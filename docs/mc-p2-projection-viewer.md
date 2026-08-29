# 任务书：P2-④ 投影查看器（2D 三视图 + 层切片）

> 仓库：mc-ai-builder-v2 | 日期：2026-08-29 | 本轮定位：P2 渲染收官最后一项
> **允许修改/新建**：`src/utils/projection.js`（新建，纯函数投影计算）、`src/utils/projection.test.js`（新建）、`src/components/ProjectionViewer.jsx`（新建）、`src/App.jsx`（视口工具栏加入口 + 模态挂载）、如需要 `src/components/VoxelWorld.jsx` 仅导出色表（尽量不动）

## 一、现状盘点（已取证）

1. `viewMode` 已有 'mc' | 'blueprint' 两态（blueprint = SEMANTIC_COLORS 语义色块渲染，VoxelWorld.jsx:824-1126）
2. 色表**未导出**：SEMANTIC_COLORS（VoxelWorld 内）；但 `textureMapping.js` 已导出 `FALLBACK_COLORS`（方块→hex，120+ 条目）可作投影色源
3. 3D 视口工具栏现有视角按钮（App.jsx ~「实景视图/编辑视角/游戏视角」）+ MinecraftHUD.jsx 组件
4. 无任何 2D 投影/平面图功能；store.blocks / semanticVoxels 数据完备（position:[x,y,z] + type）

## 二、设计

### 1. projection.js（纯函数，可单测）
- `computeProjection(voxels, direction)`：
  - direction: 'top' | 'front' | 'side'
  - 输入：体素数组 `[{ position:[x,y,z], type }]`（非 AIR）
  - top：沿 Y 压缩，每 (x,z) 取 **最高** 方块 → 输出 `{ grid: Map('x,z' -> {type, y}), width, depth, height }`（height = 最高 y+1）
  - front：沿 Z 压缩（从南侧看），每 (x,y) 取 **最前**（z 最大）→ `{ grid, width, height, depth }`
  - side：沿 X 压缩（从东侧看），每 (z,y) 取最右（x 最大）
- `getLayerSlice(voxels, y)`：top 视图第 y 层平面（用于层切片）
- 边界处理：空 voxels → 全空 grid（不抛错）
- 输出结构统一 `{ cells: Array<{ x, y, type }>, width, depth, height }`（front/side 的 y 语义=高度轴）

### 2. ProjectionViewer.jsx（渲染组件）
- 入参：`blocks` 或从 useStore 读 semanticVoxels
- **三视图并排**：TOP（俯视）/ FRONT（正面）/ SIDE（侧面），每图 Canvas 2D 绘制：
  - 每格 = 一个方块（像素尺寸 = 方块数 × 20px，可缩放 fit）
  - 色块填充：`FALLBACK_COLORS[type] || '#c8c8c8'`（空位透明/网格线）
  - 坐标轴标注（X/Z/X/Y）+ 尺寸徽标（W×D×H）
  - 暗色主题配色（bg #0f1219，网格线 rgba(255,255,255,0.08)，对齐现有 UI）
- **层切片控制**：TOP 图下方滑块（0 ~ height-1，默认最高层），实时切换显示该层平面（用 getLayerSlice）
- 底部统计：方块数 / 尺寸 / 最高层
- 纯展示组件，不涉及 3D

### 3. App.jsx 入口
- 3D 视口工具栏（现有视角按钮行）加「📐 投影」按钮（isProjectionOpen state）
- 打开 → 模态/侧滑面板（复用 ConfirmModal 风格或新建轻量 overlay）内嵌 `<ProjectionViewer />`，可关闭
- 按钮样式对齐现有视角按钮（text-xs、bg-neutral-900/80 等）

### 4. 单测（projection.test.js）
- 3×3×2 立方体（全 stone）top/front/side → 各投影矩阵正确（全 3×3 / 3×2 / 3×2，尺寸对）
- 带台阶差异（如 y=1 层少一块）→ top 取最高正确
- 空数组 → 空 grid 不抛错
- getLayerSlice 返回正确层

## 三、验收清单
1. `npx vitest run` 全绿（219 基线不破坏 + 新增）
2. `npm run build` 通过
3. CDP 实测（主 agent）：二阶段——① smart 生成建筑（或注入测试塔）后点击「📐 投影」→ 截图：**三视图并排色块图 + 尺寸标注 + 层滑块** ② vision 确认三视图与建筑形状相符（如塔=俯视方形环/正视柱形）
4. 模态可关闭、不影响 3D 视图

## 四、约束
- 不动：store/server/导出；VoxelWorld 尽量不动（色表用 FALLBACK_COLORS）
- Canvas 2D 绘制（不引新依赖）；性能：blocks ≤ 5000 直接算
- 中文注释；不提交（主 agent 提交）；改完跑 vitest + build 贴摘要