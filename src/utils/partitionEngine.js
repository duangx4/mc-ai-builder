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
// 4. 并行编排：runPartitionedBuild
// ============================================================

/**
 * 编排并行构建流程
 *
 * 流程：
 * 1. 如果有 currentCode，执行 diffBlocks 只重建受影响区块
 * 2. 受限并行构建（concurrency=2）
 * 3. 每个任务调用 smartEngine 子循环（construction→validation→refinement）
 * 4. mergeBlockCodes 合并所有区块代码
 * 5. 整体验证（executeVoxelScript 干跑）
 *
 * @param {Object} config - 配置对象
 * @param {string} config.userMessage - 用户输入
 * @param {Object} config.plan - BuildingPlan（已解析）
 * @param {Array} config.tasks - partitionPlan 输出的任务队列
 * @param {string} config.apiKey - API Key
 * @param {string} config.baseUrl - API Base URL
 * @param {string} config.model - 模型名称
 * @param {Object} config.callbacks - 回调函数集合
 * @param {string} config.currentCode - 现有代码（用于修改模式）
 * @param {string} config.imageUrl - 图片 URL
 * @param {AbortSignal} config.signal - 中止信号
 * @param {Object} config.settings - 设置对象
 * @param {Array} config.prevTasks - 上一次的任务列表（用于 diff）
 * @returns {Promise<Object>} { code, plan, blockResults, warnings, skippedCount }
 */
export async function runPartitionedBuild(config) {
  const {
    userMessage,
    plan,
    tasks,
    apiKey,
    baseUrl,
    model,
    callbacks = {},
    currentCode = null,
    imageUrl = null,
    signal = null,
    settings = {},
    prevTasks = null
  } = config;

  const warnings = [];
  const blockResults = [];
  let skippedCount = 0;

  // 并发度设置
  const concurrency = 2;

  // 通知开始分区构建
  const partitionCount = tasks.length;
  const treeDepth = Math.max(...tasks.map(t => t.depth), 0);

  callbacks.onPlan?.({
    ...plan,
    partitionCount,
    treeDepth,
    partitioned: true
  });

  callbacks.onStatus?.(`开始分区构建：${partitionCount} 个区块，深度 ${treeDepth}`);

  // 如果有现有代码和上次任务，执行 diff
  let tasksToRebuild = tasks;
  let tasksToSkip = [];

  if (currentCode && prevTasks && prevTasks.length > 0) {
    const diff = diffBlocks(prevTasks, tasks);

    tasksToRebuild = [...diff.rebuild, ...diff.create];
    tasksToSkip = diff.skip;
    skippedCount = tasksToSkip.length;

    callbacks.onStatus?.(
      `差异检测：跳过 ${skippedCount} 个未变更区块，重建 ${tasksToRebuild.length} 个区块`
    );

    // 对于 skip 的区块，尝试从旧代码中提取
    for (const task of tasksToSkip) {
      const oldBlockCode = extractBlockCode(currentCode, task.id);
      if (oldBlockCode) {
        blockResults.push({
          id: task.id,
          code: oldBlockCode,
          success: true,
          skipped: true
        });
      } else {
        warnings.push(`无法从旧代码提取区块 ${task.id}，将重新构建`);
        tasksToRebuild.push(task);
      }
    }
  }

  // 如果没有需要构建的任务
  if (tasksToRebuild.length === 0) {
    callbacks.onStatus?.('所有区块均未变更，跳过构建');

    // 直接返回旧代码
    return {
      code: currentCode || '',
      plan,
      blockResults,
      warnings,
      skippedCount
    };
  }

  // 受限并行构建
  callbacks.onStatus?.(`并行构建 ${tasksToRebuild.length} 个区块（并发度 ${concurrency}）...`);

  // 分批处理任务
  const batches = [];
  for (let i = 0; i < tasksToRebuild.length; i += concurrency) {
    batches.push(tasksToRebuild.slice(i, i + concurrency));
  }

  let completedCount = 0;

  for (const batch of batches) {
    // 检查中止信号
    if (signal?.aborted) {
      throw new Error('Build aborted by user');
    }

    // 并行构建当前批次
    const batchPromises = batch.map(task => buildSingleBlock({
      task,
      userMessage,
      plan,
      apiKey,
      baseUrl,
      model,
      callbacks,
      imageUrl,
      signal,
      settings
    }));

    const batchResults = await Promise.allSettled(batchPromises);

    // 失败自动重试一次（带上次错误，给 LLM 修正机会）
    const retryPromises = batch.map((task, i) => {
      const r = batchResults[i];
      const failed = r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success);
      if (!failed) return null;
      const prevErr = r.status === 'rejected' ? String(r.reason) : (r.value.error || 'unknown');
      callbacks.onStatus?.(`区块 ${task.id} 失败（${prevErr.slice(0, 60)}），自动重试...`);
      return buildSingleBlock({
        task,
        userMessage,
        plan,
        apiKey,
        baseUrl,
        model,
        callbacks,
        imageUrl,
        signal,
        settings,
        previousError: prevErr
      });
    }).filter(Boolean);

    const retryResults = retryPromises.length > 0 ? await Promise.allSettled(retryPromises) : [];
    let retryIdx = 0;
    for (let i = 0; i < batchResults.length; i++) {
      const r = batchResults[i];
      const task = batch[i];
      const failedFirst = r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success);
      if (failedFirst && retryResults[retryIdx]) {
        batchResults[i] = retryResults[retryIdx];
        retryIdx++;
      }
    }

    // 收集结果
    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i];
      const task = batch[i];

      if (result.status === 'fulfilled') {
        blockResults.push(result.value);

        if (result.value.success) {
          completedCount++;
          callbacks.onStatus?.(
            `区块完成 (${completedCount}/${tasksToRebuild.length}): ${task.name}`
          );
        } else {
          warnings.push(`区块 ${task.id} 构建失败: ${result.value.error || 'unknown'}`);
        }
      } else {
        warnings.push(`区块 ${task.id} 异常: ${result.reason}`);
        blockResults.push({
          id: task.id,
          code: '',
          success: false,
          error: result.reason
        });
      }
    }
  }

  // 失败比例容错：失败 >= 1/3 时整体回退常规构建（缺块建筑比回退更糟）
  const failedCount = blockResults.filter(b => !b.success).length;
  const totalCount = Math.max(1, tasksToRebuild.length);
  if (failedCount > 0 && failedCount / totalCount >= 1 / 3) {
    const err = new Error(`分区构建失败率过高（${failedCount}/${totalCount} 区块失败），回退常规构建`);
    callbacks.onStatus?.(err.message);
    throw err;
  }

  // 衔接校验与修复
  callbacks.onStatus?.('校验区块衔接...');

  const { buildAdjacencyTable, validateSeams } = await import('./adjacencyEngine.js');
  const adjacencyTable = buildAdjacencyTable(tasks);
  const seamValidation = validateSeams(tasks, plan, adjacencyTable);

  // 记录衔接问题
  const fatalSeamIssues = seamValidation.issues.filter(i => i.type === 'fatal');
  const fixableSeamIssues = seamValidation.issues.filter(i => i.type === 'fixable');
  const seamWarnings = seamValidation.issues.filter(i => i.type === 'warning');

  if (fatalSeamIssues.length > 0) {
    warnings.push(`发现 ${fatalSeamIssues.length} 个严重衔接问题（重叠/高度差过大）`);
  }

  if (fixableSeamIssues.length > 0) {
    callbacks.onStatus?.(`自动修复 ${fixableSeamIssues.length} 个衔接问题（缝隙/高度差）`);
  }

  if (seamWarnings.length > 0) {
    seamWarnings.forEach(w => warnings.push(w.message));
  }

  // 合并所有区块代码
  callbacks.onStatus?.('合并区块代码...');

  const mergeResult = mergeBlockCodes(blockResults, {
    skipValidation: false,
    oldCode: currentCode
  });

  if (mergeResult.warnings.length > 0) {
    warnings.push(...mergeResult.warnings);
  }

  // 整体验证：无主体代码（合并失败/全部区块失败）时抛出，触发上层 fallback 常规构建
  // 否则会交付「纯衔接填充代码」= 一整坨实心方块（已实测踩坑：四合院被填成 2139 块石砖）
  if (!mergeResult.valid) {
    warnings.push('合并后的代码验证失败');
    const err = new Error(`分区构建失败：${mergeResult.warnings.join('; ')}`);
    callbacks.onStatus?.(`分区构建失败，回退到常规模式: ${err.message}`);
    throw err;
  }

  // 如果有自动生成的衔接填充代码，追加到合并代码后
  let finalCode = mergeResult.code;
  if (seamValidation.fillCode) {
    finalCode = `${mergeResult.code}\n\n${seamValidation.fillCode}`;
  }

  // 熔断：SEAM FILL 填充代码占比过高（>60%）说明主体构建失败，只剩填充在堆方块
  //（已实测两次踩坑：四合院 2139 块石砖 / 台基+柱 630 块均为纯填充产物）
  const fillLen = (seamValidation.fillCode || '').length;
  const mainLen = (mergeResult.code || '').length;
  if (fillLen > 0 && mainLen > 0 && fillLen / (fillLen + mainLen) > 0.6) {
    const err = new Error(`衔接填充占比过高（填充 ${fillLen}B / 主体 ${mainLen}B），判定主体构建异常，回退常规构建`);
    callbacks.onStatus?.(err.message);
    throw err;
  }

  callbacks.onStatus?.(
    `分区构建完成：${completedCount}/${tasksToRebuild.length} 成功，跳过 ${skippedCount} 个`
  );

  // 通过 onPlan 回传衔接信息
  if (adjacencyTable.length > 0) {
    callbacks.onPlan?.({
      ...plan,
      seams: {
        edges: adjacencyTable,
        issues: seamValidation.issues,
        filled: fixableSeamIssues.length
      }
    });
  }

  return {
    code: finalCode,
    plan,
    blockResults,
    warnings,
    skippedCount,
    valid: mergeResult.valid,
    seams: {
      edges: adjacencyTable,
      issues: seamValidation.issues,
      filled: fixableSeamIssues.length
    }
  };
}

/**
 * 构建单个区块（调用简化的 smartEngine 子循环）
 *
 * @param {Object} config - 配置对象
 * @returns {Promise<Object>} { id, code, success, error? }
 */
async function buildSingleBlock(config) {
  const {
    task,
    userMessage,
    plan,
    apiKey,
    baseUrl,
    model,
    callbacks = {},
    imageUrl: _imageUrl = null,
    signal = null,
    settings = {},
    previousError = null
  } = config;

  try {
    // 构建区块专属的 prompt
    const blockPrompt = `${userMessage}

请只构建以下区块：
- ID: ${task.id}
- 名称: ${task.name}
- 位置: [${task.position.join(', ')}]
- 尺寸: [${task.size.join(', ')}] (宽×高×深)
- 材料: ${task.materials.join(', ')}
${task.notes ? `- 备注: ${task.notes}` : ''}

风格: ${plan.style || 'unknown'}
整体要求: ${plan.globalNotes || '无'}

重要：
1. 代码必须包裹在区块标记中：
   // BLOCK ${task.id} START
   你的代码
   // BLOCK ${task.id} END

2. 使用提供的位置和尺寸精确构建
3. 保持与整体风格一致
4. **严格禁止实心堆砌**：不要用大的三重循环把整个区块填成实心方块。必须按照建筑结构构建：
   - 墙体用循环构建（边缘一圈，内部留空）
   - 开口/门窗/门洞不要用方块堵死
   - 柱子/梁/屋顶按薄结构逐根/逐层放置
   - 需要中空的区域（庭院/室内/天井）保持 AIR（不要放置方块）
   - 优先使用 builder.set 逐位置精确放置，避免大范围 fill
${previousError ? `
5. 上一次构建失败，错误信息：${String(previousError).slice(0, 300)}
   请避免同类错误（尤其是：代码语法错误、引号/括号不匹配、变量未定义、漏掉部分结构）。` : ''}`;

    // 简化的构建流程（只生成代码，不进入完整的阶段循环）
    // 这里我们直接调用 AI 生成代码
    const response = await callAIForBlock({
      prompt: blockPrompt,
      apiKey,
      baseUrl,
      model,
      signal,
      settings
    });

    // 验证代码
    if (!response || !response.code) {
      throw new Error('No code generated');
    }

    // 确保代码包含区块标记
    let code = cleanBlockCode(response.code);
    if (!code.includes(`// BLOCK ${task.id} START`)) {
      code = `// BLOCK ${task.id} START\n${code}\n// BLOCK ${task.id} END`;
    }

    // 验证代码语法
    try {
      executeVoxelScript(code, true);
    } catch (validationError) {
      throw new Error(`Code validation failed: ${validationError.message}`);
    }

    return {
      id: task.id,
      code,
      success: true
    };
  } catch (error) {
    callbacks.onStatus?.(`区块 ${task.id} 失败: ${error.message}`);

    return {
      id: task.id,
      code: '',
      success: false,
      error: error.message
    };
  }
}

/**
 * 清洗区块代码：剥离模型常输出的模板头（重复 builder 声明 / import / use strict），
 * 这些会导致 executeVoxelScript 校验报 "Identifier 'builder' has already been declared"
 */
function cleanBlockCode(code) {
  let cleaned = code || '';
  // 剥离 import/export 语句
  cleaned = cleaned.replace(/^\s*(import|export)\b.*$/gm, '');
  // 剥离 builder 重复声明（const/let/var builder = ...）
  cleaned = cleaned.replace(/^\s*(const|let|var)\s+builder\b[^;]*;?$/gm, '');
  // 剥离 'use strict' 等 pragma
  cleaned = cleaned.replace(/^\s*["']use strict["'];?$/gm, '');
  // 剥离三引号代码块围栏（模型有时把代码包在 ``` 里）
  cleaned = cleaned.replace(/^```(?:javascript|js)?$/gm, '');
  return cleaned;
}

/**
 * 调用 AI 生成单个区块代码
 * （简化版，直接调用 API，不进入完整的 smartEngine 循环）
 */
async function callAIForBlock(config) {
  const {
    prompt,
    apiKey,
    baseUrl,
    model,
    signal,
    settings = {}
  } = config;

  // 导入 fetchWithRetry + CORS 代理助手
  const { fetchWithRetry } = await import('./fetchWithRetry.js');
  const { wrapRequest } = await import('./proxyHelper.js');

  const { url: reqUrl, fetchOptions } = wrapRequest(
    baseUrl,
    '/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a Minecraft building code generator. Generate JavaScript code using the VoxelBuilder API.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: settings.maxTokens || 4096
      }),
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
    throw new Error(`API Error ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // 提取代码
  const codeMatch = content.match(/```(?:javascript|js)?\n?([\s\S]*?)```/);
  const code = codeMatch ? codeMatch[1].trim() : content.trim();

  return { code };
}
