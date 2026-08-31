/**
 * 方块分类和渲染器路由
 * 统一管理所有特殊方块类型的识别和渲染器选择
 */

import { isGlassBlock, isGlassPaneBlock } from './glassBlocks';
import { isTorchBlock, isLanternBlock } from './torchLanternGeometry';
import { isCrossPlantBlock } from './plantGeometry';
import { isButtonBlock, isPressurePlateBlock } from './buttonPlateGeometry';
import { isCarpetBlock } from './carpetGeometry';
import { isRedstoneBlock, isRailBlock } from './redstoneRailGeometry';
import { isChestBlock, isBarrelBlock } from './chestGeometry';
import { isBedBlock } from './bedGeometry';
import { isFurnaceBlock } from './furnaceGeometry';
import { isLadderBlock, isScaffoldingBlock } from './ladderScaffoldingGeometry';
import { isGlowingBlock } from './glowingBlockGeometry';
import { isWorkstationBlock } from './workstationGeometry';

/**
 * 方块渲染类型枚举
 */
export const BlockRenderType = {
  NORMAL: 'normal',           // 普通立方体
  STAIRS: 'stairs',           // 楼梯
  SLAB: 'slab',              // 台阶
  FENCE: 'fence',            // 栅栏
  WALL: 'wall',              // 围墙
  DOOR: 'door',              // 门
  TRAPDOOR: 'trapdoor',      // 活板门
  GLASS: 'glass',            // 玻璃
  GLASS_PANE: 'glass_pane',  // 玻璃板
  TORCH: 'torch',            // 火把
  LANTERN: 'lantern',        // 灯笼
  PLANT: 'plant',            // 植物（交叉平面）
  BUTTON: 'button',          // 按钮
  PRESSURE_PLATE: 'plate',   // 压力板
  CARPET: 'carpet',          // 地毯
  REDSTONE: 'redstone',      // 红石
  RAIL: 'rail',              // 铁轨
  CHEST: 'chest',            // 箱子
  BARREL: 'barrel',          // 桶
  BED: 'bed',                // 床
  FURNACE: 'furnace',        // 熔炉
  LADDER: 'ladder',          // 梯子
  SCAFFOLDING: 'scaffolding',// 脚手架
  GLOWING: 'glowing',        // 发光方块
  WORKSTATION: 'workstation',// 工作站
  SPECIAL: 'special'         // 其他特殊方块
};

/**
 * 获取方块的渲染类型
 * @param {string} blockType - 方块类型（可能包含属性）
 * @returns {string} 渲染类型
 */
export function getBlockRenderType(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();

  // 楼梯
  if (cleanType.includes('_stairs')) {
    return BlockRenderType.STAIRS;
  }

  // 台阶
  if (cleanType.includes('_slab')) {
    return BlockRenderType.SLAB;
  }

  // 门
  if (cleanType.includes('_door') && !cleanType.includes('trapdoor')) {
    return BlockRenderType.DOOR;
  }

  // 活板门
  if (cleanType.includes('trapdoor')) {
    return BlockRenderType.TRAPDOOR;
  }

  // 栅栏
  if (cleanType.includes('_fence') && !cleanType.includes('fence_gate')) {
    return BlockRenderType.FENCE;
  }

  // 围墙
  if (cleanType.includes('_wall') && !cleanType.startsWith('wall_')) {
    return BlockRenderType.WALL;
  }

  // 玻璃
  if (isGlassBlock(blockType)) {
    return BlockRenderType.GLASS;
  }

  // 玻璃板
  if (isGlassPaneBlock(blockType)) {
    return BlockRenderType.GLASS_PANE;
  }

  // 火把
  if (isTorchBlock(blockType)) {
    return BlockRenderType.TORCH;
  }

  // 灯笼
  if (isLanternBlock(blockType)) {
    return BlockRenderType.LANTERN;
  }

  // 植物
  if (isCrossPlantBlock(blockType)) {
    return BlockRenderType.PLANT;
  }

  // 按钮
  if (isButtonBlock(blockType)) {
    return BlockRenderType.BUTTON;
  }

  // 压力板
  if (isPressurePlateBlock(blockType)) {
    return BlockRenderType.PRESSURE_PLATE;
  }

  // 地毯
  if (isCarpetBlock(blockType)) {
    return BlockRenderType.CARPET;
  }

  // 红石
  if (isRedstoneBlock(blockType)) {
    return BlockRenderType.REDSTONE;
  }

  // 铁轨
  if (isRailBlock(blockType)) {
    return BlockRenderType.RAIL;
  }

  // 箱子
  if (isChestBlock(blockType)) {
    return BlockRenderType.CHEST;
  }

  // 桶
  if (isBarrelBlock(blockType)) {
    return BlockRenderType.BARREL;
  }

  // 床
  if (isBedBlock(blockType)) {
    return BlockRenderType.BED;
  }

  // 熔炉
  if (isFurnaceBlock(blockType)) {
    return BlockRenderType.FURNACE;
  }

  // 梯子
  if (isLadderBlock(blockType)) {
    return BlockRenderType.LADDER;
  }

  // 脚手架
  if (isScaffoldingBlock(blockType)) {
    return BlockRenderType.SCAFFOLDING;
  }

  // 发光方块
  if (isGlowingBlock(blockType)) {
    return BlockRenderType.GLOWING;
  }

  // 工作站
  if (isWorkstationBlock(blockType)) {
    return BlockRenderType.WORKSTATION;
  }

  // 特殊方块
  if (isSpecialBlock(cleanType)) {
    return BlockRenderType.SPECIAL;
  }

  // 默认普通方块
  return BlockRenderType.NORMAL;
}

/**
 * 特殊方块列表（需要自定义模型）
 */
const SPECIAL_BLOCKS = [
  'chest', 'ender_chest', 'trapped_chest', 'barrel',
  'furnace', 'blast_furnace', 'smoker',
  'brewing_stand', 'enchanting_table', 'anvil',
  'bed', 'banner', 'sign', 'hanging_sign',
  'piston', 'sticky_piston',
  'ladder', 'scaffolding',
  'hopper', 'dispenser', 'dropper',
  'observer', 'lectern',
  'dragon_egg', 'end_portal_frame',
  'beacon', 'conduit',
  'bell', 'grindstone', 'stonecutter',
  'composter', 'loom', 'cartography_table',
  'smithing_table', 'fletching_table',
  'cauldron', 'campfire', 'soul_campfire',
  'end_rod', 'lightning_rod'
];

/**
 * 判断是否为特殊方块
 */
function isSpecialBlock(cleanType) {
  return SPECIAL_BLOCKS.some(special => cleanType.includes(special));
}

/**
 * 按渲染类型分组方块
 * @param {Array} blocks - 方块数组
 * @returns {Object} 按类型分组的方块
 */
export function groupBlocksByRenderType(blocks) {
  const groups = {};

  // 初始化所有类型的数组
  Object.values(BlockRenderType).forEach(type => {
    groups[type] = [];
  });

  // 分组
  blocks.forEach(block => {
    const renderType = getBlockRenderType(block.type);
    groups[renderType].push(block);
  });

  return groups;
}

/**
 * 获取方块的材质属性
 * @param {string} blockType - 方块类型
 * @returns {Object} 材质属性
 */
export function getBlockMaterialProps(blockType) {
  const renderType = getBlockRenderType(blockType);

  // 透明方块
  if (renderType === BlockRenderType.GLASS || renderType === BlockRenderType.GLASS_PANE) {
    return {
      transparent: true,
      opacity: blockType.includes('tinted') ? 0.6 : 0.8,
      depthWrite: false,
      side: 2 // THREE.DoubleSide
    };
  }

  // 植物（需要透明和双面渲染）
  if (renderType === BlockRenderType.PLANT) {
    return {
      transparent: true,
      alphaTest: 0.1,
      side: 2
    };
  }

  // 水和其他透明液体
  if (blockType.includes('water') || blockType.includes('lava')) {
    return {
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    };
  }

  // 默认不透明
  return {
    transparent: false,
    side: 0 // THREE.FrontSide
  };
}
