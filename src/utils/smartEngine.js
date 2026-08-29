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

// ============================================================
// 阶段状态机 (Phase State Machine)
// ============================================================

/**
 * 引擎阶段枚举
 */
export const PHASES = {
  PLANNING: 'planning',
  CONSTRUCTION: 'construction',
  VALIDATION: 'validation',
  REFINEMENT: 'refinement',
  DONE: 'done'
};

/**
 * 阶段顺序（用于验证状态转换）
 */
export const PHASE_ORDER = [
  PHASES.PLANNING,
  PHASES.CONSTRUCTION,
  PHASES.VALIDATION,
  PHASES.REFINEMENT,
  PHASES.DONE
];

/**
 * 每个阶段允许的工具集合
 */
const PHASE_ALLOWED_TOOLS = {
  [PHASES.PLANNING]: ['read_skill', 'read_subdoc'],
  [PHASES.CONSTRUCTION]: ['generate_code', 'modify_code'],
  [PHASES.VALIDATION]: [], // 本地执行，无工具调用
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
  
  // 不允许回退（除了 validation → refinement 这个特殊情况）
  if (fromPhase === PHASES.VALIDATION && toPhase === PHASES.REFINEMENT) {
    return true;
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
  
  // 验证 blocks 结构（如果有的话）
  if (normalizedPlan.blocks.length > 0) {
    for (const block of normalizedPlan.blocks) {
      if (!block.id || !block.name) {
        return { ok: false, reason: 'Block missing required fields (id, name)' };
      }
    }
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
  let truncated = false;
  let refineCount = 0;
  let stepCount = 0;
  let emptyResponseCount = 0; // 连续空响应计数（熔断机制）

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

        case PHASES.VALIDATION:
          await executeValidationPhase();
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

    // 发起 LLM 请求
    const response = await callLLMWithTools();

    // 检查是否有代码生成
    if (!response.codeGenerated && !context.currentCode) {
      emptyResponseCount++;

      if (emptyResponseCount >= 2) {
        throw new Error('连续 2 次空响应，熔断');
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

    // 进入验证阶段
    changePhase(PHASES.VALIDATION, 'Code generated');
  }

  /**
   * 执行 Validation 阶段
   */
  async function executeValidationPhase() {
    callbacks.onStatus?.('Validation: 验证代码...');

    if (!generatedCode) {
      throw new Error('No code to validate');
    }

    // 检查截断
    truncated = checkCodeTruncation(generatedCode);
    if (truncated) {
      lastErrors.push('Code appears truncated');
      callbacks.onStatus?.('警告: 代码可能被截断');
    }

    // 执行代码
    try {
      const dedupedCode = dedupeTopLevelConsts(generatedCode);
      const voxels = executeVoxelScript(dedupedCode, true);

      if (voxels.length === 0) {
        throw new Error('Code executed but produced no blocks');
      }

      callbacks.onStatus?.(`验证通过: 生成 ${voxels.length} 个方块`);
      changePhase(PHASES.DONE, 'Validation passed');
    } catch (error) {
      lastErrors.push(`Validation error: ${error.message}`);
      callbacks.onStatus?.(`验证失败: ${error.message}`);

      // 进入修复阶段
      if (refineCount < MAX_REFINE) {
        changePhase(PHASES.REFINEMENT, `Validation failed: ${error.message}`);
      } else {
        callbacks.onStatus?.('已达最大修复次数，返回当前代码');
        changePhase(PHASES.DONE, 'Max refinements reached');
      }
    }
  }

  /**
   * 执行 Refinement 阶段
   */
  async function executeRefinementPhase() {
    refineCount++;
    callbacks.onStatus?.(`Refinement (${refineCount}/${MAX_REFINE}): 修复错误...`);

    // 添加错误信息到消息历史
    const errorMsg = lastErrors[lastErrors.length - 1] || 'Unknown error';
    messages.push({
      role: 'system',
      content: `## 验证失败\n\n错误信息: ${errorMsg}\n\n请使用 modify_code 修复代码中的错误。注意只修改有问题的部分，不要重新生成整个代码。`
    });

    // 发起 LLM 请求
    await callLLMWithTools();

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
}

// ============================================================
// 导出供测试使用
// ============================================================

export { checkCodeTruncation };
