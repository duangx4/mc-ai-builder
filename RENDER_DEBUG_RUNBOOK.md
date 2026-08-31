# P3 渲染 Debug 续接 RUNBOOK

> **用途**：续接 2026-08-30 晚搁置的"3D 场景不显示方块"调试。回来从这里继续，不用重翻零散报告。
> **整合来源**：`docs/final-diagnostic-report.md` / `docs/debug-rendering-findings.md` / `docs/debug-session-summary.md` / `docs/rendering-issue-root-cause.md` / `RENDER_DEBUG_STATUS.md`
> **最后动作**：`907c9d39`（08-30 22:03，移除测试立方体代码，保留日志）

---

## 一句话现状

**数据流/资源层全部正常，问题锁定在 R3F 渲染层：VoxelWorld 组件在 `<Canvas>` 的 children props 里存在，但从未 mount 成 React Fiber 节点**——既没执行 console.log，也没画出任何像素（WebGL 全 0,0,0,0）。

## 已排除 / 已确认

| 层面 | 状态 | 证据 |
|------|------|------|
| Store 数据 | ✅ 正常 | 155 方块（stonecutter×50/grindstone×50/dragon_egg×1/iron_bars×18/chain×10/lantern×4/torch×4/candle×7/brewing_stand×7/button×2/pressure_plate×2），position 全有效 |
| 方块分类 | ✅ 正常 | blocks-classification.json 加载正确 |
| 模型数据 | ✅ 正常 | vanilla-block-models.json（865 模型），测试方块数据完整 |
| Atlas/贴图 | ✅ 正常 | atlas.png（435KB）+ atlas-uv-map.json（184KB），Console 已打"Atlas 加载成功: 928 张贴图" |
| 过滤逻辑 | ✅ 正常 | 155 个全可见（无 INVISIBLE_BLOCKS），过滤前后都是 155 |
| viewMode | ✅ 正常 | = 'mc'（非 blueprint，未提前返回 null） |
| controlMode | ✅ 正常 | = 'orbit' |
| Canvas 尺寸 | ⚠️ 有坑 | 初始 300x150（R3F 默认），容器实际 664×901；已手动 resize 到 996×1352 |
| WebGL context | ✅ 正常 | 创建成功未丢失 |
| **VoxelWorld mount** | ❌ **卡点** | **不在 React Fiber 树（遍历 348 节点未找到）、console.log 未触发、WebGL 像素全 0** |

## ❌ 根因确认

**VoxelWorld 在 `<Canvas>` children props 里（第 11 个位置），但没被实际渲染成 R3F 场景节点。**

两个候选方向（都未最终验证）：

1. **A. VoxelWorld render() 早期 return null / 抛异常被吞** — 但 viewMode='mc' 已排除 blueprint 分支；PERFORMANCE_THRESHOLD=1000000 > 155 不会触发 ultra。**最可疑**：组件顶层若依赖某未就绪的 state 提前 return。
2. **B. `<Canvas>` children 解析/布局问题** — VoxelWorld 作为 children 传入但可能被条件包裹、顺序不当或 R3F 未识别为场景元素（比如外层多包了一层非 R3F 组件）。

> ⚠️ 注意：`docs/final-diagnostic-report.md` 里写的"摄像机位置/过滤逻辑"是**第一轮假设，已被 debug-session-summary 推翻**——真正证据是 Fiber 树里根本没有 VoxelWorld 节点。别被早期报告误导。

## ▶️ 下一步（从这继续，按序）

### 第 1 步：重启 dev server（必需，昨晚停在等这个）
```bash
npm run dev   # 或项目实际脚本
```
然后浏览器开对应端口（当时是 5175/5177），确认能加载。

### 第 2 步：验证"VoxelWorld 是否 mount"
在组件最顶层 return 前加日志（或直接看是否仍无输出）：
```js
console.log('[VoxelWorld] RENDER TOP', { viewMode, blocksCount: blocks.length });
```
- 若**仍不打印** → 组件根本没被 React 调用 → 查它在 `<Canvas>` 里的挂载方式（方向 B）
- 若**打印了但无画面** → render 走了但返回空/报错 → 查 return null 分支（方向 A）

### 第 3 步（关键分叉验证）：加一个不依赖任何逻辑的测试立方体
把昨晚 `b6165bf8` 加的红色立方体逻辑**重新放回** `<Canvas>` 内**最外层**（不经过 VoxelWorld）：
```jsx
<Canvas camera={{position:[10,10,10],fov:75}}>
  {/* 独立于 VoxelWorld 的测试立方体 */}
  <mesh position={[0,5,0]}><boxGeometry args={[2,2,2]} /><meshBasicMaterial color="red" /></mesh>
  {containsVoxelWorld && <VoxelWorld .../>}
</Canvas>
```
- **红色立方体可见** → R3F 渲染正常 → 问题纯在 VoxelWorld 内部
- **红色立方体也不可见** → R3F 渲染层挂了（Canvas/相机/WebGL 循环），往基础设施查
- 同时用 `axesHelper args={[10]}` + `gridHelper` 辅助定位

### 第 4 步：跟踪 VoxelWorld 挂载点
既然 Canvas.children 里有 VoxelWorld，重点看**它是怎么进 children 的**——打开 `App.jsx` 里 `<Canvas>` 的 JSX 结构，确认 VoxelWorld 是被 `{cond && ...}`、`{viewMode === 'mc' && ...}` 之类包裹（若 viewMode 在某刻不是 'mc' 就会卸载/不挂）。已知快照时 viewMode='mc'，但要确认**初始渲染那一刻**的状态。

## 🧰 已建的诊断工具（不用重造）
- `window.__voxel_store` → `useStore`（src/store/useStore.js 里暴露），`getState()` 可取实时数据
- `browser-cdp-skill/` → CDP 浏览器自动化工具集

## ⏳ 未决事项 / 建议用户确认
1. VoxelWorld 在 `<Canvas>` 里的**确切 JSX 挂载条件**——这是第一排查点，可能一次就看穿
2. 昨晚停在此处（22:03），用户回来后是否继续 → 决定走 A/B 哪条
3. 若嫌手动 debug 慢：可生成一个新任务书走 atm-run claude，带本 RUNBOOK 作为上下文，让它直接改代码跑 b6165bf8 的验证流程

---

**不删任何诊断脚本/日志**——CDP 工具集和 window.__voxel_store 是排查的关键抓手，清理待问题解决后再做。
