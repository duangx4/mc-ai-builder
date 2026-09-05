/**
 * projection.js - 体素投影计算工具（纯函数）
 *
 * 提供三视图投影（俯视/正视/侧视）和层切片功能
 */

/**
 * 计算体素数组的投影
 * @param {Array} voxels - 体素数组 [{ position: [x, y, z], type: string }]
 * @param {string} direction - 投影方向 'top' | 'front' | 'side'
 * @returns {Object} { cells: Array<{x, y, type}>, width, depth, height }
 */
export function computeProjection(voxels, direction) {
  // 空数组处理
  if (!voxels || voxels.length === 0) {
    return { cells: [], width: 0, depth: 0, height: 0 };
  }

  // 过滤空气方块和无效数据
  const validVoxels = voxels.filter(v =>
    v && v.position && Array.isArray(v.position) && v.position.length >= 3 &&
    v.type && v.type.toLowerCase() !== 'air'
  );

  if (validVoxels.length === 0) {
    return { cells: [], width: 0, depth: 0, height: 0 };
  }

  // 计算边界
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  validVoxels.forEach(v => {
    const [x, y, z] = v.position;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const depth = maxZ - minZ + 1;

  // 根据方向计算投影
  switch (direction) {
    case 'top': {
      // 俯视图：沿 Y 轴压缩，每 (x, z) 取最高方块
      const grid = new Map();
      validVoxels.forEach(v => {
        const [x, y, z] = v.position;
        const key = `${x},${z}`;
        const existing = grid.get(key);
        if (!existing || y > existing.y) {
          grid.set(key, { x, z, y, type: v.type });
        }
      });

      // 转换为 cells 数组
      const cells = Array.from(grid.values()).map(({ x, z, type }) => ({
        x: x - minX,
        y: z - minZ,
        type
      }));

      return { cells, width, depth, height };
    }

    case 'front': {
      // 正视图：从南侧看（沿 Z 轴压缩），每 (x, y) 取最前方块（z 最大）
      const grid = new Map();
      validVoxels.forEach(v => {
        const [x, y, z] = v.position;
        const key = `${x},${y}`;
        const existing = grid.get(key);
        if (!existing || z > existing.z) {
          grid.set(key, { x, y, z, type: v.type });
        }
      });

      const cells = Array.from(grid.values()).map(({ x, y, type }) => ({
        x: x - minX,
        y: y - minY,
        type
      }));

      return { cells, width, depth: height, height: depth };
    }

    case 'side': {
      // 侧视图：从东侧看（沿 X 轴压缩），每 (z, y) 取最右方块（x 最大）
      const grid = new Map();
      validVoxels.forEach(v => {
        const [x, y, z] = v.position;
        const key = `${z},${y}`;
        const existing = grid.get(key);
        if (!existing || x > existing.x) {
          grid.set(key, { x, y, z, type: v.type });
        }
      });

      const cells = Array.from(grid.values()).map(({ z, y, type }) => ({
        x: z - minZ,
        y: y - minY,
        type
      }));

      return { cells, width: depth, depth: height, height: width };
    }

    default:
      throw new Error(`Unknown projection direction: ${direction}`);
  }
}

/**
 * 获取指定高度层的切片（俯视图）
 * @param {Array} voxels - 体素数组
 * @param {number} y - Y 坐标（绝对坐标）
 * @returns {Object} { cells: Array<{x, y, type}>, width, depth }
 */
export function getLayerSlice(voxels, y) {
  if (!voxels || voxels.length === 0) {
    return { cells: [], width: 0, depth: 0 };
  }

  // 过滤空气方块和指定层的方块
  const layerVoxels = voxels.filter(v =>
    v && v.position && Array.isArray(v.position) && v.position.length >= 3 &&
    v.type && v.type.toLowerCase() !== 'air' &&
    v.position[1] === y
  );

  if (layerVoxels.length === 0) {
    return { cells: [], width: 0, depth: 0 };
  }

  // 计算边界
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  layerVoxels.forEach(v => {
    const [x, , z] = v.position;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });

  const width = maxX - minX + 1;
  const depth = maxZ - minZ + 1;

  // 构建 cells
  const cells = layerVoxels.map(v => ({
    x: v.position[0] - minX,
    y: v.position[2] - minZ,
    type: v.type
  }));

  return { cells, width, depth };
}

/**
 * 计算体素数组的边界信息
 * @param {Array} voxels - 体素数组
 * @returns {Object} { minX, maxX, minY, maxY, minZ, maxZ, width, height, depth }
 */
export function getBounds(voxels) {
  if (!voxels || voxels.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, width: 0, height: 0, depth: 0 };
  }

  const validVoxels = voxels.filter(v =>
    v && v.position && Array.isArray(v.position) && v.position.length >= 3 &&
    v.type && v.type.toLowerCase() !== 'air'
  );

  if (validVoxels.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, width: 0, height: 0, depth: 0 };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  validVoxels.forEach(v => {
    const [x, y, z] = v.position;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });

  return {
    minX, maxX, minY, maxY, minZ, maxZ,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    depth: maxZ - minZ + 1
  };
}
