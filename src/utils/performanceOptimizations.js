/**
 * performanceOptimizations.js - 性能优化工具
 *
 * 提供方块数据处理、缓存和优化相关的工具函数
 */

/**
 * 批量处理方块数据（避免一次性处理导致卡顿）
 */
export function batchProcessBlocks(blocks, batchSize = 1000, processFn) {
  const results = [];

  for (let i = 0; i < blocks.length; i += batchSize) {
    const batch = blocks.slice(i, i + batchSize);
    const batchResults = processFn(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * 异步批量处理（不阻塞 UI）
 */
export async function batchProcessBlocksAsync(blocks, batchSize = 1000, processFn, onProgress) {
  const results = [];
  const totalBatches = Math.ceil(blocks.length / batchSize);

  for (let i = 0; i < blocks.length; i += batchSize) {
    const batch = blocks.slice(i, i + batchSize);
    const batchResults = await processFn(batch);
    results.push(...batchResults);

    if (onProgress) {
      const progress = Math.round(((i + batch.length) / blocks.length) * 100);
      onProgress(progress, i / batchSize + 1, totalBatches);
    }

    // 让出控制权，避免阻塞 UI
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
}

/**
 * 方块去重（基于位置）
 */
export function deduplicateBlocks(blocks) {
  const seen = new Set();
  return blocks.filter(block => {
    const key = `${block.position[0]},${block.position[1]},${block.position[2]}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * 创建方块位置索引（快速查找）
 */
export function createBlockIndex(blocks) {
  const index = new Map();

  blocks.forEach(block => {
    const key = `${block.position[0]},${block.position[1]},${block.position[2]}`;
    index.set(key, block);
  });

  return {
    get: (x, y, z) => index.get(`${x},${y},${z}`),
    has: (x, y, z) => index.has(`${x},${y},${z}`),
    size: () => index.size,
    clear: () => index.clear()
  };
}

/**
 * 简单的 LRU 缓存
 */
export class LRUCache {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // 移到最后（最近使用）
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  set(key, value) {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果超出大小，删除最旧的
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

/**
 * 节流函数（限制调用频率）
 */
export function throttle(fn, delay = 100) {
  let lastCall = 0;
  let timeout = null;

  return function (...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      return fn.apply(this, args);
    } else {
      // 确保最后一次调用会执行
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        lastCall = Date.now();
        fn.apply(this, args);
      }, delay - timeSinceLastCall);
    }
  };
}

/**
 * 防抖函数（延迟执行）
 */
export function debounce(fn, delay = 300) {
  let timeout = null;

  return function (...args) {
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 计算方块数据大小（估算内存占用）
 */
export function estimateBlocksMemorySize(blocks) {
  if (!blocks || blocks.length === 0) return 0;

  // 估算：每个方块约 100 字节（position[3] + blockType + metadata）
  const bytesPerBlock = 100;
  const totalBytes = blocks.length * bytesPerBlock;

  return {
    bytes: totalBytes,
    kb: Math.round(totalBytes / 1024),
    mb: (totalBytes / 1024 / 1024).toFixed(2)
  };
}

/**
 * 优化大型方块数组的更新
 */
export function optimizeBlockUpdate(oldBlocks, newBlocks, maxSize = 50000) {
  // 如果新数组过大，考虑分批更新
  if (newBlocks.length > maxSize) {
    console.warn(`[Performance] Large block update: ${newBlocks.length} blocks`);

    // 可以在这里实现分批策略
    // 目前直接返回，但可以扩展为分批更新
    return newBlocks;
  }

  return newBlocks;
}

/**
 * 计算区域边界（用于优化渲染范围）
 */
export function calculateBounds(blocks) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  blocks.forEach(block => {
    const [x, y, z] = block.position;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  });

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    size: {
      x: maxX - minX + 1,
      y: maxY - minY + 1,
      z: maxZ - minZ + 1
    },
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: (minZ + maxZ) / 2
    }
  };
}

/**
 * 性能监控工具
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }

  start(label) {
    this.metrics.set(label, {
      startTime: performance.now(),
      endTime: null,
      duration: null
    });
  }

  end(label) {
    const metric = this.metrics.get(label);
    if (!metric) {
      console.warn(`[Performance] No start time found for "${label}"`);
      return;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    console.log(`[Performance] ${label}: ${metric.duration.toFixed(2)}ms`);

    return metric.duration;
  }

  report() {
    const report = {};
    this.metrics.forEach((metric, label) => {
      if (metric.duration !== null) {
        report[label] = `${metric.duration.toFixed(2)}ms`;
      }
    });
    return report;
  }

  clear() {
    this.metrics.clear();
  }
}

/**
 * 内存清理建议
 */
export function getMemoryCleanupSuggestions(blocks, messages) {
  const suggestions = [];

  // 检查方块数量
  if (blocks.length > 100000) {
    suggestions.push({
      type: 'blocks',
      severity: 'high',
      message: `方块数量过多 (${blocks.length})，建议清理或分批处理`
    });
  } else if (blocks.length > 50000) {
    suggestions.push({
      type: 'blocks',
      severity: 'medium',
      message: `方块数量较多 (${blocks.length})，注意性能`
    });
  }

  // 检查消息数量
  if (messages.length > 100) {
    suggestions.push({
      type: 'messages',
      severity: 'medium',
      message: `对话历史较长 (${messages.length} 条)，建议清理`
    });
  }

  return suggestions;
}
