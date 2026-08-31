/**
 * 特殊方块渲染器 - Part 5: 发光方块
 * 包括：信标、潮涌核心、末地烛、龙蛋
 */

import * as THREE from 'three';

/**
 * 发光方块列表
 */
export const GLOWING_BLOCKS = [
  'beacon', 'conduit', 'end_rod', 'dragon_egg',
  'sea_lantern', 'glowstone', 'shroomlight',
  'jack_o_lantern', 'redstone_lamp'
];

/**
 * 创建信标几何体
 * 信标由底座和水晶组成
 */
export function createBeaconGeometry() {
  const group = new THREE.Group();

  // 底座：16x4x16 = 1 x 0.25 x 1
  const baseGeometry = new THREE.BoxGeometry(1, 0.25, 1);
  const base = new THREE.Mesh(baseGeometry);
  base.position.y = -0.375;
  group.add(base);

  // 水晶：4x12x4 = 0.25 x 0.75 x 0.25
  const crystalGeometry = new THREE.BoxGeometry(0.25, 0.75, 0.25);
  const crystal = new THREE.Mesh(crystalGeometry);
  crystal.position.y = 0.125;
  group.add(crystal);

  return mergeGroup(group);
}

/**
 * 创建潮涌核心几何体
 */
export function createConduitGeometry() {
  // 潮涌核心是一个八面体，这里简化为菱形
  const geometry = new THREE.OctahedronGeometry(0.5, 0);
  return geometry;
}

/**
 * 创建末地烛几何体
 */
export function createEndRodGeometry(facing = 'up') {
  const group = new THREE.Group();

  // 底座：4x2x4 = 0.25 x 0.125 x 0.25
  const baseGeometry = new THREE.BoxGeometry(0.25, 0.125, 0.25);
  const base = new THREE.Mesh(baseGeometry);

  // 杆：2x14x2 = 0.125 x 0.875 x 0.125
  const rodGeometry = new THREE.BoxGeometry(0.125, 0.875, 0.125);
  const rod = new THREE.Mesh(rodGeometry);
  rod.position.y = 0.5;

  group.add(base);
  group.add(rod);

  // 根据朝向旋转
  if (facing === 'down') {
    group.rotation.x = Math.PI;
  } else if (facing === 'north') {
    group.rotation.x = Math.PI / 2;
  } else if (facing === 'south') {
    group.rotation.x = -Math.PI / 2;
  } else if (facing === 'east') {
    group.rotation.z = -Math.PI / 2;
  } else if (facing === 'west') {
    group.rotation.z = Math.PI / 2;
  }

  return mergeGroup(group);
}

/**
 * 创建龙蛋几何体
 */
export function createDragonEggGeometry() {
  // 龙蛋是一个略扁的球体
  const geometry = new THREE.SphereGeometry(0.5, 16, 12);
  geometry.scale(1, 1.2, 1); // 稍微拉长
  return geometry;
}

/**
 * 判断是否为发光方块
 */
export function isGlowingBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return GLOWING_BLOCKS.some(block => cleanType.includes(block));
}

/**
 * 解析末地烛属性
 */
export function parseEndRodProperties(properties = {}) {
  return {
    facing: properties.facing || 'up'
  };
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
