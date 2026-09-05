/**
 * preciseModificationEngine.js - 精确修改模式工作流引擎
 *
 * 用于建筑群中的局部修改，提供：
 * 1. 周边建筑风格分析
 * 2. 边界融合处理
 * 3. 多阶段修改工作流
 * 4. 风格一致性保证
 */

import { fetchAIResponse } from './ai.js';
import {
  extractAIContent,
  extractJSON,
  extractCodeBlock,
  formatAIError,
  validateAPISettings,
  createUserFriendlyError
} from './errorHandling.js';

/**
 * 阶段1：分析选中区域和周边环境
 * @param {Array} regionBlocks - 区域内的方块
 * @param {Array} surroundingBlocks - 周边方块（扩展2-3格）
 * @param {Object} bounds - 区域边界
 * @returns {Promise<Object>} - 分析结果
 */
export async function analyzeRegionAndContext(regionBlocks, surroundingBlocks, bounds, settings) {
  // 验证 API 设置
  validateAPISettings(settings);

  const prompt = `你是 Minecraft 建筑分析专家。分析选中区域和周边环境。

**选中区域**：
- 坐标范围: (${bounds.min.x}, ${bounds.min.y}, ${bounds.min.z}) 到 (${bounds.max.x}, ${bounds.max.y}, ${bounds.max.z})
- 尺寸: ${bounds.size.x}×${bounds.size.y}×${bounds.size.z}
- 方块数量: ${regionBlocks.length}

**区域内主要材料**：
${analyzeMaterials(regionBlocks)}

**周边环境**：
- 周边方块数量: ${surroundingBlocks.length}
${surroundingBlocks.length > 0 ? `- 周边主要材料:\n${analyzeMaterials(surroundingBlocks)}` : '- 周边无建筑'}

**任务**：
1. 识别选中区域的建筑类型（房屋/塔楼/城墙/装饰等）
2. 分析建筑风格（中世纪/现代/东方/幻想等）
3. 识别周边建筑的风格特征
4. 分析区域与周边的连接关系（独立/连接/嵌入）
5. 评估修改时需要注意的约束（保持风格/保留连接/材料一致）

返回 JSON 格式：
{
  "buildingType": "建筑类型",
  "detectedStyle": "检测到的风格",
  "surroundingStyle": "周边风格",
  "connectionType": "独立|连接|嵌入",
  "constraints": ["约束1", "约束2"],
  "recommendations": ["建议1", "建议2"]
}`;

  try {
    const result = await fetchAIResponse(
      prompt,
      settings.apiKey,
      settings.baseUrl || 'https://api.openai.com/v1',
      settings.model || 'gpt-4',
      []
    );

    const response = extractAIContent(result);

    // 尝试解析 JSON
    try {
      return extractJSON(response);
    } catch (parseError) {
      console.warn('分析结果 JSON 解析失败，使用默认分析:', parseError.message);
      return {
        buildingType: '未知建筑',
        detectedStyle: '混合风格',
        surroundingStyle: '混合风格',
        connectionType: '独立',
        constraints: ['保持现有尺寸', '使用类似材料'],
        recommendations: ['建议保持风格一致性']
      };
    }
  } catch (error) {
    const friendlyError = createUserFriendlyError('analyze', error);
    console.error('区域分析失败:', friendlyError);
    throw new Error(friendlyError);
  }
}

/**
 * 阶段2：规划修改方案
 * @param {Object} analysis - 分析结果
 * @param {string} userRequest - 用户修改需求
 * @param {Object} bounds - 区域边界
 * @returns {Promise<Object>} - 修改计划
 */
export async function planModification(analysis, userRequest, bounds, settings) {
  validateAPISettings(settings);

  const prompt = `基于分析结果，规划建筑修改方案。

**当前建筑分析**：
- 类型: ${analysis.buildingType}
- 风格: ${analysis.detectedStyle}
- 周边风格: ${analysis.surroundingStyle}
- 连接类型: ${analysis.connectionType}

**修改约束**：
${analysis.constraints.map(c => `- ${c}`).join('\n')}

**用户需求**：
${userRequest}

**区域信息**：
- 尺寸: ${bounds.size.x}×${bounds.size.y}×${bounds.size.z}
- 坐标: (${bounds.min.x}, ${bounds.min.y}, ${bounds.min.z}) 到 (${bounds.max.x}, ${bounds.max.y}, ${bounds.max.z})

**任务**：
设计详细的修改计划，确保：
1. 满足用户需求
2. 保持与周边建筑的风格一致性
3. 处理好边界连接
4. 尊重约束条件

返回 JSON 格式：
{
  "summary": "修改概述（1-2句话）",
  "steps": [
    {
      "phase": "阶段名称",
      "description": "详细描述",
      "materials": ["主要材料1", "主要材料2"]
    }
  ],
  "styleNotes": "风格保持要点",
  "boundaryHandling": "边界处理说明",
  "estimatedBlocks": 估算方块数
}`;

  try {
    const result = await fetchAIResponse(
      prompt,
      settings.apiKey,
      settings.baseUrl || 'https://api.openai.com/v1',
      settings.model || 'gpt-4',
      []
    );

    const response = extractAIContent(result);

    try {
      return extractJSON(response);
    } catch (parseError) {
      console.warn('修改计划 JSON 解析失败，使用简化计划:', parseError.message);
      return {
        summary: '根据需求修改选中区域',
        steps: [
          { phase: '清理', description: '清理现有结构', materials: ['air'] },
          { phase: '重建', description: '按需求重建', materials: ['stone', 'wood'] }
        ],
        styleNotes: `保持 ${analysis.detectedStyle} 风格`,
        boundaryHandling: '保持边界连接',
        estimatedBlocks: bounds.size.x * bounds.size.y * bounds.size.z * 0.4
      };
    }
  } catch (error) {
    const friendlyError = createUserFriendlyError('plan', error);
    console.error('修改规划失败:', friendlyError);
    throw new Error(friendlyError);
  }
}

/**
 * 阶段3：生成修改代码
 * @param {Object} plan - 修改计划
 * @param {Object} analysis - 分析结果
 * @param {Array} preservedBlocks - 区域外需要保留的方块
 * @param {Object} bounds - 区域边界
 * @returns {Promise<string>} - VoxelBuilder 代码
 */
export async function generateModificationCode(plan, analysis, preservedBlocks, bounds, settings) {
  validateAPISettings(settings);

  const prompt = `生成精确的 VoxelBuilder 修改代码。

**修改计划**：
${plan.summary}

**施工步骤**：
${plan.steps.map((s, i) => `${i + 1}. ${s.phase}: ${s.description}\n   材料: ${s.materials.join(', ')}`).join('\n\n')}

**风格要求**：
${plan.styleNotes}

**边界处理**：
${plan.boundaryHandling}

**区域范围**：
- 坐标: (${bounds.min.x}, ${bounds.min.y}, ${bounds.min.z}) 到 (${bounds.max.x}, ${bounds.max.y}, ${bounds.max.z})
- 尺寸: ${bounds.size.x}×${bounds.size.y}×${bounds.size.z}

**重要约束**：
1. 只修改选中区域 (${bounds.min.x}~${bounds.max.x}, ${bounds.min.y}~${bounds.max.y}, ${bounds.min.z}~${bounds.max.z})
2. 区域外已有 ${preservedBlocks.length} 个方块，这些方块将自动保留，无需在代码中重建
3. 保持 ${analysis.detectedStyle} 风格
4. 确保与周边建筑（${analysis.surroundingStyle}）协调

**VoxelBuilder API 提醒**：
- 使用 builder.setBlock(x, y, z, blockType) 放置方块
- 使用 builder.fill(x1, y1, z1, x2, y2, z2, blockType) 填充区域
- 使用 builder.beginGroup(name) 和 endGroup() 组织代码
- 坐标使用绝对坐标（基于区域范围）

请生成完整的、可执行的 JavaScript 代码。`;

  try {
    const result = await fetchAIResponse(
      prompt,
      settings.apiKey,
      settings.baseUrl || 'https://api.openai.com/v1',
      settings.model || 'gpt-4',
      []
    );

    const response = extractAIContent(result);

    // 提取代码块
    const code = extractCodeBlock(response);

    if (!code || code.length < 10) {
      throw new Error('生成的代码为空或过短');
    }

    return code;
  } catch (error) {
    const friendlyError = createUserFriendlyError('generate', error);
    console.error('代码生成失败:', friendlyError);
    throw new Error(friendlyError);
  }
}

/**
 * 执行完整的精确修改工作流
 * @param {Object} params - 参数对象
 * @returns {Promise<Object>} - 修改结果
 */
export async function executePreciseModificationWorkflow({
  regionBlocks,
  surroundingBlocks,
  preservedBlocks,
  bounds,
  userRequest,
  settings,
  onProgress
}) {
  try {
    // 阶段1: 分析
    if (onProgress) onProgress({ phase: 'analyze', message: '正在分析区域和周边环境...', progress: 10 });

    const analysis = await analyzeRegionAndContext(
      regionBlocks,
      surroundingBlocks,
      bounds,
      settings
    );

    if (onProgress) onProgress({ phase: 'analyze', message: '环境分析完成', progress: 30 });

    // 阶段2: 规划
    if (onProgress) onProgress({ phase: 'plan', message: '正在规划修改方案...', progress: 40 });

    const plan = await planModification(
      analysis,
      userRequest,
      bounds,
      settings
    );

    if (onProgress) onProgress({ phase: 'plan', message: '修改计划生成完成', progress: 60 });

    // 阶段3: 生成代码
    if (onProgress) onProgress({ phase: 'generate', message: '正在生成修改代码...', progress: 70 });

    const code = await generateModificationCode(
      plan,
      analysis,
      preservedBlocks,
      bounds,
      settings
    );

    if (onProgress) onProgress({ phase: 'generate', message: '代码生成完成', progress: 100 });

    return {
      success: true,
      analysis,
      plan: {
        ...plan,
        code // 将生成的代码包含在计划中
      }
    };

  } catch (error) {
    console.error('精确修改工作流失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 辅助函数：分析材料分布
 */
function analyzeMaterials(blocks) {
  const materialCount = {};

  blocks.forEach(block => {
    const type = block.blockType || 'unknown';
    materialCount[type] = (materialCount[type] || 0) + 1;
  });

  // 排序并取前5个
  const sorted = Object.entries(materialCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sorted.length === 0) {
    return '  - 无方块';
  }

  return sorted
    .map(([type, count]) => `  - ${type}: ${count} 个`)
    .join('\n');
}

/**
 * 提取周边方块（扩展指定距离）
 * @param {Array} allBlocks - 所有方块
 * @param {Object} bounds - 区域边界
 * @param {number} distance - 扩展距离（默认3格）
 * @returns {Array} - 周边方块
 */
export function extractSurroundingBlocks(allBlocks, bounds, distance = 3) {
  return allBlocks.filter(block => {
    const [x, y, z] = block.position;

    // 在扩展范围内
    const inExpandedRange = (
      x >= bounds.min.x - distance && x <= bounds.max.x + distance &&
      y >= bounds.min.y - distance && y <= bounds.max.y + distance &&
      z >= bounds.min.z - distance && z <= bounds.max.z + distance
    );

    // 但不在选中区域内
    const inSelectedRange = (
      x >= bounds.min.x && x <= bounds.max.x &&
      y >= bounds.min.y && y <= bounds.max.y &&
      z >= bounds.min.z && z <= bounds.max.z
    );

    return inExpandedRange && !inSelectedRange;
  });
}
