# MC AI Builder - 高精度方块系统使用指南

## ✅ 系统已完成功能

### 1. MC 原版模型解析系统
- ✅ 解析 MC 1.20.1 原版 JSON 模型
- ✅ 支持 multipart 系统（栅栏、墙体自动连接）
- ✅ 支持 variants 系统（灯笼、火把等）
- ✅ 实例化批量渲染优化

### 2. 已支持的高精度方块
- ✅ **栅栏系列**：oak_fence, spruce_fence, birch_fence 等
- ✅ **墙体系列**：cobblestone_wall, brick_wall, stone_brick_wall 等
- ✅ **灯笼系列**：lantern, soul_lantern
- ✅ **火把系列**：torch, soul_torch, redstone_torch

### 3. 后端服务器
- ✅ 运行在 `http://localhost:3001`
- ✅ 提供 API 和技能管理功能

---

## 🎮 如何使用

### 方法 1：在聊天框中使用自然语言

直接在聊天框中输入：

```
帮我创建一个栅栏围栏，3x3 的区域
```

```
在坐标 (0,0,0) 放置一个灯笼
```

```
创建一排火把，从 (0,0,0) 到 (10,0,0)
```

AI 会自动生成代码并放置方块。

### 方法 2：使用代码执行

在聊天框中输入代码块：

````
```javascript
// 栅栏测试
builder.set(0, 0, 0, 'oak_fence');
builder.set(1, 0, 0, 'oak_fence');
builder.set(2, 0, 0, 'oak_fence');

// 墙体测试
builder.set(0, 0, 2, 'cobblestone_wall');
builder.set(1, 0, 2, 'cobblestone_wall');
builder.set(2, 0, 2, 'cobblestone_wall');

// 灯笼测试
builder.set(4, 0, 0, 'lantern');
builder.set(5, 0, 0, 'soul_lantern');

// 火把测试
builder.set(4, 0, 2, 'torch');
builder.set(5, 0, 2, 'soul_torch');
```
````

### 方法 3：快速测试提示词

复制以下内容到聊天框：

```
请使用 builder.set() 在以下位置放置方块：
- oak_fence: (0,0,0), (1,0,0), (2,0,0)
- cobblestone_wall: (0,0,2), (1,0,2), (2,0,2)
- lantern: (4,0,0)
- soul_lantern: (5,0,0)
- torch: (4,0,2)
- soul_torch: (5,0,2)
```

---

## 🎥 视角控制

方块放置后，使用以下操作查看：

1. **旋转视角**：按住鼠标右键拖动
2. **缩放**：滚动鼠标滚轮
3. **平移**：按住鼠标中键拖动
4. **重置视角**：刷新页面或调整摄像机

---

## 🔧 Builder API 参考

### 基础放置
```javascript
builder.set(x, y, z, 'block_type');        // 放置单个方块
builder.fill(x1,y1,z1, x2,y2,z2, 'block'); // 填充区域
```

### 高精度方块示例

**栅栏围栏**：
```javascript
// 创建 5x5 栅栏围栏
for (let x = 0; x < 5; x++) {
    builder.set(x, 0, 0, 'oak_fence');  // 北边
    builder.set(x, 0, 4, 'oak_fence');  // 南边
}
for (let z = 1; z < 4; z++) {
    builder.set(0, 0, z, 'oak_fence');  // 西边
    builder.set(4, 0, z, 'oak_fence');  // 东边
}
```

**墙体围墙**：
```javascript
// L 形墙体
for (let x = 0; x < 5; x++) {
    builder.set(x, 0, 0, 'cobblestone_wall');
}
for (let z = 1; z < 5; z++) {
    builder.set(0, 0, z, 'cobblestone_wall');
}
```

**照明系统**：
```javascript
// 每隔 5 格放置火把
for (let x = 0; x < 20; x += 5) {
    builder.set(x, 0, 0, 'torch');
}
```

**装饰灯笼**：
```javascript
// 在四个角放置灯笼
builder.set(0, 0, 0, 'lantern');
builder.set(10, 0, 0, 'lantern');
builder.set(0, 0, 10, 'lantern');
builder.set(10, 0, 10, 'lantern');
```

---

## ⚡ 性能优化

系统已实现：
- ✅ 实例化渲染（批量绘制相同方块）
- ✅ 自动按模型组合分组
- ✅ 异步加载几何体
- ✅ 方块连接状态缓存

可以轻松渲染数百个高精度方块而不卡顿。

---

## 🐛 常见问题

### Q: 看不到方块？
A: 
1. 调整摄像机视角（滚轮缩放，右键旋转）
2. 检查方块是否被遮挡
3. 按 F12 查看控制台日志确认方块已添加

### Q: 连接没有显示？
A: 确保相邻方块是同类型的（oak_fence 只与 oak_fence 连接）

### Q: 代码执行后显示"no blocks were placed"？
A: 确保使用 `builder.set()` 或 `builder.fill()`，而不是直接操作 store

### Q: 性能卡顿？
A: 
1. 使用 `builder.fill()` 替代大量 `builder.set()`
2. 避免一次性放置数千个方块
3. 关闭不必要的视觉效果

---

## 📚 支持的方块类型

### 栅栏（自动连接）
- oak_fence, spruce_fence, birch_fence, jungle_fence
- acacia_fence, dark_oak_fence, crimson_fence, warped_fence
- nether_brick_fence

### 墙体（自动连接）
- cobblestone_wall, mossy_cobblestone_wall
- stone_brick_wall, mossy_stone_brick_wall
- brick_wall, prismarine_wall, red_sandstone_wall
- granite_wall, diorite_wall, andesite_wall

### 光源
- torch, soul_torch, redstone_torch
- lantern, soul_lantern
- wall_torch, soul_wall_torch, redstone_wall_torch

### 其他高精度方块
- iron_bars, glass_pane (需要进一步测试)
- chain (需要进一步测试)
- pressure_plate 系列 (需要进一步测试)

---

## 🎯 推荐测试场景

### 场景 1：栅栏花园
```javascript
// 创建 10x10 栅栏围栏
for (let x = 0; x < 10; x++) {
    builder.set(x, 0, 0, 'oak_fence');
    builder.set(x, 0, 9, 'oak_fence');
}
for (let z = 0; z < 10; z++) {
    builder.set(0, 0, z, 'oak_fence');
    builder.set(9, 0, z, 'oak_fence');
}
```

### 场景 2：墙体城堡
```javascript
// 城堡外墙
builder.fill(0, 0, 0, 20, 0, 0, 'cobblestone_wall');
builder.fill(0, 0, 20, 20, 0, 20, 'cobblestone_wall');
builder.fill(0, 0, 0, 0, 0, 20, 'cobblestone_wall');
builder.fill(20, 0, 0, 20, 0, 20, 'cobblestone_wall');
```

### 场景 3：夜间照明
```javascript
// 路灯系统
for (let x = 0; x < 50; x += 10) {
    builder.set(x, 0, 0, 'stone');
    builder.set(x, 1, 0, 'oak_fence');
    builder.set(x, 2, 0, 'oak_fence');
    builder.set(x, 3, 0, 'lantern');
}
```

---

## 💡 提示

1. **连接逻辑**：栅栏和墙体会自动连接相邻的同类方块
2. **性能**：使用 `fill()` 比多次 `set()` 更高效
3. **调试**：按 F12 打开控制台查看详细日志
4. **视角**：方块太小看不清时，滚轮放大视角
5. **原版数据**：所有模型都基于 MC 1.20.1 官方数据，100%还原

---

## 🚀 下一步

系统已准备好使用！在聊天框输入你的建筑需求，AI 会自动生成代码并渲染方块。

享受使用 MC AI Builder！🎮
