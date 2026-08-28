---
name: 远古城市 - bottom_2
description: 远古城市建筑案例（巨型），尺寸 14×24×41，参考自 data/minecraft/structures/ancient_city/city_center/walls/bottom_2.nbt
---

# 🏗️ 远古城市 - bottom_2

## 基本信息

- **尺寸**: 14×24×41（巨型建筑）
- **方块数**: 1834
- **材料种类**: 36 种
- **来源**: `data/minecraft/structures/ancient_city/city_center/walls/bottom_2.nbt`

## 材料分析

主要方块（按使用量）：

| 方块 | 数量 | 类别 |
|------|------|------|
| `deepslate_bricks` | 647 | 墙 |
| `gray_wool` | 484 | 装饰 |
| `deepslate` | 260 | 框架/柱 |
| `deepslate_tile_stairs` | 125 | 屋顶 |
| `chiseled_deepslate` | 95 | 特殊/结构 |
| `deepslate_tiles` | 52 | 墙 |
| `deepslate_brick_stairs` | 40 | 屋顶 |
| `polished_deepslate` | 32 | 墙 |
| `polished_deepslate_stairs` | 25 | 屋顶 |
| `dark_oak_planks` | 20 | 墙 |
| `deepslate_tile_wall` | 12 | 门窗 |
| `cracked_deepslate_tiles` | 11 | 其他 |

材料类别分布：墙(751), 装饰(484), 框架/柱(260), 屋顶(190), 特殊/结构(105)

## 结构分析

- **地基层** (y=0): deepslate_bricks(374个), deepslate(127个), jigsaw(4个)
- **屋顶层** (y=23): 
- **高度**: 24 格（高耸）

### 设计要点

1. **比例**: 14:24:41（均衡）
2. **主材料**: deepslate_bricks, gray_wool, deepslate, deepslate_tile_stairs, chiseled_deepslate
3. **结构层次**: 从地基到屋顶共 24 层

## 结构代码参考

```javascript
// 结构尺寸: 14×24×41
// 从原始结构数据转换，方块数: 1834

// 地基 (y=0): x0-13, z0-40
//   主要: deepslate_bricks×374, deepslate×127, jigsaw×4
// 墙体 (y=1-22): 主要方块 gray_wool×484, deepslate_bricks×273, deepslate×133, deepslate_tile_stairs×125, chiseled_deepslate×95

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
