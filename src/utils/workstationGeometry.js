/**
 * 特殊方块渲染器 - Part 6: 工作站方块
 * 包括：工作台、附魔台、酿造台、铁砧等
 */

import * as THREE from 'three';

/**
 * 工作站方块列表
 */
export const WORKSTATION_BLOCKS = [
  'crafting_table', 'enchanting_table', 'brewing_stand', 'anvil',
  'smithing_table', 'fletching_table', 'cartography_table',
  'loom', 'grindstone', 'stonecutter', 'lectern',
  'composter', 'cauldron'
];

/**
 * 创建工作台几何体（标准立方体）
 */
export function createCraftingTableGeometry() {
  return new THREE.BoxGeometry(1, 1, 1);
}

/**
 * 创建附魔台几何体
 */
export function createEnchantingTableGeometry() {
  const group = new THREE.Group();

  // 底座：16x12x16 = 1 x 0.75 x 1
  const baseGeometry = new THREE.BoxGeometry(1, 0.75, 1);
  const base = new THREE.Mesh(baseGeometry);
  base.position.y = -0.125;
  group.add(base);

  // 书本（装饰，可选）
  const bookGeometry = new THREE.BoxGeometry(0.5, 0.125, 0.5);
  const book = new THREE.Mesh(bookGeometry);
  book.position.y = 0.3125;
  group.add(book);

  return mergeGroup(group);
}

/**
 * 创建酿造台几何体
 */
export function createBrewingStandGeometry() {
  const group = new THREE.Group();

  // 底座：8x2x8 = 0.5 x 0.125 x 0.5
  const baseGeometry = new THREE.BoxGeometry(0.5, 0.125, 0.5);
  const base = new THREE.Mesh(baseGeometry);
  base.position.y = -0.4375;
  group.add(base);

  // 中心杆：2x14x2 = 0.125 x 0.875 x 0.125
  const rodGeometry = new THREE.BoxGeometry(0.125, 0.875, 0.125);
  const rod = new THREE.Mesh(rodGeometry);
  rod.position.y = 0;
  group.add(rod);

  return mergeGroup(group);
}

/**
 * 创建铁砧几何体
 */
export function createAnvilGeometry(facing = 'north') {
  const group = new THREE.Group();

  // 底座：16x4x12 = 1 x 0.25 x 0.75
  const baseGeometry = new THREE.BoxGeometry(1, 0.25, 0.75);
  const base = new THREE.Mesh(baseGeometry);
  base.position.y = -0.375;
  group.add(base);

  // 中间部分：12x5x10 = 0.75 x 0.3125 x 0.625
  const middleGeometry = new THREE.BoxGeometry(0.75, 0.3125, 0.625);
  const middle = new THREE.Mesh(middleGeometry);
  middle.position.y = -0.09375;
  group.add(middle);

  // 顶部：16x3x10 = 1 x 0.1875 x 0.625
  const topGeometry = new THREE.BoxGeometry(1, 0.1875, 0.625);
  const top = new THREE.Mesh(topGeometry);
  top.position.y = 0.15625;
  group.add(top);

  // 根据朝向旋转
  const rotation = getFacingRotation(facing);
  group.rotation.y = rotation;

  return mergeGroup(group);
}

/**
 * 创建大锅几何体
 */
export function createCauldronGeometry() {
  const group = new THREE.Group();

  // 外壁（使用 4 个面）
  const wallThickness = 0.125;
  const height = 0.625;
  const width = 0.875;

  // 北墙
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThickness));
  northWall.position.set(0, -0.1875, -width / 2 + wallThickness / 2);
  group.add(northWall);

  // 南墙
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThickness));
  southWall.position.set(0, -0.1875, width / 2 - wallThickness / 2);
  group.add(southWall);

  // 东墙
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, width));
  eastWall.position.set(width / 2 - wallThickness / 2, -0.1875, 0);
  group.add(eastWall);

  // 西墙
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, width));
  westWall.position.set(-width / 2 + wallThickness / 2, -0.1875, 0);
  group.add(westWall);

  // 底部
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(width - wallThickness * 2, wallThickness, width - wallThickness * 2));
  bottom.position.y = -0.4375;
  group.add(bottom);

  return mergeGroup(group);
}

/**
 * 判断是否为工作站方块
 */
export function isWorkstationBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return WORKSTATION_BLOCKS.some(ws => cleanType.includes(ws));
}

function getFacingRotation(facing) {
  switch (facing) {
    case 'north': return 0;
    case 'east': return Math.PI / 2;
    case 'south': return Math.PI;
    case 'west': return -Math.PI / 2;
    default: return 0;
  }
}

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
