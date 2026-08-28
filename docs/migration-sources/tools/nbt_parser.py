# -*- coding: utf-8 -*-
"""
MC 建筑结构解析工具
解析 WorldEdit .schem / Litematica .litematic 文件，输出结构分析数据
用法: python nbt_parser.py <文件路径> [--json]
"""
import sys, os, json, struct
from collections import Counter

# ========== NBT 解析（纯 Python，不依赖第三方库）==========
TAG_END = 0
TAG_BYTE = 1
TAG_SHORT = 2
TAG_INT = 3
TAG_LONG = 4
TAG_FLOAT = 5
TAG_DOUBLE = 6
TAG_BYTE_ARRAY = 7
TAG_STRING = 8
TAG_LIST = 9
TAG_COMPOUND = 10
TAG_INT_ARRAY = 11
TAG_LONG_ARRAY = 12

class NBTReader:
    def __init__(self, data):
        self.data = data
        self.pos = 0
    
    def read_byte(self):
        v = self.data[self.pos]
        self.pos += 1
        return v if v < 128 else v - 256
    
    def read_ubyte(self):
        v = self.data[self.pos]
        self.pos += 1
        return v
    
    def read_short(self):
        v = struct.unpack('>h', self.data[self.pos:self.pos+2])[0]
        self.pos += 2
        return v
    
    def read_int(self):
        v = struct.unpack('>i', self.data[self.pos:self.pos+4])[0]
        self.pos += 4
        return v
    
    def read_long(self):
        v = struct.unpack('>q', self.data[self.pos:self.pos+8])[0]
        self.pos += 8
        return v
    
    def read_float(self):
        v = struct.unpack('>f', self.data[self.pos:self.pos+4])[0]
        self.pos += 4
        return v
    
    def read_double(self):
        v = struct.unpack('>d', self.data[self.pos:self.pos+8])[0]
        self.pos += 8
        return v
    
    def read_string(self):
        l = self.read_short()
        s = self.data[self.pos:self.pos+l].decode('utf-8', errors='replace')
        self.pos += l
        return s
    
    def read_byte_array(self):
        l = self.read_int()
        v = self.data[self.pos:self.pos+l]
        self.pos += l
        return v
    
    def read_int_array(self):
        l = self.read_int()
        v = list(struct.unpack(f'>{l}i', self.data[self.pos:self.pos+l*4]))
        self.pos += l * 4
        return v
    
    def read_long_array(self):
        l = self.read_int()
        v = list(struct.unpack(f'>{l}q', self.data[self.pos:self.pos+l*8]))
        self.pos += l * 8
        return v
    
    def read_tag(self, tag_type):
        if tag_type == TAG_BYTE: return self.read_byte()
        elif tag_type == TAG_SHORT: return self.read_short()
        elif tag_type == TAG_INT: return self.read_int()
        elif tag_type == TAG_LONG: return self.read_long()
        elif tag_type == TAG_FLOAT: return self.read_float()
        elif tag_type == TAG_DOUBLE: return self.read_double()
        elif tag_type == TAG_BYTE_ARRAY: return self.read_byte_array()
        elif tag_type == TAG_STRING: return self.read_string()
        elif tag_type == TAG_INT_ARRAY: return self.read_int_array()
        elif tag_type == TAG_LONG_ARRAY: return self.read_long_array()
        elif tag_type == TAG_LIST:
            elem_type = self.read_byte()
            length = self.read_int()
            if elem_type == 0:  # 空 list
                return []
            return [self.read_tag(elem_type) for _ in range(length)]
        elif tag_type == TAG_COMPOUND:
            d = {}
            while True:
                t = self.read_byte()
                if t == TAG_END: break
                name = self.read_string()
                d[name] = self.read_tag(t)
            return d
        return None
    
    def read_named_tag(self):
        t = self.read_byte()
        name = self.read_string()
        return name, self.read_tag(t)

def parse_nbt(data):
    r = NBTReader(data)
    name, root = r.read_named_tag()
    return root

# ========== 方块名转换 ==========
def block_id_to_name(id_str, data_val=0):
    """把 block ID + data 值转成 1.13+ 方块名"""
    if not id_str:
        return 'air'
    if ':' in id_str:
        base = id_str.split(':')[1]
    else:
        base = id_str
    # 常见 data 值 → 变体
    variants = {
        'wool': ['white_wool','orange_wool','magenta_wool','light_blue_wool','yellow_wool','lime_wool','pink_wool','gray_wool','light_gray_wool','cyan_wool','purple_wool','blue_wool','brown_wool','green_wool','red_wool','black_wool'],
        'planks': ['oak_planks','spruce_planks','birch_planks','jungle_planks','acacia_planks','dark_oak_planks'],
        'log': ['oak_log','spruce_log','birch_log','jungle_log','acacia_log','dark_oak_log'],
        'log2': ['acacia_log','dark_oak_log'],
        'cobblestone_wall': ['cobblestone_wall','mossy_cobblestone_wall'],
        'stonebrick': ['stone_bricks','mossy_stone_bricks','cracked_stone_bricks','chiseled_stone_bricks'],
        'sandstone': ['sandstone','chiseled_sandstone','cut_sandstone'],
        'red_sandstone': ['red_sandstone','chiseled_red_sandstone','cut_red_sandstone'],
        'quartz_block': ['quartz_block','chiseled_quartz_block','quartz_pillar'],
        'prismarine': ['prismarine','prismarine_bricks','dark_prismarine'],
        'concrete': ['white_concrete','orange_concrete','magenta_concrete','light_blue_concrete','yellow_concrete','lime_concrete','pink_concrete','gray_concrete','light_gray_concrete','cyan_concrete','purple_concrete','blue_concrete','brown_concrete','green_concrete','red_concrete','black_concrete'],
        'concrete_powder': ['white_concrete_powder','orange_concrete_powder','magenta_concrete_powder','light_blue_concrete_powder','yellow_concrete_powder','lime_concrete_powder','pink_concrete_powder','gray_concrete_powder','light_gray_concrete_powder','cyan_concrete_powder','purple_concrete_powder','blue_concrete_powder','brown_concrete_powder','green_concrete_powder','red_concrete_powder','black_concrete_powder'],
        'stained_glass': ['white_stained_glass','orange_stained_glass','magenta_stained_glass','light_blue_stained_glass','yellow_stained_glass','lime_stained_glass','pink_stained_glass','gray_stained_glass','light_gray_stained_glass','cyan_stained_glass','purple_stained_glass','blue_stained_glass','brown_stained_glass','green_stained_glass','red_stained_glass','black_stained_glass'],
        'stained_glass_pane': ['white_stained_glass_pane','orange_stained_glass_pane','magenta_stained_glass_pane','light_blue_stained_glass_pane','yellow_stained_glass_pane','lime_stained_glass_pane','pink_stained_glass_pane','gray_stained_glass_pane','light_gray_stained_glass_pane','cyan_stained_glass_pane','purple_stained_glass_pane','blue_stained_glass_pane','brown_stained_glass_pane','green_stained_glass_pane','red_stained_glass_pane','black_stained_glass_pane'],
        'carpet': ['white_carpet','orange_carpet','magenta_carpet','light_blue_carpet','yellow_carpet','lime_carpet','pink_carpet','gray_carpet','light_gray_carpet','cyan_carpet','purple_carpet','blue_carpet','brown_carpet','green_carpet','red_carpet','black_carpet'],
        'terracotta': ['white_terracotta','orange_terracotta','magenta_terracotta','light_blue_terracotta','yellow_terracotta','lime_terracotta','pink_terracotta','gray_terracotta','light_gray_terracotta','cyan_terracotta','purple_terracotta','blue_terracotta','brown_terracotta','green_terracotta','red_terracotta','black_terracotta'],
        'glazed_terracotta': ['white_glazed_terracotta','orange_glazed_terracotta','magenta_glazed_terracotta','light_blue_glazed_terracotta','yellow_glazed_terracotta','lime_glazed_terracotta','pink_glazed_terracotta','gray_glazed_terracotta','light_gray_glazed_terracotta','cyan_glazed_terracotta','purple_glazed_terracotta','blue_glazed_terracotta','brown_glazed_terracotta','green_glazed_terracotta','red_glazed_terracotta','black_glazed_terracotta'],
        'anvil': ['anvil','chipped_anvil','damaged_anvil'],
        'sea_lantern': ['sea_lantern'],
        'torch': ['torch'],
    }
    if base in variants and data_val < len(variants[base]):
        return variants[base][data_val]
    # 默认映射
    default_map = {
        'stone': 'stone', 'granite': 'granite', 'diorite': 'diorite', 'andesite': 'andesite',
        'grass': 'grass_block', 'dirt': 'dirt', 'sand': 'sand', 'gravel': 'gravel',
        'bedrock': 'bedrock', 'water': 'water', 'lava': 'lava', 'glass': 'glass',
        'oak_stairs': 'oak_stairs', 'stone_brick_stairs': 'stone_brick_stairs',
        'air': 'air', 'cave_air': 'cave_air', 'cobblestone': 'cobblestone',
        'oak_planks': 'oak_planks', 'bookshelf': 'bookshelf', 'chest': 'chest',
        'crafting_table': 'crafting_table', 'furnace': 'furnace', 'bed': 'red_bed',
        'torch': 'torch', 'ladder': 'ladder', 'fence': 'oak_fence',
        'fence_gate': 'oak_fence_gate', 'door': 'oak_door', 'trapdoor': 'oak_trapdoor',
        'glass_pane': 'glass_pane', 'iron_bars': 'iron_bars', 'spruce_stairs': 'spruce_stairs',
        'birch_stairs': 'birch_stairs', 'jungle_stairs': 'jungle_stairs',
        'acacia_stairs': 'acacia_stairs', 'dark_oak_stairs': 'dark_oak_stairs',
        'stone_stairs': 'stone_stairs', 'stone_brick_stairs': 'stone_brick_stairs',
        'brick_stairs': 'brick_stairs', 'sandstone_stairs': 'sandstone_stairs',
        'oak_slab': 'oak_slab', 'stone_slab': 'stone_slab', 'stone_brick_slab': 'stone_brick_slab',
        'brick_block': 'bricks', 'nether_brick': 'nether_bricks', 'nether_brick_fence': 'nether_brick_fence',
        'netherrack': 'netherrack', 'soul_sand': 'soul_sand', 'glowstone': 'glowstone',
        'end_stone': 'end_stone', 'purpur_block': 'purpur_block', 'purpur_pillar': 'purpur_pillar',
        'purpur_stairs': 'purpur_stairs', 'purpur_slab': 'purpur_slab',
        'obsidian': 'obsidian', 'ice': 'ice', 'packed_ice': 'packed_ice',
        'snow': 'snow', 'snow_layer': 'snow_layer', 'clay': 'clay',
        'farmland': 'farmland', 'wheat': 'wheat', 'melon': 'melon', 'pumpkin': 'pumpkin',
        'lit_furnace': 'furnace', 'lit_redstone_lamp': 'redstone_lamp',
        'wool': 'white_wool', 'hay_block': 'hay_block',
        'cactus': 'cactus', 'vine': 'vine', 'tall_grass': 'grass', 'dead_bush': 'dead_bush',
        'flower_pot': 'flower_pot', 'cauldron': 'cauldron', 'brewing_stand': 'brewing_stand',
        'enchanting_table': 'enchanting_table', 'ender_chest': 'ender_chest',
        'anvil': 'anvil', 'beacon': 'beacon', 'jukebox': 'jukebox', 'note_block': 'note_block',
        'dispenser': 'dispenser', 'dropper': 'dropper', 'piston': 'piston',
        'sticky_piston': 'sticky_piston', 'redstone_wire': 'redstone_wire',
        'lever': 'lever', 'stone_button': 'stone_button', 'wooden_button': 'oak_button',
        'stone_pressure_plate': 'stone_pressure_plate', 'wooden_pressure_plate': 'oak_pressure_plate',
        'rail': 'rail', 'golden_rail': 'powered_rail', 'detector_rail': 'detector_rail',
        'tnt': 'tnt', 'torch': 'torch', 'redstone_torch': 'redstone_torch',
        'tripwire_hook': 'tripwire_hook', 'tripwire': 'tripwire',
        'repeater': 'repeater', 'comparator': 'comparator',
        'command_block': 'command_block', 'chain_command_block': 'chain_command_block',
        'spawner': 'spawner', 'mob_spawner': 'spawner', 'structure_block': 'structure_block',
        'barrier': 'barrier', 'slime_block': 'slime_block',
    }
    return default_map.get(base, base)

# ========== Sponge .schem v3 解析 ==========
def parse_sponge_schem(root):
    """Sponge Schematic v3 格式"""
    width = root.get('Width', 0)
    height = root.get('Height', 0)
    length = root.get('Length', 0)
    palette = root.get('Palette', {})
    block_data = root.get('BlockData', b'')
    offset = root.get('Offset', [0, 0, 0])
    
    # palette: {方块名: 索引} 反转为 {索引: 方块名}
    inv_palette = {v: k for k, v in palette.items()}
    
    blocks = {}
    pos = 0
    for y in range(height):
        for z in range(length):
            for x in range(width):
                if pos < len(block_data):
                    idx = block_data[pos]
                    pos += 1
                    if idx != 0:  # 0 通常 = air
                        bname = inv_palette.get(idx, f'unknown_{idx}')
                        if bname != 'minecraft:air':
                            blocks[(x, y, z)] = bname.replace('minecraft:', '')
    
    return {
        'width': width, 'height': height, 'length': length,
        'offset': list(offset),
        'block_count': len(blocks),
        'total_blocks': width * height * length,
        'blocks': blocks,
        'palette_size': len(palette),
        'palette': list(palette.keys()),
    }

# ========== 经典 .schematic 解析 ==========
def parse_classic_schem(root):
    """MCEdit .schematic 格式（1.12 及以前）"""
    width = root.get('Width', 0)
    height = root.get('Height', 0)
    length = root.get('Length', 0)
    blocks_arr = root.get('Blocks', b'')
    data_arr = root.get('Data', b'')
    palette = root.get('Palette', {})  # 可能不存在
    
    blocks = {}
    for i in range(len(blocks_arr)):
        bid = blocks_arr[i]
        if bid == 0:  # air
            continue
        d = data_arr[i] if i < len(data_arr) else 0
        x = i % width
        y = (i // width) % height
        z = i // (width * height)
        name = block_id_to_name(str(bid), d)
        if name != 'air':
            blocks[(x, y, z)] = name
    
    return {
        'width': width, 'height': height, 'length': length,
        'offset': [0, 0, 0],
        'block_count': len(blocks),
        'total_blocks': width * height * length,
        'blocks': blocks,
        'palette_size': len(set(blocks.values())),
        'palette': list(set(blocks.values())),
    }

# ========== Litematica .litematic 解析 ==========
def parse_litematic(root):
    """Litematica 格式"""
    metadata = root.get('Metadata', {})
    regions = root.get('Regions', {})
    
    results = []
    for rname, region in regions.items():
        size = region.get('Size', [0, 0, 0])
        position = region.get('Position', [0, 0, 0])
        block_states = region.get('BlockStatePalette', [])
        block_state_array = region.get('BlockStates', b'')
        block_entities = region.get('BlockEntityList', [])
        
        sx, sy, sz = size
        total = sx * sy * sz
        bits_per_block = max(1, (total.bit_length() + 31) // 32)  # 近似
        # Litematica 用 varint 长度编码
        # 简化：按 64-bit 容器解析
        longs = block_state_array
        # 计算实际 bits per block
        arr_len = len(longs) // 8  # 多少个 long
        bits = 1
        for b in range(1, 33):
            if (total * b + 63) // 64 <= arr_len:
                bits = b
            else:
                break
        bits = max(1, bits)
        
        blocks = {}
        mask = (1 << bits) - 1
        for i in range(total):
            bit_pos = i * bits
            long_idx = bit_pos // 64
            bit_off = bit_pos % 64
            if long_idx >= len(longs) // 8:
                break
            value = struct.unpack_from('<Q', longs, long_idx * 8)[0] >> bit_off & mask
            if value < len(block_states):
                state = block_states[value]
                bname = state.get('Name', 'minecraft:air')
                bname = bname.replace('minecraft:', '')
                if bname != 'air':
                    x = i % sx
                    y = (i // sx) % sy
                    z = i // (sx * sy)
                    blocks[(x, y, z)] = bname
        
        results.append({
            'region': rname,
            'width': sx, 'height': sy, 'length': sz,
            'position': list(position),
            'block_count': len(blocks),
            'total_blocks': total,
            'blocks': blocks,
            'palette_size': len(block_states),
            'palette': [s.get('Name', '').replace('minecraft:', '') for s in block_states],
        })
    
    return results

# ========== 主流程 ==========
# 1.13+ 结构 NBT（size + blocks + palette）
def parse_structure_nbt(root):
    """官方结构方块 NBT 格式：size + blocks[] + palette[]"""
    size = root.get('size', [0, 0, 0])
    blocks_list = root.get('blocks', [])
    palette = root.get('palette', [])
    
    sx, sy, sz = size
    blocks = {}
    for b in blocks_list:
        pos = b.get('pos', [0, 0, 0])
        state = b.get('state', 0)
        if state < len(palette):
            p = palette[state]
            if isinstance(p, dict):
                bname = p.get('Name', 'minecraft:air').replace('minecraft:', '')
            else:
                bname = str(p).replace('minecraft:', '')
            if bname != 'air':
                blocks[(pos[0], pos[1], pos[2])] = bname
    
    return {
        'width': sx, 'height': sy, 'length': sz,
        'offset': [0, 0, 0],
        'block_count': len(blocks),
        'total_blocks': sx * sy * sz,
        'blocks': blocks,
        'palette_size': len(palette),
        'palette': [str(p.get('Name', '') if isinstance(p, dict) else p).replace('minecraft:', '') for p in palette],
    }

def analyze_file(path):
    with open(path, 'rb') as f:
        data = f.read()
    
    # 尝试各种格式
    ext = os.path.splitext(path)[1].lower()
    name = os.path.basename(path)
    
    # Litematica (.litematic) — gzip 压缩
    if ext == '.litematic':
        import gzip
        try:
            raw = gzip.decompress(data)
            root = parse_nbt(raw)
            regions = parse_litematic(root)
            return {'file': name, 'type': 'litematic', 'regions': regions}
        except Exception as e:
            return {'file': name, 'type': 'litematic', 'error': str(e)}
    
    # .schem — gzip 或裸
    if ext == '.schem':
        import gzip
        for is_gz in [True, False]:
            try:
                raw = gzip.decompress(data) if is_gz else data
                root = parse_nbt(raw)
                if 'Width' in root or 'Blocks' in root:
                    if 'Blocks' in root and 'Width' not in root:
                        # 经典格式
                        return {'file': name, 'type': 'classic_schematic', **parse_classic_schem(root)}
                    else:
                        return {'file': name, 'type': 'sponge_schem', **parse_sponge_schem(root)}
            except Exception as e:
                continue
        return {'file': name, 'type': 'schem', 'error': '无法解析'}
    
    # .nbt — 尝试
    if ext == '.nbt':
        import gzip
        try:
            raw = gzip.decompress(data)
        except:
            raw = data
        try:
            root = parse_nbt(raw)
            if 'Regions' in root:
                regions = parse_litematic(root)
                return {'file': name, 'type': 'litematic', 'regions': regions}
            elif 'Width' in root:
                return {'file': name, 'type': 'sponge_schem', **parse_sponge_schem(root)}
            elif 'Blocks' in root and 'size' not in root:
                return {'file': name, 'type': 'classic_schematic', **parse_classic_schem(root)}
            elif 'size' in root and 'blocks' in root and 'palette' in root:
                return {'file': name, 'type': 'structure_nbt', **parse_structure_nbt(root)}
            else:
                return {'file': name, 'type': 'unknown', 'keys': list(root.keys())[:20]}
        except Exception as e:
            return {'file': name, 'type': 'nbt', 'error': str(e)}
    
    return {'file': name, 'type': 'unsupported', 'error': f'不支持的格式: {ext}'}

def summarize(result):
    """输出人类可读摘要"""
    if 'error' in result:
        print(f"❌ {result['file']}: {result['error']}")
        return
    
    if result['type'] == 'litematic':
        print(f"📐 {result['file']} (Litematica)")
        for r in result['regions']:
            print(f"  区域 [{r['region']}]: {r['width']}×{r['height']}×{r['length']}")
            print(f"    方块数: {r['block_count']}/{r['total_blocks']} ({r['block_count']*100//max(1,r['total_blocks'])}%)")
            print(f"    调色板: {r['palette_size']} 种")
            # 统计 top 方块
            counter = Counter(r['blocks'].values())
            top = counter.most_common(10)
            print(f"    主要方块: {', '.join(f'{b}({c})' for b,c in top)}")
    elif result['type'] in ('sponge_schem', 'classic_schematic'):
        print(f"📐 {result['file']} ({result['type']})")
        print(f"  尺寸: {result['width']}×{result['height']}×{result['length']}")
        print(f"  方块数: {result['block_count']}/{result['total_blocks']} ({result['block_count']*100//max(1,result['total_blocks'])}%)")
        print(f"  调色板: {result['palette_size']} 种")
        counter = Counter(result['blocks'].values())
        top = counter.most_common(10)
        print(f"  主要方块: {', '.join(f'{b}({c})' for b,c in top)}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python nbt_parser.py <文件> [--json]")
        sys.exit(1)
    
    path = sys.argv[1]
    result = analyze_file(path)
    
    if '--json' in sys.argv:
        # JSON 模式：blocks 转成 list 方便序列化
        def blocks_to_list(blocks):
            return [{'x': k[0], 'y': k[1], 'z': k[2], 'block': v} for k, v in blocks.items()]
        if 'regions' in result:
            for r in result['regions']:
                r['blocks'] = blocks_to_list(r['blocks'])
        elif 'blocks' in result:
            result['blocks'] = blocks_to_list(result['blocks'])
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        summarize(result)
