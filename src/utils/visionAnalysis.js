/**
 * visionAnalysis.js - Vision AI 建筑分析系统
 *
 * 使用 Claude 3.5 Sonnet Vision API 分析建筑截图，生成改进建议
 */

import { loadSettings } from './settingsSchema.js';

/**
 * Vision AI 分析建筑截图
 * @param {Array} screenshots - 截图数组 [{angle, label, data}]
 * @param {string} originalPrompt - 原始用户提示词
 * @param {Object} buildingInfo - 建筑信息 {bounds, center, size}
 * @returns {Promise<Object>} 分析结果
 */
export async function analyzeWithVision(screenshots, originalPrompt, buildingInfo) {
  const settings = loadSettings();
  const { apiKey, baseUrl, model } = settings;

  if (!apiKey) {
    throw new Error('API Key not configured');
  }

  // 构建分析提示词
  const analysisPrompt = buildVisionAnalysisPrompt(originalPrompt, buildingInfo);

  // 准备图片内容（仅使用前 3 张，控制成本）
  const imageContents = screenshots.slice(0, 3).map(shot => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: 'image/jpeg',
      data: shot.data.split(',')[1] // 移除 data:image/jpeg;base64, 前缀
    }
  }));

  // 构建 API 请求
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: analysisPrompt
        },
        ...imageContents
      ]
    }
  ];

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        messages,
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vision API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0]?.message?.content || '';

    // 解析分析结果
    const analysis = parseVisionAnalysis(analysisText);

    return {
      success: true,
      analysis,
      rawResponse: analysisText,
      cost: estimateCost(screenshots.length),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Vision Analysis] Error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 构建 Vision 分析提示词
 */
function buildVisionAnalysisPrompt(originalPrompt, buildingInfo) {
  return `你是一位 Minecraft 建筑专家。请分析这些建筑截图（来自不同角度），并提供专业的评估和改进建议。

**用户原始需求：**
${originalPrompt}

**建筑信息：**
- 尺寸：${buildingInfo.size.x} × ${buildingInfo.size.y} × ${buildingInfo.size.z} 方块
- 总方块数：约 ${estimateBlockCount(buildingInfo.size)} 个

**请从以下三个维度进行评估：**

1. **结构完整性（Structural Integrity）**
   - 是否有缺失的部分（墙体、屋顶、地基等）？
   - 比例是否合理？
   - 对称性如何？
   - 结构稳定性评估

2. **风格一致性（Style Consistency）**
   - 建筑风格是否符合用户需求？
   - 材料选择是否统一？
   - 造型元素是否协调？
   - 主题表达是否清晰？

3. **细节丰富度（Detail Richness）**
   - 装饰元素是否充足？
   - 层次变化是否丰富？
   - 是否有创意细节？
   - 整体视觉吸引力如何？

**输出格式（JSON）：**
\`\`\`json
{
  "overall_score": 7.5,
  "dimensions": {
    "structure": {
      "score": 8.0,
      "issues": ["屋顶右侧有明显缺口", "地基不平整"],
      "strengths": ["主体结构完整", "对称性良好"]
    },
    "style": {
      "score": 7.0,
      "issues": ["材料混用过多，缺乏统一感"],
      "strengths": ["整体风格明确", "色调协调"]
    },
    "detail": {
      "score": 7.5,
      "issues": ["窗户装饰过于简单", "缺少入口门廊"],
      "strengths": ["屋顶细节丰富", "有烟囱装饰"]
    }
  },
  "recommendations": [
    "修复屋顶右侧缺口，使用与左侧相同的瓦片",
    "统一墙体材料，建议全部使用石砖或橡木板",
    "增加窗台和窗框装饰",
    "添加入口门廊，提升整体层次感"
  ],
  "priority_fixes": [
    "屋顶缺口（高优先级）",
    "材料统一（中优先级）"
  ]
}
\`\`\`

请确保输出完整的 JSON，评分范围 0-10 分（7 分及以上为合格）。`;
}

/**
 * 解析 Vision API 返回的分析结果
 */
function parseVisionAnalysis(text) {
  try {
    // 提取 JSON 代码块
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // 尝试直接解析
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    }

    // 解析失败，返回默认结构
    console.warn('[Vision Analysis] Failed to parse JSON, using default structure');
    return {
      overall_score: 5.0,
      dimensions: {
        structure: { score: 5.0, issues: ['解析失败'], strengths: [] },
        style: { score: 5.0, issues: ['解析失败'], strengths: [] },
        detail: { score: 5.0, issues: ['解析失败'], strengths: [] }
      },
      recommendations: ['无法生成建议，请重试'],
      priority_fixes: [],
      parse_error: true,
      raw_text: text
    };
  } catch (error) {
    console.error('[Vision Analysis] Parse error:', error);
    return {
      overall_score: 5.0,
      dimensions: {
        structure: { score: 5.0, issues: ['解析错误'], strengths: [] },
        style: { score: 5.0, issues: ['解析错误'], strengths: [] },
        detail: { score: 5.0, issues: ['解析错误'], strengths: [] }
      },
      recommendations: ['解析错误，请重试'],
      priority_fixes: [],
      parse_error: true,
      error: error.message
    };
  }
}

/**
 * 根据分析结果生成改进提示词
 */
export function generateImprovementPrompt(originalPrompt, analysis) {
  const { overall_score, recommendations, priority_fixes } = analysis;

  // 如果评分已经很高，不需要改进
  if (overall_score >= 8.5) {
    return null;
  }

  // 构建改进提示词
  const improvements = [];

  if (priority_fixes && priority_fixes.length > 0) {
    improvements.push('**优先修复：**');
    priority_fixes.forEach(fix => {
      improvements.push(`- ${fix}`);
    });
  }

  if (recommendations && recommendations.length > 0) {
    improvements.push('\n**改进建议：**');
    recommendations.slice(0, 5).forEach(rec => {
      improvements.push(`- ${rec}`);
    });
  }

  return `${originalPrompt}

**AI 视觉分析反馈（当前评分 ${overall_score}/10）：**
${improvements.join('\n')}

请根据以上反馈改进建筑，重点关注优先修复项。保持原有风格的同时，修复问题并提升细节质量。`;
}

/**
 * 估算方块数量
 */
function estimateBlockCount(size) {
  return Math.round(size.x * size.y * size.z * 0.3); // 假设 30% 填充率
}

/**
 * 估算 Vision API 成本
 * @param {number} imageCount - 图片数量
 * @returns {number} 估算成本（美元）
 */
function estimateCost(imageCount) {
  // Claude 3.5 Sonnet Vision: ~$0.015 per image (1024x1024)
  return imageCount * 0.015;
}
