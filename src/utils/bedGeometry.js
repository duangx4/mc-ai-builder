/**
 * 特殊方块渲染器 - Part 2: 床
 */

import * as THREE from 'three';

/**
 * 床方块列表
 */
export const BED_BLOCKS = [
  'white_bed', 'orange_bed', 'magenta_bed', 'light_blue_bed',
  'yellow_bed', 'lime_bed', 'pink_bed', 'gray_bed',
  'light_gray_bed', 'cyan_bed', 'purple_bed', 'blue_bed',
  'brown_bed', 'green_bed', 'red_bed', 'black_bed'
];

/**
 * 创建床几何体
 * 床占据两个方块空间
 */
export function createBedGeometry(part = 'foot', facing = 'north') {
  const group = new THREE.Group();

  // 床垫：16x9x16 = 1 x 0.5625 x 1
  const mattressGeometry = new THREE.BoxGeometry(1, 0.5625, 1);
  const mattress = new THREE.Mesh(mattressGeometry);
  mattress.position.y = -0.21875;

  group.add(mattress);

  // 床腿（4 个）
  const legGeometry = new THREE.BoxGeometry(0.1875, 0.1875, 0.1875);

  const positions = [
    [-0.40625, -0.40625, -0.40625],
    [0.40625, -0.40625, -0.40625],
    [-0.40625, -0.40625, 0.40625],
    [0.40625, -0.40625, 0.40625]
  ];

  positions.forEach(pos => {
    const leg = new THREE.Mesh(legGeometry);
    leg.position.set(...pos);
    group.add(leg);
  });

  // 床头（只在 head 部分）
  if (part === 'head') {
    const headboardGeometry = new THREE.BoxGeometry(1, 0.5625, 0.125);
    const headboard = new THREE.Mesh(headboardGeometry);
    headboard.position.set(0, 0.09375, -0.4375);
    group.add(headboard);
  }

  // 根据朝向旋转
  const rotation = getFacingRotation(facing);
  group.rotation.y = rotation;

  return mergeGroup(group);
}

/**
 * 判断是否为床
 */
export function isBedBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return BED_BLOCKS.some(bed => cleanType.includes(bed));
}

/**
 * 解析床属性
 */
export function parseBedProperties(properties = {}) {
  return {
    part: properties.part || 'foot',
    facing: properties.facing || 'north'
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
