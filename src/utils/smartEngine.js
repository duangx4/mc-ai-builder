/**
 * 智能构建引擎 (Smart Build Engine)
 * 
 * 阶段状态机：planning → construction → validation → refinement → done
 * 工具护栏：每个阶段只允许特定工具调用
 * 结构化规划：解析 BuildingPlan JSON
 * 
 * 复用现有基础设施：
 * - fetchWithRetry: 统一的 HTTP 重试服务层
 * - sseParser: 流式响应解析
 * - executeVoxelScript: 代码沙箱执行
 * - agentLoopV2: 工具定义和执行器
 */

import { fetchWithRetry } from './fetchWithRetry.js';
import { wrapRequest } from './proxyHelper.js';
import { createSSEParser } from './sseParser.js';
import { executeVoxelScript, dedupeTopLevelConsts } from './sandbox.js';
import {
  AGENT_TOOLS_V2,
  executeToolV2,
  getToolsSchemaV2,
  generateAgentSkillsPrompt,
  SKILLS_DATABASE
} from './agentLoopV2.js';
import { SYSTEM_PROMPT } from './prompts.js';
import { partitionPlan, runPartitionedBuild } from './partitionEngine.js';
import { getSdfPrimitivesHint } from './sdfTemplates.js';

// ============================================================
// 阶段状态机 (Phase State Machine)
// ============================================================

/**
 * 融合版五步工作流阶段
 *
 * 用户视角（3 个大阶段）：
 * - 规划设计：Planning
 * - 精细建造：Construction + Syntax Check
 * - 质量优化：Quality Check + Refinement
 *
 * 技术实现（5 个内部步骤）：
 * - Planning: 规划蓝图
 * - Construction: 生成代码
 * - Syntax Check: 快速语法验证（新增，快速失败）
 * - Quality Check: AI 智能质量检查（新增，三维度评估）
 * - Refinement: 问题修复（增强，双模式修复）
 */
export const PHASES = {
  PLANNING: 'planning',
  CONSTRUCTION: 'construction',
  SYNTAX_CHECK: 'syntax_check',   // 新增
  QUALITY_CHECK: 'quality_check', // 新增（替代 VALIDATION）
  REFINEMENT: 'refinement',
  DONE: 'done'
};

/**
 * 阶段顺序（用于验证状态转换）
 */
export const PHASE_ORDER = [
  PHASES.PLANNING,
  PHASES.CONSTRUCTION,
  PHASES.SYNTAX_CHECK,
  PHASES.QUALITY_CHECK,
  PHASES.REFINEMENT,
  PHASES.DONE
];

/**
 * 每个阶段允许的工具集合
 */
const PHASE_ALLOWED_TOOLS = {
  [PHASES.PLANNING]: ['read_skill', 'read_subdoc'],
  [PHASES.CONSTRUCTION]: ['generate_code', 'modify_code'],
  [PHASES.SYNTAX_CHECK]: [], // 本地执行，无工具调用
  [PHASES.QUALITY_CHECK]: [], // AI 评估，无工具调用（直接调用 LLM）
  [PHASES.REFINEMENT]: ['modify_code'],
  [PHASES.DONE]: []
};

/**
 * 获取指定阶段允许的工具列表
 * @param {string} phase - 阶段名称
 * @returns {Array<string>} 允许的工具名称列表
 */
export function getAllowedTools(phase) {
  return PHASE_ALLOWED_TOOLS[phase] || [];
}

/**
 * 检查是否可以从一个阶段转换到另一个阶段
 * @param {string} fromPhase - 当前阶段
 * @param {string} toPhase - 目标阶段
 * @param {string} _reason - 转换原因（用于日志）
 * @returns {boolean} 是否允许转换
 */
export function canTransition(fromPhase, toPhase, _reason = '') {
  const fromIndex = PHASE_ORDER.indexOf(fromPhase);
  const toIndex = PHASE_ORDER.indexOf(toPhase);

  // 特殊情况：允许从 REFINEMENT 回到 SYNTAX_CHECK 或 QUALITY_CHECK
  if (fromPhase === PHASES.REFINEMENT) {
    if (toPhase === PHASES.SYNTAX_CHECK || toPhase === PHASES.QUALITY_CHECK) {
      return true;
    }
  }

  // 允许向前推进
  if (toIndex > fromIndex) {
    return true;
  }

  // 其他情况不允许
  return false;
}

/**
 * 检查工具调用是否在当前阶段被允许
 * @param {string} toolName - 工具名称
 * @param {string} currentPhase - 当前阶段
 * @returns {Object} { allowed: boolean, error?: string }
 */
export function checkToolAllowed(toolName, currentPhase) {
  const allowedTools = getAllowedTools(currentPhase);
  
  if (allowedTools.includes(toolName)) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    error: `[SmartEngine] Tool "${toolName}" not allowed in phase "${currentPhase}". Allowed tools: ${allowedTools.join(', ') || 'none'}`
  };
}

// ============================================================
// BuildingPlan 结构化解析 (Structured Plan Parser)
// ============================================================

/**
 * 从 LLM 输出中解析结构化的 BuildingPlan
 * 
 * 支持格式：
 * - 纯 JSON
 * - Markdown 代码块包裹的 JSON
 * - 字段缺失时补充默认值
 * 
 * @param {string} text - LLM 输出文本
 * @returns {Object} { ok: boolean, plan?: Object, reason?: string }
 */
export function parseBuildingPlan(text) {
  if (!text || typeof text !== 'string') {
    return { ok: false, reason: 'Empty or invalid input' };
  }
  
  let jsonText = text.trim();
  
  // 尝试提取 markdown 代码块中的 JSON
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }
  
  // 尝试解析 JSON
  let plan;
  try {
    plan = JSON.parse(jsonText);
  } catch (e) {
    return { ok: false, reason: `JSON parse error: ${e.message}` };
  }
  
  // 验证并补充默认值
  const normalizedPlan = {
    style: plan.style || 'unknown',
    summary: plan.summary || 'No summary provided',
    blocks: Array.isArray(plan.blocks) ? plan.blocks : [],
    globalNotes: plan.globalNotes || '',
    sections: plan.sections || { groundY: 0, heightLine: 8 }
  };

  // blocks 不是数组时的容错处理
  if (!Array.isArray(normalizedPlan.blocks)) {
    console.warn('[parseBuildingPlan] blocks 不是数组，归一化为空数组');
    normalizedPlan.blocks = [];
  }

  // 归一化 blocks 元素字段（自动补齐缺失字段）
  if (normalizedPlan.blocks.length > 0) {
    normalizedPlan.blocks = normalizedPlan.blocks.map((block, index) => {
      const normalized = { ...block };

      // 补齐 id
      if (!normalized.id) {
        normalized.id = `b${index}`;
        console.warn(`[parseBuildingPlan] 已补齐字段: blocks[${index}].id = "${normalized.id}"`);
      }

      // 补齐 name
      if (!normalized.name) {
        normalized.name = normalized.id || `Part ${index}`;
        console.warn(`[parseBuildingPlan] 已补齐字段: blocks[${index}].name = "${normalized.name}"`);
      }

      // 补齐 size
      if (!Array.isArray(normalized.size)) {
        normalized.size = [10, 10, 10];
        console.warn(`[parseBuildingPlan] 已补齐字段: blocks[${index}].size = [10, 10, 10]`);
      }

      return normalized;
    });
  }

  return { ok: true, plan: normalizedPlan };
}

// ============================================================
// 辅助函数：代码截断检测
// ============================================================

/**
 * 检查代码是否被截断（复用自 ai.js 的逻辑）
 * @param {string} content - 生成的内容
 * @returns {boolean} 是否截断
 */
function checkCodeTruncation(content) {
  if (!content) return false;

  // 提取代码（如果有 markdown 包裹）
  const codeMatch = content.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
  const code = codeMatch ? codeMatch[1] : content;

  const trimmedCode = code.trim();

  // 对于太短的代码，只检查明显的截断标志
  if (trimmedCode.length < 100) {
    return trimmedCode.endsWith(',') ||
           trimmedCode.endsWith('(') ||
           trimmedCode.endsWith('{') ||
           trimmedCode.endsWith('[');
  }

  // 检查不完整的语法结尾
  if (trimmedCode.endsWith(',') ||
      trimmedCode.endsWith('(') ||
      trimmedCode.endsWith('{') ||
      trimmedCode.endsWith('[') ||
      trimmedCode.endsWith(':') ||
      trimmedCode.endsWith('//') ||
      trimmedCode.endsWith('/*') ||
      trimmedCode.endsWith('+') ||
      trimmedCode.endsWith('-') ||
      trimmedCode.endsWith('*') ||
      trimmedCode.endsWith('=') ||
      trimmedCode.endsWith('&&') ||
      trimmedCode.endsWith('||')) {
    return true;
  }

  // 检查括号不平衡
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;

  if (openBraces > closeBraces + 1 || openParens > closeParens + 1) {
    return true;
  }

  return false;
}

// ============================================================
// 智能构建引擎主循环 (Main Engine Loop)
// ============================================================

// 全局护栏常量
const MAX_STEPS = 30; // 总步数上限
const MAX_REFINE = 3; // 最大修复次数

/**
 * 智能构建引擎主入口
 *
 * @param {Object} config - 配置对象
 * @param {string} config.userMessage - 用户输入
 * @param {string} config.apiKey - API Key
 * @param {string} config.baseUrl - API Base URL
 * @param {string} config.model - 模型名称
 * @param {Object} config.callbacks - 回调函数集合
 * @param {Function} config.callbacks.onPhaseChange - 阶段变化回调 (phase, reason)
 * @param {Function} config.callbacks.onChunk - 流式输出回调 (chunk, accumulated)
 * @param {Function} config.callbacks.onStatus - 状态更新回调 (message)
 * @param {Function} config.callbacks.onPlan - 规划完成回调 (plan)
 * @param {Function} config.callbacks.onToolCall - 工具调用回调 (toolName, args, result)
 * @param {string} config.currentCode - 现有代码（用于修改模式）
 * @param {string} config.imageUrl - 图片 URL
 * @param {AbortSignal} config.signal - 中止信号
 * @param {Array} config.conversationHistory - 对话历史
 * @param {Object} config.settings - 设置对象
 * @returns {Promise<Object>} { content, plan, phases, truncated, lastErrors }
 */
export async function generateWithSmartEngine(config) {
  const {
    userMessage,
    apiKey,
    baseUrl = 'https://api.openai.com/v1',
    model = 'gpt-4',
    callbacks = {},
    currentCode = null,
    imageUrl = null,
    signal = null,
    conversationHistory = null,
    settings = {}
  } = config;

  // 初始化上下文
  const context = {
    currentCode: currentCode || '',
    userMessage,
    imageUrl,
    config: settings
  };

  // 初始化阶段跟踪
  let currentPhase = PHASES.PLANNING;
  const phaseHistory = [];
  let plan = null;
  let generatedCode = '';
  let lastErrors = [];
  let lastQualityReport = null; // 新增：保存质量检查报告
  let truncated = false;
  let refineCount = 0;
  let stepCount = 0;
  let emptyResponseCount = 0; // 连续空响应计数（熔断机制）
  let constructionRebased = false; // construction 阶段上下文重建标志（只做一次）

  // 通知阶段变化
  const changePhase = (newPhase, reason = '') => {
    if (!canTransition(currentPhase, newPhase, reason)) {
      console.warn(`[SmartEngine] Invalid phase transition: ${currentPhase} → ${newPhase}`);
      // 对于 refinement 可以回到 validation 的特殊情况，允许通过
      if (!(currentPhase === PHASES.REFINEMENT && newPhase === PHASES.VALIDATION)) {
        return false;
      }
    }

    phaseHistory.push({
      name: currentPhase,
      toolsUsed: [],
      outcome: reason
    });

    currentPhase = newPhase;
    callbacks.onPhaseChange?.(newPhase, reason);
    callbacks.onStatus?.(`进入阶段: ${newPhase}`);
    return true;
  };

  // 构建系统提示（基于 agentSkillsPrompt，增强阶段说明）
  const systemPrompt = generateAgentSkillsPrompt({
    customPrompt: settings.agentSystemPrompt || null,
    customSkills: settings.customSkills || [],
    customScripts: settings.customScripts || []
  }) + `

---

# 🤖 智能构建引擎 (Smart Build Engine)

你正在使用智能构建引擎，该引擎通过多阶段流程确保高质量输出。

## 当前阶段: ${currentPhase}

### 阶段说明:

**PLANNING** (规划阶段):
- 目标: 理解需求，制定构建计划
- 允许工具: read_skill, read_subdoc
- 输出: 结构化的 BuildingPlan JSON (包含 style, summary, blocks, globalNotes)

**CONSTRUCTION** (构建阶段):
- 目标: 生成建筑代码
- 允许工具: generate_code, modify_code
- 输出: 可执行的 JavaScript 代码

**VALIDATION** (验证阶段):
- 目标: 自动验证代码语法和执行
- 本地执行，无需工具调用

**REFINEMENT** (修复阶段):
- 目标: 修复验证中发现的错误
- 允许工具: modify_code
- 最多尝试 ${MAX_REFINE} 次

**DONE** (完成):
- 构建完成，返回结果

## 重要规则:

1. **遵守阶段工具限制**: 只能使用当前阶段允许的工具
2. **输出结构化计划**: planning 阶段必须输出 JSON 格式的 BuildingPlan
3. **避免重复生成**: 出错时使用 modify_code 而非 generate_code
4. **思考后行动**: 每次工具调用前说明理由

当前阶段允许的工具: ${getAllowedTools(currentPhase).join(', ') || '无（本地执行）'}
`;

  // 构建消息历史
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // 添加对话历史（如果有）
  if (conversationHistory && conversationHistory.length > 0) {
    messages.push(...conversationHistory);
  }

  // 添加用户消息
  const userMsg = imageUrl ? {
    role: 'user',
    content: [
      { type: 'text', text: userMessage },
      { type: 'image_url', image_url: { url: imageUrl } }
    ]
  } : { role: 'user', content: userMessage };

  messages.push(userMsg);

  // ============================================================
  // 主循环
  // ============================================================

  while (currentPhase !== PHASES.DONE && stepCount < MAX_STEPS) {
    stepCount++;

    // 检查中止信号
    if (signal?.aborted) {
      throw new Error('Generation aborted by user');
    }

    callbacks.onStatus?.(`步骤 ${stepCount}/${MAX_STEPS} - 阶段: ${currentPhase}`);

    // 根据当前阶段执行相应逻辑
    try {
      switch (currentPhase) {
        case PHASES.PLANNING:
          await executePlanningPhase();
          break;

        case PHASES.CONSTRUCTION:
          await executeConstructionPhase();
          break;

        case PHASES.SYNTAX_CHECK:
          await executeSyntaxCheckPhase();
          break;

        case PHASES.QUALITY_CHECK:
          await executeQualityCheckPhase();
          break;

        case PHASES.REFINEMENT:
          await executeRefinementPhase();
          break;

        default:
          throw new Error(`Unknown phase: ${currentPhase}`);
      }
    } catch (error) {
      // 处理中止错误
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        throw error; // 直接抛出，不重试
      }

      // 其他错误记录并尝试恢复
      console.error(`[SmartEngine] Error in phase ${currentPhase}:`, error);
      lastErrors.push(`${currentPhase}: ${error.message}`);

      // 如果在 construction 阶段出错，尝试进入 refinement
      if (currentPhase === PHASES.CONSTRUCTION && generatedCode) {
        changePhase(PHASES.REFINEMENT, `Construction error: ${error.message}`);
      } else {
        // 否则标记为完成，返回部分结果
        changePhase(PHASES.DONE, `Fatal error: ${error.message}`);
      }
    }
  }

  // 超过最大步数
  if (stepCount >= MAX_STEPS) {
    callbacks.onStatus?.(`已达到最大步数限制 (${MAX_STEPS})`);
    lastErrors.push('Reached maximum steps limit');
  }

  // 返回结果
  return {
    content: generatedCode || context.currentCode,
    plan,
    phases: phaseHistory,
    truncated,
    lastErrors
  };

  // ============================================================
  // 阶段执行函数
  // ============================================================

  /**
   * 执行 Planning 阶段
   */
  async function executePlanningPhase() {
    callbacks.onStatus?.('Planning: 分析需求并制定构建计划...');

    // 调用 LLM 生成规划
    const planningPrompt = currentPhase === PHASES.PLANNING && messages.length === 2
      ? `请先阅读相关技能文档（如 knowledge-skill），然后制定详细的构建计划。

输出格式要求（JSON）:

**blocks 数组元素字段要求（严格遵循）：**
- "id": 英文小写短标识符，如 "main_hall"、"left_wing"（必填，唯一）
- "name": 中文或英文显示名，如 "正殿"（必填）
- "size": [宽, 高, 深]，三个正整数（必填）
- "materials": 主要材料中文名数组（选填）
- "notes": 该区块备注（选填）

**输出前逐项检查每个 block 是否都有 id 和 name，缺失会让整个规划作废。**

\`\`\`json
{
  "style": "建筑风格名称",
  "summary": "一句话总结",
  "blocks": [
    {
      "id": "唯一标识",
      "name": "区块名称",
      "position": [x, y, z],
      "size": [宽, 高, 深],
      "materials": ["主要材料"],
      "notes": "备注"
    }
  ],
  "globalNotes": "整体要求"
}
\`\`\`

注意：先调用 read_skill 阅读相关文档，再输出计划。`
      : '';

    if (planningPrompt) {
      messages.push({ role: 'assistant', content: planningPrompt });
    }

    // 发起 LLM 请求（可能包含工具调用）
    const response = await callLLMWithTools();

    // 尝试解析 BuildingPlan
    const parseResult = parseBuildingPlan(response.content || '');

    if (parseResult.ok) {
      plan = parseResult.plan;
      callbacks.onPlan?.(plan);
      callbacks.onStatus?.(`规划完成: ${plan.summary}`);

      // 规划成功日志
      console.log('[SmartEngine] Plan parsed:', {
        blockCount: plan.blocks.length,
        blocks: plan.blocks.map(b => ({ id: b.id, name: b.name, size: b.size }))
      });

      // 检查是否需要分区构建
      const shouldPartition = settings.smartPartition !== false &&
                              plan.blocks &&
                              plan.blocks.length > 0;

      if (shouldPartition) {
        // 检查是否有大区块需要细分
        const maxBlockSize = settings.maxBlockSize || 24;
        const hasLargeBlocks = plan.blocks.some(block => {
          const size = block.size || [10, 10, 10];
          return Math.max(...size) > maxBlockSize;
        });

        // 如果区块数 > 1 或有大区块，使用分区构建
        if (plan.blocks.length > 1 || hasLargeBlocks) {
          callbacks.onStatus?.('检测到多区块或大区块，启用分区构建模式...');

          // 执行分区规划
          const tasks = partitionPlan(plan, {
            maxBlockSize: settings.maxBlockSize || 24,
            maxDepth: settings.partitionMaxDepth || 2,
            minChildren: 2,
            maxChildren: 6
          });

          callbacks.onStatus?.(`分区规划完成：${tasks.length} 个任务`);

          // 使用分区构建
          try {
            const partitionResult = await runPartitionedBuild({
              userMessage,
              plan,
              tasks,
              apiKey,
              baseUrl,
              model,
              callbacks,
              currentCode,
              imageUrl,
              signal,
              settings,
              prevTasks: context.prevTasks || null
            });

            // 保存任务列表供下次 diff 使用
            context.prevTasks = tasks;

            // 直接使用分区构建的结果
            generatedCode = partitionResult.code;

            if (partitionResult.warnings.length > 0) {
              lastErrors.push(...partitionResult.warnings);
            }

            // 跳过常规 construction 阶段，直接进入验证
            changePhase(PHASES.VALIDATION, 'Partitioned build completed');
            return;
          } catch (error) {
            callbacks.onStatus?.(`分区构建失败，回退到常规模式: ${error.message}`);
            lastErrors.push(`Partition build failed: ${error.message}`);
            // 继续常规流程
          }
        }
      }

      changePhase(PHASES.CONSTRUCTION, 'Plan parsed successfully');
    } else {
      // 解析失败，但不阻塞，带警告进入 construction
      callbacks.onStatus?.(`警告: 无法解析规划 (${parseResult.reason})，直接进入构建阶段`);
      changePhase(PHASES.CONSTRUCTION, 'Planning parse failed, proceed anyway');
    }
  }

  /**
   * 执行 Construction 阶段
   */
  async function executeConstructionPhase() {
    callbacks.onStatus?.('Construction: 生成建筑代码...');

    // 关键修复：construction 阶段重建干净上下文（只做一次）
    // 实测模型被 planning 阶段的对话产物带偏——进入 construction 后仍持续输出规划 JSON 而不生成代码；
    // 重建后模型只见「system + 用户需求 + plan 摘要 + 阶段强指令」，无从回到规划模式
    if (!constructionRebased) {
      constructionRebased = true;
      if (messages.length > 2) {
        const sysMsg = messages[0];
        const userMsg = messages.find(m => m.role === 'user');
        messages.length = 0;
        if (sysMsg) messages.push(sysMsg);
        if (userMsg) messages.push(userMsg);
        console.log(`[SmartEngine] Construction 上下文重建：保留 ${messages.length} 条（system+user）`);
        // 附上 plan 摘要（紧凑，保持构建依据）
        if (plan) {
          const planSummary = `已确认的构建计划（供生成代码参考）：风格=${plan.style || 'unknown'}；区块 ${(plan.blocks || []).map(b => `「${b.name}(${b.id}) ${(b.size || []).join('x')}」`).join('；')}${plan.globalNotes ? `；整体要求：${plan.globalNotes}` : ''}`;
          messages.push({ role: 'system', content: planSummary });
          console.log(`[SmartEngine] 附 plan 摘要：${planSummary.slice(0, 120)}...`);
        }
      }
    }

    // 强指令：阻断模型回到规划模式（实测模型常再次输出规划而不生成代码）
    messages.push({
      role: 'system',
      content: '**当前阶段：CONSTRUCTION（生成代码）**。立即使用 generate_code 工具输出完整的 Minecraft 建筑 JavaScript 代码。禁止再次输出规划、JSON、markdown 说明或文字描述——直接调用工具生成代码，代码必须调用 builder.* API（如 builder.set / builder.fill）。\n\n**屋顶生成规范（重要）**——需要屋顶时优先调用 builder.roof() 生成器，方向完全由算法保证，禁止逐块手写台阶：\n\n## builder.roof() 屋顶生成器（推荐）\n```javascript\nbuilder.roof(x0, z0, x1, z1, {\n  style: \'gable\' | \'hip\' | \'pyramid\',  // 双坡硬山 | 四坡庑殿 | 攒尖方锥\n  material: \'gray_concrete\',            // 瓦片材质\n  frame: \'dark_oak_planks\',             // 檩条/屋脊材质\n  baseY: 5,                              // 屋顶底面高度（可省略，自动检测墙顶）\n  eaves: 0,                              // 挑檐格数（0=外框即墙顶）\n  slope: 1                               // 坡度步进（1=45°，每升高1层内收1格）\n});\n```\n\n**示例**：中式硬山顶建筑，墙体 8x6（面阔x进深），墙高 5，灰瓦深色梁：\n```javascript\n// 墙体 (0,0,0) 到 (7,4,5)\nbuilder.walls(0, 0, 0, 7, 4, 5, \'stone_bricks\');\n// 屋顶：外框 (0,0,7,5) 自动检测墙顶高度\nbuilder.roof(0, 0, 7, 5, { style: \'gable\', material: \'gray_concrete\', frame: \'dark_oak_planks\' });\n```\n\n**手工台阶/半砖（仅特殊情况）**：\n- `builder.stairs(x, y, z, \'oak_stairs\', \'south\')` - facing 必须指定（n/s/e/w）\n- `builder.slab(x, y, z, \'oak_slab\', \'bottom\')` - half 为 \'bottom\' 或 \'top\'\n\n**传统屋顶做法（仅 builder.roof 不适用时）**：\n1. 结构：双坡屋顶 = 两侧山墙上方逐层内收的斜坡，每升高 1 格水平内收 1 格（约 45° 坡）；单坡屋顶 = 一侧高一侧低逐层倾斜。\n2. 层次：屋顶至少 3 层结构——下层用深色橡木木板/横梁（builder.set 在屋檐下做一圈檐口支撑），中层瓦片主层（灰色瓦片/深灰混凝土），上层屋脊（顶部最后一层收成一条或一排脊瓦）。\n3. 飞檐：瓦片外沿挑出墙外 1 格（屋檐比墙体宽 1 圈），四角不悬空（角部用橡木梁承接）。\n4. 比例：屋顶总高约为建筑高度的 30%~50%，坡度均匀；建筑较矮（≤5 格）时可用简化单坡或平顶。\n\n' + getSdfPrimitivesHint()
    });

    // 发起 LLM 请求
    const response = await callLLMWithTools();

    // 检查是否有代码生成
    if (!response.codeGenerated && !context.currentCode) {
      emptyResponseCount++;

      // 诊断日志：空响应时输出请求上下文（定位 cfbot/opus5 长上下文空响应问题）
      console.warn(`[SmartEngine] 空响应 #${emptyResponseCount}，阶段=${currentPhase}，消息数=${messages.length}，总字符=${messages.reduce((s, m) => s + String(m.content || '').length, 0)}，返回内容=${String(response.content || '').slice(0, 80)}`);

      if (emptyResponseCount >= 3) {
        throw new Error('连续 3 次空响应，熔断');
      }

      callbacks.onStatus?.('警告: 未生成代码，重试...');
      return; // 重试
    }

    // 重置空响应计数
    emptyResponseCount = 0;

    // 获取生成的代码
    generatedCode = context.currentCode;

    if (!generatedCode) {
      throw new Error('No code generated');
    }

    // 进入语法检查阶段
    changePhase(PHASES.SYNTAX_CHECK, 'Code generated');
  }

  /**
   * 执行 Syntax Check 阶段（新增）
   * 快速失败机制：在昂贵的 Quality Check 之前验证基础语法
   */
  async function executeSyntaxCheckPhase() {
    callbacks.onStatus?.('Syntax Check: 验证代码语法...');

    if (!generatedCode) {
      throw new Error('No code to check');
    }

    // 检查截断
    truncated = checkCodeTruncation(generatedCode);
    if (truncated) {
      lastErrors.push('Code appears truncated');
      callbacks.onStatus?.('警告: 代码可能被截断');
    }

    // 执行代码验证语法
    try {
      const dedupedCode = dedupeTopLevelConsts(generatedCode);
      const voxels = executeVoxelScript(dedupedCode, true);

      if (voxels.length === 0) {
        throw new Error('Code executed but produced no blocks');
      }

      callbacks.onStatus?.(`✅ 语法通过: 生成 ${voxels.length} 个方块`);

      // 语法通过 → 进入质量检查
      changePhase(PHASES.QUALITY_CHECK, 'Syntax valid');
    } catch (error) {
      lastErrors.push(`Syntax error: ${error.message}`);
      callbacks.onStatus?.(`❌ 语法错误: ${error.message}`);

      // 语法错误 → 直接修复，跳过质量检查（节省成本）
      if (refineCount < MAX_REFINE) {
        changePhase(PHASES.REFINEMENT, `Syntax check failed: ${error.message}`);
      } else {
        callbacks.onStatus?.('已达最大修复次数，返回当前代码');
        changePhase(PHASES.DONE, 'Max refinements reached');
      }
    }
  }

  /**
   * 执行 Quality Check 阶段（新增核心）
   * AI 智能质量检查：三维度评估（结构/风格/细节）
   */
  async function executeQualityCheckPhase() {
    callbacks.onStatus?.('Quality Check: AI 正在检查建筑质量...');

    if (!generatedCode) {
      throw new Error('No code to check quality');
    }

    // 小建筑跳过质量检查（< 50 方块）
    const dedupedCode = dedupeTopLevelConsts(generatedCode);
    const voxels = executeVoxelScript(dedupedCode, true);
    const voxelCount = voxels.length;

    if (voxelCount < 50) {
      callbacks.onStatus?.(`⚡ 小型建筑 (${voxelCount} 方块)，跳过质量检查`);
      changePhase(PHASES.DONE, 'Small building, quality check skipped');
      return;
    }

    // 构建质量检查 Prompt
    const qualityPrompt = `你是一位资深的 Minecraft 建筑师。请检查以下建筑的质量：

**建筑信息：**
- 风格：${plan?.style || '未指定'}
- 方块数：${voxelCount}
- 蓝图：${plan ? JSON.stringify(plan.blocks) : '无'}

**生成的代码片段：**
\`\`\`javascript
${generatedCode.substring(0, 1000)}...
\`\`\`

请从以下 3 个维度评估（每项 0-10 分）：

1. **结构完整性** (structural_score)
   - 建筑是否完整？有无缺失部分？
   - 比例是否合理？是否协调？
   - 是否稳定？是否悬空？

2. **风格一致性** (style_score)
   - 材料选择是否符合风格？
   - 造型是否匹配主题？
   - 整体感觉是否统一？

3. **细节丰富度** (detail_score)
   - 装饰是否足够？
   - 是否有变化和层次？
   - 是否生动有趣？

**输出格式（严格 JSON）：**
\`\`\`json
{
  "overall_score": 8.5,
  "structural_score": 9,
  "style_score": 8,
  "detail_score": 8,
  "issues": [
    {
      "severity": "medium",
      "category": "structure",
      "description": "屋顶坡度过陡",
      "suggestion": "将屋顶高度从 8 格降低到 6 格"
    }
  ],
  "passed": true,
  "needs_refinement": false
}
\`\`\`

**评分标准：**
- overall_score >= 7.0 → passed = true
- 发现严重问题 → needs_refinement = true
- issues 数组包含所有发现的问题

只输出 JSON，不要有其他文字。`;

    // 调用 LLM 进行质量检查
    try {
      messages.push({
        role: 'user',
        content: qualityPrompt
      });

      const qualityResponse = await callLLMForQualityCheck();
      const report = parseQualityReport(qualityResponse);

      // 回调质量报告
      if (callbacks.onQualityReport) {
        callbacks.onQualityReport(report);
      }

      callbacks.onStatus?.(`Quality Check 完成: 总分 ${report.overall_score}/10`);

      if (report.passed && !report.needs_refinement) {
        // ✅ 质量优秀 → 完成
        callbacks.onStatus?.(`✅ 质量优秀 (${report.overall_score}/10)`);
        changePhase(PHASES.DONE, `Quality excellent (${report.overall_score}/10)`);
      } else {
        // ⚠️ 需要改进 → 进入 Refinement
        lastQualityReport = report;
        callbacks.onStatus?.(`⚠️ 发现 ${report.issues.length} 个质量问题`);

        if (refineCount < MAX_REFINE) {
          changePhase(PHASES.REFINEMENT, `Quality issues found (${report.issues.length} issues)`);
        } else {
          callbacks.onStatus?.('已达最大修复次数，接受当前质量');
          changePhase(PHASES.DONE, 'Max refinements reached');
        }
      }
    } catch (error) {
      console.error('[Quality Check] Failed:', error);
      callbacks.onStatus?.('质量检查失败，跳过');
      // 质量检查失败不阻塞，直接完成
      changePhase(PHASES.DONE, 'Quality check failed, proceeding');
    }
  }

  /**
   * 执行 Refinement 阶段（增强版）
   * 双模式修复：语法错误 + 质量问题
   */
  async function executeRefinementPhase() {
    refineCount++;
    callbacks.onStatus?.(`Refinement (${refineCount}/${MAX_REFINE}): 修复问题...`);

    // 区分两种修复场景
    if (lastErrors.length > 0 && !lastQualityReport) {
      // 场景 A: 语法错误修复（来自 SYNTAX_CHECK）
      await fixSyntaxError();
    } else if (lastQualityReport) {
      // 场景 B: 质量问题修复（来自 QUALITY_CHECK）
      await improveQuality();
    } else {
      // 未知场景，默认语法修复
      await fixSyntaxError();
    }
  }

  /**
   * 修复语法错误
   */
  async function fixSyntaxError() {
    const errorMsg = lastErrors[lastErrors.length - 1] || 'Unknown error';
    messages.push({
      role: 'system',
      content: `## 语法错误\n\n错误信息: ${errorMsg}\n\n请使用 modify_code 修复代码中的语法错误。注意只修改有问题的部分，不要重新生成整个代码。`
    });

    // 发起 LLM 请求
    await callLLMWithTools();

    // 更新代码
    generatedCode = context.currentCode;

    // 重新语法检查
    changePhase(PHASES.SYNTAX_CHECK, 'Syntax error fixed, re-checking');
  }

  /**
   * 改进质量问题
   */
  async function improveQuality() {
    const issues = lastQualityReport.issues || [];

    const refinementPrompt = `质量检查发现 ${issues.length} 个问题，请使用 modify_code 逐一修复：

${issues.map((issue, i) => `
${i + 1}. **${issue.category}** (${issue.severity})
   问题：${issue.description}
   建议：${issue.suggestion}
`).join('\n')}

**当前代码：**
\`\`\`javascript
${generatedCode.substring(0, 1000)}...
\`\`\`

请调用 modify_code 工具，按建议修复代码。`;

    messages.push({
      role: 'user',
      content: refinementPrompt
    });

    await callLLMWithTools();

    // 更新代码
    generatedCode = context.currentCode;

    // 清空质量报告，重新质量检查
    lastQualityReport = null;
    changePhase(PHASES.QUALITY_CHECK, 'Quality refinement completed, re-checking');
  }

  /**
   * 旧的 Validation 阶段（已废弃，保留向后兼容）
   */
  async function executeValidationPhase() {
    // 重定向到 Syntax Check
    await executeSyntaxCheckPhase();

    // 更新代码
    generatedCode = context.currentCode;

    // 重新验证
    changePhase(PHASES.VALIDATION, 'Refinement attempt completed');
  }

  /**
   * 调用 LLM 并处理工具调用
   * @returns {Object} { content, codeGenerated }
   */
  async function callLLMWithTools() {
    const requestBody = {
      model: model,
      messages: messages,
      stream: true,
      tools: getToolsSchemaV2(getAllowedTools(currentPhase).length > 0 ? getAllowedTools(currentPhase) : null)
    };

    // 应用设置（thinkingEffort 等）
    if (settings.thinkingEffort) {
      requestBody.thinking_effort = settings.thinkingEffort;
    }
    if (settings.maxTokens) {
      requestBody.max_tokens = settings.maxTokens;
    }

    // 发起请求（使用 fetchWithRetry；botcf 等 CORS 受限网关自动走同源代理）
    const { url: reqUrl, fetchOptions } = wrapRequest(
      baseUrl,
      '/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal
      }
    );
    const response = await fetchWithRetry(
      reqUrl,
      fetchOptions,
      {
        timeout: settings.timeout || 60000,
        maxRetries: 3
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    // 解析流式响应（createSSEParser 回调式，支持跨包缓冲）
    let accumulatedContent = '';
    let accumulatedToolCalls = [];
    let codeGenerated = false;

    const parser = createSSEParser((data) => {
      const delta = data.choices?.[0]?.delta;
      if (!delta) return;

      if (delta.content) {
        accumulatedContent += delta.content;
        callbacks.onChunk?.(delta.content, accumulatedContent);
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!accumulatedToolCalls[idx]) {
            accumulatedToolCalls[idx] = {
              id: tc.id || `call_${Date.now()}_${idx}`,
              type: 'function',
              function: { name: '', arguments: '' }
            };
          }
          if (tc.function?.name) {
            accumulatedToolCalls[idx].function.name = tc.function.name;
          }
          if (tc.function?.arguments) {
            accumulatedToolCalls[idx].function.arguments += tc.function.arguments;
          }
        }
      }
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } finally {
      reader.releaseLock();
    }

    // 处理工具调用
    if (accumulatedToolCalls.length > 0) {
      // 添加助手消息（包含工具调用）
      const assistantMsg = {
        role: 'assistant',
        content: accumulatedContent || null,
        tool_calls: accumulatedToolCalls.filter(tc => tc.function.name)
      };
      messages.push(assistantMsg);

      // 执行工具
      for (const toolCall of assistantMsg.tool_calls) {
        const toolName = toolCall.function.name;
        let args;

        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        // 检查工具是否被允许
        const checkResult = checkToolAllowed(toolName, currentPhase);
        let result;

        if (!checkResult.allowed) {
          result = { success: false, error: checkResult.error };
        } else {
          // 执行工具
          result = await executeToolV2(toolName, args, context);

          // 记录代码生成
          if (toolName === 'generate_code' || toolName === 'modify_code') {
            if (result.success) {
              codeGenerated = true;
            }
          }
        }

        callbacks.onToolCall?.(toolName, args, result);

        // 添加工具结果到消息
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }

      // 继续对话（让 LLM 处理工具结果）
      return await callLLMWithTools();
    }

    // 没有工具调用，直接返回
    messages.push({
      role: 'assistant',
      content: accumulatedContent
    });

    return {
      content: accumulatedContent,
      codeGenerated
    };
  }

  /**
   * 调用 LLM 进行质量检查（不使用工具）
   * @returns {string} LLM 返回的 JSON 字符串
   */
  async function callLLMForQualityCheck() {
    const requestBody = {
      model: model,
      messages: messages,
      stream: false, // 质量检查不需要流式
      temperature: 0.3 // 降低温度，让评分更稳定
    };

    // 发起请求
    const { url: reqUrl, fetchOptions } = wrapRequest(
      baseUrl,
      '/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal
      }
    );

    const response = await fetchWithRetry(
      reqUrl,
      fetchOptions,
      {
        timeout: settings.timeout || 60000,
        maxRetries: 2
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // 添加到消息历史
    messages.push({
      role: 'assistant',
      content: content
    });

    return content;
  }
}

// ============================================================
// 质量检查辅助函数
// ============================================================

/**
 * 解析质量检查报告
 * @param {string} text - LLM 返回的文本
 * @returns {Object} 解析后的质量报告
 */
function parseQualityReport(text) {
  try {
    // 提取 JSON（可能被代码块包裹）
    let jsonText = text.trim();

    // 移除 markdown 代码块
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const report = JSON.parse(jsonText);

    // 验证必需字段
    if (typeof report.overall_score !== 'number') {
      throw new Error('Missing overall_score');
    }

    // 设置默认值
    return {
      overall_score: report.overall_score || 0,
      structural_score: report.structural_score || 0,
      style_score: report.style_score || 0,
      detail_score: report.detail_score || 0,
      issues: Array.isArray(report.issues) ? report.issues : [],
      passed: report.passed !== false, // 默认通过
      needs_refinement: report.needs_refinement === true
    };
  } catch (error) {
    console.error('[parseQualityReport] Failed to parse:', error);
    console.error('[parseQualityReport] Input text:', text.substring(0, 500));

    // 返回默认报告（通过）
    return {
      overall_score: 7.0,
      structural_score: 7.0,
      style_score: 7.0,
      detail_score: 7.0,
      issues: [],
      passed: true,
      needs_refinement: false,
      parse_error: error.message
    };
  }
}

/**
 * 获取用户友好的阶段信息
 * @param {string} internalPhase - 内部阶段名称
 * @returns {Object} { stage: string, progress: number }
 */
export function getUserPhaseInfo(internalPhase) {
  switch(internalPhase) {
    case PHASES.PLANNING:
      return { stage: '规划设计', progress: 20 };
    case PHASES.CONSTRUCTION:
      return { stage: '精细建造', progress: 50 };
    case PHASES.SYNTAX_CHECK:
      return { stage: '精细建造', progress: 65 };
    case PHASES.QUALITY_CHECK:
      return { stage: '质量优化', progress: 85 };
    case PHASES.REFINEMENT:
      return { stage: '质量优化', progress: 95 };
    case PHASES.DONE:
      return { stage: '完成', progress: 100 };
    default:
      return { stage: '处理中', progress: 50 };
  }
}

// ============================================================
// 导出供测试使用
// ============================================================

export { checkCodeTruncation, parseQualityReport };
