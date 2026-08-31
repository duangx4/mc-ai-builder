/**
 * 红石和铁轨渲染器
 * 11 个方块（7 个红石 + 4 个铁轨）
 * 平面贴图渲染
 */

import * as THREE from 'three';

/**
 * 红石相关方块
 */
export const REDSTONE_BLOCKS = [
  'redstone_wire',
  'repeater', 'comparator',
  'redstone_torch', 'redstone_wall_torch',
  'lever', 'tripwire_hook'
];

/**
 * 铁轨方块
 */
export const RAIL_BLOCKS = [
  'rail', 'powered_rail', 'detector_rail', 'activator_rail'
];

/**
 * 创建平面方块几何体（用于红石、铁轨等）
 */
export function createFlatBlockGeometry() {
  // 非常薄的方块：16x1x16 = 1 x 0.0625 x 1
  const geometry = new THREE.BoxGeometry(1, 0.0625, 1);
  geometry.translate(0, -0.46875, 0); // 贴地
  return geometry;
}

/**
 * 判断是否为红石方块
 */
export function isRedstoneBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return REDSTONE_BLOCKS.some(rs => cleanType.includes(rs));
}

/**
 * 判断是否为铁轨方块
 */
export function isRailBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return RAIL_BLOCKS.some(rail => cleanType.includes(rail));
}
