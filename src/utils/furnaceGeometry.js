/**
 * 特殊方块渲染器 - Part 3: 熔炉类
 * 包括：熔炉、高炉、烟熏炉
 */

import * as THREE from 'three';

/**
 * 熔炉方块列表
 */
export const FURNACE_BLOCKS = [
  'furnace', 'blast_furnace', 'smoker'
];

/**
 * 创建熔炉几何体
 * 熔炉是一个立方体，前面有开口
 */
export function createFurnaceGeometry(facing = 'north', lit = false) {
  // 基本立方体
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  // 根据朝向旋转
  const rotation = getFacingRotation(facing);
  geometry.rotateY(rotation);

  return geometry;
}

/**
 * 判断是否为熔炉
 */
export function isFurnaceBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return FURNACE_BLOCKS.some(furnace => cleanType.includes(furnace));
}

/**
 * 解析熔炉属性
 */
export function parseFurnaceProperties(properties = {}) {
  return {
    facing: properties.facing || 'north',
    lit: properties.lit === 'true' || properties.lit === true
  };
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
