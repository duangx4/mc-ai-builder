# MC AI Builder v2 — P1-③ 区块衔接规划任务书（2026-08-29）

> 任务发起：OpenClaw | 执行：Claude Code（cwd 本仓库）
> 范围：P1 第三阶段——**区块衔接规划**：全局水平基准面 / 每区块高度线 / 衔接表 / 贴边连续与墙顶对齐校验 / 自动修复。附带：默认版本切换 1.20.1（用户拍板主玩版本）。

## 0. 铁律

1. 只在本仓库内工作；只增强不破坏（smart 模式内部深化，旧路径保留）。
2. 复用：`partitionEngine.js`（tasks 结构/mergeBlockCodes 已有衔接 warning 种子）、`smartEngine.js` 阶段循环、`fetchWithRetry`/`sseParser`、`executeVoxelScript`。不重造。
3. 每类提交（中文信息）；新文件 lint 零 error；`npm test` 全绿（113 现有 + 新增）。
4. 验收：`npm test`、lint、`node server.js`（3001）+ `npm run dev`（**http://localhost:5173**）冒烟；默认版本切换后前端正常。
5. 中文注释。

## 1. 现状

- P1-② `partitionEngine.js`：partitionPlan 递归细分（子块精确覆盖父区）+ diffBlocks + mergeBlockCodes（合并时已有**轻量衔接预检**：相邻区块共享界面坐标连续检查，仅 warning 不自动修复——本轮深化为完整衔接规划）。
- plan 结构：`parseBuildingPlan` 已有 `sections: { groundY, heightLine }` 预留字段（多数 plan 可能没填，需容错）。
- 改版者目标（路线图 2.1）：**全局水平基准面 + 每区块地面高度/设计总高/关键高度线 + 衔接关系（轴/侧/对齐/过渡）+ 校验强制贴边连续、墙顶檐口对齐**。

## 2. 设计：扩展 `partitionEngine.js`（或新增 `adjacencyEngine.js`，以代码整洁为准）

### 2.1 `buildAdjacencyTable(tasks) => edges[]`
- 遍历任务对，找出**面相邻**（共享 2D 面、轴对齐相邻：x/z 方向相接且 y 区间重叠）区块；
- 边结构：`{ a, b, axis, faceA, faceB, overlapRange, gap, heightALine, heightBLine, aligned }`
- 对角接触（仅棱/点）不算相邻——防误报；纯函数可测。

### 2.2 `validateSeams(tasks, plan, table) => { issues[], fillCode }`
- 校验项（改版者要求）：
  1. **贴边连续**：相邻区块共享面坐标连续（gap=0）、无重叠（负 gap 即重叠）
  2. **墙顶对齐**：相邻区块设计总高（heightLine）一致（允许 ±1 容差）——不一致记 issue
  3. **水平基准面**：各区块 groundY 与 plan.sections.groundY（或全场最小 groundY）一致，不一致记 issue
  4. 檐口/顶面材质过渡：同高度线但材质不同 → warning（材质直通 P1-④ 再管，本轮仅记录字段）
- **自动修复（本轮核心增量）**：
  - gap>0 缝隙 → 生成**缝合代码片段**（fill 方块补缝，材质取两侧公共面材质）收集进 `fillCode`
  - 高度线不一致且差 ≤3 → 拉齐到较高值（生成补高代码进 fillCode），差 >3 → 记 `fatal` issue
  - 重叠（负 gap）→ `fatal` issue（需重生成）
- 返回 issues 分级：fatal（进 refinement 重生成该区块）/ fixable（自动填充）/ warning（仅提示）

### 2.3 集成 `runPartitionedBuild`
- mergeBlockCodes 前：validateSeams → fixable issues 的 fillCode append 进合并代码；fatal issues → 对应区块标记为需重生成（重试一次，仍失败则降级为 warning 交付并报告）
- 衔接结果随 `onPlan`/最终结果返回（`seams: { edges, issues, filled }`）供 UI/日志显示

### 2.4 默认版本切换（用户拍板：1.20.1 为主）
- `src/App.jsx` L267 `useState('1.21')` → `useState('1.20.1')`
- `src/utils/versionConfig.js`：`isLatest` 从 1.21 移到 1.20.1（或新增 `default: true` 字段更清晰，保持一致）；确认 1.20.1 数据覆盖完整（1.21 additions 在 1.20 为 null 的降级逻辑已有则不动）
- `validBlocks.js` 是 1.21 全量列表（1.20.1 ⊆ 1.21 语义兼容，无需动；若校验逻辑按 isLatest 硬编码则检查）
- 检查设置/导出默认版本引用（生成导出 WorldEdit 等）是否也走 selectedVersion 状态（App.jsx L267 单一来源即可）

## 3. 测试（vitest，新增 ≥18 断言）

- `buildAdjacencyTable`：同轴相邻检出 / 对角不误报 / 不同 y 层不相邻 / 间隙大小正确
- `validateSeams`：无缝无 issue / gap 检测 + fillCode 生成（补缝坐标边界正确）/ 高度线差 ≤3 自动拉齐 / 差 >3 fatal / 重叠 fatal / groundY 不一致检测
- 集成：mock 流式跑通含 fatal → 重生成成功的路径
- 默认版本：versionConfig 默认导出 = 1.20.1（如新增 default 字段的测试）

## 4. 实施顺序与提交

1. `feat: 衔接表 buildAdjacencyTable + 校验 validateSeams（含自动缝合/拉齐）+ 测试`
2. `feat: runPartitionedBuild 衔接集成（fixable 填充 / fatal 重生成）+ 测试`
3. `feat: 默认版本切换 1.20.1（App.jsx + versionConfig）`

## 5. 交付

- 提交清单；新增断言数；lint；冒烟（3001/5173，版本下拉默认 1.20.1）
- 每文件改动摘要；衔接收敛策略说明（fatal 重试一次降级 warning）
- 留给用户手动验证项（smart 模式多区块建筑看缝合日志/生成结果无缝隙）