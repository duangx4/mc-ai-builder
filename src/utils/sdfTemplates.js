/**
 * SDF 曲面模板库 (P3-① Curved Surface Template Library)
 * 常见曲面建筑模板，供 LLM 参考生成代码
 */

export const SDF_TEMPLATES = [
  {
    id: 'chinese_pavilion_dome',
    name: 'Chinese Pavilion Dome',
    名称: '中式亭阁圆顶',
    description: '圆形穹顶配合木柱环，典型的中式亭阁结构',
    blocks: [
      '底部方形基座（石砖）',
      '四角或八角木柱（橡木原木）',
      '顶部圆形穹顶（builder.dome 深色橡木楼梯）',
      '穹顶中心装饰（灯笼或栅栏）'
    ],
    hint: 'builder.dome(centerX, floorY + columnHeight, centerZ, 6, 4, "dark_oak_stairs", { hollow: true })'
  },

  {
    id: 'western_church_dome',
    name: 'Western Church Dome',
    名称: '西式穹顶教堂',
    description: '经典的圆形穹顶教堂大厅，带鼓座和穹顶',
    blocks: [
      '方形主体建筑（石砖墙）',
      '圆形鼓座（builder.cylinder 空心石砖，高 3-4 格）',
      '半球形穹顶（builder.dome 砂岩或石砖楼梯）',
      '顶部十字架或尖顶'
    ],
    hint: 'builder.cylinder(cx, roofY, cz, 8, 4, "stone_bricks", { hollow: true, wall: 1 }); builder.dome(cx, roofY + 4, cz, 8, 6, "sandstone_stairs", { hollow: true })'
  },

  {
    id: 'round_tower',
    name: 'Round Tower',
    名称: '圆形塔楼',
    description: '圆柱形塔身配锥形屋顶',
    blocks: [
      '圆柱形塔身（builder.cylinder 空心石砖，高 12-20 格）',
      '内部楼梯或楼板',
      '锥形屋顶（builder.dome 小半径，高度=半径，尖锐收顶）',
      '顶部旗杆或箭塔'
    ],
    hint: 'builder.cylinder(cx, groundY, cz, 6, 20, "stone_bricks", { hollow: true, wall: 2 }); builder.dome(cx, groundY + 20, cz, 6, 6, "dark_oak_stairs")'
  },

  {
    id: 'observatory_dome',
    name: 'Observatory Dome',
    名称: '天文台穹顶',
    description: '半球形观测穹顶，现代或科幻风格',
    blocks: [
      '圆形底座建筑（混凝土或铁块）',
      '完整半球形穹顶（builder.dome 玻璃或铁块，hollow=true）',
      '顶部透气孔或天线',
      '内部望远镜平台'
    ],
    hint: 'builder.dome(cx, baseY, cz, 10, 10, "glass", { hollow: true, wall: 1 })'
  },

  {
    id: 'arch_bridge',
    name: 'Arch Bridge',
    名称: '拱桥',
    description: '石拱桥，使用半圆或椭圆拱形',
    blocks: [
      '两侧桥墩（石砖柱）',
      '中间拱形（builder.dome 侧向，或用 builder.torus 切半）',
      '桥面铺装（石板）',
      '护栏（栅栏或墙）'
    ],
    hint: '// 拱形可用 dome 旋转 90 度，或手动用 builder.sphere 切片\nfor (let x = 0; x < archWidth; x++) { let y = Math.sqrt(radius*radius - (x-center)*(x-center)); builder.set(...) }'
  },

  {
    id: 'fountain_basin',
    name: 'Circular Fountain',
    名称: '圆形喷泉',
    description: '圆形水池配中心喷泉',
    blocks: [
      '圆形水池边缘（builder.cylinder 高 1-2 格，hollow=true，石砖）',
      '水池内部填水（水方块）',
      '中心喷泉柱（小圆柱，石英或海晶石）',
      '装饰雕塑（可选，用 builder.sphere 做球形装饰）'
    ],
    hint: 'builder.cylinder(cx, groundY, cz, 8, 2, "stone_bricks", { hollow: true, wall: 1 }); builder.cylinder(cx, groundY, cz, 7, 1, "water")'
  },

  {
    id: 'igloo_dome',
    name: 'Igloo Dome',
    名称: '冰屋圆顶',
    description: '半球形冰屋，低矮圆顶',
    blocks: [
      '半球形外壳（builder.dome 雪块或冰块，radius=6, height=4）',
      '入口隧道（手动挖开一侧）',
      '内部空心（hollow=true）'
    ],
    hint: 'builder.dome(cx, snowY, cz, 6, 4, "snow_block", { hollow: true, wall: 1 })'
  },

  {
    id: 'colosseum_tier',
    name: 'Colosseum Tier',
    名称: '竞技场环形看台',
    description: '圆形或椭圆形看台，多层环形结构',
    blocks: [
      '多层同心圆柱（builder.cylinder hollow，逐层半径递增）',
      '阶梯式座位（楼梯方块）',
      '中心竞技场地面',
      '外墙装饰（拱门、柱子）'
    ],
    hint: 'for (let tier = 0; tier < 3; tier++) { builder.cylinder(cx, groundY + tier*3, cz, 15 + tier*3, 3, "stone_bricks", { hollow: true, wall: 2 }); }'
  },

  {
    id: 'torii_gate',
    name: 'Torii Gate with Curved Top',
    名称: '鸟居（曲线顶梁）',
    description: '日式鸟居，顶梁可用 torus 切片做弧形',
    blocks: [
      '两根立柱（深色橡木原木）',
      '顶部横梁（可用 builder.torus 的一部分做弧形）',
      '次级横梁（直线，橡木栅栏）'
    ],
    hint: '// 用 torus 做弧形横梁：builder.torus(cx, topY, cz, 8, 1, "dark_oak_log", { orientation: "horizontal" }) 然后只保留前后半段'
  },

  {
    id: 'spherical_lantern',
    name: 'Spherical Lantern',
    名称: '球形灯笼',
    description: '装饰性球形灯笼，可悬挂或立柱顶',
    blocks: [
      '球形外壳（builder.sphere 空心，玻璃或铁栅栏，radius=2-3）',
      '中心光源（荧石或海晶灯）',
      '悬挂链条（栅栏向上延伸）'
    ],
    hint: 'builder.sphere(cx, lampY, cz, 3, "glass", { hollow: true, wall: 1 }); builder.set(cx, lampY, cz, "sea_lantern")'
  },

  {
    id: 'radar_dish',
    name: 'Radar Dish',
    名称: '雷达天线盘',
    description: '抛物面雷达盘，科幻或现代风格',
    blocks: [
      '抛物面（用 builder.dome 倒置或 builder.sphere 切片）',
      '中心接收器（铁块或石英块）',
      '支撑支架（铁栅栏或混凝土柱）',
      '底座平台'
    ],
    hint: '// 倒置 dome：builder.dome(cx, dishY, cz, 8, 6, "iron_block", { hollow: true }) 然后手动填充内侧做抛物面'
  },

  {
    id: 'mushroom_house',
    name: 'Mushroom House',
    名称: '蘑菇屋',
    description: '蘑菇形房屋，大伞盖',
    blocks: [
      '圆柱形柄（builder.cylinder 橡木或蘑菇柄方块）',
      '大伞盖（builder.dome 大半径，红色混凝土或蘑菇块）',
      '伞盖底部空心（方便居住）',
      '门窗开口'
    ],
    hint: 'builder.cylinder(cx, groundY, cz, 3, 8, "mushroom_stem"); builder.dome(cx, groundY + 8, cz, 10, 6, "red_concrete", { hollow: true })'
  }
];

/**
 * 获取曲面原语使用提示（供 LLM system prompt 注入）
 */
export function getSdfPrimitivesHint() {
  return `
## 曲面原语 (Curved Surface Primitives)

可用的曲面构建原语（专为穹顶、圆塔、球形等建筑设计）：

1. **builder.sphere(cx, cy, cz, radius, block, options?)**
   - 球体：中心 (cx, cy, cz)，半径 radius
   - options: { hollow: true, wall: 1 } 可做空心球壳
   - 示例：builder.sphere(0, 10, 0, 5, "stone_bricks") // 实心石砖球

2. **builder.dome(cx, cy, cz, radius, height, block, options?)**
   - 穹顶：底面中心 (cx, cy, cz)，半径 radius，高度 height
   - 穹顶从底面向上升起，适合屋顶、教堂穹顶、亭阁圆顶
   - options: { hollow: true, wall: 1 } 可做空心穹顶
   - 示例：builder.dome(0, 10, 0, 8, 6, "sandstone_stairs", { hollow: true }) // 空心砂岩穹顶

3. **builder.cylinder(cx, cy, cz, radius, height, block, options?)**
   - 圆柱：底面中心 (cx, cy, cz)，半径 radius，高度 height
   - 竖直圆柱，适合塔楼、柱子、筒状建筑
   - options: { hollow: true, wall: 1 } 可做空心圆柱（塔内部空）
   - 示例：builder.cylinder(0, 0, 0, 6, 20, "stone_bricks", { hollow: true, wall: 2 }) // 空心圆塔

4. **builder.torus(cx, cy, cz, majorR, minorR, block, options?)**
   - 环面：中心 (cx, cy, cz)，主半径 majorR，副半径（管粗）minorR
   - 甜甜圈形状，适合拱门、装饰环、特殊结构
   - options: { orientation: 'horizontal'|'vertical' } 控制环的朝向
   - 示例：builder.torus(0, 10, 0, 8, 2, "quartz_block") // 水平石英环

**使用场景提示：**
- 穹顶屋顶 → builder.dome
- 圆形塔楼 → builder.cylinder (hollow: true)
- 球形装饰/灯笼 → builder.sphere
- 拱形结构/环形装饰 → builder.torus（或 dome 侧向）

所有原语内部使用 builder.set 放置方块，与现有 API 完全兼容。
`.trim();
}
