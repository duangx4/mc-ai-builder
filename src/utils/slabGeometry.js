/**
 * 台阶几何体生成器
 * 支持所有 60 种台阶方块的渲染
 */

import * as THREE from 'three';

/**
 * 创建台阶几何体
 * @param {string} type - 类型: 'top', 'bottom', 'double'
 * @returns {THREE.BufferGeometry} 台阶几何体
 */
export function createSlabGeometry(type = 'bottom') {
  const geometry = new THREE.BoxGeometry(1, 0.5, 1);

  // 调整位置
  switch (type) {
    case 'top':
      // 上半台阶，向上偏移 0.25
      geometry.translate(0, 0.25, 0);
      break;
    case 'bottom':
      // 下半台阶，向下偏移 0.25
      geometry.translate(0, -0.25, 0);
      break;
    case 'double':
      // 双层台阶，恢复为完整方块
      return new THREE.BoxGeometry(1, 1, 1);
    default:
      geometry.translate(0, -0.25, 0);
  }

  return geometry;
}

/**
 * 解析台阶属性
 */
export function parseSlabProperties(properties = {}) {
  return {
    type: properties.type || 'bottom'
  };
}
