/**
 * blueprintEngine.js - 蓝图模式引擎
 *
 * 实现蓝图模式的完整工作流：
 * 1. 交互式问答收集需求
 * 2. 生成详细蓝图
 * 3. 用户审批
 * 4. 执行建造
 */

import { fetchAIResponse } from './ai.js';
import {
  generateFullBlueprint,
  validateBlueprint,
  generateASCIIFloorPlan,
  generateConstructionPlan,
  estimateMaterialList
} from './blueprintGenerator.js';
import {
  extractAIContent,
  extractJSON,
  extractCodeBlock,
  validateAPISettings,
  createUserFriendlyError
} from './errorHandling.js';

// 5 个核心问题
export const CORE_QUESTIONS = [
  {
    id: 'buildingType',
    question: '您想建造什么类型的建筑？',
    examples: '例如：房屋、城堡、塔楼、桥梁、花园、神庙、宫殿',
    hint: '这将决定建筑的基础结构和整体形态',
    validation: (answer) => answer && answer.length > 0
  },
  {
    id: 'buildingScale',
    question: '建筑的规模大约是多少？',
    examples: '例如：小型（10x10x10）、中型（20x20x15）、大型（30x30x20）、超大型（50x50x30）',
    hint: '请提供长×宽×高的大致尺寸，或选择预设规模',
    validation: (answer) => answer && answer.length > 0
  },
  {
    id: 'buildingStyle',
    question: '您希望采用什么建筑风格？',
    examples: '例如：中世纪、现代、东方古典、幻想、工业、自然',
    hint: '风格将影响材料选择和装饰元素',
    validation: (answer) => answer && answer.length > 0
  },
  {
    id: 'materialPreference',
    question: '您倾向于使用什么材料？',
    examples: '例如：石材系、木材系、混凝土系、砖石系、混合材料',
    hint: '可以指定主材料和辅助材料',
    validation: (answer) => answer && answer.length > 0
  },
  {
    id: 'specialFeatures',
    question: '有什么特殊功能或装饰需求吗？（可选）',
    examples: '例如：庭院、地下室、塔楼、阳台、喷泉、花园',
    hint: '留空表示标准建筑，可以添加多个特殊需求',
    validation: () => true // 可选问题
  }
];

/**
 * 蓝图模式状态
 */
export const BLUEPRINT_PHASES = {
  COLLECT: 'collect',           // 需求收集
  GENERATE: 'generate',          // 蓝图生成
  APPROVE: 'approve',            // 用户审批
  BUILD: 'build',                // 建造执行
  DONE: 'done'                   // 完成
};

/**
 * 使用 AI 增强蓝图生成
 * @param {Object} requirements - 用户需求
 * @param {Object} settings - 设置
 * @returns {Promise<Object>} - AI 生成的蓝图
 */
export async function generateBlueprintWithAI(requirements, settings) {
  const {
    buildingType,
    buildingScale,
    buildingStyle,
    materialPreference,
    specialFeatures
  } = requirements;

  const prompt = `你是 Minecraft 建筑蓝图设计师。根据用户需求生成详细的建筑蓝图。

**用户需求**：
- 建筑类型: ${buildingType}
- 规模: ${buildingScale}
- 风格: ${buildingStyle}
- 材料偏好: ${materialPreference}
- 特殊功能: ${specialFeatures || '无'}

**任务**：
1. 分析需求，设计合理的建筑结构
2. 生成清晰的 ASCII 俯视图（使用 # 墙体、. 地板、D 门、W 窗户、S 楼梯、+ 柱子）
3. 规划 7 个施工阶段（地基 → 主体 → 楼层 → 屋顶 → 外装 → 内装 → 景观）
4. 统计材料清单（使用真实的 Minecraft 方块名称）
5. 估算方块总数和建造时间

**重要约束**：
- 尺寸必须合理（长宽一般 10-50，高度一般 8-30）
- ASCII 图必须清晰可读，边界完整
- 材料必须是 Minecraft 1.20.1 中存在的方块
- 施工阶段必须有详细描述和方块列表
- 时间估算：500 方块 ≈ 2 分钟

请返回标准 JSON 格式的蓝图。`;

  try {
    validateAPISettings(settings);

    const result = await fetchAIResponse(
      prompt,
      settings.apiKey,
      settings.baseUrl || 'https://api.openai.com/v1',
      settings.model || 'gpt-4',
      [], // history
      null, // onChunk
      null, // currentCode
      null, // imageUrl
      null, // apiHistory
      settings // settings
    );

    const response = extractAIContent(result);

    let blueprint;
    try {
      blueprint = extractJSON(response);
    } catch (parseError) {
      console.warn('AI 返回的蓝图 JSON 解析失败，使用本地生成器:', parseError.message);
      // 降级：使用本地生成器
      blueprint = generateFullBlueprint(requirements);
    }

    // 验证蓝图
    const validation = validateBlueprint(blueprint);
    if (!validation.valid) {
      console.warn('AI 生成的蓝图不完整，使用本地生成器补全:', validation.errors);
      // 使用本地生成器作为后备
      blueprint = generateFullBlueprint(requirements);
    }

    return blueprint;

  } catch (error) {
    console.error('AI 蓝图生成失败，降级到本地生成器:', error);
    // 降级：使用本地生成器
    return generateFullBlueprint(requirements);
  }
}

/**
 * 基于蓝图生成建造代码
 * @param {Object} blueprint - 审批的蓝图
 * @param {Object} settings - 设置
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Object>} - {code: string, summary: string}
 */
export async function generateBuildCodeFromBlueprint(blueprint, settings, onProgress) {
  const { metadata, requirements, constructionPlan, materialList } = blueprint;

  const prompt = `根据以下审批的蓝图生成 VoxelBuilder 建造代码。

**蓝图信息**：
- 建筑类型: ${metadata.buildingType}
- 风格: ${metadata.style}
- 尺寸: ${metadata.size.width}×${metadata.size.depth}×${metadata.size.height}
- 预计方块数: ${metadata.estimatedBlocks}

**施工计划**（7 个阶段）：
${constructionPlan.phases.map((p, i) => `${i + 1}. ${p.name}: ${p.description}\n   主要方块: ${p.blocks.join(', ')}`).join('\n\n')}

**材料清单**：
${Object.entries(materialList).map(([block, qty]) => `- ${block}: ${qty} 个`).join('\n')}

**特殊需求**：
${requirements.specialFeatures?.join('、') || '无'}

**建造要求**：
1. 严格按照蓝图尺寸（${metadata.size.width}×${metadata.size.depth}×${metadata.size.height}）
2. 使用蓝图指定的材料（${Object.keys(materialList).slice(0, 5).join('、')}）
3. 遵循 7 个施工阶段的顺序
4. 保持 ${metadata.style} 风格的一致性
5. 添加合理的细节和装饰
6. 确保结构稳定、比例协调

**VoxelBuilder API 使用规范**：
- 使用 beginGroup(name) 和 endGroup() 组织各个施工阶段
- 使用 setPriority(phase, priority) 确保正确的建造顺序
- 地基使用 priority 1，主体使用 priority 2，依此类推
- 对称结构使用循环减少代码重复
- 细节装饰使用最高 priority（7）

请生成完整的、可执行的 VoxelBuilder JavaScript 代码。`;

  if (onProgress) {
    onProgress({ phase: 'build', message: '正在生成建造代码...', progress: 10 });
  }

  try {
    validateAPISettings(settings);

    const result = await fetchAIResponse(
      prompt,
      settings.apiKey,
      settings.baseUrl || 'https://api.openai.com/v1',
      settings.model || 'gpt-4',
      [], // history
      null, // onChunk
      null, // currentCode
      null, // imageUrl
      null, // apiHistory
      settings // settings
    );

    const response = extractAIContent(result);

    if (onProgress) {
      onProgress({ phase: 'build', message: '建造代码生成完成', progress: 100 });
    }

    // 提取代码块
    const code = extractCodeBlock(response);

    if (!code || code.length < 10) {
      throw new Error('生成的建造代码为空或过短');
    }

    return {
      code,
      summary: `已生成 ${metadata.buildingType}（${metadata.style} 风格）的建造代码`
    };

  } catch (error) {
    const friendlyError = createUserFriendlyError('build', error);
    console.error('建造代码生成失败:', friendlyError);
    throw new Error(friendlyError);
    throw new Error(`建造代码生成失败: ${error.message}`);
  }
}

/**
 * 执行完整的蓝图模式工作流
 * @param {Object} requirements - 用户需求（来自问答）
 * @param {Object} settings - 设置
 * @param {Object} callbacks - 回调函数
 * @returns {Promise<Object>} - 工作流结果
 */
export async function executeBlueprintWorkflow(requirements, settings, callbacks = {}) {
  const {
    onPhaseChange,      // (phase) => void
    onProgress,         // ({phase, message, progress}) => void
    onBlueprintReady,   // (blueprint) => Promise<decision>
    onComplete,         // (result) => void
    onError            // (error) => void
  } = callbacks;

  try {
    // Phase 1: 生成蓝图
    if (onPhaseChange) onPhaseChange(BLUEPRINT_PHASES.GENERATE);
    if (onProgress) onProgress({ phase: 'generate', message: '正在生成蓝图...', progress: 20 });

    const blueprint = await generateBlueprintWithAI(requirements, settings);

    if (onProgress) onProgress({ phase: 'generate', message: '蓝图生成完成', progress: 40 });

    // Phase 2: 用户审批
    if (onPhaseChange) onPhaseChange(BLUEPRINT_PHASES.APPROVE);
    if (!onBlueprintReady) {
      throw new Error('缺少 onBlueprintReady 回调');
    }

    const decision = await onBlueprintReady(blueprint);

    if (decision.action === 'cancel') {
      return {
        status: 'cancelled',
        message: '用户取消了建造',
        feedback: decision.feedback
      };
    }

    if (decision.action === 'modify') {
      return {
        status: 'modify',
        message: '用户要求修改蓝图',
        feedback: decision.feedback
      };
    }

    // Phase 3: 执行建造
    if (onPhaseChange) onPhaseChange(BLUEPRINT_PHASES.BUILD);
    if (onProgress) onProgress({ phase: 'build', message: '开始建造...', progress: 60 });

    const buildResult = await generateBuildCodeFromBlueprint(blueprint, settings, onProgress);

    if (onProgress) onProgress({ phase: 'build', message: '建造完成', progress: 100 });

    // Phase 4: 完成
    if (onPhaseChange) onPhaseChange(BLUEPRINT_PHASES.DONE);

    const result = {
      status: 'success',
      blueprint,
      code: buildResult.code,
      summary: buildResult.summary
    };

    if (onComplete) onComplete(result);

    return result;

  } catch (error) {
    console.error('蓝图工作流执行失败:', error);
    if (onError) onError(error);
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * 修改蓝图
 * @param {Object} blueprint - 原蓝图
 * @param {Object} modifications - 修改内容
 * @returns {Object} - 修改后的蓝图
 */
export function modifyBlueprint(blueprint, modifications) {
  const modified = JSON.parse(JSON.stringify(blueprint)); // 深拷贝

  if (modifications.size) {
    modified.metadata.size = { ...modified.metadata.size, ...modifications.size };
  }

  if (modifications.materials) {
    // 重新生成材料清单
    modified.materialList = estimateMaterialList(modified.metadata.size, modifications.materials);
  }

  if (modifications.style) {
    modified.metadata.style = modifications.style;
    modified.requirements.style = modifications.style;
    // 重新生成施工计划
    modified.constructionPlan.phases = generateConstructionPlan(
      modifications.style,
      Object.keys(modified.materialList)
    );
  }

  // 重新估算方块数
  modified.metadata.estimatedBlocks = Object.values(modified.materialList).reduce(
    (sum, qty) => sum + qty,
    0
  );

  return modified;
}
