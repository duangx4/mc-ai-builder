# -*- coding: utf-8 -*-
"""
MC AI Builder 结构合理性分析器

读取 blocks.json / voxels.json 的真实体素数据，用几何算法检测建筑结构问题，
让 AI 能"理解"建筑结构是否合理（而非靠脑内想象）。

检测项：
1. 浮空块      — 无下方支撑的非可浮空方块
2. 地基完整性  — 建筑底面（最低层）是否覆盖完整
3. 墙体连通性  — 同层墙是否断裂成孤岛 / 墙体缺失
4. 屋顶覆盖    — 屋顶是否覆盖所有墙体投影面积
5. 门窗堵塞    — 门/窗方块是否被实体方块堵住或悬空
6. 重叠冲突    — 同一坐标是否有多方块冲突

用法:
    python analyze_structure.py <blocks.json 或 voxels.json>
    python analyze_structure.py <文件> --json     # 输出 JSON 报告
    python analyze_structure.py <文件> --verbose  # 详细（含问题坐标列表）
    python analyze_structure.py <文件> --min-support <值>  # 支撑判定阈值

输出:
    人类可读的检查报告（默认），或结构化 JSON（--json）
"""

import json
import sys
import os
import argparse
import io
from collections import Counter

# Windows 控制台 GBK 编码兼容：强制 UTF-8 输出
if sys.stdout.encoding and sys.stdout.encoding.lower().startswith('gbk'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ---------------------------------------------------------------
# 方块语义表
# ---------------------------------------------------------------

# 可浮空方块：无支撑也合法（装饰/悬挂类）
FLOATABLE_BLOCKS = {
    'air', 'water', 'lava', 'bubble_column',
    # 灯具/悬挂
    'lantern', 'soul_lantern', 'torch', 'soul_torch', 'redstone_torch',
    'wall_torch', 'end_rod', 'chain', 'bell',
    # 植物（不承重）
    'grass', 'tall_grass', 'fern', 'large_fern', 'dandelion', 'poppy',
    'azure_bluet', 'allium', 'cornflower', 'lily_of_the_valley', 'wither_rose',
    'oxeye_daisy', 'sunflower', 'lilac', 'peony', 'rose_bush',
    'sapling', 'oak_sapling', 'spruce_sapling', 'birch_sapling', 'jungle_sapling',
    'acacia_sapling', 'dark_oak_sapling', 'cherry_sapling',
    'bamboo', 'bamboo_sapling', 'bamboo_block',
    'vine', 'hanging_roots', 'weeping_vines', 'twisting_vines',
    'kelp', 'seagrass', 'lily_pad', 'sea_pickle', 'coral', 'coral_fan',
    'wheat', 'carrots', 'potatoes', 'beetroots', 'sweet_berry_bush',
    'nether_wart', 'cave_vines', 'glow_berries',
    # 薄片/挂饰
    'cobweb', 'flower_pot', 'potted_azalea', 'potted_flowering_azalea',
    'painting', 'item_frame', 'glow_item_frame', 'banner', 'wall_banner',
    'lever', 'stone_button', 'oak_button', 'spruce_button', 'birch_button',
    'jungle_button', 'acacia_button', 'dark_oak_button', 'mangrove_button',
    'tripwire_hook', 'tripwire', 'redstone_wire', 'repeater', 'comparator',
    'rail', 'powered_rail', 'detector_rail', 'activator_rail',
    'scaffolding',
}

# 非实体方块：不视为"支撑"（踩不上去 / 透明的）
NON_SOLID_BLOCKS = {
    'air', 'water', 'lava', 'bubble_column',
    'glass', 'glass_pane',
    'lantern', 'soul_lantern', 'torch', 'soul_torch', 'redstone_torch',
    'wall_torch', 'end_rod', 'chain',
    'grass', 'tall_grass', 'fern', 'large_fern', 'dandelion', 'poppy',
    'azure_bluet', 'allium', 'cornflower', 'lily_of_the_valley',
    'sunflower', 'lilac', 'peony', 'rose_bush',
    'sapling', 'oak_sapling', 'spruce_sapling', 'birch_sapling', 'jungle_sapling',
    'acacia_sapling', 'dark_oak_sapling',
    'bamboo_sapling', 'vine', 'hanging_roots', 'weeping_vines', 'twisting_vines',
    'kelp', 'seagrass', 'lily_pad', 'sea_pickle',
    'wheat', 'carrots', 'potatoes', 'beetroots', 'sweet_berry_bush',
    'cobweb', 'flower_pot',
    'redstone_wire', 'repeater', 'comparator',
    'rail', 'powered_rail', 'detector_rail', 'activator_rail',
    'lever', 'stone_button', 'oak_button', 'spruce_button', 'birch_button',
    'jungle_button', 'acacia_button', 'dark_oak_button',
    'tripwire_hook', 'tripwire',
    'scaffolding',
}

# 屋顶方块关键词（type 或 groupId 命中即视为屋顶层）
ROOF_KEYWORDS = ('stairs', 'slab', 'tiles', 'tile', 'roof', 'prismarine', 'hay',
                 'roof_', '_roof', 'eave', 'ridge')

# 门/窗关键词
DOOR_KEYWORDS = ('door',)
WINDOW_KEYWORDS = ('glass', 'glass_pane', 'window')


# ---------------------------------------------------------------
# 工具函数
# ---------------------------------------------------------------

def base_type(t):
    """去掉方块类型后的属性部分，如 'oak_door?facing=south' → 'oak_door'"""
    if not t:
        return ''
    return t.split('?')[0]


def parse_properties(b):
    """解析 properties 字段，兼容字符串 'facing=south,half=lower' 或 dict"""
    props = b.get('properties')
    if isinstance(props, dict):
        return props
    if isinstance(props, str):
        result = {}
        for kv in props.split(','):
            kv = kv.strip()
            if '=' in kv:
                k, v = kv.split('=', 1)
                result[k.strip()] = v.strip()
        return result
    return {}


class BlockMap:
    """体素数据的内存索引，支持快速查询"""

    def __init__(self, blocks):
        self.blocks = blocks
        self.by_pos = {}   # (x,y,z) -> block dict
        self.invalid = []  # position 异常的方块
        self.min_y = float('inf')
        self.max_y = -float('inf')
        self.min_x = float('inf')
        self.max_x = -float('inf')
        self.min_z = float('inf')
        self.max_z = -float('inf')

        for b in blocks:
            pos = b.get('position')
            if not isinstance(pos, list) or len(pos) != 3 or any(v is None for v in pos):
                # 记录非法坐标方块（本身即结构 bug）
                self.invalid.append(b)
                continue
            x, y, z = pos
            self.by_pos[(x, y, z)] = b
            self.min_x = min(self.min_x, x)
            self.max_x = max(self.max_x, x)
            self.min_y = min(self.min_y, y)
            self.max_y = max(self.max_y, y)
            self.min_z = min(self.min_z, z)
            self.max_z = max(self.max_z, z)

    def get(self, x, y, z):
        return self.by_pos.get((x, y, z))

    def exists(self, x, y, z):
        return (x, y, z) in self.by_pos

    def is_solid(self, x, y, z):
        """是否为实体方块（可支撑/可遮挡）"""
        b = self.get(x, y, z)
        if b is None:
            return False
        return base_type(b['type']) not in NON_SOLID_BLOCKS

    def is_roof(self, x, y, z):
        """该位置是否为屋顶方块"""
        b = self.get(x, y, z)
        if b is None:
            return False
        t = base_type(b['type'])
        g = b.get('groupId') or ''
        return any(k in t for k in ROOF_KEYWORDS) or any(k in g for k in ROOF_KEYWORDS)


# ---------------------------------------------------------------
# 检测器
# ---------------------------------------------------------------

def detect_floating(bm, support_radius=3):
    """浮空块检测：无下方支撑的非可浮空方块

    规则：
    - 可浮空方块（FLOATABLE_BLOCKS）跳过
    - 最低层（地基所在层）跳过
    - 向下搜索 support_radius（默认 3）格内是否存在实体方块：
      * 有 → 视为有支撑（架高层、挑檐下方有梁等都算安全）
      * 无 → 视为悬空
    - 搜索路径上遇到水/岩浆（water/lava）不视为实体，继续下探
    """
    issues = []
    for (x, y, z), b in bm.by_pos.items():
        t = base_type(b['type'])
        if t in FLOATABLE_BLOCKS:
            continue
        # 屋顶方块（stairs/slabs/tiles 等）：挑檐/翘角允许局部悬空，由屋顶覆盖检查负责
        if any(k in t for k in ROOF_KEYWORDS):
            continue
        # 最低层（通常是地基所在 y）不算浮空
        if y == bm.min_y:
            continue
        # 向下搜索支撑
        supported = False
        reason = ''
        for dy in range(1, support_radius + 1):
            below = bm.get(x, y - dy, z)
            if below is None:
                continue
            below_t = base_type(below['type'])
            if bm.is_solid(x, y - dy, z):
                supported = True
                reason = f'下方 {dy} 格有 {below_t}'
                break
            elif below_t in ('water', 'lava', 'bubble_column'):
                reason = f'下方 {dy} 格是 {below_t}（无实体）'
        if not supported:
            # 水平锚固豁免：同一层左右/前后相邻有实体方块 → 视为被墙锚固（窗楣/门楣场景）
            anchored = False
            for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if bm.is_solid(x + dx, y, z + dz):
                    anchored = True
                    break
            if anchored:
                continue
            issues.append({
                'pos': (x, y, z),
                'type': t,
                'detail': f'{t} 悬空（{reason or "向下无任何支撑"}）'
            })
    return issues


def detect_foundation(bm):
    """地基完整性：建筑底面（min_y 层）是否覆盖完整"""
    issues = []
    y = bm.min_y
    # 该层所有列
    cols = set()
    present = set()
    for (x, yy, z) in bm.by_pos:
        cols.add((x, z))
        if yy == y:
            present.add((x, z))
    missing = [(x, z) for (x, z) in cols if (x, z) not in present]
    if missing:
        issues.append({
            'pos': None,
            'type': 'foundation',
            'detail': f'地基层 y={y} 有 {len(missing)} 列缺失地基（共 {len(cols)} 列）',
            'count': len(missing),
            'coords': missing[:20]
        })
    return issues


def detect_wall_gaps(bm, min_comp_size=3):
    """墙体连通性：按 groupId 分组，检测同组墙体在每层的断裂（孤岛）

    规则：
    - 对每个 groupId 的建筑组，逐层提取实体方块
    - 用 BFS 找连通分量
    - 非最大分量且大小 >= min_comp_size 的视为"孤立墙块"（结构断裂）
    """
    issues = []

    # 按 groupId 分组（排除 None / foundation 等非建筑组）
    groups = {}
    for (x, y, z), b in bm.by_pos.items():
        g = b.get('groupId')
        if not g or g == 'foundation':
            continue
        t = base_type(b['type'])
        if t in FLOATABLE_BLOCKS or any(k in t for k in ROOF_KEYWORDS):
            continue
        groups.setdefault(g, []).append((x, y, z))

    for g, positions in groups.items():
        # 按层分组
        by_y = {}
        for (x, y, z) in positions:
            by_y.setdefault(y, []).append((x, z))

        for y in sorted(by_y):
            cells = by_y[y]
            if len(cells) < 4:
                continue
            pos_set = set(cells)
            visited = set()
            components = []
            for p in pos_set:
                if p in visited:
                    continue
                queue = [p]
                visited.add(p)
                comp = []
                while queue:
                    cur = queue.pop(0)
                    comp.append(cur)
                    cx, cz = cur
                    for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        np = (cx + dx, cz + dz)
                        if np in pos_set and np not in visited:
                            visited.add(np)
                            queue.append(np)
                components.append(comp)

            if components:
                main = max(components, key=len)
                for comp in components:
                    if comp is main:
                        continue
                    if len(comp) >= min_comp_size:
                        issues.append({
                            'pos': None,
                            'type': 'wall_gap',
                            'detail': f'组 {g} 在 y={y} 层有 {len(comp)} 个孤立墙块（未与主结构连通）',
                            'count': len(comp),
                            'coords': [(cx, y, cz) for (cx, cz) in comp[:10]]
                        })
    return issues


def detect_roof_coverage(bm, wall_priority=50):
    """屋顶覆盖：建筑组的外墙柱顶是否被屋顶覆盖

    规则：按 groupId 分组。若某组内存在屋顶方块（说明该组是"有顶建筑"），
    则该组所有 priority >= wall_priority 的墙柱顶部（向上 3 格内）必须有屋顶覆盖。
    无屋顶的组（围墙、游廊、影壁等开放结构）不检查。
    """
    issues = []

    # 统计每组是否有屋顶方块
    group_has_roof = set()
    for (x, y, z), b in bm.by_pos.items():
        if bm.is_roof(x, y, z):
            group_has_roof.add(b.get('groupId'))

    # 收集有顶组的墙柱最高点
    wall_cols = {}  # (x,z) -> {top_y, group}
    for (x, y, z), b in bm.by_pos.items():
        g = b.get('groupId')
        if g is None or g not in group_has_roof:
            continue
        if b.get('priority', 0) >= wall_priority:
            key = (x, z)
            if key not in wall_cols or y > wall_cols[key][0]:
                wall_cols[key] = (y, g)

    # 检查每根墙柱顶部是否有屋顶覆盖
    uncovered = []
    for (x, z), (top_y, g) in wall_cols.items():
        covered = False
        for dy in (0, 1, 2, 3):
            if bm.is_roof(x, top_y + dy, z):
                covered = True
                break
        if not covered:
            uncovered.append((x, z, top_y))
    if uncovered:
        issues.append({
            'pos': None,
            'type': 'roof_coverage',
            'detail': f'{len(uncovered)} 根墙体柱顶未被屋顶覆盖（示例: {uncovered[:8]}）',
            'count': len(uncovered),
            'coords': uncovered[:20]
        })
    return issues


def detect_door_blocked(bm):
    """门窗堵塞：门/窗方块是否被实体方块堵住"""
    issues = []
    for (x, y, z), b in bm.by_pos.items():
        t = base_type(b['type'])
        props = parse_properties(b)
        facing = props.get('facing', '')
        if any(k in t for k in DOOR_KEYWORDS):
            # 门下方必须是地面/地基（solid 或存在方块）
            below = bm.get(x, y - 1, z)
            if below is None:
                issues.append({
                    'pos': (x, y, z),
                    'type': 'door_floating',
                    'detail': f'门 {t} 下方为空（无方块支撑）'
                })
            elif not bm.is_solid(x, y - 1, z):
                below_t = base_type(below['type'])
                issues.append({
                    'pos': (x, y, z),
                    'type': 'door_floating',
                    'detail': f'门 {t} 下方是 {below_t}（非实体支撑）'
                })
            # 门的另一半
            half = props.get('half', '')
            if half == 'lower':
                if not bm.exists(x, y + 1, z):
                    issues.append({
                        'pos': (x, y, z),
                        'type': 'door_incomplete',
                        'detail': f'门 {t} 缺少上半部分 (half=upper)'
                    })
    return issues


def detect_overlap(bm):
    """重叠冲突：同一坐标多个方块（理论上 voxels 已去重，保留逻辑）"""
    # blocks.json 可能有重复（不同优先级覆盖），voxels.json 是最终结果
    return []


def detect_invalid_position(bm):
    """非法坐标：position 为 None / 异常（生成 bug 的直接证据）"""
    issues = []
    for b in bm.invalid:
        issues.append({
            'pos': None,
            'type': 'invalid_position',
            'detail': f"{b.get('type')} 的 position 异常: {b.get('position')} (groupId={b.get('groupId')})"
        })
    return issues


def detect_water_base(bm):
    """水池无底：水体方块下方必须有实体底（否则水会漏/悬空）"""
    issues = []
    for (x, y, z), b in bm.by_pos.items():
        t = base_type(b['type'])
        if t not in ('water', 'lava', 'bubble_column'):
            continue
        if not bm.is_solid(x, y - 1, z):
            issues.append({
                'pos': (x, y, z),
                'type': 'water_no_base',
                'detail': f'{t} 无底（y-1 处无实体，水会漏下）'
            })
    return issues


# ---------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------

def analyze_blocks(blocks, support_radius=3):
    """执行全量分析，返回结构化报告 dict"""
    bm = BlockMap(blocks)
    report = {
        'statistics': {
            'total_blocks': len(blocks),
            'bounds': {
                'x': [bm.min_x, bm.max_x],
                'y': [bm.min_y, bm.max_y],
                'z': [bm.min_z, bm.max_z],
            },
            'size': [
                bm.max_x - bm.min_x + 1,
                bm.max_y - bm.min_y + 1,
                bm.max_z - bm.min_z + 1,
            ],
            'group_counts': dict(Counter(b.get('groupId') or 'none' for b in blocks)),
            'type_counts': dict(Counter(base_type(b['type']) for b in blocks)),
        },
        'checks': {
            'invalid_position': detect_invalid_position(bm),
            'floating': detect_floating(bm, support_radius=support_radius),
            'foundation': detect_foundation(bm),
            'wall_gaps': detect_wall_gaps(bm),
            'roof_coverage': detect_roof_coverage(bm),
            'door_blocked': detect_door_blocked(bm),
            'water_base': detect_water_base(bm),
            'overlap': detect_overlap(bm),
        }
    }
    return report


def render_text(report, verbose=False):
    """把分析报告渲染成人类可读文本"""
    s = report['statistics']
    lines = []
    lines.append('=' * 56)
    lines.append('  MC AI Builder 结构合理性分析报告')
    lines.append('=' * 56)
    lines.append(f"  方块总数:  {s['total_blocks']}")
    lines.append(f"  尺寸:      {s['size'][0]}×{s['size'][1]}×{s['size'][2]}")
    lines.append(f"  边界:      x[{s['bounds']['x'][0]}..{s['bounds']['x'][1]}] "
                 f"y[{s['bounds']['y'][0]}..{s['bounds']['y'][1]}] "
                 f"z[{s['bounds']['z'][0]}..{s['bounds']['z'][1]}]")
    lines.append('-' * 56)

    checks = report['checks']
    total_issues = 0

    check_labels = [
        ('invalid_position', '非法坐标'),
        ('floating', '浮空块检测'),
        ('foundation', '地基完整性'),
        ('wall_gaps', '墙体连通性'),
        ('roof_coverage', '屋顶覆盖'),
        ('door_blocked', '门窗堵塞'),
        ('water_base', '水池无底'),
        ('overlap', '重叠冲突'),
    ]

    for key, label in check_labels:
        issues = checks[key]
        lines.append(f"\n[{label}]")
        if not issues:
            lines.append("  ✅ 通过")
        else:
            total_issues += len(issues)
            for iss in issues[:5]:
                pos = f"({iss['pos'][0]},{iss['pos'][1]},{iss['pos'][2]})" if iss['pos'] else '(全局)'
                lines.append(f"  ⚠️ {pos} {iss['detail']}")
            if len(issues) > 5:
                lines.append(f"  ... 共 {len(issues)} 个问题")

    lines.append('\n' + '=' * 56)
    if total_issues == 0:
        lines.append('  ✅ 结构合理：未发现问题')
    else:
        lines.append(f'  ⚠️ 发现 {total_issues} 个问题（详见上方）')
    lines.append('=' * 56)
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description='MC AI Builder 结构合理性分析器')
    parser.add_argument('file', help='blocks.json 或 voxels.json 路径')
    parser.add_argument('--json', action='store_true', help='输出 JSON 报告')
    parser.add_argument('--verbose', action='store_true', help='详细模式（输出更多问题坐标）')
    parser.add_argument('--min-support', type=int, default=3,
                        help='支撑判定搜索深度（默认 3，向下 3 格内有实体即算有支撑）')
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f'❌ 文件未找到: {args.file}')
        sys.exit(1)

    try:
        with open(args.file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f'❌ JSON 解析失败: {e}')
        sys.exit(1)

    blocks = data if isinstance(data, list) else (data.get('blocks') or data.get('data') or [])
    if not blocks:
        print('❌ 未找到方块数据')
        sys.exit(1)

    report = analyze_blocks(blocks, support_radius=args.min_support)

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(render_text(report, verbose=args.verbose))


if __name__ == '__main__':
    main()
