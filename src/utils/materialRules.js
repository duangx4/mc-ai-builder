/**
 * 材质一致性铁律 (Material Consistency Rules)
 * 
 * 用于确保跨区块建筑的材质统一性
 * 注入到 AI 系统提示中
 */

/**
 * 材质规则文本（注入到系统提示）
 */
export const MATERIAL_RULES_TEXT = `
## 材质一致性铁律 (Material Consistency Rules)

建筑材质必须遵守以下严格规则，确保跨区块的统一性和协调性：

1. **一个主材质族**
   - 整栋建筑选择 1 个主材质族（例如：橡木族、石砖族、混凝土族）
   - 至多使用 2 个辅助材质（例如：基座用石材、窗户用玻璃）
   - 跨区块必须保持相同的主材质族（这是区块衔接的核心约束）

2. **结构件对应正确类别**
   - 柱子/支撑 → log 或石柱类方块
   - 墙体 → planks 或 stone_bricks 等实心方块
   - 檐口/屋顶边缘 → stairs（楼梯方块）
   - 地面/台阶 → slab 或 stairs
   - 门 → door（木门或铁门）
   - 窗户 → glass_pane 或 glass

3. **确定性原则（禁止随机混搭）**
   - 禁止在同一建筑中逐块随机混搭不同材质
   - randomAt 函数仅允许用于同材质族内的自然散布效果（例如：植被分布、风化效果、苔藓点缀）
   - 同一结构构件（如所有柱子、所有墙体）必须使用统一材质

4. **原版方块 ID**
   - 一律使用原版 Minecraft 方块 ID（兼容 1.20.1）
   - 禁止臆造或使用不存在的方块名称
   - 使用 searchMaterial 工具查询可用材质

5. **不一致即返工**
   - 在验证阶段发现跨区块材质族冲突，必须进入 refinement 阶段修复
   - 材质不一致视为严重错误，优先级高于其他美观问题

**材质查询工具**：使用 searchMaterial 工具按需查询完整材质库（1700+ 材质）。
`;

/**
 * 获取精选材质速查表（每类别 Top 6）
 * 用于系统提示的快速参考
 */
export function getCuratedMaterialsText() {
  // 精选常用材质（硬编码，避免循环依赖）
  const curatedByCategory = {
    woods: [
      'oak_planks', 'oak_log', 'oak_stairs', 'oak_slab', 'oak_fence', 'oak_door',
      'spruce_planks', 'spruce_log', 'spruce_stairs', 'spruce_slab', 'spruce_fence', 'spruce_door',
      'birch_planks', 'dark_oak_planks', 'acacia_planks', 'jungle_planks'
    ],
    stones: [
      'stone', 'stone_bricks', 'cobblestone', 'smooth_stone', 'stone_stairs', 'stone_slab',
      'andesite', 'polished_andesite', 'diorite', 'polished_diorite', 'granite', 'polished_granite',
      'deepslate', 'deepslate_bricks', 'polished_deepslate', 'cobbled_deepslate'
    ],
    concrete: [
      'white_concrete', 'light_gray_concrete', 'gray_concrete', 'black_concrete',
      'red_concrete', 'orange_concrete', 'yellow_concrete', 'lime_concrete',
      'blue_concrete', 'cyan_concrete', 'green_concrete', 'brown_concrete'
    ],
    wool: [
      'white_wool', 'light_gray_wool', 'gray_wool', 'black_wool',
      'red_wool', 'blue_wool', 'green_wool', 'yellow_wool'
    ],
    glass: [
      'glass', 'glass_pane', 'white_stained_glass', 'white_stained_glass_pane',
      'light_gray_stained_glass', 'black_stained_glass', 'tinted_glass'
    ],
    metals: [
      'iron_block', 'gold_block', 'copper_block', 'cut_copper',
      'iron_bars', 'iron_door', 'iron_trapdoor', 'chain'
    ],
    natural: [
      'dirt', 'grass_block', 'coarse_dirt', 'sand', 'gravel', 'clay',
      'oak_leaves', 'spruce_leaves', 'birch_leaves', 'moss_block'
    ],
    terracotta: [
      'terracotta', 'white_terracotta', 'orange_terracotta', 'red_terracotta',
      'brown_terracotta', 'gray_terracotta'
    ]
  };

  let text = '\n## 常用材质速查 (Curated Materials Quick Reference)\n\n';
  text += '以下是按类别精选的常用材质（完整材质库请用 searchMaterial 工具查询）：\n\n';

  for (const [category, materials] of Object.entries(curatedByCategory)) {
    text += `### ${category}\n`;
    text += materials.map(id => `- ${id}`).join('\n') + '\n\n';
  }

  return text;
}

/**
 * 获取完整材质规则（包含铁律 + 精选速查）
 */
export function getFullMaterialRules() {
  return MATERIAL_RULES_TEXT + getCuratedMaterialsText();
}
