/**
 * 分区构建引擎 (Partition Build Engine)
 * 
 * 功能：
 * - partitionPlan: 递归细分大区块
 * - diffBlocks: 差异检测（只重建受影响区块）
 * - mergeBlockCodes: 合并区块代码
 * - runPartitionedBuild: 并行编排构建
 */

// ============================================================
// 1. 分区规划：递归细分 (partitionPlan)
// ============================================================

/**
 * 递归细分建筑区块
 * 
 * 规则：
 * - 任一维度 > maxBlockSize → 递归细分
 * - 按最大维度切分（2~6 等分）
 * - 达到 maxDepth 或尺寸达标 → 叶子节点
 * - 子区块精确覆盖父区块（无缝隙）
 * 
 * @param {Object} plan - parseBuildingPlan 后的 plan
 * @param {Object} options - 配置选项
 * @param {number} options.maxBlockSize - 最大区块尺寸（默认 24）
 * @param {number} options.maxDepth - 最大递归深度（默认 2）
 * @param {number} options.minChildren - 最小子区块数（默认 2）
 * @param {number} options.maxChildren - 最大子区块数（默认 6）
 * @returns {Array} 任务队列 { id, name, position, size, materials, notes, parent, depth, dependencies }[]
 */
export function partitionPlan(plan, options = {}) {
  const {
    maxBlockSize = 24,
    maxDepth = 2,
    minChildren = 2,
    maxChildren = 6
  } = options;

  if (!plan || !plan.blocks || plan.blocks.length === 0) {
    return [];
  }

  const tasks = [];
  let taskIdCounter = 0;

  /**
   * 递归细分单个区块
   */
  function subdivideBlock(block, currentDepth, parentId = null) {
    const { id, name, position, size, materials, notes } = block;
    
    // 确保 position 和 size 都是数组
    const pos = Array.isArray(position) ? position : [0, 0, 0];
    const blockSize = Array.isArray(size) ? size : [10, 10, 10];
    
    // 检查是否需要细分
    const maxDim = Math.max(...blockSize);
    const needsSubdivision = maxDim > maxBlockSize && currentDepth < maxDepth;

    if (!needsSubdivision) {
      // 叶子节点：直接添加为任务
      tasks.push({
        id: id || `task_${taskIdCounter++}`,
        name: name || 'unnamed',
        position: pos,
        size: blockSize,
        materials: materials || [],
        notes: notes || '',
        parent: parentId,
        depth: currentDepth,
        dependencies: []
      });
      return;
    }

    // 需要细分：找到最大维度
    const maxDimIndex = blockSize.indexOf(maxDim);
    const dimNames = ['width', 'height', 'depth'];

    // 决定子区块数量（2~6 之间，优先 2 或 3）
    let numChildren;
    if (maxDim <= maxBlockSize * 1.5) {
      numChildren = minChildren; // 接近阈值，只分 2 块
    } else if (maxDim <= maxBlockSize * 2.5) {
      numChildren = 3;
    } else if (maxDim <= maxBlockSize * 4) {
      numChildren = 4;
    } else {
      numChildren = Math.min(maxChildren, Math.ceil(maxDim / maxBlockSize));
    }

    // 沿最大维度均匀切分
    const childSize = Math.floor(maxDim / numChildren);
    const remainder = maxDim % numChildren;

    const children = [];
    for (let i = 0; i < numChildren; i++) {
      const childPos = [...pos];
      const childBlockSize = [...blockSize];

      // 当前子块在该维度上的起始位置
      let offset = i * childSize;
      
      // 分配余数（前 remainder 个子块多分 1）
      if (i < remainder) {
        offset += i;
        childBlockSize[maxDimIndex] = childSize + 1;
      } else {
        offset += remainder;
        childBlockSize[maxDimIndex] = childSize;
      }

      childPos[maxDimIndex] += offset;

      const childId = `${id}__${i}`;
      const childName = `${name}_${dimNames[maxDimIndex]}_${i}`;

      children.push({
        id: childId,
        name: childName,
        position: childPos,
        size: childBlockSize,
        materials: materials || [],
        notes: notes || '',
        parent: id,
        depth: currentDepth + 1
      });
    }

    // 递归处理子区块
    for (const child of children) {
      subdivideBlock(child, currentDepth + 1, id);
    }
  }

  // 处理所有顶层区块
  for (const block of plan.blocks) {
    subdivideBlock(block, 0, null);
  }

  return tasks;
}

// ============================================================
// 2. 差异检测：只重建受影响区块 (diffBlocks)
// ============================================================

/**
 * 比较新旧规划，识别需要重建/新建/删除的区块
 * 
 * 规则：
 * - 同 id 且 size/position/materials 一致 → skip
 * - 同 id 但参数变化 → rebuild
 * - 新 id → create
 * - 消失的 id → remove
 * 
 * @param {Array} prevPlan - 旧的任务列表（partitionPlan 输出）
 * @param {Array} nextPlan - 新的任务列表（partitionPlan 输出）
 * @returns {Object} { rebuild: [], create: [], remove: [], skip: [] }
 */
export function diffBlocks(prevPlan, nextPlan) {
  const result = {
    rebuild: [],
    create: [],
    remove: [],
    skip: []
  };

  if (!Array.isArray(prevPlan)) prevPlan = [];
  if (!Array.isArray(nextPlan)) nextPlan = [];

  // 构建 id 映射
  const prevMap = new Map(prevPlan.map(b => [b.id, b]));
  const nextMap = new Map(nextPlan.map(b => [b.id, b]));

  // 检查新规划中的区块
  for (const nextBlock of nextPlan) {
    const prevBlock = prevMap.get(nextBlock.id);

    if (!prevBlock) {
      // 新增区块
      result.create.push(nextBlock);
    } else {
      // 检查是否有变化
      const changed = !isBlockEqual(prevBlock, nextBlock);
      
      if (changed) {
        result.rebuild.push(nextBlock);
      } else {
        result.skip.push(nextBlock);
      }
    }
  }

  // 检查旧规划中消失的区块
  for (const prevBlock of prevPlan) {
    if (!nextMap.has(prevBlock.id)) {
      result.remove.push(prevBlock);
    }
  }

  return result;
}

/**
 * 比较两个区块是否相等（深度比较关键字段）
 */
function isBlockEqual(block1, block2) {
  // 比较 position
  if (!arraysEqual(block1.position, block2.position)) return false;
  
  // 比较 size
  if (!arraysEqual(block1.size, block2.size)) return false;
  
  // 比较 materials
  if (!arraysEqual(block1.materials, block2.materials)) return false;
  
  return true;
}

/**
 * 比较两个数组是否相等
 */
function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}

// ============================================================
// 3. 代码合并：mergeBlockCodes
// ============================================================

import { executeVoxelScript } from './sandbox.js';

/**
 * 从代码中提取区块代码片段（基于标记）
 *
 * 约定：区块代码应该被 // BLOCK <id> START 和 // BLOCK <id> END 标记包裹
 *
 * @param {string} code - 完整代码
 * @param {string} blockId - 区块 ID
 * @returns {string|null} 区块代码片段，未找到返回 null
 */
export function extractBlockCode(code, blockId) {
  if (!code || !blockId) return null;

  const startMarker = `// BLOCK ${blockId} START`;
  const endMarker = `// BLOCK ${blockId} END`;

  const startIdx = code.indexOf(startMarker);
  const endIdx = code.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return null;
  }

  // 提取标记之间的代码（包含标记）
  return code.substring(startIdx, endIdx + endMarker.length);
}

/**
 * 合并多个区块代码为完整代码
 *
 * 策略：
 * - 每个区块代码应该包裹在函数或 IIFE 中
 * - 合并顺序：文件头（公共 utils/常量）→ 各区块函数 → 主函数依次调用
 * - 使用区块标记：// BLOCK <id> START/END
 * - 冲突兜底：dedupeTopLevelConsts（需要从 sandbox 导入）
 * - 干跑验证：executeVoxelScript
 *
 * @param {Array} blockResults - 区块构建结果 [{ id, code, success, error? }]
 * @param {Object} options - 选项 { skipValidation?: boolean, oldCode?: string }
 * @returns {Object} { code, warnings, valid }
 */
export function mergeBlockCodes(blockResults, options = {}) {
  const { skipValidation = false, oldCode = null } = options;
  const warnings = [];

  if (!Array.isArray(blockResults) || blockResults.length === 0) {
    return { code: '', warnings: ['No block results to merge'], valid: false };
  }

  // 过滤出成功的区块
  const successfulBlocks = blockResults.filter(b => b.success && b.code);

  if (successfulBlocks.length === 0) {
    return {
      code: '',
      warnings: ['No successful blocks to merge'],
      valid: false
    };
  }

  // 如果有旧代码，尝试提取 skip 区块的代码
  const codeSegments = [];
  const processedIds = new Set();

  // 处理新生成的区块
  for (const block of successfulBlocks) {
    if (processedIds.has(block.id)) {
      warnings.push(`Duplicate block id: ${block.id}`);
      continue;
    }

    // 添加区块标记
    const markedCode = `// BLOCK ${block.id} START\n${block.code}\n// BLOCK ${block.id} END`;
    codeSegments.push(markedCode);
    processedIds.add(block.id);
  }

  // 如果提供了旧代码，尝试提取 skip 区块（未在新结果中的区块）
  if (oldCode) {
    // 从旧代码中查找所有区块标记
    const blockMarkerRegex = /\/\/ BLOCK (\S+) START/g;
    let match;

    while ((match = blockMarkerRegex.exec(oldCode)) !== null) {
      const oldBlockId = match[1];

      // 如果这个区块没有被重新生成，保留旧代码
      if (!processedIds.has(oldBlockId)) {
        const oldBlockCode = extractBlockCode(oldCode, oldBlockId);
        if (oldBlockCode) {
          codeSegments.push(oldBlockCode);
          processedIds.add(oldBlockId);
        } else {
          warnings.push(`Could not extract old code for block: ${oldBlockId}`);
        }
      }
    }
  }

  // 合并所有代码段
  let mergedCode = codeSegments.join('\n\n');

  // 去重顶层 const 声明（防止冲突）
  // 注意：需要在运行时动态导入，因为 sandbox.js 可能还未加载
  try {
    // 尝试使用 dedupeTopLevelConsts（如果可用）
    // 由于我们不能直接导入 dedupeTopLevelConsts（它不是导出的），
    // 我们需要自己实现一个简单版本或者跳过这一步
    // 这里我们实现一个简化版本
    mergedCode = dedupeTopLevelConstsLocal(mergedCode);
  } catch (e) {
    warnings.push(`Deduplication warning: ${e.message}`);
  }

  // 干跑验证（如果未跳过）
  let valid = true;
  if (!skipValidation) {
    try {
      executeVoxelScript(mergedCode, true);
    } catch (error) {
      valid = false;
      warnings.push(`Validation failed: ${error.message}`);
    }
  }

  return {
    code: mergedCode,
    warnings,
    valid
  };
}

/**
 * 本地简化版 dedupeTopLevelConsts
 * （复制自 sandbox.js 的逻辑）
 */
function dedupeTopLevelConstsLocal(code) {
  if (typeof code !== 'string' || !code.includes('builder.')) return code;

  const RE = /^const\s+([A-Za-z_$][\w$]*)\s*=/;
  const lines = code.split('\n');
  const counts = {};
  const last = {};

  // 统计每个顶层 const 变量的出现次数和最后位置
  for (let i = 0; i < lines.length; i++) {
    const m = RE.exec(lines[i]);
    if (m) {
      const varName = m[1];
      counts[varName] = (counts[varName] || 0) + 1;
      last[varName] = i;
    }
  }

  // 检查是否有重复
  let hasDup = false;
  for (const k in counts) {
    if (counts[k] > 1) {
      hasDup = true;
      break;
    }
  }

  if (!hasDup) return code;

  // 过滤掉重复的声明（保留最后一次）
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = RE.exec(lines[i]);
    if (m && counts[m[1]] > 1 && i !== last[m[1]]) {
      continue;
    }
    out.push(lines[i]);
  }

  return out.join('\n');
}

// ============================================================
// 4. 并行编排：runPartitionedBuild (第三个 commit)
// ============================================================

/**
 * 编排并行构建流程
 *
 * @param {Object} _config - 配置对象
 * @returns {Promise<Object>} { code, plan, blockResults, warnings }
 */
export async function runPartitionedBuild(_config) {
  // 占位实现，第三个 commit 完成
  throw new Error('runPartitionedBuild not implemented yet');
}
