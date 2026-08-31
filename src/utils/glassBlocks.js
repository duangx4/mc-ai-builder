/**
 * 玻璃渲染工具
 * 识别所有玻璃方块并启用透明渲染
 */

/**
 * 所有玻璃方块列表（18 个）
 */
export const GLASS_BLOCKS = [
  'glass',
  'tinted_glass',
  'white_stained_glass',
  'orange_stained_glass',
  'magenta_stained_glass',
  'light_blue_stained_glass',
  'yellow_stained_glass',
  'lime_stained_glass',
  'pink_stained_glass',
  'gray_stained_glass',
  'light_gray_stained_glass',
  'cyan_stained_glass',
  'purple_stained_glass',
  'blue_stained_glass',
  'brown_stained_glass',
  'green_stained_glass',
  'red_stained_glass',
  'black_stained_glass'
];

/**
 * 所有玻璃板方块列表（17 个）
 */
export const GLASS_PANE_BLOCKS = [
  'glass_pane',
  'white_stained_glass_pane',
  'orange_stained_glass_pane',
  'magenta_stained_glass_pane',
  'light_blue_stained_glass_pane',
  'yellow_stained_glass_pane',
  'lime_stained_glass_pane',
  'pink_stained_glass_pane',
  'gray_stained_glass_pane',
  'light_gray_stained_glass_pane',
  'cyan_stained_glass_pane',
  'purple_stained_glass_pane',
  'blue_stained_glass_pane',
  'brown_stained_glass_pane',
  'green_stained_glass_pane',
  'red_stained_glass_pane',
  'black_stained_glass_pane'
];

/**
 * 判断是否为玻璃方块
 */
export function isGlassBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return GLASS_BLOCKS.includes(cleanType);
}

/**
 * 判断是否为玻璃板方块
 */
export function isGlassPaneBlock(blockType) {
  const cleanType = blockType.replace(/\[.*\]/, '').toLowerCase();
  return GLASS_PANE_BLOCKS.includes(cleanType);
}

/**
 * 获取玻璃材质配置
 */
export function getGlassMaterialProps(blockType) {
  const isTinted = blockType.includes('tinted');

  return {
    transparent: true,
    opacity: isTinted ? 0.6 : 0.8,
    depthWrite: false, // 避免透明排序问题
    side: 2 // THREE.DoubleSide
  };
}
