/**
 * 火把和灯笼渲染器
 * 10 个方块（6 个火把 + 4 个灯笼）
 */

import * as THREE from 'three';

/**
 * 火把方块列表
 */
export const TORCH_BLOCKS = [
  'torch', 'wall_torch',
  'soul_torch', 'soul_wall_torch',
  'redstone_torch', 'redstone_wall_torch'
];

/**
 * 灯笼方块列表
 */
export const LANTERN_BLOCKS = [
  'lantern', 'soul_lantern',
  'sea_lantern', 'end_rod'
];

/**
 * 创建火把几何体
 * @param {boolean} isWall - 是否为墙壁火把
 * @param {string} facing - 墙壁火把朝向
 */
export function createTorchGeometry(isWall = false, facing = 'north') {
  const group = new THREE.Group();

  // 火把杆：2x10x2 像素 = 0.125 x 0.625 x 0.125
  const stickGeometry = new THREE.BoxGeometry(0.125, 0.625, 0.125);
  const stick = new THREE.Mesh(stickGeometry);
  stick.position.y = 0.1875; // 向上偏移

  // 火焰头：3x3x3 = 0.1875 x 0.1875 x 0.1875
  const flameGeometry = new THREE.BoxGeometry(0.1875, 0.1875, 0.1875);
  const flame = new THREE.Mesh(flameGeometry);
  flame.position.y = 0.53125; // 在杆顶部

  if (isWall) {
    // 墙壁火把倾斜
    const angle = Math.PI / 6; // 30度倾斜
    stick.rotation.x = angle;
    flame.rotation.x = angle;

    // 根据朝向调整旋转
    const rotation = getFacingRotation(facing);
    stick.rotation.y = rotation;
    flame.rotation.y = rotation;

    // 调整位置使其靠墙
    const offset = 0.3;
    switch (facing) {
      case 'north':
        stick.position.z -= offset;
        flame.position.z -= offset;
        break;
      case 'south':
        stick.position.z += offset;
        flame.position.z += offset;
        break;
      case 'east':
        stick.position.x += offset;
        flame.position.x += offset;
        break;
      case 'west':
        stick.position.x -= offset;
        flame.position.x -= offset;
        break;
    }
  }

  group.add(stick);
  group.add(flame);

  return mergeGroup(group);
}

/**
 * 创建灯笼几何体
 * @param {boolean} hanging - 是否悬挂
 */
export function createLanternGeometry(hanging = false) {
  const group = new THREE.Group();

  // 灯笼主体：5x6x5 = 0.3125 x 0.375 x 0.3125
  const bodyGeometry = new THREE.BoxGeometry(0.3125, 0.375, 0.3125);
  const body = new THREE.Mesh(bodyGeometry);
  body.position.y = hanging ? -0.1 : 0.125;

  if (hanging) {
    // 悬挂链条：2x2x2 = 0.125 x 0.125 x 0.125
    const chainGeometry = new THREE.BoxGeometry(0.125, 0.125, 0.125);
    const chain = new THREE.Mesh(chainGeometry);
    chain.position.y = 0.1875;
    group.add(chain);
  }

  group.add(body);

  return mergeGroup(group);
}

/**
 * 判断是否为火把
 */
export function isTorchBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return TORCH_BLOCKS.some(torch => cleanType.includes(torch));
}

/**
 * 判断是否为灯笼
 */
export function isLanternBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return LANTERN_BLOCKS.some(lantern => cleanType.includes(lantern));
}

/**
 * 解析火把属性
 */
export function parseTorchProperties(properties = {}, blockType = '') {
  const isWall = blockType.includes('wall_torch');
  return {
    isWall,
    facing: properties.facing || 'north'
  };
}

/**
 * 解析灯笼属性
 */
export function parseLanternProperties(properties = {}) {
  return {
    hanging: properties.hanging === 'true' || properties.hanging === true
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
