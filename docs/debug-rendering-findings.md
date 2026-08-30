# 渲染问题诊断报告

**日期**: 2026-08-30  
**任务**: 定位 3D 场景不显示方块的根本原因

---

## 🔍 诊断过程

### 1. 初始状态检查

**发现**:
- ✅ Dev server 运行在 5177 端口
- ✅ Canvas 元素存在
- ❌ 初始检查显示 0 个方块
- ❌ 分类文件报告未加载（误报，实际已加载）

### 2. 暴露 Zustand Store

**问题**: CDP 诊断工具无法访问 `window.__voxel_store`

**修复**: 在 `src/store/useStore.js` 添加:
```javascript
// Expose store to window for debugging
if (typeof window !== 'undefined') {
    window.__voxel_store = useStore;
}
```

**结果**: ✅ 可以通过 `window.__voxel_store.getState()` 访问状态

### 3. Canvas 尺寸问题

**发现**: Canvas 初始化为 300x150（默认尺寸），未自动适配父容器

**父容器尺寸**: 664px × 901px  
**Canvas 实际尺寸**: 300px × 150px

**临时修复**: 手动调整 Canvas 尺寸
```javascript
canvas.width = rect.width * window.devicePixelRatio;
canvas.height = rect.height * window.devicePixelRatio;
window.dispatchEvent(new Event('resize'));
```

**结果**: Canvas 调整为 996 × 1352（考虑 devicePixelRatio）

### 4. 页面重载后的状态

**发现**: 重载后恢复了 155 个方块（原始测试数据）

**方块组成**:
```
stonecutter:         50
grindstone:          50
dragon_egg:          1
iron_bars:           18
chain:               10
lantern:             4
torch:               4
candle:              7
brewing_stand:       7
stone_button:        2
stone_pressure_plate: 2
---
总计:                155
```

**特点**: 全部是复杂方块（需要 VanillaMultiElementBlocks 渲染器）

### 5. 方块分类验证

检查 `blocks-classification.json` 中的分类：

| 方块 | multiElement | simpleShape | rotation |
|-----|--------------|-------------|----------|
| stonecutter | ✅ | ❌ | ❌ |
| grindstone | ✅ | ❌ | ❌ |
| dragon_egg | ✅ | ❌ | ❌ |
| iron_bars | ✅ | ❌ | ❌ |
| torch | ✅ | ❌ | ❌ |
| brewing_stand | ✅ | ❌ | ❌ |
| chain | ❌ | ❌ | ✅ |
| lantern | ❌ | ❌ | ✅ |
| candle | ❌ | ❌ | ✅ |
| stone_button | ❌ | ✅ | ❌ |
| stone_pressure_plate | ❌ | ✅ | ❌ |

**结论**: 分类正确，应该被 VanillaMultiElementBlocks 或 TexturedInstancedBlocks 渲染

### 6. 模型数据验证

检查 `vanilla-block-models.json`:
- ✅ 文件可访问（1.76 MB，865 个模型）
- ✅ stonecutter 模型存在（2 个 elements）
- ✅ grindstone 模型存在（5 个 elements）
- ✅ torch 模型存在（3 个 elements）
- ✅ lantern 模型存在（4 个 elements）
- ✅ chain 模型存在（2 个 elements）

### 7. Atlas 纹理检查

**路径**: `/minecraft-1.20.1/atlas.png`  
**状态**: ✅ 可访问（435 KB，200 OK，image/png）

**UV 映射**: `/minecraft-1.20.1/atlas-uv-map.json`  
**状态**: ✅ 可访问（184 KB，JSON）

### 8. WebGL 渲染状态

**Canvas 状态**:
- ✅ WebGL context 存在
- ✅ Context 未丢失
- ❌ **所有采样像素为 (0,0,0,0) - 完全空白**

**Three.js 标识**: Canvas 上有 `data-engine="three.js r182"`，说明 React Three Fiber 已初始化

### 9. React 组件树检查

**发现**: VoxelWorld 组件 **未出现在 React Fiber 树中**

**组件链**:
```
Unknown → Unknown → CanvasImpl → Unknown → m → Canvas → Unknown → App
```

**缺失**: VoxelWorld 应该在 Canvas 内部，但未找到

---

## 🚨 根本原因分析

### 核心问题

**VoxelWorld 组件未挂载或未渲染任何内容**

可能的原因：

1. **条件渲染阻止挂载**
   - 检查 App.jsx 中是否有条件判断阻止 VoxelWorld 渲染
   - 可能与 `isLoadingSession` 或其他状态有关

2. **VoxelWorld 返回 null**
   - 所有子渲染器（TexturedInstancedBlocks、VanillaMultiElementBlocks 等）在 `blocks.length === 0` 时返回 null
   - 但现在有 155 个方块，不应该返回 null

3. **React Three Fiber 场景未正确初始化**
   - Canvas 存在但内部场景对象未创建
   - 可能是 R3F 版本兼容性问题

4. **VoxelWorld useStore 订阅问题**
   - Zustand 订阅可能未触发重新渲染
   - 需要验证 `useStore((state) => state.blocks)` 是否正常工作

5. **性能模式或视图模式问题**
   - 检查 `viewMode` 是否为 'blueprint'（会渲染不同内容）
   - 检查 `useUltraPerformance` 是否错误触发

---

## 🔧 下一步调试计划

### A. 验证 VoxelWorld 是否真的被渲染

```javascript
// 在 VoxelWorld.jsx 开头添加 console.log
export default function VoxelWorld({ version = '1.20.1' }) {
    const blocks = useStore((state) => state.blocks);
    console.log('[VoxelWorld] Rendering with blocks:', blocks.length);
    // ...
}
```

### B. 检查 App.jsx 中的条件渲染

查找是否有类似的代码：
```javascript
{someCondition && <VoxelWorld version={selectedVersion} />}
```

### C. 验证 Zustand 订阅

```javascript
// 在浏览器 console 中测试
const unsubscribe = window.__voxel_store.subscribe(
  (state) => state.blocks,
  (blocks) => console.log('Blocks changed:', blocks.length)
);

// 触发变化
window.__voxel_store.setState({ blocks: [...window.__voxel_store.getState().blocks] });
```

### D. 检查 React Three Fiber 场景

```javascript
// 在浏览器 console 中
const canvas = document.querySelector('canvas');
const fiber = canvas.__r3f;
console.log('R3F Fiber:', fiber);
console.log('Scene:', fiber?.scene);
console.log('Scene children:', fiber?.scene?.children);
```

### E. 强制简单渲染测试

临时修改 VoxelWorld.jsx，添加一个简单的立方体：
```javascript
return (
  <group>
    {/* 测试立方体 - 如果这个不显示，说明 R3F 有问题 */}
    <mesh position={[0, 5, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshBasicMaterial color="red" />
    </mesh>
    
    {/* 原有的渲染逻辑 */}
    {/* ... */}
  </group>
);
```

---

## 📊 已验证正常的部分

✅ Dev server 正常运行  
✅ 前端页面加载成功  
✅ React 应用挂载  
✅ Canvas 元素存在  
✅ WebGL context 创建成功  
✅ Zustand store 初始化  
✅ Store 中有 155 个有效方块  
✅ blocks-classification.json 加载成功  
✅ vanilla-block-models.json 可访问  
✅ Atlas 纹理文件可访问  
✅ 方块不是 invisible 类型  
✅ 方块有正确的 position 数组  
✅ 方块分类正确  
✅ 模型数据完整  

---

## ❌ 待修复的问题

1. **Canvas 自动尺寸适配**
   - React Three Fiber 的 ResizeObserver 未工作
   - 需要检查 Canvas 配置或添加手动 resize 处理

2. **VoxelWorld 组件渲染失败**
   - **核心问题**: 155 个方块存在但未渲染
   - 需要添加调试日志定位具体原因

3. **Three.js 场景内容缺失**
   - Scene 对象未暴露到 `canvas.__r3f`
   - 或者 scene.children 为空

---

## 🎯 关键发现总结

1. **数据层完全正常**: 155 个有效方块，类型、位置、分类都正确
2. **资源文件完全正常**: 模型、纹理、分类文件都可访问
3. **渲染层完全空白**: WebGL 初始化但没有绘制任何内容
4. **组件树异常**: VoxelWorld 未出现在 React Fiber 树中

**结论**: 问题出在 **VoxelWorld 组件的渲染逻辑** 或 **React Three Fiber 的场景构建**，而不是数据或资源文件。
