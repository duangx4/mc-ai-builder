/**
 * 方块连接状态推断与校验（纯函数）
 * Block Connection Inference & Validation (Pure Functions)
 * 
 * 职责：
 * 1. inferConnections - 推断 fence/wall 方块的 4 向连接状态（n/s/e/w）
 * 2. validateBlockStates - 统计状态方块缺失 properties 的数量（观察性，不抛错）
 */

/**
 * 推断栅栏/墙方块的连接状态
 * @param {Array} blocks - 方块数组（每个元素 { position: [x,y,z], type: string, properties?: string }）
 * @returns {Map} posKey -> { n: boolean, s: boolean, e: boolean, w: boolean }
 */
export function inferConnections(blocks) {
  const connections = new Map();
  const posMap = new Map();

  // 建立位置索引
  blocks.forEach(block => {
    const [x, y, z] = block.position;
    const key = `${x},${y},${z}`;
    posMap.set(key, block);
  });

  // 判断方块是否是 fence（非 fence_gate）或 wall（非 wall_ 前缀）
  const isFence = (type) => type && type.includes('_fence') && !type.includes('fence_gate');
  const isWall = (type) => type && type.includes('_wall') && !type.startsWith('wall_');

  blocks.forEach(block => {
    const type = block.type?.toLowerCase() || '';
    
    if (!isFence(type) && !isWall(type)) {
      return; // 非栅栏/墙，跳过
    }

    const [x, y, z] = block.position;
    const key = `${x},${y},${z}`;
    
    // 检查 4 个水平邻居（同 Y）
    const neighbors = {
      n: posMap.get(`${x},${y},${z - 1}`), // North: -Z
      s: posMap.get(`${x},${y},${z + 1}`), // South: +Z
      e: posMap.get(`${x + 1},${y},${z}`), // East: +X
      w: posMap.get(`${x - 1},${y},${z}`)  // West: -X
    };

    const conn = { n: false, s: false, e: false, w: false };

    // 同族连接：fence 只连 fence，wall 只连 wall
    Object.keys(neighbors).forEach(dir => {
      const nb = neighbors[dir];
      if (!nb) return;
      
      const nbType = nb.type?.toLowerCase() || '';
      
      if (isFence(type) && isFence(nbType)) {
        conn[dir] = true;
      } else if (isWall(type) && isWall(nbType)) {
        conn[dir] = true;
      }
    });

    connections.set(key, conn);
  });

  return connections;
}

/**
 * 校验状态方块的 properties 完整性（观察性统计）
 * @param {Array} blocks - 方块数组
 * @returns {Object} { total, noFacingStairs, noConnFence, noHalfSlab, ok }
 */
export function validateBlockStates(blocks) {
  let total = blocks.length;
  let noFacingStairs = 0;
  let noConnFence = 0;
  let noHalfSlab = 0;

  blocks.forEach(block => {
    const type = block.type?.toLowerCase() || '';
    const props = block.properties || '';

    // 台阶缺 facing
    if (type.includes('_stairs') && !props.includes('facing=')) {
      noFacingStairs++;
    }

    // 栅栏/墙方块（观察：连接状态在渲染层推断，此处仅计数）
    if ((type.includes('_fence') && !type.includes('fence_gate')) ||
        (type.includes('_wall') && !type.startsWith('wall_'))) {
      // 这里不检查连接状态（渲染时动态推断），仅统计数量供参考
      // 如果有需要，可以检查是否有预设的连接属性
      // 当前实现：不认为缺失连接属性是错误
    }

    // 半砖缺 half
    if (type.includes('_slab') && !props.includes('half=')) {
      noHalfSlab++;
    }
  });

  return {
    total,
    noFacingStairs,
    noConnFence: 0, // 不作为校验项（渲染时推断）
    noHalfSlab,
    ok: noFacingStairs === 0 && noHalfSlab === 0
  };
}
