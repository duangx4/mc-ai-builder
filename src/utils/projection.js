/**
 * 投影计算工具 - 纯函数模块
 * 支持三视图投影（俯视/正视/侧视）+ 层切片
 */

/**
 * 计算体素的三维包围盒
 * @param {Array<{position: [x,y,z], type: string}>} voxels - 体素数组
 * @returns {{minX, maxX, minY, maxY, minZ, maxZ, width, height, depth}}
 */
function getBounds(voxels) {
  if (!voxels || voxels.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, width: 0, height: 0, depth: 0 };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  voxels.forEach(v => {
    if (!v.position || v.position.length < 3) return;
    const [x, y, z] = v.position;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return;
    
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });

  // 边界处理：如果没有有效体素
  if (minX === Infinity) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, width: 0, height: 0, depth: 0 };
  }

  return {
    minX, maxX, minY, maxY, minZ, maxZ,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    depth: maxZ - minZ + 1
  };
}

/**
 * 计算俯视图投影（TOP - 沿 Y 轴压缩）
 * 每个 (x,z) 位置取最高（y 最大）的方块
 * @param {Array<{position: [x,y,z], type: string}>} voxels
 * @returns {{cells: Array<{x, z, y, type}>, width, depth, height}}
 */
export function computeTopProjection(voxels) {
  if (!voxels || voxels.length === 0) {
    return { cells: [], width: 0, depth: 0, height: 0 };
  }

  const bounds = getBounds(voxels);
  const grid = new Map(); // key: "x,z" -> {type, y}

  // 遍历所有体素，每个 (x,z) 位置保留 y 最大的方块
  voxels.forEach(v => {
    if (!v.position || v.position.length < 3 || v.type === 'AIR') return;
    const [x, y, z] = v.position;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return;

    const key = `${x},${z}`;
    const existing = grid.get(key);
    if (!existing || y > existing.y) {
      grid.set(key, { type: v.type, y, x, z });
    }
  });

  // 转换为数组
  const cells = Array.from(grid.values());

  return {
    cells,
    width: bounds.width,
    depth: bounds.depth,
    height: bounds.height
  };
}

/**
 * 计算正视图投影（FRONT - 沿 Z 轴压缩，从南侧看）
 * 每个 (x,y) 位置取 z 最大的方块（最靠近观察者）
 * @param {Array<{position: [x,y,z], type: string}>} voxels
 * @returns {{cells: Array<{x, y, z, type}>, width, height, depth}}
 */
export function computeFrontProjection(voxels) {
  if (!voxels || voxels.length === 0) {
    return { cells: [], width: 0, height: 0, depth: 0 };
  }

  const bounds = getBounds(voxels);
  const grid = new Map(); // key: "x,y" -> {type, z}

  voxels.forEach(v => {
    if (!v.position || v.position.length < 3 || v.type === 'AIR') return;
    const [x, y, z] = v.position;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return;

    const key = `${x},${y}`;
    const existing = grid.get(key);
    if (!existing || z > existing.z) {
      grid.set(key, { type: v.type, z, x, y });
    }
  });

  const cells = Array.from(grid.values());

  return {
    cells,
    width: bounds.width,
    height: bounds.height,
    depth: bounds.depth
  };
}

/**
 * 计算侧视图投影（SIDE - 沿 X 轴压缩，从东侧看）
 * 每个 (z,y) 位置取 x 最大的方块（最靠右）
 * @param {Array<{position: [x,y,z], type: string}>} voxels
 * @returns {{cells: Array<{x, y, z, type}>, width, height, depth}}
 */
export function computeSideProjection(voxels) {
  if (!voxels || voxels.length === 0) {
    return { cells: [], width: 0, height: 0, depth: 0 };
  }

  const bounds = getBounds(voxels);
  const grid = new Map(); // key: "z,y" -> {type, x}

  voxels.forEach(v => {
    if (!v.position || v.position.length < 3 || v.type === 'AIR') return;
    const [x, y, z] = v.position;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return;

    const key = `${z},${y}`;
    const existing = grid.get(key);
    if (!existing || x > existing.x) {
      grid.set(key, { type: v.type, x, z, y });
    }
  });

  const cells = Array.from(grid.values());

  return {
    cells,
    width: bounds.width,
    height: bounds.height,
    depth: bounds.depth
  };
}

/**
 * 获取指定 Y 层的切片（用于俯视图层滑块）
 * @param {Array<{position: [x,y,z], type: string}>} voxels
 * @param {number} targetY - 目标层高度
 * @returns {{cells: Array<{x, z, type}>, width, depth}}
 */
export function getLayerSlice(voxels, targetY) {
  if (!voxels || voxels.length === 0) {
    return { cells: [], width: 0, depth: 0 };
  }

  const bounds = getBounds(voxels);
  const cells = [];

  voxels.forEach(v => {
    if (!v.position || v.position.length < 3 || v.type === 'AIR') return;
    const [x, y, z] = v.position;
    if (y === targetY) {
      cells.push({ x, z, type: v.type });
    }
  });

  return {
    cells,
    width: bounds.width,
    depth: bounds.depth
  };
}

/**
 * 统一投影计算接口
 * @param {Array} voxels
 * @param {'top'|'front'|'side'} direction
 * @returns {{cells: Array, width: number, height: number, depth: number}}
 */
export function computeProjection(voxels, direction) {
  switch (direction) {
    case 'top':
      return computeTopProjection(voxels);
    case 'front':
      return computeFrontProjection(voxels);
    case 'side':
      return computeSideProjection(voxels);
    default:
      throw new Error(`Unknown projection direction: ${direction}`);
  }
}
