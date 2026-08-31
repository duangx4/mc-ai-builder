/**
 * 植物和花渲染器
 * 63 个方块（33 个植物 + 30 个花）
 * 使用交叉平面渲染
 */

import * as THREE from 'three';

/**
 * 所有需要交叉平面渲染的植物
 */
export const CROSS_PLANT_BLOCKS = [
  // 草类
  'grass', 'tall_grass', 'fern', 'large_fern',
  'dead_bush', 'seagrass', 'tall_seagrass',

  // 海洋植物
  'kelp', 'kelp_plant', 'sea_pickle',

  // 作物
  'wheat', 'carrots', 'potatoes', 'beetroots',
  'nether_wart', 'sweet_berry_bush',

  // 树苗
  'oak_sapling', 'spruce_sapling', 'birch_sapling',
  'jungle_sapling', 'acacia_sapling', 'dark_oak_sapling',
  'cherry_sapling', 'mangrove_propagule',

  // 花
  'dandelion', 'poppy', 'blue_orchid', 'allium',
  'azure_bluet', 'red_tulip', 'orange_tulip', 'white_tulip',
  'pink_tulip', 'oxeye_daisy', 'cornflower', 'lily_of_the_valley',
  'wither_rose', 'torchflower', 'pitcher_plant',

  // 大型花
  'sunflower', 'lilac', 'rose_bush', 'peony',
  'tall_seagrass', 'large_fern', 'tall_grass',

  // 蘑菇
  'red_mushroom', 'brown_mushroom', 'crimson_fungus', 'warped_fungus',

  // 其他植物
  'bamboo', 'sugar_cane', 'cactus',
  'vine', 'weeping_vines', 'twisting_vines',
  'chorus_plant', 'chorus_flower',
  'nether_sprouts', 'crimson_roots', 'warped_roots'
];

/**
 * 创建交叉平面几何体（X 形）
 */
export function createCrossPlantGeometry() {
  const group = new THREE.Group();

  // 两个相交的平面，形成 X 形
  const planeGeometry = new THREE.PlaneGeometry(1, 1);

  // 第一个平面（对角线）
  const plane1 = new THREE.Mesh(planeGeometry);
  plane1.rotation.y = Math.PI / 4;

  // 第二个平面（垂直对角线）
  const plane2 = new THREE.Mesh(planeGeometry);
  plane2.rotation.y = -Math.PI / 4;

  group.add(plane1);
  group.add(plane2);

  return mergeGroup(group);
}

/**
 * 判断是否为交叉平面植物
 */
export function isCrossPlantBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return CROSS_PLANT_BLOCKS.some(plant => cleanType.includes(plant));
}

/**
 * 合并 Group 中的几何体
 */
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
