---
name: 远古城市 - bottom_1
description: 远古城市建筑案例（巨型），尺寸 14×24×41，参考自 data/minecraft/structures/ancient_city/city_center/walls/bottom_1.nbt
---

# 🏗️ 远古城市 - bottom_1

## 基本信息

- **尺寸**: 14×24×41（巨型建筑）
- **方块数**: 1993
- **材料种类**: 37 种
- **来源**: `data/minecraft/structures/ancient_city/city_center/walls/bottom_1.nbt`

## 材料分析

主要方块（按使用量）：

| 方块 | 数量 | 类别 |
|------|------|------|
| `deepslate_bricks` | 665 | 墙 |
| `gray_wool` | 493 | 装饰 |
| `deepslate` | 281 | 框架/柱 |
| `deepslate_tile_stairs` | 169 | 屋顶 |
| `chiseled_deepslate` | 133 | 特殊/结构 |
| `deepslate_tiles` | 52 | 墙 |
| `polished_deepslate_stairs` | 41 | 屋顶 |
| `deepslate_brick_stairs` | 41 | 屋顶 |
| `polished_deepslate` | 30 | 墙 |
| `dark_oak_planks` | 28 | 墙 |
| `deepslate_tile_wall` | 12 | 门窗 |
| `dark_oak_fence` | 12 | 门窗 |

材料类别分布：墙(775), 装饰(493), 框架/柱(281), 屋顶(251), 特殊/结构(145)

## 结构分析

- **地基层** (y=0): deepslate_bricks(386个), deepslate(148个), jigsaw(4个)
- **屋顶层** (y=23): 
- **高度**: 24 格（高耸）

### 设计要点

1. **比例**: 14:24:41（均衡）
2. **主材料**: deepslate_bricks, gray_wool, deepslate, deepslate_tile_stairs, chiseled_deepslate
3. **结构层次**: 从地基到屋顶共 24 层

## 结构代码参考

```javascript
// 结构尺寸: 14×24×41
// 从原始结构数据转换，方块数: 1993

// 地基 (y=0): x0-13, z0-40
//   主要: deepslate_bricks×386, deepslate×148, jigsaw×4
// 墙体 (y=1-22): 主要方块 gray_wool×493, deepslate_bricks×279, deepslate_tile_stairs×169, deepslate×133, chiseled_deepslate×133

// VoxelBuilder 代码结构：
builder.defineComponent('structure', (b) => {
  // 尺寸 14×24×41，实际使用时按需求调整比例
  b.beginGroup('foundation', { priority: 10 });
  b.fill(0, 0, 0, 14, 0, 41, 'deepslate_bricks');
  b.endGroup();
  // ... (墙体、门窗、屋顶按实际结构填充)
});
```

## 使用建议

- 生成类似风格建筑时参考此案例的**材料组合**和**尺寸比例**
- 不要照抄坐标，而是模仿：材料搭配、层高比例、屋顶处理
