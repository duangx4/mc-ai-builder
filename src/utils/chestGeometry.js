/**
 * 特殊方块渲染器 - Part 1: 箱子类
 * 包括：箱子、末影箱、陷阱箱、桶
 */

import * as THREE from 'three';

/**
 * 箱子方块列表
 */
export const CHEST_BLOCKS = [
  'chest', 'trapped_chest', 'ender_chest'
];

/**
 * 桶方块列表
 */
export const BARREL_BLOCKS = ['barrel'];

/**
 * 创建箱子几何体
 * 箱子由两个部分组成：底部和盖子
 */
export function createChestGeometry(facing = 'north') {
  const group = new THREE.Group();

  // 底部：14x10x14 = 0.875 x 0.625 x 0.875
  const bottomGeometry = new THREE.BoxGeometry(0.875, 0.625, 0.875);
  const bottom = new THREE.Mesh(bottomGeometry);
  bottom.position.y = -0.1875;

  // 盖子：14x5x14 = 0.875 x 0.3125 x 0.875
  const lidGeometry = new THREE.BoxGeometry(0.875, 0.3125, 0.875);
  const lid = new THREE.Mesh(lidGeometry);
  lid.position.y = 0.28125;

  // 锁扣（装饰）：2x4x1 = 0.125 x 0.25 x 0.0625
  const latchGeometry = new THREE.BoxGeometry(0.125, 0.25, 0.0625);
  const latch = new THREE.Mesh(latchGeometry);
  latch.position.set(0, 0.125, 0.4375);

  group.add(bottom);
  group.add(lid);
  group.add(latch);

  // 根据朝向旋转
  const rotation = getFacingRotation(facing);
  group.rotation.y = rotation;

  return mergeGroup(group);
}

/**
 * 创建桶几何体
 */
export function createBarrelGeometry(facing = 'up') {
  // 桶是一个完整的立方体，但顶部和底部有特殊纹理
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  // 根据朝向旋转
  if (facing === 'down') {
    geometry.rotateX(Math.PI);
  } else if (facing === 'north') {
    geometry.rotateX(Math.PI / 2);
  } else if (facing === 'south') {
    geometry.rotateX(-Math.PI / 2);
  } else if (facing === 'east') {
    geometry.rotateZ(-Math.PI / 2);
  } else if (facing === 'west') {
    geometry.rotateZ(Math.PI / 2);
  }

  return geometry;
}

/**
 * 判断是否为箱子
 */
export function isChestBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return CHEST_BLOCKS.some(chest => cleanType.includes(chest));
}

/**
 * 判断是否为桶
 */
export function isBarrelBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return BARREL_BLOCKS.some(barrel => cleanType.includes(barrel));
}

/**
 * 解析箱子属性
 */
export function parseChestProperties(properties = {}) {
  return {
    facing: properties.facing || 'north',
    type: properties.type || 'single' // single, left, right
  };
}

/**
 * 解析桶属性
 */
export function parseBarrelProperties(properties = {}) {
  return {
    facing: properties.facing || 'up'
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
