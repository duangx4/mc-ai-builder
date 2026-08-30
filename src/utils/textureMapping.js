/**
 * 纹理映射工具 - 版本化路径 + 分面贴图解析
 * 纯函数模块，无副作用，方便单测
 */

/**
 * 清洗方块类型名（去除 [properties] 后缀）
 * @param {string} type - 原始方块类型（可能含 [facing=south] 等后缀）
 * @returns {string} 清洗后的类型名
 */
export function cleanBlockType(type) {
  if (!type) return type;
  // 移除方括号及其内容（properties 后缀）
  return type.replace(/\[.*\]$/, '');
}

/**
 * 根据版本返回纹理基础路径
 * @param {string} version - MC版本号，如 '1.20.1' 或 '1.21'
 * @returns {string} 纹理路径
 */
export function getTextureBasePath(version) {
  if (version === '1.20.1') {
    return '/minecraft-1.20.1/textures/block/';
  }
  // 默认兜底到 1.21
  return '/minecraft/textures/block/';
}

/**
 * 分面贴图规则映射表
 * 返回 {side, top, bottom} 三个面的纹理文件名（不含扩展名）
 */
const FACE_MAPPING_RULES = {
  // 原木类
  'oak_log': { side: 'oak_log', top: 'oak_log_top', bottom: 'oak_log_top' },
  'spruce_log': { side: 'spruce_log', top: 'spruce_log_top', bottom: 'spruce_log_top' },
  'birch_log': { side: 'birch_log', top: 'birch_log_top', bottom: 'birch_log_top' },
  'jungle_log': { side: 'jungle_log', top: 'jungle_log_top', bottom: 'jungle_log_top' },
  'acacia_log': { side: 'acacia_log', top: 'acacia_log_top', bottom: 'acacia_log_top' },
  'dark_oak_log': { side: 'dark_oak_log', top: 'dark_oak_log_top', bottom: 'dark_oak_log_top' },
  'mangrove_log': { side: 'mangrove_log', top: 'mangrove_log_top', bottom: 'mangrove_log_top' },
  'cherry_log': { side: 'cherry_log', top: 'cherry_log_top', bottom: 'cherry_log_top' },
  
  // 剥皮原木
  'stripped_oak_log': { side: 'stripped_oak_log', top: 'stripped_oak_log_top', bottom: 'stripped_oak_log_top' },
  'stripped_spruce_log': { side: 'stripped_spruce_log', top: 'stripped_spruce_log_top', bottom: 'stripped_spruce_log_top' },
  'stripped_birch_log': { side: 'stripped_birch_log', top: 'stripped_birch_log_top', bottom: 'stripped_birch_log_top' },
  'stripped_jungle_log': { side: 'stripped_jungle_log', top: 'stripped_jungle_log_top', bottom: 'stripped_jungle_log_top' },
  'stripped_acacia_log': { side: 'stripped_acacia_log', top: 'stripped_acacia_log_top', bottom: 'stripped_acacia_log_top' },
  'stripped_dark_oak_log': { side: 'stripped_dark_oak_log', top: 'stripped_dark_oak_log_top', bottom: 'stripped_dark_oak_log_top' },
  'stripped_mangrove_log': { side: 'stripped_mangrove_log', top: 'stripped_mangrove_log_top', bottom: 'stripped_mangrove_log_top' },
  'stripped_cherry_log': { side: 'stripped_cherry_log', top: 'stripped_cherry_log_top', bottom: 'stripped_cherry_log_top' },
  
  // 菌柄
  'crimson_stem': { side: 'crimson_stem', top: 'crimson_stem_top', bottom: 'crimson_stem_top' },
  'warped_stem': { side: 'warped_stem', top: 'warped_stem_top', bottom: 'warped_stem_top' },
  'stripped_crimson_stem': { side: 'stripped_crimson_stem', top: 'stripped_crimson_stem_top', bottom: 'stripped_crimson_stem_top' },
  'stripped_warped_stem': { side: 'stripped_warped_stem', top: 'stripped_warped_stem_top', bottom: 'stripped_warped_stem_top' },
  
  // 草方块
  'grass_block': { side: 'grass_block_side', top: 'grass_block_top', bottom: 'dirt' },
  
  // 菌丝
  'mycelium': { side: 'mycelium_side', top: 'mycelium_top', bottom: 'dirt' },
  
  // 灰化土
  'podzol': { side: 'podzol_side', top: 'podzol_top', bottom: 'dirt' },
  
  // 耕地
  'farmland': { side: 'dirt', top: 'farmland', bottom: 'dirt' },
  
  // 玄武岩
  'basalt': { side: 'basalt_side', top: 'basalt_top', bottom: 'basalt_top' },
  'polished_basalt': { side: 'polished_basalt_side', top: 'polished_basalt_top', bottom: 'polished_basalt_top' },
  
  // 远古残骸
  'ancient_debris': { side: 'ancient_debris_side', top: 'ancient_debris_top', bottom: 'ancient_debris_top' },
  
  // 竹块
  'bamboo_block': { side: 'bamboo_block', top: 'bamboo_block_top', bottom: 'bamboo_block_top' },
};

/**
 * 获取方块类型的分面纹理名称
 */
export function getFaceTextureNames(type) {
  const lowerType = type.toLowerCase();
  
  if (FACE_MAPPING_RULES[lowerType]) {
    return FACE_MAPPING_RULES[lowerType];
  }
  
  if (lowerType.endsWith('_log')) {
    return {
      side: lowerType,
      top: lowerType + '_top',
      bottom: lowerType + '_top'
    };
  }
  
  if (lowerType.endsWith('_stem')) {
    return {
      side: lowerType,
      top: lowerType + '_top',
      bottom: lowerType + '_top'
    };
  }
  
  return {
    side: lowerType,
    top: lowerType,
    bottom: lowerType
  };
}


export const BLOCK_TEXTURE_ALIASES = {
    // Grass & Dirt
    'grass': 'grass_block_side',
    'grass_block': 'grass_block_side',
    'dirt': 'dirt',
    'coarse_dirt': 'coarse_dirt',
    'podzol': 'podzol_top',

    // Stone variants
    'stone': 'stone',
    'cobble': 'cobblestone',
    'cobblestone': 'cobblestone',
    'stone_bricks': 'stone_bricks',
    'mossy_stone_bricks': 'mossy_stone_bricks',
    'cracked_stone_bricks': 'cracked_stone_bricks',
    'smooth_stone': 'smooth_stone',
    'polished_andesite': 'polished_andesite',
    'polished_diorite': 'polished_diorite',
    'polished_granite': 'polished_granite',

    // Deepslate variants
    'deepslate': 'deepslate',
    'deepslate_bricks': 'deepslate_bricks',
    'deepslate_tiles': 'deepslate_tiles',
    'cracked_deepslate_bricks': 'cracked_deepslate_bricks',
    'cracked_deepslate_tiles': 'cracked_deepslate_tiles',
    'polished_deepslate': 'polished_deepslate',
    'chiseled_deepslate': 'chiseled_deepslate',
    'cobbled_deepslate': 'cobbled_deepslate',
    // Deepslate stairs/slabs - map to their base texture
    'deepslate_tile_stairs': 'deepslate_tiles',
    'deepslate_tile_slab': 'deepslate_tiles',
    'deepslate_brick_stairs': 'deepslate_bricks',
    'deepslate_brick_slab': 'deepslate_bricks',
    'polished_deepslate_stairs': 'polished_deepslate',
    'polished_deepslate_slab': 'polished_deepslate',
    'cobbled_deepslate_stairs': 'cobbled_deepslate',
    'cobbled_deepslate_slab': 'cobbled_deepslate',
    // AI sometimes generates wrong names - map to closest
    'polished_deepslate_bricks': 'deepslate_bricks',  // This block doesn't exist, map to deepslate_bricks


    // Wood planks
    'planks': 'oak_planks',
    'oak_planks': 'oak_planks',
    'spruce_planks': 'spruce_planks',
    'birch_planks': 'birch_planks',
    'jungle_planks': 'jungle_planks',
    'acacia_planks': 'acacia_planks',
    'dark_oak_planks': 'dark_oak_planks',
    'crimson_planks': 'crimson_planks',
    'warped_planks': 'warped_planks',
    'mangrove_planks': 'mangrove_planks',
    'cherry_planks': 'cherry_planks',
    'bamboo_planks': 'bamboo_planks',

    // Logs
    'log': 'oak_log',
    'oak_log': 'oak_log',
    'spruce_log': 'spruce_log',
    'birch_log': 'birch_log',
    'jungle_log': 'jungle_log',
    'acacia_log': 'acacia_log',
    'dark_oak_log': 'dark_oak_log',
    'crimson_stem': 'crimson_stem',
    'warped_stem': 'warped_stem',
    'mangrove_log': 'mangrove_log',
    'cherry_log': 'cherry_log',

    // Stripped logs
    'stripped_oak_log': 'stripped_oak_log',
    'stripped_spruce_log': 'stripped_spruce_log',
    'stripped_birch_log': 'stripped_birch_log',
    'stripped_jungle_log': 'stripped_jungle_log',
    'stripped_acacia_log': 'stripped_acacia_log',
    'stripped_dark_oak_log': 'stripped_dark_oak_log',
    'stripped_crimson_stem': 'stripped_crimson_stem',
    'stripped_warped_stem': 'stripped_warped_stem',
    'stripped_mangrove_log': 'stripped_mangrove_log',
    'stripped_cherry_log': 'stripped_cherry_log',

    // Wood blocks (bark on all sides) - map to log side texture
    'oak_wood': 'oak_log',
    'spruce_wood': 'spruce_log',
    'birch_wood': 'birch_log',
    'jungle_wood': 'jungle_log',
    'acacia_wood': 'acacia_log',
    'dark_oak_wood': 'dark_oak_log',
    'crimson_hyphae': 'crimson_stem',
    'warped_hyphae': 'warped_stem',
    'mangrove_wood': 'mangrove_log',
    'cherry_wood': 'cherry_log',
    
    // Stripped wood blocks
    'stripped_oak_wood': 'stripped_oak_log',
    'stripped_spruce_wood': 'stripped_spruce_log',
    'stripped_birch_wood': 'stripped_birch_log',
    'stripped_jungle_wood': 'stripped_jungle_log',
    'stripped_acacia_wood': 'stripped_acacia_log',
    'stripped_dark_oak_wood': 'stripped_dark_oak_log',
    'stripped_crimson_hyphae': 'stripped_crimson_stem',
    'stripped_warped_hyphae': 'stripped_warped_stem',
    'stripped_mangrove_wood': 'stripped_mangrove_log',
    'stripped_cherry_wood': 'stripped_cherry_log',

    // Slabs (map to their base block texture)
    'oak_slab': 'oak_planks',
    'spruce_slab': 'spruce_planks',
    'birch_slab': 'birch_planks',
    'jungle_slab': 'jungle_planks',
    'acacia_slab': 'acacia_planks',
    'dark_oak_slab': 'dark_oak_planks',
    'crimson_slab': 'crimson_planks',
    'warped_slab': 'warped_planks',
    'stone_slab': 'stone',
    'cobblestone_slab': 'cobblestone',
    'stone_brick_slab': 'stone_bricks',
    'brick_slab': 'bricks',
    'quartz_slab': 'quartz_block_side',
    'smooth_stone_slab': 'smooth_stone',
    'polished_andesite_slab': 'polished_andesite',
    'sandstone_slab': 'sandstone',
    'red_sandstone_slab': 'red_sandstone',
    'cut_sandstone_slab': 'cut_sandstone',
    'nether_brick_slab': 'nether_bricks',
    'red_nether_brick_slab': 'red_nether_bricks',
    'prismarine_slab': 'prismarine',
    'dark_prismarine_slab': 'dark_prismarine',
    'prismarine_brick_slab': 'prismarine_bricks',
    'granite_slab': 'granite',
    'diorite_slab': 'diorite',
    'andesite_slab': 'andesite',
    'polished_granite_slab': 'polished_granite',
    'polished_diorite_slab': 'polished_diorite',
    'mossy_stone_brick_slab': 'mossy_stone_bricks',
    'mossy_cobblestone_slab': 'mossy_cobblestone',
    'blackstone_slab': 'blackstone',
    'polished_blackstone_slab': 'polished_blackstone',
    'mud_brick_slab': 'mud_bricks',
    'bamboo_slab': 'bamboo_planks',
    'cherry_slab': 'cherry_planks',
    'mangrove_slab': 'mangrove_planks',

    // Stairs (map to their base block texture)
    'oak_stairs': 'oak_planks',
    'spruce_stairs': 'spruce_planks',
    'birch_stairs': 'birch_planks',
    'jungle_stairs': 'jungle_planks',
    'acacia_stairs': 'acacia_planks',
    'dark_oak_stairs': 'dark_oak_planks',
    'cobblestone_stairs': 'cobblestone',
    'stone_brick_stairs': 'stone_bricks',
    'brick_stairs': 'bricks',
    'quartz_stairs': 'quartz_block_side',
    'sandstone_stairs': 'sandstone',
    'red_sandstone_stairs': 'red_sandstone',
    'nether_brick_stairs': 'nether_bricks',
    'red_nether_brick_stairs': 'red_nether_bricks',
    'prismarine_stairs': 'prismarine',
    'dark_prismarine_stairs': 'dark_prismarine',
    'prismarine_brick_stairs': 'prismarine_bricks',
    'granite_stairs': 'granite',
    'diorite_stairs': 'diorite',
    'andesite_stairs': 'andesite',
    'polished_granite_stairs': 'polished_granite',
    'polished_diorite_stairs': 'polished_diorite',
    'polished_andesite_stairs': 'polished_andesite',
    'stone_stairs': 'stone',
    'mossy_stone_brick_stairs': 'mossy_stone_bricks',
    'mossy_cobblestone_stairs': 'mossy_cobblestone',
    'blackstone_stairs': 'blackstone',
    'polished_blackstone_stairs': 'polished_blackstone',
    'crimson_stairs': 'crimson_planks',
    'warped_stairs': 'warped_planks',
    'bamboo_stairs': 'bamboo_planks',
    'cherry_stairs': 'cherry_planks',
    'mangrove_stairs': 'mangrove_planks',
    'mud_brick_stairs': 'mud_bricks',

    // Leaves
    'leaves': 'oak_leaves',
    'oak_leaves': 'oak_leaves',
    'spruce_leaves': 'spruce_leaves',
    'birch_leaves': 'birch_leaves',
    'jungle_leaves': 'jungle_leaves',
    'acacia_leaves': 'acacia_leaves',
    'dark_oak_leaves': 'dark_oak_leaves',
    'azalea_leaves': 'azalea_leaves',
    'cherry_leaves': 'cherry_leaves',
    'mangrove_leaves': 'mangrove_leaves',

    // Bricks & Walls
    'brick': 'bricks',
    'bricks': 'bricks',
    'brick_wall': 'bricks',
    'stone_brick_wall': 'stone_bricks',
    'cobblestone_wall': 'cobblestone',
    'mossy_cobblestone_wall': 'mossy_cobblestone',
    'deepslate_brick_wall': 'deepslate_bricks',
    'deepslate_tile_wall': 'deepslate_tiles',

    // Glass - All 16 colors
    'glass': 'glass',
    'glass_pane': 'glass',
    'tinted_glass': 'tinted_glass',
    // White
    'white_stained_glass': 'white_stained_glass',
    'white_stained_glass_pane': 'white_stained_glass',
    // Orange
    'orange_stained_glass': 'orange_stained_glass',
    'orange_stained_glass_pane': 'orange_stained_glass',
    // Magenta
    'magenta_stained_glass': 'magenta_stained_glass',
    'magenta_stained_glass_pane': 'magenta_stained_glass',
    // Light Blue
    'light_blue_stained_glass': 'light_blue_stained_glass',
    'light_blue_stained_glass_pane': 'light_blue_stained_glass',
    // Yellow
    'yellow_stained_glass': 'yellow_stained_glass',
    'yellow_stained_glass_pane': 'yellow_stained_glass',
    // Lime
    'lime_stained_glass': 'lime_stained_glass',
    'lime_stained_glass_pane': 'lime_stained_glass',
    // Pink
    'pink_stained_glass': 'pink_stained_glass',
    'pink_stained_glass_pane': 'pink_stained_glass',
    // Gray
    'gray_stained_glass': 'gray_stained_glass',
    'gray_stained_glass_pane': 'gray_stained_glass',
    // Light Gray
    'light_gray_stained_glass': 'light_gray_stained_glass',
    'light_gray_stained_glass_pane': 'light_gray_stained_glass',
    // Cyan
    'cyan_stained_glass': 'cyan_stained_glass',
    'cyan_stained_glass_pane': 'cyan_stained_glass',
    // Purple
    'purple_stained_glass': 'purple_stained_glass',
    'purple_stained_glass_pane': 'purple_stained_glass',
    // Blue
    'blue_stained_glass': 'blue_stained_glass',
    'blue_stained_glass_pane': 'blue_stained_glass',
    // Brown
    'brown_stained_glass': 'brown_stained_glass',
    'brown_stained_glass_pane': 'brown_stained_glass',
    // Green
    'green_stained_glass': 'green_stained_glass',
    'green_stained_glass_pane': 'green_stained_glass',
    // Red
    'red_stained_glass': 'red_stained_glass',
    'red_stained_glass_pane': 'red_stained_glass',
    // Black
    'black_stained_glass': 'black_stained_glass',
    'black_stained_glass_pane': 'black_stained_glass',

    // Doors
    'oak_door': 'oak_door_bottom',
    'spruce_door': 'spruce_door_bottom',
    'birch_door': 'birch_door_bottom',
    'jungle_door': 'jungle_door_bottom',
    'acacia_door': 'acacia_door_bottom',
    'dark_oak_door': 'dark_oak_door_bottom',
    'iron_door': 'iron_door_bottom',
    'crimson_door': 'crimson_door_bottom',
    'warped_door': 'warped_door_bottom',

    // Concrete
    'white_concrete': 'white_concrete',
    'black_concrete': 'black_concrete',
    'gray_concrete': 'gray_concrete',
    'light_gray_concrete': 'light_gray_concrete',
    'red_concrete': 'red_concrete',
    'orange_concrete': 'orange_concrete',
    'yellow_concrete': 'yellow_concrete',
    'lime_concrete': 'lime_concrete',
    'green_concrete': 'green_concrete',
    'cyan_concrete': 'cyan_concrete',
    'light_blue_concrete': 'light_blue_concrete',
    'blue_concrete': 'blue_concrete',
    'purple_concrete': 'purple_concrete',
    'magenta_concrete': 'magenta_concrete',
    'pink_concrete': 'pink_concrete',
    'brown_concrete': 'brown_concrete',

    // Wool
    'white_wool': 'white_wool',
    'black_wool': 'black_wool',
    'gray_wool': 'gray_wool',
    'light_gray_wool': 'light_gray_wool',

    // Terracotta
    'terracotta': 'terracotta',
    'white_terracotta': 'white_terracotta',
    'orange_terracotta': 'orange_terracotta',
    'magenta_terracotta': 'magenta_terracotta',
    'light_blue_terracotta': 'light_blue_terracotta',
    'yellow_terracotta': 'yellow_terracotta',
    'lime_terracotta': 'lime_terracotta',
    'pink_terracotta': 'pink_terracotta',
    'gray_terracotta': 'gray_terracotta',
    'light_gray_terracotta': 'light_gray_terracotta',
    'cyan_terracotta': 'cyan_terracotta',
    'purple_terracotta': 'purple_terracotta',
    'blue_terracotta': 'blue_terracotta',
    'brown_terracotta': 'brown_terracotta',
    'green_terracotta': 'green_terracotta',
    'red_terracotta': 'red_terracotta',
    'black_terracotta': 'black_terracotta',

    // Metals & Ores
    'iron_block': 'iron_block',
    'gold_block': 'gold_block',
    'diamond_block': 'diamond_block',
    'emerald_block': 'emerald_block',
    'copper_block': 'copper_block',
    'netherite_block': 'netherite_block',

    // Misc
    'sand': 'sand',
    'gravel': 'gravel',
    'clay': 'clay',
    'snow_block': 'snow',
    'ice': 'ice',
    'packed_ice': 'packed_ice',
    'blue_ice': 'blue_ice',
    'obsidian': 'obsidian',
    'crying_obsidian': 'crying_obsidian',
    'glowstone': 'glowstone',
    'sea_lantern': 'sea_lantern',
    'shroomlight': 'shroomlight',
    // Note: lantern/torch/flower_pot textures are not cube-mappable, use fallback colors
    'bookshelf': 'bookshelf',
    'crafting_table': 'crafting_table_front',
    'furnace': 'furnace_front',
    'barrel': 'barrel_side',
    'quartz_block': 'quartz_block_side',
    'smooth_quartz': 'quartz_block_bottom',
    'prismarine': 'prismarine',
    'dark_prismarine': 'dark_prismarine',

    // Carpets (map to wool textures)
    'white_carpet': 'white_wool',
    'black_carpet': 'black_wool',
    'gray_carpet': 'gray_wool',
    'light_gray_carpet': 'light_gray_wool',
    'red_carpet': 'red_wool',
    'blue_carpet': 'blue_wool',
    'green_carpet': 'green_wool',
    'brown_carpet': 'brown_wool',
    'orange_carpet': 'orange_wool',
    'yellow_carpet': 'yellow_wool',
    'lime_carpet': 'lime_wool',
    'pink_carpet': 'pink_wool',
    'cyan_carpet': 'cyan_wool',
    'purple_carpet': 'purple_wool',
    'magenta_carpet': 'magenta_wool',
    'light_blue_carpet': 'light_blue_wool',
    
    // Fences (map to their wood planks texture)
    'oak_fence': 'oak_planks',
    'spruce_fence': 'spruce_planks',
    'birch_fence': 'birch_planks',
    'jungle_fence': 'jungle_planks',
    'acacia_fence': 'acacia_planks',
    'dark_oak_fence': 'dark_oak_planks',
    'crimson_fence': 'crimson_planks',
    'warped_fence': 'warped_planks',
    'nether_brick_fence': 'nether_bricks',
    'bamboo_fence': 'bamboo_planks',
    'cherry_fence': 'cherry_planks',
    'mangrove_fence': 'mangrove_planks',
    
    // Fence Gates
    'oak_fence_gate': 'oak_planks',
    'spruce_fence_gate': 'spruce_planks',
    'birch_fence_gate': 'birch_planks',
    'jungle_fence_gate': 'jungle_planks',
    'acacia_fence_gate': 'acacia_planks',
    'dark_oak_fence_gate': 'dark_oak_planks',
    'crimson_fence_gate': 'crimson_planks',
    'warped_fence_gate': 'warped_planks',
    'bamboo_fence_gate': 'bamboo_planks',
    'cherry_fence_gate': 'cherry_planks',
    'mangrove_fence_gate': 'mangrove_planks',
    
    // Trapdoors
    'oak_trapdoor': 'oak_trapdoor',
    'spruce_trapdoor': 'spruce_trapdoor',
    'birch_trapdoor': 'birch_trapdoor',
    'jungle_trapdoor': 'jungle_trapdoor',
    'acacia_trapdoor': 'acacia_trapdoor',
    'dark_oak_trapdoor': 'dark_oak_trapdoor',
    'iron_trapdoor': 'iron_trapdoor',
    'crimson_trapdoor': 'crimson_trapdoor',
    'warped_trapdoor': 'warped_trapdoor',
    'bamboo_trapdoor': 'bamboo_trapdoor',
    'cherry_trapdoor': 'cherry_trapdoor',
    'mangrove_trapdoor': 'mangrove_trapdoor',
    
    // Crops (map to their mature stage)
    'wheat': 'wheat_stage7',
    'carrots': 'carrots_stage3',
    'potatoes': 'potatoes_stage3',
    'beetroots': 'beetroots_stage3',
    'nether_wart': 'nether_wart_stage2',
    
    // Flowers
    'dandelion': 'dandelion',
    'poppy': 'poppy',
    'blue_orchid': 'blue_orchid',
    'allium': 'allium',
    'azure_bluet': 'azure_bluet',
    'red_tulip': 'red_tulip',
    'orange_tulip': 'orange_tulip',
    'white_tulip': 'white_tulip',
    'pink_tulip': 'pink_tulip',
    'oxeye_daisy': 'oxeye_daisy',
    'cornflower': 'cornflower',
    'lily_of_the_valley': 'lily_of_the_valley',
    'wither_rose': 'wither_rose',
    'torchflower': 'torchflower',
    
    // Grass & Ferns
    'short_grass': 'short_grass',
    'tall_grass': 'tall_grass_top',
    'fern': 'fern',
    'large_fern': 'large_fern_top',
    'dead_bush': 'dead_bush',
    'seagrass': 'seagrass',
    
    // Saplings
    'oak_sapling': 'oak_sapling',
    'spruce_sapling': 'spruce_sapling',
    'birch_sapling': 'birch_sapling',
    'jungle_sapling': 'jungle_sapling',
    'acacia_sapling': 'acacia_sapling',
    'dark_oak_sapling': 'dark_oak_sapling',
    'cherry_sapling': 'cherry_sapling',
    
    // Mushrooms
    'red_mushroom': 'red_mushroom',
    'brown_mushroom': 'brown_mushroom',
    'crimson_fungus': 'crimson_fungus',
    'warped_fungus': 'warped_fungus',
    
    // Other plants
    'sweet_berry_bush': 'sweet_berry_bush_stage3',
    'sugar_cane': 'sugar_cane',
    'bamboo': 'bamboo_stalk',
    'nether_sprouts': 'nether_sprouts',
    'warped_roots': 'warped_roots',
    'crimson_roots': 'crimson_roots',
    'cave_vines': 'cave_vines',
    'cave_vines_plant': 'cave_vines_plant',
    'kelp': 'kelp',
    'kelp_plant': 'kelp_plant',
    
    // Farming blocks
    'farmland': 'farmland_moist',
    'dirt': 'dirt',
    'coarse_dirt': 'coarse_dirt',
    'rooted_dirt': 'rooted_dirt',
    'grass_block': 'grass_block_side',
    'podzol': 'podzol_top',
    'mycelium': 'mycelium_top',
    'moss_block': 'moss_block',
    'mud': 'mud',
    
    // Nether blocks
    'netherrack': 'netherrack',
    'nether_bricks': 'nether_bricks',
    'red_nether_bricks': 'red_nether_bricks',
    'soul_sand': 'soul_sand',
    'soul_soil': 'soul_soil',
    'basalt': 'basalt_side',
    'polished_basalt': 'polished_basalt_side',
    'blackstone': 'blackstone',
    'polished_blackstone': 'polished_blackstone',
    'polished_blackstone_bricks': 'polished_blackstone_bricks',
    'gilded_blackstone': 'gilded_blackstone',
    'magma_block': 'magma',
    'ancient_debris': 'ancient_debris_side',
    
    // Misc functional blocks
    'campfire': 'campfire_log',
    'soul_campfire': 'soul_campfire_log',
    'cauldron': 'cauldron_side',
    'composter': 'composter_side',
    'smoker': 'smoker_front',
    'blast_furnace': 'blast_furnace_front',
    'stonecutter': 'stonecutter_side',
    'grindstone': 'grindstone_side',
    'lectern': 'lectern_front',
    'note_block': 'note_block',
    'jukebox': 'jukebox_side',
    'hopper': 'hopper_outside',
    'iron_bars': 'iron_bars',
    'chain': 'chain',
    'rail': 'rail',
    'powered_rail': 'powered_rail',
    'detector_rail': 'detector_rail',
    'activator_rail': 'activator_rail',
    'lily_pad': 'lily_pad',
    'water': 'water_still',
    'lava': 'lava_still',
};

// 发光方块列表（1.20.1 真实存在的发光方块）
// 这些方块使用 MeshBasicMaterial 保持固有明亮，不受光照影响（模拟自发光）
export const GLOW_BLOCKS = [
  'glowstone',
  'lantern',
  'soul_lantern',
  'sea_lantern',
  'magma_block',
  'shroomlight',
  'redstone_lamp',
  'torch',
  'wall_torch',
  'soul_torch',
  'redstone_torch',
  'cave_vines',
  'cave_vines_plant',
];

// 水方块列表（需要特殊半透明处理）
// water/flowing_water 会有动画效果，kelp/seagrass 走 cross 路径
export const WATER_BLOCKS = [
  'water',
  'flowing_water',
  'kelp',
  'kelp_plant',
  'seagrass',
  'tall_seagrass',
];

export const FALLBACK_COLORS = {
    // Woods
    'oak_planks': '#b8945f',
    'oak_log': '#6b4423',
    'oak_door': '#b8945f',
    'spruce_planks': '#5c4033',
    'spruce_log': '#3d2817',
    'birch_planks': '#c8b77a',
    'birch_log': '#f5f5dc',
    'jungle_planks': '#9a6e4a',
    'acacia_planks': '#ad5d32',
    'dark_oak_planks': '#3d2817',
    'dark_oak_log': '#2d1f12',
    'dark_oak_slab': '#3d2817',
    'dark_oak_stairs': '#3d2817',
    'stripped_oak_log': '#b8945f',
    'stripped_spruce_log': '#6b5032',
    'stripped_birch_log': '#c8b77a',
    'stripped_dark_oak_log': '#4a3423',
    'crimson_planks': '#6f2828',
    'warped_planks': '#2a6e6e',
    'cherry_planks': '#e4baba',
    'mangrove_planks': '#7a3f3f',
    'bamboo_planks': '#c4a84b',
    
    // Wood blocks (bark on all sides)
    'oak_wood': '#6b4423',
    'spruce_wood': '#3d2817',
    'birch_wood': '#f5f5dc',
    'jungle_wood': '#5a4a3a',
    'acacia_wood': '#6a6a6a',
    'dark_oak_wood': '#2d1f12',
    'crimson_hyphae': '#5a1a1a',
    'warped_hyphae': '#1a5a5a',
    'mangrove_wood': '#5a3030',
    'cherry_wood': '#d4a0a0',
    
    // Stripped wood blocks
    'stripped_oak_wood': '#b8945f',
    'stripped_spruce_wood': '#6b5032',
    'stripped_birch_wood': '#c8b77a',
    'stripped_jungle_wood': '#9a6e4a',
    'stripped_acacia_wood': '#ad5d32',
    'stripped_dark_oak_wood': '#4a3423',
    'stripped_crimson_hyphae': '#8a4040',
    'stripped_warped_hyphae': '#3a8a8a',
    'stripped_mangrove_wood': '#7a4040',
    'stripped_cherry_wood': '#e4baba',

    // Stone variants
    'stone': '#8a8a8a',
    'cobblestone': '#7a7a7a',
    'stone_bricks': '#888888',
    'mossy_stone_bricks': '#6a7a6a',
    'smooth_stone': '#9a9a9a',
    'polished_andesite': '#8a8a8a',
    'polished_diorite': '#c0c0c0',
    'polished_granite': '#9a6a5a',

    // Deepslate
    'deepslate': '#4a4a55',
    'deepslate_bricks': '#3d3d48',
    'deepslate_tiles': '#363644',
    'cracked_deepslate_bricks': '#3a3a45',
    'cracked_deepslate_tiles': '#333340',
    'polished_deepslate': '#484855',
    'chiseled_deepslate': '#404050',
    'cobbled_deepslate': '#4a4a55',
    // Deepslate stairs/slabs
    'deepslate_tile_stairs': '#363644',
    'deepslate_tile_slab': '#363644',
    'deepslate_brick_stairs': '#3d3d48',
    'deepslate_brick_slab': '#3d3d48',
    'polished_deepslate_stairs': '#484855',
    'polished_deepslate_slab': '#484855',
    'cobbled_deepslate_stairs': '#4a4a55',
    'cobbled_deepslate_slab': '#4a4a55',
    // AI incorrect names
    'polished_deepslate_bricks': '#3d3d48',


    // Bricks & Walls
    'bricks': '#9b5a4a',
    'brick_wall': '#9b5a4a',
    'stone_brick_wall': '#888888',
    'cobblestone_wall': '#7a7a7a',

    // Glass - All 16 colors (fallback colors)
    'glass': '#c0e8f8',
    'glass_pane': '#c0e8f8',
    'tinted_glass': '#2a2a3a',
    'white_stained_glass': '#f0f0f0',
    'white_stained_glass_pane': '#f0f0f0',
    'orange_stained_glass': '#d87f33',
    'orange_stained_glass_pane': '#d87f33',
    'magenta_stained_glass': '#b24cd8',
    'magenta_stained_glass_pane': '#b24cd8',
    'light_blue_stained_glass': '#6699d8',
    'light_blue_stained_glass_pane': '#6699d8',
    'yellow_stained_glass': '#e5e533',
    'yellow_stained_glass_pane': '#e5e533',
    'lime_stained_glass': '#7fcc19',
    'lime_stained_glass_pane': '#7fcc19',
    'pink_stained_glass': '#f27fa5',
    'pink_stained_glass_pane': '#f27fa5',
    'gray_stained_glass': '#4c4c4c',
    'gray_stained_glass_pane': '#4c4c4c',
    'light_gray_stained_glass': '#999999',
    'light_gray_stained_glass_pane': '#999999',
    'cyan_stained_glass': '#4c7f99',
    'cyan_stained_glass_pane': '#4c7f99',
    'purple_stained_glass': '#7f3fb2',
    'purple_stained_glass_pane': '#7f3fb2',
    'blue_stained_glass': '#334cb2',
    'blue_stained_glass_pane': '#334cb2',
    'brown_stained_glass': '#664c33',
    'brown_stained_glass_pane': '#664c33',
    'green_stained_glass': '#667f33',
    'green_stained_glass_pane': '#667f33',
    'red_stained_glass': '#993333',
    'red_stained_glass_pane': '#993333',
    'black_stained_glass': '#191919',
    'black_stained_glass_pane': '#191919',

    // Concrete
    'white_concrete': '#cfd5d6',
    'black_concrete': '#080a0f',
    'gray_concrete': '#36393d',
    'light_gray_concrete': '#7d7d73',
    'red_concrete': '#8e2121',
    'orange_concrete': '#e06101',
    'yellow_concrete': '#f0af15',
    'lime_concrete': '#5ea918',
    'green_concrete': '#495b24',
    'cyan_concrete': '#157788',
    'light_blue_concrete': '#2389c6',
    'blue_concrete': '#2c2e8f',
    'purple_concrete': '#64209c',
    'magenta_concrete': '#a9309f',
    'pink_concrete': '#d5658e',
    'brown_concrete': '#603b1f',

    // Metals
    'iron_block': '#d8d8d8',
    'gold_block': '#f9d849',
    'diamond_block': '#62ece8',
    'emerald_block': '#2ed151',
    'copper_block': '#c06b4e',
    'netherite_block': '#423d3f',

    // Lights
    'torch': '#ffcc00',
    'glowstone': '#ffdd66',
    'sea_lantern': '#a8e4e4',
    'shroomlight': '#f9a825',
    'lantern': '#e8a93c',

    // Misc
    'sand': '#e0d6a8',
    'gravel': '#8a8078',
    'clay': '#a0a0b0',
    'snow_block': '#fafafa',
    'ice': '#8eb8e8',
    'packed_ice': '#7aa8d8',
    'blue_ice': '#6a98e8',
    'obsidian': '#0f0a18',
    'bookshelf': '#6b4423',
    'quartz_block': '#ece8e0',
    'prismarine': '#5a9a8a',
    'dark_prismarine': '#3a5a4a',

    // Decorative
    'flower_pot': '#8b4513',
    'potted_oak_sapling': '#8b4513',
    'potted_spruce_sapling': '#8b4513',
    'potted_birch_sapling': '#8b4513',
    'potted_fern': '#8b4513',
    'potted_dandelion': '#8b4513',
    'potted_poppy': '#8b4513',
    'potted_cactus': '#8b4513',
    'potted_azalea_bush': '#8b4513',
    'wall_torch': '#ffcc00',
    'soul_torch': '#66ffff',
    'redstone_torch': '#ff4444',
    'candle': '#e8d8b8',
    'white_candle': '#f0f0f0',
    'black_candle': '#1a1a1a',
    'red_candle': '#aa2020',
    'blue_candle': '#2020aa',
    'soul_lantern': '#66dddd',

    // Buttons (use wood/stone colors)
    'oak_button': '#b8945f',
    'spruce_button': '#5c4033',
    'birch_button': '#c8b77a',
    'jungle_button': '#9a6e4a',
    'acacia_button': '#ad5d32',
    'dark_oak_button': '#3d2817',
    'stone_button': '#8a8a8a',
    'polished_blackstone_button': '#2a2a30',

    // Plants
    'sweet_berry_bush': '#4a8a4a',
    'dead_bush': '#8b7355',
    'fern': '#4a8a4a',
    'large_fern': '#4a8a4a',
    'grass': '#5a9a4a',
    'short_grass': '#5a9a4a',
    'tall_grass': '#5a9a4a',
    'seagrass': '#3a8a6a',
    'kelp': '#3a7a5a',
    'kelp_plant': '#3a7a5a',
    
    // Flowers
    'dandelion': '#f0d000',
    'poppy': '#e02020',
    'blue_orchid': '#2090d0',
    'allium': '#b060d0',
    'azure_bluet': '#e0e0f0',
    'red_tulip': '#e02020',
    'orange_tulip': '#e07020',
    'white_tulip': '#f0f0f0',
    'pink_tulip': '#e080a0',
    'oxeye_daisy': '#f0f0a0',
    'cornflower': '#4060d0',
    'lily_of_the_valley': '#f0f0f0',
    'wither_rose': '#202020',
    'torchflower': '#e08020',
    'sunflower': '#f0d000',
    'lilac': '#c080c0',
    'rose_bush': '#c02020',
    'peony': '#e0a0c0',
    
    // Saplings
    'oak_sapling': '#4a8a4a',
    'spruce_sapling': '#2a5a3a',
    'birch_sapling': '#5a9a5a',
    'jungle_sapling': '#3a7a3a',
    'acacia_sapling': '#5a8a4a',
    'dark_oak_sapling': '#2a5a2a',
    'cherry_sapling': '#e0a0b0',
    'azalea': '#5a8a5a',
    'flowering_azalea': '#c080a0',
    
    // Mushrooms
    'red_mushroom': '#c02020',
    'brown_mushroom': '#8a6a4a',
    'crimson_fungus': '#8a2020',
    'warped_fungus': '#2a8a8a',
    
    // Nether plants
    'nether_sprouts': '#2a8a8a',
    'warped_roots': '#2a8a8a',
    'crimson_roots': '#8a2020',
    'nether_wart': '#6a2020',
    
    // Vines
    'cave_vines': '#4a8a4a',
    'cave_vines_plant': '#4a8a4a',
    'bamboo': '#6a9a4a',
    'sugar_cane': '#8ac060',
    
    // Crops
    'wheat': '#d4b84a',
    'carrots': '#e07020',
    'potatoes': '#c4a060',
    'beetroots': '#8a2020',
    'melon': '#6a9a30',
    'pumpkin': '#d07010',
    'sugar_cane': '#8ac060',
    
    // Farming
    'farmland': '#6a4a2a',
    'dirt': '#8b6b4a',
    'coarse_dirt': '#7a5a3a',
    'rooted_dirt': '#7a5a3a',
    'grass_block': '#5a9a4a',
    'podzol': '#6a5030',
    'mycelium': '#8a7080',
    'moss_block': '#5a7a4a',
    'mud': '#4a3a3a',
    'muddy_mangrove_roots': '#4a3a3a',
    
    // Fences & Gates
    'oak_fence': '#b8945f',
    'spruce_fence': '#5c4033',
    'birch_fence': '#c8b77a',
    'jungle_fence': '#9a6e4a',
    'acacia_fence': '#ad5d32',
    'dark_oak_fence': '#3d2817',
    'crimson_fence': '#6f2828',
    'warped_fence': '#2a6e6e',
    'nether_brick_fence': '#2d1a1a',
    'bamboo_fence': '#c4a84b',
    'cherry_fence': '#e4baba',
    'mangrove_fence': '#7a3f3f',
    'oak_fence_gate': '#b8945f',
    'spruce_fence_gate': '#5c4033',
    'birch_fence_gate': '#c8b77a',
    'jungle_fence_gate': '#9a6e4a',
    'acacia_fence_gate': '#ad5d32',
    'dark_oak_fence_gate': '#3d2817',
    'crimson_fence_gate': '#6f2828',
    'warped_fence_gate': '#2a6e6e',
    'bamboo_fence_gate': '#c4a84b',
    'cherry_fence_gate': '#e4baba',
    'mangrove_fence_gate': '#7a3f3f',
    
    // Trapdoors
    'oak_trapdoor': '#b8945f',
    'spruce_trapdoor': '#5c4033',
    'birch_trapdoor': '#c8b77a',
    'jungle_trapdoor': '#9a6e4a',
    'acacia_trapdoor': '#ad5d32',
    'dark_oak_trapdoor': '#3d2817',
    'iron_trapdoor': '#d8d8d8',
    'crimson_trapdoor': '#6f2828',
    'warped_trapdoor': '#2a6e6e',
    
    // Doors
    'spruce_door': '#5c4033',
    'birch_door': '#c8b77a',
    'jungle_door': '#9a6e4a',
    'acacia_door': '#ad5d32',
    'dark_oak_door': '#3d2817',
    'iron_door': '#d8d8d8',
    'crimson_door': '#6f2828',
    'warped_door': '#2a6e6e',
    
    // Stairs
    'oak_stairs': '#b8945f',
    'spruce_stairs': '#5c4033',
    'birch_stairs': '#c8b77a',
    'jungle_stairs': '#9a6e4a',
    'acacia_stairs': '#ad5d32',
    'stone_stairs': '#8a8a8a',
    'cobblestone_stairs': '#7a7a7a',
    'stone_brick_stairs': '#888888',
    'mossy_stone_brick_stairs': '#6a7a6a',
    'brick_stairs': '#9b5a4a',
    'sandstone_stairs': '#e0d6a8',
    'red_sandstone_stairs': '#b86030',
    'nether_brick_stairs': '#2d1a1a',
    'red_nether_brick_stairs': '#4a1a1a',
    'quartz_stairs': '#ece8e0',
    'prismarine_stairs': '#5a9a8a',
    'dark_prismarine_stairs': '#3a5a4a',
    'purpur_stairs': '#a070a0',
    'polished_blackstone_stairs': '#2a2a30',
    'polished_blackstone_brick_stairs': '#2a2a30',
    'cut_copper_stairs': '#c06b4e',
    'bamboo_stairs': '#c4a84b',
    'cherry_stairs': '#e4baba',
    
    // Slabs
    'oak_slab': '#b8945f',
    'spruce_slab': '#5c4033',
    'birch_slab': '#c8b77a',
    'jungle_slab': '#9a6e4a',
    'acacia_slab': '#ad5d32',
    'stone_slab': '#8a8a8a',
    'cobblestone_slab': '#7a7a7a',
    'stone_brick_slab': '#888888',
    'brick_slab': '#9b5a4a',
    'sandstone_slab': '#e0d6a8',
    'quartz_slab': '#ece8e0',
    'smooth_stone_slab': '#9a9a9a',
    'smooth_quartz_slab': '#ece8e0',
    'cut_copper_slab': '#c06b4e',
    
    // Nether blocks
    'netherrack': '#6a3030',
    'nether_bricks': '#2d1a1a',
    'red_nether_bricks': '#4a1a1a',
    'soul_sand': '#5a4a3a',
    'soul_soil': '#4a3a2a',
    'basalt': '#4a4a50',
    'polished_basalt': '#5a5a60',
    'blackstone': '#2a2a30',
    'polished_blackstone': '#2a2a30',
    'polished_blackstone_bricks': '#2a2a30',
    'gilded_blackstone': '#3a3a30',
    'crying_obsidian': '#2a1a4a',
    'ancient_debris': '#5a4a40',
    'glowstone': '#ffdd66',
    'magma_block': '#8a3010',
    
    // Wool
    'white_wool': '#f0f0f0',
    'black_wool': '#1a1a1a',
    'gray_wool': '#4a4a4a',
    'light_gray_wool': '#8a8a8a',
    'red_wool': '#9a2020',
    'blue_wool': '#2020aa',
    'green_wool': '#209a20',
    'brown_wool': '#6b4423',
    'orange_wool': '#d06000',
    'yellow_wool': '#d0c000',
    'lime_wool': '#6ac000',
    'pink_wool': '#d070a0',
    'cyan_wool': '#009090',
    'purple_wool': '#802080',
    'magenta_wool': '#a030a0',
    'light_blue_wool': '#4090d0',
    
    // Beds
    'white_bed': '#f0f0f0',
    'red_bed': '#9a2020',
    'blue_bed': '#2020aa',
    'green_bed': '#209a20',
    'black_bed': '#1a1a1a',
    'cyan_bed': '#009090',
    'orange_bed': '#d06000',
    'yellow_bed': '#d0c000',
    'pink_bed': '#d070a0',
    'purple_bed': '#802080',
    
    // Terracotta
    'terracotta': '#9a6a4a',
    'white_terracotta': '#d0c0b0',
    'black_terracotta': '#2a2020',
    'gray_terracotta': '#4a4040',
    'light_gray_terracotta': '#8a7a70',
    'red_terracotta': '#8a3030',
    'orange_terracotta': '#a05020',
    'yellow_terracotta': '#b09030',
    'brown_terracotta': '#5a3020',
    'cyan_terracotta': '#506060',
    
    // Misc blocks
    'campfire': '#d06000',
    'soul_campfire': '#40a0a0',
    'cauldron': '#4a4a4a',
    'water_cauldron': '#3060a0',
    'lava_cauldron': '#d04000',
    'composter': '#6a5030',
    'barrel': '#6a5030',
    'smoker': '#5a5050',
    'blast_furnace': '#5a5a5a',
    'furnace': '#6a6a6a',
    'crafting_table': '#8a6a4a',
    'cartography_table': '#6a5a4a',
    'fletching_table': '#8a7a5a',
    'smithing_table': '#3a3a4a',
    'loom': '#8a7a6a',
    'stonecutter': '#7a7a7a',
    'grindstone': '#6a6a6a',
    'lectern': '#8a6a4a',
    'note_block': '#6a4a3a',
    'jukebox': '#6a4a3a',
    'tripwire_hook': '#6a5a4a',
    'iron_bars': '#8a8a8a',
    'chain': '#4a4a5a',
    'hopper': '#4a4a4a',
    'activator_rail': '#6a3030',
    'detector_rail': '#6a4a4a',
    'powered_rail': '#d0a030',
    'rail': '#8a7a6a',
    'lily_pad': '#2a6a2a',
    'water': '#3060a0',
    'lava': '#d04000',

    // Other
    'chest': '#8b6914',
    'ender_chest': '#1a3a3a',
    'trapped_chest': '#8b6914',
    'brewing_stand': '#4a4a4a',
    'enchanting_table': '#2a1a4a',
    'anvil': '#4a4a4a',
    'bell': '#d4a017',
    'lever': '#6b4423',

    // Carpets
    'white_carpet': '#f0f0f0',
    'black_carpet': '#1a1a1a',
    'gray_carpet': '#4a4a4a',
    'light_gray_carpet': '#8a8a8a',
    'red_carpet': '#9a2020',
    'blue_carpet': '#2020aa',
    'green_carpet': '#209a20',
    'brown_carpet': '#6b4423',
    'orange_carpet': '#d06000',
    'yellow_carpet': '#d0c000',
    'lime_carpet': '#6ac000',
    'pink_carpet': '#d070a0',
    'cyan_carpet': '#009090',
    'purple_carpet': '#802080',
    'magenta_carpet': '#a030a0',
    'light_blue_carpet': '#4090d0',
    'moss_carpet': '#5a7a4a',

    'default': '#888888'
};

/**
 * 中文材质名 → 标准英文 ID 映射
 * 生成代码（尤其 opus5）常用中文直接写材质（如 \"石砖\"），渲染层必须归一化才能找贴图/颜色
 */
export const CN_MATERIAL_MAP = {
  // 石材
  '石砖': 'stone_bricks', '石头': 'stone', '圆石': 'cobblestone', '安山岩': 'andesite', '花岗岩': 'granite',
  '闪长岩': 'diorite', '深板岩': 'deepslate', '深板岩砖': 'deepslate_bricks', '磨制深板岩': 'polished_deepslate',
  '砂岩': 'sandstone', '红砂岩': 'red_sandstone', '石砖台阶': 'stone_brick_stairs', '苔石': 'mossy_cobblestone',
  // 木材
  '深色橡木原木': 'dark_oak_log', '深色橡木': 'dark_oak_log', '深色橡木木板': 'dark_oak_planks', '深色橡木柱': 'dark_oak_log',
  '橡木原木': 'oak_log', '橡木木板': 'oak_planks', '橡木': 'oak_log', '桦木原木': 'birch_log', '桦木木板': 'birch_planks',
  '云杉原木': 'spruce_log', '云杉木板': 'spruce_planks', '金合欢原木': 'acacia_log', '丛林木原木': 'jungle_log',
  '红树木原木': 'mangrove_log', '红树木板': 'mangrove_planks', '木板': 'oak_planks',
  // 墙面
  '白色混凝土': 'white_concrete', '白色混凝土墙': 'white_concrete', '白色陶瓦': 'white_terracotta',
  '混凝土': 'white_concrete', '黑曜石': 'obsidian', '石英块': 'quartz_block', '平滑石英': 'smooth_quartz',
  // 基础
  '草方块': 'grass_block', '泥土': 'dirt', '沙': 'sand', '沙子': 'sand', '砾石': 'gravel', '冰': 'ice',
  '玻璃': 'glass', '玻璃板': 'glass_pane', '书架': 'bookshelf', '灯笼': 'lantern', '萤石': 'glowstone',
  '海晶灯': 'sea_lantern', '岩浆块': 'magma_block', '荧石': 'glowstone',
  // 屋顶/瓦
  '瓦片': 'deepslate_tiles', '灰色瓦片': 'deepslate_tiles', '深灰瓦片': 'deepslate_tiles', '瓦': 'bricks',
  // 水/叶
  '水': 'water', '流动的水': 'flowing_water', '树叶': 'oak_leaves', '橡树叶': 'oak_leaves',
  '深色橡树叶': 'dark_oak_leaves', '树苗': 'oak_sapling'
};

/**
 * 解析方块纹理（综合别名和分面规则）
 * @param {string} type - 方块类型
 * @param {string} version - MC版本
 * @returns {{side: string, top: string, bottom: string, fallbackColor: string}}
 */
export function resolveBlockTextures(type, version = '1.20.1') {
  const lowerType = type.toLowerCase();
  // 中文材质名先归一化为标准英文 ID
  const normalized = CN_MATERIAL_MAP[lowerType] || lowerType;
  
  // 1. 获取分面纹理名
  const faceTextures = getFaceTextureNames(normalized);
  
  // 2. 对每个面应用别名映射（如果存在）
  const resolvedSide = BLOCK_TEXTURE_ALIASES[faceTextures.side] || faceTextures.side;
  const resolvedTop = BLOCK_TEXTURE_ALIASES[faceTextures.top] || faceTextures.top;
  const resolvedBottom = BLOCK_TEXTURE_ALIASES[faceTextures.bottom] || faceTextures.bottom;
  
  // 3. 获取兜底颜色
  const fallbackColor = FALLBACK_COLORS[normalized] || FALLBACK_COLORS['default'];
  
  return {
    side: resolvedSide,
    top: resolvedTop,
    bottom: resolvedBottom,
    fallbackColor
  };
}
