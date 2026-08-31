/**
 * 门几何体生成器
 * 支持 20 种门方块（双格高度）
 */

import * as THREE from 'three';

/**
 * 创建门几何体
 * @param {string} facing - 朝向: 'north', 'south', 'east', 'west'
 * @param {string} half - 上下部分: 'upper', 'lower'
 * @param {string} hinge - 合页位置: 'left', 'right'
 * @param {boolean} open - 是否打开
 * @returns {THREE.BufferGeometry} 门几何体
 */
export function createDoorGeometry(facing = 'north', half = 'lower', hinge = 'left', open = false) {
  // 门的厚度为 3 像素 = 0.1875 方块
  const thickness = 0.1875;
  const width = 1;
  const height = 1;

  const geometry = new THREE.BoxGeometry(width, height, thickness);

  // 调整位置和旋转
  let offsetX = 0, offsetZ = 0;
  let rotation = 0;

  // 根据朝向和开关状态调整
  if (open) {
    // 门打开时，绕合页旋转 90 度
    rotation = hinge === 'left' ? -Math.PI / 2 : Math.PI / 2;
  }

  // 根据朝向调整基础旋转
  const facingRotation = getFacingRotation(facing);
  rotation += facingRotation;

  // 应用旋转
  geometry.rotateY(rotation);

  // 根据朝向调整位置（门需要贴墙）
  switch (facing) {
    case 'north':
      offsetZ = -0.40625;
      break;
    case 'south':
      offsetZ = 0.40625;
      break;
    case 'east':
      offsetX = 0.40625;
      break;
    case 'west':
      offsetX = -0.40625;
      break;
  }

  geometry.translate(offsetX, 0, offsetZ);

  return geometry;
}

/**
 * 创建活板门几何体
 * @param {string} facing - 朝向: 'north', 'south', 'east', 'west'
 * @param {string} half - 上下部分: 'top', 'bottom'
 * @param {boolean} open - 是否打开
 * @returns {THREE.BufferGeometry} 活板门几何体
 */
export function createTrapdoorGeometry(facing = 'north', half = 'bottom', open = false) {
  // 活板门厚度为 3 像素 = 0.1875 方块
  const thickness = 0.1875;
  const size = 1;

  const geometry = new THREE.BoxGeometry(size, thickness, size);

  if (!open) {
    // 关闭时，水平放置
    const offsetY = half === 'top' ? 0.40625 : -0.40625;
    geometry.translate(0, offsetY, 0);
  } else {
    // 打开时，竖立并贴墙
    geometry.rotateX(Math.PI / 2);

    let offsetX = 0, offsetZ = 0, offsetY = 0;

    // 根据朝向贴墙
    switch (facing) {
      case 'north':
        offsetZ = -0.40625;
        break;
      case 'south':
        offsetZ = 0.40625;
        break;
      case 'east':
        offsetX = 0.40625;
        geometry.rotateY(Math.PI / 2);
        break;
      case 'west':
        offsetX = -0.40625;
        geometry.rotateY(Math.PI / 2);
        break;
    }

    // 上下位置调整
    offsetY = half === 'top' ? 0.40625 : -0.40625;

    geometry.translate(offsetX, offsetY, offsetZ);
  }

  return geometry;
}

/**
 * 根据朝向获取旋转角度
 */
function getFacingRotation(facing) {
  switch (facing) {
    case 'north': return 0;
    case 'east': return Math.PI / 2;
    case 'south': return Math.PI;
    case 'west': return -Math.PI / 2;
    default: return 0;
  }
}

/**
 * 解析门属性
 */
export function parseDoorProperties(properties = {}) {
  return {
    facing: properties.facing || 'north',
    half: properties.half || 'lower',
    hinge: properties.hinge || 'left',
    open: properties.open === 'true' || properties.open === true
  };
}

/**
 * 解析活板门属性
 */
export function parseTrapdoorProperties(properties = {}) {
  return {
    facing: properties.facing || 'north',
    half: properties.half || 'bottom',
    open: properties.open === 'true' || properties.open === true
  };
}
