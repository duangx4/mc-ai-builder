# 方块渲染问题分析

## 问题描述

用户报告以下方块没有被渲染：
- `polished_deepslate` (实际是 polished_deepslate_stairs)
- `crying_obsidian`
- `dragon_egg`

## 当前系统架构

### VoxelWorld 方块分类逻辑

方块在 VoxelWorld 中被分为以下类别：

1. **stairBlocks** - 楼梯方块（`_stairs`）
2. **waterBlocks** - 水方块
3. **fenceWallBlocks** - 栅栏/墙体（使用 MC 原版模型）
4. **torchLanternBlocks** - 火把/灯笼（使用 MC 原版模型）
5. **regularBlocks** - 其他普通方块

### 渲染器分配

```javascript
// 1. UltraPerformance 模式 - 所有方块合并
if (useUltraPerformance) {
    <UltraPerformanceRenderer blocks={visibleBlocks} />
}

// 2. 普通模式
// 2.1 纹理方块 (regularBlocks)
<TexturedInstancedBlocks blocks={regularBlocks} />

// 2.2 Vanilla 多元素方块
<VanillaMultiElementBlocks blocks={vanillaBlocks} />

// 2.3 栅栏/墙体
<MCModelInstancedBlocks blocks={fenceWallBlocks} />

// 2.4 火把/灯笼
<MCModelInstancedBlocks blocks={torchLanternBlocks} />

// 2.5 楼梯
<StairInstancedBlocks blocks={stairBlocks} />

// 2.6 水
<WaterBlocks blocks={waterBlocks} />
```

## 问题诊断

### 1. polished_deepslate_stairs

**应该在哪里渲染**：`StairInstancedBlocks`

**问题**：
- 方块类型是 `polished_deepslate_stairs`
- `isStair()` 判断应该为 true（包含 `_stairs`）
- 应该被归类到 `stairBlocks`
- 由 `StairInstancedBlocks` 渲染

**可能原因**：
1. `StairInstancedBlocks` 组件渲染逻辑有问题
2. 材质加载失败
3. 几何体生成失败

### 2. crying_obsidian

**应该在哪里渲染**：`TexturedInstancedBlocks`

**问题**：
- 这是普通方块
- 应该被归类到 `regularBlocks`
- 由 `TexturedInstancedBlocks` 渲染

**可能原因**：
1. 纹理映射缺失
2. atlas 中没有对应纹理
3. 材质创建失败

### 3. dragon_egg

**应该在哪里渲染**：`TexturedInstancedBlocks` 或 `VanillaMultiElementBlocks`

**问题**：
- 龙蛋是特殊方块，可能有特殊模型
- 应该被归类到 `regularBlocks` 或 `vanillaBlocks`

**可能原因**：
1. 没有纹理
2. 需要特殊模型
3. 没有在 blocks-classification.json 中定义

## 调试步骤

### 步骤 1：确认方块分类

在浏览器控制台运行：

```javascript
const state = window.__voxel_store.getState();
const blocks = state.blocks;

// 检查楼梯分类
const stairs = blocks.filter(b => b.type.includes('_stairs'));
console.log('Stairs:', stairs.length, stairs.map(b => b.type));

// 检查普通方块
const regular = blocks.filter(b => 
  !b.type.includes('_stairs') && 
  !b.type.includes('_fence') && 
  !b.type.includes('_wall') &&
  !b.type.includes('torch') &&
  !b.type.includes('lantern')
);
console.log('Regular:', regular.length);
```

### 步骤 2：检查 TexturedInstancedBlocks

查看日志中的 `texturedBlocksCount`：

```bash
grep "texturedBlocksCount" voxel-debug.log
```

如果计数为 0，说明所有 regular 方块都没有被渲染。

### 步骤 3：检查材质系统

```javascript
// 检查材质是否存在
const { getOrCreateMaterial } = await import('/src/components/VoxelWorld.jsx');

// 尝试创建材质
const mat1 = getOrCreateMaterial('crying_obsidian', '1.20.1');
const mat2 = getOrCreateMaterial('dragon_egg', '1.20.1');

console.log('Materials:', mat1, mat2);
```

### 步骤 4：检查 Atlas

```javascript
// 检查 atlas 是否加载
const { isAtlasLoaded } = await import('/src/utils/atlasMaterial.js');
console.log('Atlas loaded:', isAtlasLoaded());

// 检查纹理 UV
const { getTextureUV } = await import('/src/utils/atlasMaterial.js');
console.log('crying_obsidian UV:', getTextureUV('crying_obsidian'));
console.log('dragon_egg UV:', getTextureUV('dragon_egg'));
```

## 临时解决方案

如果确认是渲染器的问题，可以：

### 方案 1：强制使用 UltraPerformance 模式

UltraPerformance 模式会渲染所有方块（使用单色）：

```javascript
window.__voxel_store.getState().setUseUltraPerformance(true);
```

### 方案 2：添加调试日志

在 `VoxelWorld.jsx` 的分类逻辑中添加：

```javascript
console.log('[VoxelWorld] About to render:', {
    visibleBlocksCount: visibleBlocks.length,
    texturedBlocksCount: regularBlocks.length,
    vanillaBlocksCount: vanillaBlocks.size,
    fenceWallBlocksCount: fenceWallBlocks.length,
    torchLanternBlocksCount: torchLanternBlocks.length,
    stairBlocksCount: stairBlocks.length  // 添加这个
});
```

### 方案 3：直接检查组件

```javascript
// 查看 StairInstancedBlocks 是否正在渲染
const stairElements = document.querySelectorAll('[key*="stair"]');
console.log('Stair elements:', stairElements.length);

// 查看 TexturedInstancedBlocks 是否正在渲染
const texturedElements = document.querySelectorAll('[key*="textured"]');
console.log('Textured elements:', texturedElements.length);
```

## 下一步行动

1. ✅ 确认方块分类是否正确
2. ⬜ 检查对应渲染器是否工作
3. ⬜ 检查材质/纹理系统
4. ⬜ 修复具体问题
5. ⬜ 测试验证

## 相关文件

- `src/components/VoxelWorld.jsx` - 主渲染逻辑
- `src/components/TexturedInstancedBlocks.jsx` - 纹理方块渲染器
- `src/components/StairInstancedBlocks.jsx` - 楼梯渲染器
- `src/utils/atlasMaterial.js` - 材质系统
- `public/minecraft-1.20.1/atlas.png` - 纹理集
- `public/minecraft-1.20.1/atlas-uv-map.json` - UV 映射
