/**
 * 栅栏和围墙几何体生成器
 * 支持 12 个栅栏 + 61 个围墙的动态连接渲染
 */

import * as THREE from 'three';

/**
 * 创建栅栏几何体（带连接逻辑）
 * @param {Object} connections - 连接状态 { north, south, east, west }
 * @returns {THREE.BufferGeometry} 栅栏几何体
 */
export function createFenceGeometry(connections = {}) {
  const group = new THREE.Group();

  // 中心柱 (4x16x4 像素 = 0.25x1x0.25 方块)
  const centerPost = new THREE.BoxGeometry(0.25, 1, 0.25);
  const centerMesh = new THREE.Mesh(centerPost);
  group.add(centerMesh);

  // 添加连接横杆
  // 每个方向有两根横杆（上下各一根）
  if (connections.north) {
    addFenceRail(group, 'north');
  }
  if (connections.south) {
    addFenceRail(group, 'south');
  }
  if (connections.east) {
    addFenceRail(group, 'east');
  }
  if (connections.west) {
    addFenceRail(group, 'west');
  }

  // 合并几何体
  return mergeGroup(group);
}

/**
 * 创建围墙几何体（带连接逻辑）
 * @param {Object} connections - 连接状态 { north, south, east, west, up }
 * @returns {THREE.BufferGeometry} 围墙几何体
 */
export function createWallGeometry(connections = {}) {
  const group = new THREE.Group();

  // 围墙的高度取决于是否有连接
  const hasAnyConnection = connections.north || connections.south ||
                          connections.east || connections.west;

  // 中心柱
  // 无连接时：8x16x8 = 0.5x1x0.5
  // 有连接时：8x16x8 = 0.5x1x0.5（高度相同）
  const centerPost = new THREE.BoxGeometry(0.5, 1, 0.5);
  const centerMesh = new THREE.Mesh(centerPost);

  // 如果有连接，柱子可能更高（up 属性）
  if (connections.up) {
    centerMesh.scale.y = 1.5; // 加高
    centerMesh.position.y = 0.25;
  }

  group.add(centerMesh);

  // 添加连接墙段
  if (connections.north) {
    addWallSegment(group, 'north');
  }
  if (connections.south) {
    addWallSegment(group, 'south');
  }
  if (connections.east) {
    addWallSegment(group, 'east');
  }
  if (connections.west) {
    addWallSegment(group, 'west');
  }

  return mergeGroup(group);
}

/**
 * 添加栅栏横杆
 */
function addFenceRail(group, direction) {
  // 横杆尺寸：4x3x16 像素 = 0.25x0.1875x1
  // 两根横杆：下部（y=6）和上部（y=12）

  const railGeometry = new THREE.BoxGeometry(0.25, 0.1875, 0.5);

  // 下横杆
  const lowerRail = new THREE.Mesh(railGeometry);
  lowerRail.position.y = -0.28125; // (6-8)/16

  // 上横杆
  const upperRail = new THREE.Mesh(railGeometry);
  upperRail.position.y = 0.03125; // (12-8)/16

  // 根据方向旋转和定位
  switch (direction) {
    case 'north': // -Z
      lowerRail.position.z = -0.25;
      upperRail.position.z = -0.25;
      break;
    case 'south': // +Z
      lowerRail.position.z = 0.25;
      upperRail.position.z = 0.25;
      break;
    case 'east': // +X
      lowerRail.rotation.y = Math.PI / 2;
      lowerRail.position.x = 0.25;
      upperRail.rotation.y = Math.PI / 2;
      upperRail.position.x = 0.25;
      break;
    case 'west': // -X
      lowerRail.rotation.y = Math.PI / 2;
      lowerRail.position.x = -0.25;
      upperRail.rotation.y = Math.PI / 2;
      upperRail.position.x = -0.25;
      break;
  }

  group.add(lowerRail);
  group.add(upperRail);
}

/**
 * 添加围墙段
 */
function addWallSegment(group, direction) {
  // 墙段尺寸：8x14x8 = 0.5x0.875x0.5
  const wallGeometry = new THREE.BoxGeometry(0.5, 0.875, 0.5);
  const wall = new THREE.Mesh(wallGeometry);
  wall.position.y = -0.0625; // 稍微向下偏移

  // 根据方向定位
  switch (direction) {
    case 'north': // -Z
      wall.position.z = -0.25;
      break;
    case 'south': // +Z
      wall.position.z = 0.25;
      break;
    case 'east': // +X
      wall.position.x = 0.25;
      break;
    case 'west': // -X
      wall.position.x = -0.25;
      break;
  }

  group.add(wall);
}

/**
 * 合并 Group 中的所有几何体
 */
function mergeGroup(group) {
  const geometries = [];

  group.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geo = child.geometry.clone();
      child.updateMatrix();
      geo.applyMatrix4(child.matrix);
      geometries.push(geo);
    }
  });

  if (geometries.length === 0) {
    return new THREE.BufferGeometry();
  }

  return THREE.BufferGeometryUtils.mergeGeometries(geometries);
}

/**
 * 解析栅栏/围墙连接属性
 */
export function parseFenceWallProperties(properties = {}) {
  return {
    north: properties.north === 'true' || properties.north === true,
    south: properties.south === 'true' || properties.south === true,
    east: properties.east === 'true' || properties.east === true,
    west: properties.west === 'true' || properties.west === true,
    up: properties.up === 'true' || properties.up === true // 围墙特有
  };
}

/**
 * 根据周围方块计算连接状态
 * @param {Object} block - 当前方块
 * @param {Array} allBlocks - 所有方块
 * @returns {Object} 连接状态
 */
export function calculateConnections(block, allBlocks) {
  const [x, y, z] = block.position;
  const connections = {
    north: false,
    south: false,
    east: false,
    west: false,
    up: false
  };

  // 检查四个方向的相邻方块
  const neighbors = {
    north: allBlocks.find(b => b.position[0] === x && b.position[1] === y && b.position[2] === z - 1),
    south: allBlocks.find(b => b.position[0] === x && b.position[1] === y && b.position[2] === z + 1),
    east: allBlocks.find(b => b.position[0] === x + 1 && b.position[1] === y && b.position[2] === z),
    west: allBlocks.find(b => b.position[0] === x - 1 && b.position[1] === y && b.position[2] === z)
  };

  // 判断是否应该连接
  Object.keys(neighbors).forEach(dir => {
    const neighbor = neighbors[dir];
    if (neighbor && shouldConnect(block.type, neighbor.type)) {
      connections[dir] = true;
    }
  });

  // 检查上方是否有方块（围墙特有）
  const above = allBlocks.find(b => b.position[0] === x && b.position[1] === y + 1 && b.position[2] === z);
  if (above) {
    connections.up = true;
  }

  return connections;
}

/**
 * 判断是否应该连接到相邻方块
 */
function shouldConnect(currentType, neighborType) {
  const cleanCurrent = currentType.replace(/\[.*\]/, '').toLowerCase();
  const cleanNeighbor = neighborType.replace(/\[.*\]/, '').toLowerCase();

  // 栅栏连接到栅栏、栅栏门、墙
  if (cleanCurrent.includes('fence') && !cleanCurrent.includes('fence_gate')) {
    return cleanNeighbor.includes('fence') ||
           cleanNeighbor.includes('wall') ||
           isFullBlock(cleanNeighbor);
  }

  // 墙连接到墙、栅栏、完整方块
  if (cleanCurrent.includes('wall') && !cleanCurrent.startsWith('wall_')) {
    return cleanNeighbor.includes('wall') ||
           cleanNeighbor.includes('fence') ||
           isFullBlock(cleanNeighbor);
  }

  return false;
}

/**
 * 判断是否为完整方块（可以连接）
 */
function isFullBlock(blockType) {
  // 简化判断：不是半透明、台阶、楼梯等
  const nonFullBlocks = [
    'glass', 'slab', 'stairs', 'fence', 'wall', 'door',
    'trapdoor', 'torch', 'lantern', 'button', 'pressure_plate'
  ];

  return !nonFullBlocks.some(type => blockType.includes(type));
}
