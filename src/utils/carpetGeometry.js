/**
 * 地毯渲染器
 * 地毯是极薄的方块
 */

import * as THREE from 'three';

/**
 * 地毯方块列表
 */
export const CARPET_BLOCKS = [
  'white_carpet', 'orange_carpet', 'magenta_carpet', 'light_blue_carpet',
  'yellow_carpet', 'lime_carpet', 'pink_carpet', 'gray_carpet',
  'light_gray_carpet', 'cyan_carpet', 'purple_carpet', 'blue_carpet',
  'brown_carpet', 'green_carpet', 'red_carpet', 'black_carpet',
  'moss_carpet'
];

/**
 * 创建地毯几何体
 */
export function createCarpetGeometry() {
  // 地毯厚度：1 像素 = 0.0625 方块
  const geometry = new THREE.BoxGeometry(1, 0.0625, 1);
  geometry.translate(0, -0.46875, 0); // 贴地
  return geometry;
}

/**
 * 判断是否为地毯
 */
export function isCarpetBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return CARPET_BLOCKS.some(carpet => cleanType === carpet);
}
