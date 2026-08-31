/**
 * 特殊方块渲染器 - Part 4: 梯子和脚手架
 */

import * as THREE from 'three';

/**
 * 梯子方块
 */
export const LADDER_BLOCKS = ['ladder'];

/**
 * 脚手架方块
 */
export const SCAFFOLDING_BLOCKS = ['scaffolding'];

/**
 * 创建梯子几何体
 * 梯子贴墙，厚度很薄
 */
export function createLadderGeometry(facing = 'north') {
  // 梯子：16x16x3 = 1 x 1 x 0.1875
  const geometry = new THREE.BoxGeometry(1, 1, 0.1875);

  // 贴墙
  const offset = 0.40625;
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

  return geometry;
}

/**
 * 创建脚手架几何体
 * 脚手架是镂空的框架结构
 */
export function createScaffoldingGeometry() {
  const group = new THREE.Group();

  // 中心柱：2x16x2 = 0.125 x 1 x 0.125
  const centerPost = new THREE.BoxGeometry(0.125, 1, 0.125);
  const center = new THREE.Mesh(centerPost);
  group.add(center);

  // 四个角柱
  const cornerGeometry = new THREE.BoxGeometry(0.125, 1, 0.125);
  const corners = [
    [-0.4375, 0, -0.4375],
    [0.4375, 0, -0.4375],
    [-0.4375, 0, 0.4375],
    [0.4375, 0, 0.4375]
  ];

  corners.forEach(pos => {
    const corner = new THREE.Mesh(cornerGeometry);
    corner.position.set(...pos);
    group.add(corner);
  });

  // 顶部平台：16x2x16 = 1 x 0.125 x 1
  const platformGeometry = new THREE.BoxGeometry(1, 0.125, 1);
  const platform = new THREE.Mesh(platformGeometry);
  platform.position.y = 0.4375;
  group.add(platform);

  return mergeGroup(group);
}

/**
 * 判断是否为梯子
 */
export function isLadderBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return LADDER_BLOCKS.includes(cleanType);
}

/**
 * 判断是否为脚手架
 */
export function isScaffoldingBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return SCAFFOLDING_BLOCKS.includes(cleanType);
}

/**
 * 解析梯子属性
 */
export function parseLadderProperties(properties = {}) {
  return {
    facing: properties.facing || 'north'
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
