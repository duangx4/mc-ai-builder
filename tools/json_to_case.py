# -*- coding: utf-8 -*-
"""
结构 JSON → 建筑案例文档转换器
从解析出的结构数据中提取设计模式，生成 AI 可学习的案例文档
用法: python json_to_case.py <结构JSON目录> <输出目录> [--style 风格名]
"""
import sys, os, json, glob
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 方块分类
CATEGORIES = {
    '墙': ['stone_bricks', 'cobblestone', 'stone', 'bricks', 'sandstone', 'cut_sandstone', 'smooth_sandstone',
           'red_sandstone', 'deepslate_bricks', 'deepslate_tiles', 'polished_deepslate', 'blackstone',
           'polished_blackstone_bricks', 'nether_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks',
           'mud_bricks', 'prismarine', 'prismarine_bricks', 'dark_prismarine', 'end_stone_bricks',
           'purpur_block', 'quartz_block', 'smooth_quartz', 'white_concrete', 'light_gray_concrete',
           'terracotta', 'white_terracotta', 'oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks',
           'acacia_planks', 'dark_oak_planks', 'mangrove_planks', 'cherry_planks', 'bamboo_planks',
           'crimson_planks', 'warped_planks', 'polished_granite', 'polished_diorite', 'polished_andesite',
           'calcite', 'dripstone_block', 'tuff', 'smooth_basalt', 'packed_mud'],
    '框架/柱': ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log',
              'cherry_log', 'stripped_oak_log', 'stripped_spruce_log', 'stripped_birch_log', 'stripped_jungle_log',
              'stripped_acacia_log', 'stripped_dark_oak_log', 'stripped_mangrove_log', 'oak_wood', 'spruce_wood',
              'dark_oak_wood', 'quartz_pillar', 'purpur_pillar', 'deepslate', 'polished_blackstone',
              'cobbled_deepslate', 'bone_block', 'basalt', 'blackstone', 'gilded_blackstone'],
    '屋顶': ['oak_stairs', 'spruce_stairs', 'birch_stairs', 'jungle_stairs', 'acacia_stairs', 'dark_oak_stairs',
            'mangrove_stairs', 'cherry_stairs', 'stone_stairs', 'cobblestone_stairs', 'stone_brick_stairs',
            'brick_stairs', 'sandstone_stairs', 'smooth_sandstone_stairs', 'red_sandstone_stairs',
            'quartz_stairs', 'purpur_stairs', 'prismarine_stairs', 'prismarine_brick_stairs',
            'dark_prismarine_stairs', 'deepslate_brick_stairs', 'deepslate_tile_stairs', 'nether_brick_stairs',
            'polished_blackstone_brick_stairs', 'mud_brick_stairs', 'blackstone_stairs', 'end_stone_brick_stairs'],
    '板/台阶': ['oak_slab', 'spruce_slab', 'birch_slab', 'jungle_slab', 'acacia_slab', 'dark_oak_slab',
              'mangrove_slab', 'cherry_slab', 'stone_slab', 'cobblestone_slab', 'stone_brick_slab',
              'brick_slab', 'sandstone_slab', 'smooth_sandstone_slab', 'red_sandstone_slab', 'quartz_slab',
              'purpur_slab', 'prismarine_slab', 'prismarine_brick_slab', 'dark_prismarine_slab',
              'deepslate_brick_slab', 'deepslate_tile_slab', 'nether_brick_slab', 'polished_blackstone_brick_slab',
              'mud_brick_slab', 'blackstone_slab', 'end_stone_brick_slab', 'smooth_stone_slab',
              'polished_andesite_slab', 'polished_granite_slab', 'polished_diorite_slab', 'petrified_oak_slab'],
    '门窗': ['oak_door', 'spruce_door', 'birch_door', 'jungle_door', 'acacia_door', 'dark_oak_door',
            'mangrove_door', 'cherry_door', 'iron_door', 'oak_trapdoor', 'spruce_trapdoor', 'dark_oak_trapdoor',
            'iron_trapdoor', 'oak_fence_gate', 'spruce_fence_gate', 'jungle_fence_gate', 'dark_oak_fence_gate',
            'glass', 'glass_pane', 'white_stained_glass', 'light_blue_stained_glass', 'iron_bars',
            'oak_fence', 'spruce_fence', 'birch_fence', 'jungle_fence', 'acacia_fence', 'dark_oak_fence',
            'nether_brick_fence', 'polished_blackstone_fence'],
    '装饰': ['torch', 'lantern', 'soul_lantern', 'soul_torch', 'candle', 'flower_pot', 'cauldron', 'chest',
            'crafting_table', 'furnace', 'bookshelf', 'red_bed', 'white_bed', 'brown_bed', 'yellow_bed',
            'cyan_bed', 'ladder', 'vine', 'cobweb', 'chain', 'banner', 'white_banner', 'red_banner',
            'blue_banner', 'green_banner', 'barrel', 'campfire', 'soul_campfire', 'spruce_sign', 'oak_sign',
            'armor_stand', 'painting', 'item_frame', 'brewing_stand', 'enchanting_table', 'anvil',
            'grindstone', 'smithing_table', 'fletching_table', 'cartography_table', 'loom', 'stonecutter',
            'composter', 'lectern', 'hay_block', 'melon', 'pumpkin', 'wheat', 'carrots', 'potatoes',
            'beetroots', 'sweet_berry_bush', 'cocoa', 'kelp', 'seagrass', 'tall_seagrass', 'fern',
            'large_fern', 'grass', 'tall_grass', 'dandelion', 'poppy', 'blue_orchid', 'azure_bluet',
            'cornflower', 'lily_of_the_valley', 'allium', 'oxeye_daisy', 'sunflower', 'lilac', 'peony',
            'rose_bush', 'brown_mushroom', 'red_mushroom', 'crimson_fungus', 'warped_fungus',
            'crimson_roots', 'warped_roots', 'nether_wart', 'sugar_cane', 'bamboo', 'cactus',
            'dead_bush', 'moss_block', 'moss_carpet', 'azalea', 'flowering_azalea', 'spore_blossom'],
    '地面/环境': ['grass_block', 'dirt', 'coarse_dirt', 'podzol', 'mycelium', 'sand', 'red_sand', 'gravel',
               'clay', 'mud', 'farmland', 'path', 'dirt_path', 'stone', 'andesite', 'diorite', 'granite',
               'bedrock', 'water', 'lava', 'snow', 'snow_block', 'ice', 'packed_ice', 'blue_ice',
               'obsidian', 'crying_obsidian', 'netherrack', 'soul_sand', 'soul_soil', 'warped_nylium',
               'crimson_nylium', 'end_stone', 'cobblestone', 'mossy_cobblestone', 'tuff', 'calcite',
               'smooth_basalt', 'dripstone_block', 'pointed_dripstone', 'coral_block', 'tube_coral_block',
               'brain_coral_block', 'bubble_coral_block', 'fire_coral_block', 'horn_coral_block',
               'tube_coral', 'brain_coral', 'bubble_coral', 'fire_coral', 'horn_coral',
               'sponge', 'wet_sponge', 'sea_lantern', 'prismarine', 'dark_prismarine'],
    '特殊/结构': ['jigsaw', 'structure_block', 'structure_void', 'command_block', 'chain_command_block',
               'repeating_command_block', 'barrier', 'light', 'air', 'cave_air', 'void_air',
               'piston', 'sticky_piston', 'dispenser', 'dropper', 'hopper', 'observer',
               'redstone_lamp', 'redstone_torch', 'redstone_block', 'redstone_wire', 'lever',
               'stone_button', 'oak_button', 'stone_pressure_plate', 'oak_pressure_plate',
               'tnt', 'rail', 'powered_rail', 'detector_rail', 'minecart', 'chest_minecart',
               'tnt_minecart', 'hopper_minecart', 'spawner', 'mob_spawner', 'trial_spawner',
               'sculk', 'sculk_catalyst', 'sculk_sensor', 'sculk_shrieker', 'sculk_vein',
               'reinforced_deepslate', 'chiseled_deepslate', 'chiseled_nether_bricks',
               'chiseled_polished_blackstone', 'chiseled_quartz_block', 'chiseled_stone_bricks',
               'chiseled_sandstone', 'chiseled_red_sandstone', 'chiseled_bookshelf'],
}

def categorize(block):
    """判断方块属于哪个类别"""
    b = block.replace('minecraft:', '')
    # 先精确匹配
    for cat, blocks in CATEGORIES.items():
        if b in blocks:
            return cat
    # 按后缀推断
    if b.endswith('_stairs'): return '屋顶'
    if b.endswith('_slab'): return '板/台阶'
    if b.endswith('_door') or b.endswith('_trapdoor') or b.endswith('_fence_gate'):
        return '门窗'
    if b.endswith('_fence') or b.endswith('_wall') or b.endswith('_bars') or b.endswith('_pane'):
        return '门窗'
    if b.endswith('_log') or b.endswith('_wood') or b.endswith('_pillar'):
        return '框架/柱'
    if b.endswith('_planks'): return '墙'
    if b.endswith('_leaves'): return '装饰'
    if b.endswith('_carpet') or b.endswith('_wool'):
        return '装饰'
    if b in ('torch', 'lantern', 'soul_lantern', 'candle'): return '装饰'
    return '其他'

def analyze_structure(data):
    """分析结构，提取设计模式"""
    blocks = data.get('block_list', [])
    size = data.get('size', [0, 0, 0])
    w, h, d = size
    
    # 统计
    counter = Counter()
    category_counter = Counter()
    for b in blocks:
        name = b['block']
        counter[name] += 1
        category_counter[categorize(name)] += 1
    
    # 尺寸判定
    max_dim = max(w, h, d)
    if max_dim <= 8: size_label = '小型'
    elif max_dim <= 15: size_label = '中型'
    elif max_dim <= 25: size_label = '大型'
    else: size_label = '巨型'
    
    # 分层统计（y 层的主要方块）
    layers = defaultdict(Counter)
    for b in blocks:
        layers[b['y']][b['block']] += 1
    
    # 底部层（地基）
    base_layer = layers.get(0, Counter())
    # 顶部层（屋顶/天花）
    top_layer = layers.get(h - 1, Counter()) if h > 0 else Counter()
    
    return {
        'size': size,
        'size_label': size_label,
        'block_count': len(blocks),
        'palette': data.get('palette', []),
        'top_blocks': counter.most_common(15),
        'categories': category_counter,
        'base_layer': base_layer.most_common(5),
        'top_layer': top_layer.most_common(5),
        'width': w, 'height': h, 'depth': d,
    }

def blocks_to_code(blocks, size):
    """把方块列表转成 VoxelBuilder 近似代码（按层分组）"""
    w, h, d = size
    # 按 y 层分组
    by_layer = defaultdict(list)
    for b in blocks:
        by_layer[b['y']].append(b)
    
    lines = []
    lines.append(f"// 结构尺寸: {w}×{h}×{d}")
    lines.append(f"// 从原始结构数据转换，方块数: {len(blocks)}")
    lines.append("")
    
    # 找出主要结构模式
    # 1. 地基层 (y=0)
    base = [b for b in blocks if b['y'] == 0]
    if base:
        # 尝试找范围
        xs = [b['x'] for b in base]; zs = [b['z'] for b in base]
        if xs and zs:
            lines.append(f"// 地基 (y=0): x{min(xs)}-{max(xs)}, z{min(zs)}-{max(zs)}")
            # 统计主要方块
            c = Counter(b['block'] for b in base)
            main = c.most_common(3)
            lines.append(f"//   主要: {', '.join(f'{n}×{cnt}' for n, cnt in main)}")
    
    # 2. 墙体层 (中间)
    mid_blocks = [b for b in blocks if 0 < b['y'] < h - 1]
    if mid_blocks:
        c = Counter(b['block'] for b in mid_blocks)
        main = c.most_common(5)
        lines.append(f"// 墙体 (y=1-{h-2}): 主要方块 {', '.join(f'{n}×{cnt}' for n, cnt in main)}")
    
    # 3. 屋顶层
    roof = [b for b in blocks if b['y'] >= h - 1]
    if roof:
        c = Counter(b['block'] for b in roof)
        main = c.most_common(5)
        lines.append(f"// 屋顶 (y={h-1}+): 主要方块 {', '.join(f'{n}×{cnt}' for n, cnt in main)}")
    
    lines.append("")
    lines.append("// VoxelBuilder 代码结构：")
    lines.append("builder.defineComponent('structure', (b) => {")
    lines.append(f"  // 尺寸 {w}×{h}×{d}，实际使用时按需求调整比例")
    lines.append(f"  b.beginGroup('foundation', {{ priority: 10 }});")
    if base:
        xs = [b['x'] for b in base]; zs = [b['z'] for b in base]
        c = Counter(b['block'] for b in base)
        main_block = c.most_common(1)[0][0]
        lines.append(f"  b.fill(0, 0, 0, {w}, 0, {d}, '{main_block}');")
    lines.append("  b.endGroup();")
    lines.append("  // ... (墙体、门窗、屋顶按实际结构填充)")
    lines.append("});")
    
    return '\n'.join(lines)

def generate_case(data, output_dir, index=None, total=None):
    """生成单个案例文档"""
    cat = data.get('category_cn', data.get('category', 'unknown'))
    source = data.get('source', '')
    name = os.path.basename(source).replace('.nbt', '')
    analysis = analyze_structure(data)
    
    size = analysis['size']
    w, h, d = size
    size_label = analysis['size_label']
    
    # 风格推测（根据主要方块）
    top = [b for b, _ in analysis['top_blocks'][:5]]
    top_str = ', '.join(top)
    
    # 类别统计
    cats = analysis['categories']
    cat_str = ', '.join(f"{k}({v})" for k, v in cats.most_common(5))
    
    title = f"{cat} - {name}"
    
    doc = f"""---
name: {title}
description: {cat}建筑案例（{size_label}），尺寸 {w}×{h}×{d}，参考自 {source}
---

# 🏗️ {title}

## 基本信息

- **尺寸**: {w}×{h}×{d}（{size_label}建筑）
- **方块数**: {analysis['block_count']}
- **材料种类**: {len(analysis['palette'])} 种
- **来源**: `{source}`

## 材料分析

主要方块（按使用量）：

| 方块 | 数量 | 类别 |
|------|------|------|
"""
    for b, cnt in analysis['top_blocks'][:12]:
        doc += f"| `{b}` | {cnt} | {categorize(b)} |\n"
    
    doc += f"""
材料类别分布：{cat_str}

## 结构分析

- **地基层** (y=0): {', '.join(f'{n}({c}个)' for n, c in analysis['base_layer'])}
- **屋顶层** (y={h-1}): {', '.join(f'{n}({c}个)' for n, c in analysis['top_layer'])}
- **高度**: {h} 格（{'高耸' if h >= 10 else '普通' if h >= 5 else '低矮'}）

### 设计要点

1. **比例**: {w}:{h}:{d}（{'竖向突出' if h > max(w, d) else '横向展开' if max(w, d) > h * 2 else '均衡'}）
2. **主材料**: {top_str}
3. **结构层次**: 从地基到屋顶共 {h} 层
"""
    
    # 代码
    doc += f"""
## 结构代码参考

```javascript
{blocks_to_code(data['block_list'], size)}
```

## 使用建议

- 生成类似风格建筑时参考此案例的**材料组合**和**尺寸比例**
- 不要照抄坐标，而是模仿：材料搭配、层高比例、屋顶处理
"""
    
    # 输出
    os.makedirs(output_dir, exist_ok=True)
    safe_name = name.replace('/', '_')
    out_path = os.path.join(output_dir, f"{safe_name}.md")
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(doc)
    return out_path, analysis['block_count']

def main():
    if len(sys.argv) < 3:
        print("用法: python json_to_case.py <结构JSON目录> <输出目录> [--limit N] [--min-blocks M]")
        sys.exit(1)
    
    json_dir = sys.argv[1]
    out_dir = sys.argv[2]
    limit = None
    min_blocks = 50
    
    if '--limit' in sys.argv:
        limit = int(sys.argv[sys.argv.index('--limit') + 1])
    if '--min-blocks' in sys.argv:
        min_blocks = int(sys.argv[sys.argv.index('--min-blocks') + 1])
    
    files = sorted(glob.glob(os.path.join(json_dir, '*.json')))
    print(f"找到 {len(files)} 个结构文件")
    
    count = 0
    total_blocks = 0
    for f in files:
        if limit and count >= limit:
            break
        try:
            with open(f, 'r', encoding='utf-8') as fp:
                data = json.load(fp)
            if data.get('block_count', 0) < min_blocks:
                continue
            out_path, bc = generate_case(data, out_dir)
            count += 1
            total_blocks += bc
            print(f"✓ {os.path.basename(out_path)} ({bc} blocks)")
        except Exception as e:
            print(f"✗ {os.path.basename(f)}: {e}")
    
    print(f"\n完成: {count} 个案例, 总方块 {total_blocks}")
    print(f"输出目录: {out_dir}")

if __name__ == '__main__':
    main()
