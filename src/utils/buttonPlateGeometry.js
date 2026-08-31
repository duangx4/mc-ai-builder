/**
 * 按钮和压力板渲染器
 * 28 个方块（13 个按钮 + 15 个压力板）
 */

import * as THREE from 'three';

/**
 * 按钮方块列表
 */
export const BUTTON_BLOCKS = [
  'oak_button', 'spruce_button', 'birch_button', 'jungle_button',
  'acacia_button', 'dark_oak_button', 'cherry_button', 'bamboo_button',
  'mangrove_button', 'crimson_button', 'warped_button',
  'stone_button', 'polished_blackstone_button'
];

/**
 * 压力板方块列表
 */
export const PRESSURE_PLATE_BLOCKS = [
  'oak_pressure_plate', 'spruce_pressure_plate', 'birch_pressure_plate',
  'jungle_pressure_plate', 'acacia_pressure_plate', 'dark_oak_pressure_plate',
  'cherry_pressure_plate', 'bamboo_pressure_plate', 'mangrove_pressure_plate',
  'crimson_pressure_plate', 'warped_pressure_plate',
  'stone_pressure_plate', 'polished_blackstone_pressure_plate',
  'light_weighted_pressure_plate', 'heavy_weighted_pressure_plate'
];

/**
 * 创建按钮几何体
 */
export function createButtonGeometry(face = 'wall', facing = 'north', powered = false) {
  // 按钮尺寸：6x4x2 = 0.375 x 0.25 x 0.125
  const geometry = new THREE.BoxGeometry(0.375, 0.25, 0.125);

  // 根据 face 调整位置和旋转
  switch (face) {
    case 'floor':
      geometry.rotateX(Math.PI / 2);
      geometry.translate(0, -0.4375, 0);
      break;
    case 'ceiling':
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, 0.4375, 0);
      break;
    case 'wall':
    default:
      // 贴墙，根据朝向调整
      const offset = 0.4375;
      switch (facing) {
        case 'north':
          geometry.translate(0, 0, -offset);
          break;
        case 'south':
          geometry.translate(0, 0, offset);
          break;
        case 'east':
          geometry.rotateY(Math.PI / 2);
          geometry.translate(offset, 0, 0);
          break;
        case 'west':
          geometry.rotateY(-Math.PI / 2);
          geometry.translate(-offset, 0, 0);
          break;
      }
      break;
  }

  // 按下时稍微偏移
  if (powered) {
    geometry.scale(1, 0.8, 1);
  }

  return geometry;
}

/**
 * 创建压力板几何体
 */
export function createPressurePlateGeometry(powered = false) {
  // 压力板尺寸：14x1x14 = 0.875 x 0.0625 x 0.875
  const height = powered ? 0.03125 : 0.0625; // 按下时更薄
  const geometry = new THREE.BoxGeometry(0.875, height, 0.875);

  // 放在方块底部
  const yOffset = powered ? -0.484375 : -0.46875;
  geometry.translate(0, yOffset, 0);

  return geometry;
}

/**
 * 判断是否为按钮
 */
export function isButtonBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return BUTTON_BLOCKS.some(btn => cleanType === btn);
}

/**
 * 判断是否为压力板
 */
export function isPressurePlateBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return PRESSURE_PLATE_BLOCKS.some(plate => cleanType === plate);
}

/**
 * 解析按钮属性
 */
export function parseButtonProperties(properties = {}) {
  return {
    face: properties.face || 'wall',
    facing: properties.facing || 'north',
    powered: properties.powered === 'true' || properties.powered === true
  };
}

/**
 * 解析压力板属性
 */
export function parsePressurePlateProperties(properties = {}) {
  return {
    powered: properties.powered === 'true' || properties.powered === true
  };
}
