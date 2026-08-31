# MC 高精度方块渲染测试提示词

## 提示词（复制粘贴到聊天框）

```
请帮我测试所有高精度方块的渲染效果。创建一个测试场景，包含以下方块：

1. 栅栏系列（测试连接）：
   - 橡木栅栏 3个连续放置 (oak_fence)
   - 云杉栅栏 3个连续放置 (spruce_fence)

2. 墙体系列（测试连接）：
   - 圆石墙 3个连续放置 (cobblestone_wall)
   - 砖墙 3个连续放置 (brick_wall)

3. 灯笼系列：
   - 普通灯笼 (lantern)
   - 灵魂灯笼 (soul_lantern)

4. 火把系列：
   - 普通火把 (torch)
   - 灵魂火把 (soul_torch)
   - 红石火把 (redstone_torch)

5. 其他高精度方块：
   - 锁链 (chain)
   - 铁栏杆 3个连续 (iron_bars)
   - 玻璃板 3个连续 (glass_pane)
   - 活板门 (oak_trapdoor)
   - 压力板 (stone_pressure_plate)

请将这些方块整齐排列，方便我检查渲染效果和连接逻辑。
```

## 简化版（快速测试）

```
帮我添加测试方块：
- oak_fence 3个连续 [0,0,0], [1,0,0], [2,0,0]
- cobblestone_wall 3个连续 [0,0,2], [1,0,2], [2,0,2]
- lantern 和 soul_lantern [4,0,0], [5,0,0]
- torch 和 soul_torch [4,0,2], [5,0,2]
- chain [7,0,0]
- iron_bars 3个 [0,0,4], [1,0,4], [2,0,4]
```

## 详细测试版（检测所有类型）

```
创建一个完整的高精度方块展示场景：

第1排（栅栏测试，Y=0）：
- oak_fence: [0,0,0] [1,0,0] [2,0,0]
- spruce_fence: [4,0,0] [5,0,0] [6,0,0]
- birch_fence: [8,0,0] [9,0,0] [10,0,0]

第2排（墙体测试，Y=0，Z=2）：
- cobblestone_wall: [0,0,2] [1,0,2] [2,0,2]
- brick_wall: [4,0,2] [5,0,2] [6,0,2]
- stone_brick_wall: [8,0,2] [9,0,2] [10,0,2]

第3排（光源测试，Y=0，Z=4）：
- lantern: [0,0,4]
- soul_lantern: [2,0,4]
- torch: [4,0,4]
- soul_torch: [6,0,4]
- redstone_torch: [8,0,4]

第4排（杆状方块，Y=0，Z=6）：
- chain: [0,0,6]
- iron_bars: [2,0,6] [3,0,6] [4,0,6]
- glass_pane: [6,0,6] [7,0,6] [8,0,6]

第5排（其他特殊方块，Y=0，Z=8）：
- oak_trapdoor: [0,0,8]
- iron_trapdoor: [2,0,8]
- stone_pressure_plate: [4,0,8]
- oak_pressure_plate: [6,0,8]
- lever: [8,0,8]

请逐个添加这些方块，并告诉我哪些渲染正常，哪些有问题。
```

## 使用方法

1. 复制上面任意一个提示词
2. 粘贴到 mc-ai-builder 的聊天框
3. AI 会自动添加这些方块到场景
4. 观察渲染效果并报告问题

## 预期结果

**应该正常渲染的：**
- ✅ 栅栏（显示连接横杆）
- ✅ 墙体（显示连接段）
- ✅ 灯笼（显示挂钩+主体）
- ✅ 火把（显示杆+火焰）

**可能需要优化的：**
- ⚠️ 铁栏杆、玻璃板（连接逻辑）
- ⚠️ 活板门（旋转状态）
- ⚠️ 压力板（扁平形状）
- ⚠️ 拉杆（角度问题）

## 调试命令

如果遇到问题，可以在浏览器控制台运行：

```javascript
// 查看当前所有方块
window.__voxel_store.getState().blocks

// 查看 VoxelWorld 渲染状态
// 看控制台中的 [VoxelWorld] About to render 日志

// 强制刷新（如果缓存问题）
location.reload(true)
```
