# -*- coding: utf-8 -*-
"""
从 Minecraft jar 批量提取官方建筑结构 → 解析 → 生成案例库
用法: python extract_structures.py <jar路径> <输出目录>
"""
import sys, os, json, zipfile, gzip
from collections import Counter

# 复用 nbt_parser
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nbt_parser import parse_nbt, parse_structure_nbt, analyze_file

# 有教学价值的结构类别（排除纯地形/杂项）
INTERESTING = {
    'village': '村庄',
    'bastion': '堡垒',
    'woodland_mansion': '林间府邸',
    'ancient_city': '远古城市',
    'underwater_ruin': '海底废墟',
    'end_city': '末地城',
    'shipwreck': '沉船',
    'igloo': '雪屋',
    'pillager_outpost': '掠夺者前哨',
    'ruined_portal': '废弃传送门',
    'trail_ruins': '足迹废墟',
}

# 排除的类别（纯地形/碎片）
EXCLUDE = {'fossil', 'nether_fossils'}

def extract_from_jar(jar_path, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    stats = {}
    
    with zipfile.ZipFile(jar_path) as zf:
        # 找出所有结构 NBT
        nbt_entries = [e for e in zf.infolist() 
                       if e.filename.startswith('data/minecraft/structures/') 
                       and e.filename.endswith('.nbt')]
        print(f"总结构数: {len(nbt_entries)}")
        
        for entry in nbt_entries:
            parts = entry.filename.split('/')
            # data/minecraft/structures/<category>/<sub>/.../<name>.nbt
            category = parts[3] if len(parts) > 3 else 'unknown'
            
            if category in EXCLUDE:
                continue
            if category not in INTERESTING:
                continue
            
            # 读取并解析
            try:
                raw = zf.read(entry)
                try:
                    data = gzip.decompress(raw)
                except:
                    data = raw
                root = parse_nbt(data)
                result = parse_structure_nbt(root)
                
                # 统计
                cat_stat = stats.setdefault(category, {'count': 0, 'total_blocks': 0, 'total_size': 0})
                cat_stat['count'] += 1
                cat_stat['total_blocks'] += result['block_count']
                cat_stat['total_size'] += result['width'] * result['height'] * result['length']
                
                # 输出 JSON（每个结构一个）
                rel_name = entry.filename.replace('data/minecraft/structures/', '').replace('/', '_').replace('.nbt', '')
                out_path = os.path.join(out_dir, f"{category}__{rel_name}.json")
                
                # blocks 转 list
                block_list = [{'x': k[0], 'y': k[1], 'z': k[2], 'block': v} 
                              for k, v in result['blocks'].items()]
                json_data = {
                    'source': entry.filename,
                    'category': category,
                    'category_cn': INTERESTING.get(category, category),
                    'size': [result['width'], result['height'], result['length']],
                    'block_count': result['block_count'],
                    'palette': result['palette'],
                    'block_list': block_list,
                }
                with open(out_path, 'w', encoding='utf-8') as f:
                    json.dump(json_data, f, ensure_ascii=False)
            except Exception as e:
                print(f"  ⚠ {entry.filename}: {e}")
    
    # 汇总报告
    print("\n===== 提取汇总 =====")
    for cat, st in sorted(stats.items(), key=lambda x: -x[1]['count']):
        cn = INTERESTING.get(cat, cat)
        print(f"{cn}({cat}): {st['count']}个, 总方块 {st['total_blocks']}, 总体积 {st['total_size']}")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("用法: python extract_structures.py <jar路径> <输出目录>")
        sys.exit(1)
    extract_from_jar(sys.argv[1], sys.argv[2])
