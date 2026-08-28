---
name: 远古城市 - city_center_3
description: 远古城市建筑案例（巨型），尺寸 18×31×41，参考自 data/minecraft/structures/ancient_city/city_center/city_center_3.nbt
---

# 🏗️ 远古城市 - city_center_3

## 基本信息

- **尺寸**: 18×31×41（巨型建筑）
- **方块数**: 7908
- **材料种类**: 100 种
- **来源**: `data/minecraft/structures/ancient_city/city_center/city_center_3.nbt`

## 材料分析

主要方块（按使用量）：

| 方块 | 数量 | 类别 |
|------|------|------|
| `deepslate_bricks` | 3313 | 墙 |
| `deepslate_tiles` | 1724 | 墙 |
| `deepslate` | 1474 | 框架/柱 |
| `cobbled_deepslate` | 350 | 框架/柱 |
| `gray_carpet` | 221 | 装饰 |
| `gray_wool` | 173 | 装饰 |
| `glass_pane` | 136 | 门窗 |
| `deepslate_tile_stairs` | 65 | 屋顶 |
| `soul_sand` | 57 | 地面/环境 |
| `soul_fire` | 57 | 其他 |
| `reinforced_deepslate` | 55 | 特殊/结构 |
| `redstone_wire` | 52 | 特殊/结构 |

材料类别分布：墙(5037), 框架/柱(1824), 装饰(448), 门窗(166), 特殊/结构(135)

## 结构分析

- **地基层** (y=0): deepslate(738个)
- **屋顶层** (y=30): deepslate_bricks(32个), deepslate_tiles(22个)
- **高度**: 31 格（高耸）

### 设计要点

1. **比例**: 18:31:41（均衡）
2. **主材料**: deepslate_bricks, deepslate_tiles, deepslate, cobbled_deepslate, gray_carpet
3. **结构层次**: 从地基到屋顶共 31 层

## 结构代码参考

```javascript
// 结构尺寸: 18×31×41
// 从原始结构数据转换，方块数: 7908

// 地基 (y=0): x0-17, z0-40
//   主要: deepslate×738
// 墙体 (y=1-29): 主要方块 deepslate_bricks×3281, deepslate_tiles×1702, deepslate×736, cobbled_deepslate×350, gray_carpet×221
// 屋顶 (y=30+): 主要方块 deepslate_bricks×32, deepslate_tiles×22

// VoxelBuilder 代码结构：
builder.defineComponent('structure', (b) => {
  // 尺寸 18×31×41，实际使用时按需求调整比例
  b.beginGroup('foundation', { priority: 10 });
  b.fill(0, 0, 0, 18, 0, 41, 'deepslate');
  b.endGroup();
  // ... (墙体、门窗、屋顶按实际结构填充)
});
```

## 使用建议

- 生成类似风格建筑时参考此案例的**材料组合**和**尺寸比例**
- 不要照抄坐标，而是模仿：材料搭配、层高比例、屋顶处理
