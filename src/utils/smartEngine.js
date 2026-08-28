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
 * @param {string} reason - 转换原因（用于日志）
 * @returns {boolean} 是否允许转换
 */
export function canTransition(fromPhase, toPhase, reason = '') {
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
// 导出供测试使用
// ============================================================

export { checkCodeTruncation };
