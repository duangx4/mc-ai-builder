# MC AI Builder v2 — P1-② 多 Agent 分区流水线任务书（2026-08-29）

> 任务发起：OpenClaw | 执行：Claude Code（cwd 本仓库）
> 范围：P1 第二阶段——在 P1-① 智能构建引擎之上加**分区流水线**：编排器分配区块 / 递归细分 / 受限并行构建 / 只重建受影响区块 / 合并验证。区块衔接规划（P1-③）与材质直通（P1-④）不在本轮。

## 0. 铁律

1. 只在本仓库内工作；**只增强不破坏**：smart 模式内部升级，fast/workflow/agentSkills 与 smart 的旧路径（无分区）代码保留可回滚。
2. 复用一切可复用：`smartEngine.js`（阶段循环/状态机/parseBuildingPlan）、`agentLoopV2.js` 工具执行器、`fetchWithRetry`/`sseParser`、`sandbox.executeVoxelScript`、`checkCodeTruncation`。**不重造**。
3. 每类提交（中文信息）；新文件 lint 零 error；`npm test` 全绿（85 现有 + 新增）。
4. 验收：`npm test`、lint、`node server.js`（3001）+ `npm run dev`（**http://localhost:5173**）冒烟；smart 模式原路径无回归。
5. 中文注释。

## 1. 现状（P1-① 后，以代码为准复核）

- `smartEngine.js`：`generateWithSmartEngine`（五阶段循环）+ `parseBuildingPlan`（plan 有 `blocks: [{id,name,position,size,materials,notes}]` + `sections` 预留）+ 状态机纯函数。planning 阶段产出 BuildingPlan 后进 construction。
- App.jsx `generateVariantSmart` 调 smartEngine；UI 模式「智能构建」。
- 改版者目标（路线图 2.1）：编排器（风格规划→区块分配）→ 并行构建 Agent；复杂建筑递归细分（深度默认 2，每节点 2~6 子区块）；**只重建受影响区块**（根治"每次优化重生成整座建筑"）；区块衔接规划（本轮不做，接口预留）。

## 2. 设计：新文件 `src/utils/partitionEngine.js`

### 2.1 `partitionPlan(plan, options) => tasks[]`
- 输入：parseBuildingPlan 后的 plan；options `{ maxBlockSize, maxDepth=2, minChildren=2, maxChildren=6 }`
- 输出任务队列：`{ id, name, position, size, materials, notes, parent, depth, dependencies }[]`
- **细分规则**：区块任一维 > maxBlockSize（建议默认 24）→ 递归切分（按最大维度对半/三等分，子数 2~6 内），达 depth 上限或尺寸达标即叶子。对应 plan.blocks 的 id 派生子 id（`main_hall__0`、`main_hall__0__1` 等）。
- 纯函数，可测；细分后的 position/size 精确覆盖父区块（边界无缝隙——P1-③ 衔接校验的基础）。

### 2.2 `diffBlocks(prevPlan, nextPlan) => { rebuild: [], create: [], remove: [] }`
- 按区块 id 匹配；同 id 且 size/position/materials 一致 → 保留（skip）；参数变化 → rebuild；新 id → create；消失 → remove。
- **只重建受影响区块**：修改场景（currentCode 存在）时，仅 rebuild/create 区块进构建队列（remove 区块从合并结果删除）。
- 纯函数，可测。

### 2.3 `mergeBlockCodes(blockResults) => { code, warnings }`
- 每区块代码应该自带独立命名（AI 约定：区块代码包在 `function build_<blockId>()` 或 IIFE + 局部变量）。
- 合并策略：文件头（公共 utils/常量）→ 各区块函数 → 主函数依次调用（父区块先、子区块后）。
- 冲突兜底：复用 `dedupeTopLevelConsts`（sandbox 已有）；合并后跑 `executeVoxelScript` 干跑验证。
- 纯函数（输入字符串数组），可测。

### 2.4 `runPartitionedBuild({ userMessage, plan, tasks, apiKey, baseUrl, model, callbacks, currentCode, imageUrl, signal, settings })`
- **编排器阶段（顶层 planning 的一部分）**：用户 prompt → parseBuildingPlan → partitionPlan → 任务队列；`onPlan({ partitionCount, treeDepth })` 回调给 UI（显示"分区构建 N 区块"）。
- **受限并行**：构建并发度 **concurrency=2**（浏览器端 LLM API 限流考虑，fetchWithRetry 兜底 429）；每任务 = 一次 smartEngine 子循环（construction→validation→refinement 阶段复用，跳过顶层 planning）。
- `currentCode` 存在时：先 `diffBlocks`，仅对 rebuild/create 任务并行构建，skip 区块直接保留旧代码片段（需要从旧代码中按区块函数提取——约定区块代码带 `// BLOCK <id> START/END` 标记；旧代码无标记时降级为整体重建并提示）。
- **mergeBlockCodes → 整体 validation（executeVoxelScript 干跑 + checkCodeTruncation）→ done**。
- 尊重 signal；任一区块致命失败不阻塞整体（报告 warnings，done 返回部分结果 + 失败清单）。
- **衔接预检（轻量，P1-③ 的种子）**：合并时校验相邻区块共享界面坐标连续（同 z 面上 x 范围相接、无重叠无缝隙），发现不连续仅 warning 记录（本轮不自动修复）。

### 2.5 smartEngine 集成（`smartEngine.js` 改动）
- planning 成功后：若 plan.blocks 总数 > 1 或大区块触发细分 → 走 `runPartitionedBuild`；否则保持现有单块路径（小建筑不折腾）。
- 开关：`settings.smartPartition !== false` 默认开启（内部行为，不加 UI 开关；可在设置里关）。
- 修改场景（currentCode）时 smart 模式即走 diff 只重建路径。

### 2.6 App.jsx 微调
- `generateVariantSmart` 传 `settings.smartPartition`；生成期间状态文本可显示分区信息（onPlan 回调已有 phase/status UI 通道，仅文本，不重构 UI）。

## 3. 测试（vitest，新增 ≥20 断言）

- `partitionPlan`：小建筑不细分；大区块递归树（深度/子数边界：2~6、maxDepth 截断）；子区块覆盖父区无缝隙（面积和相等断言）
- `diffBlocks`：同 id 无变化 skip / 参数变化 rebuild / 新增 create / 删除 remove
- `mergeBlockCodes`：多区块合并顺序（父先子后）、dedupeTopLevelConsts 冲突兜底、缺标记旧代码降级
- `runPartitionedBuild` 集成（mock 流式 fetch）：2 区块并行均成功 → 合并 → done；1 区块失败 → 部分成功 + warning 不阻塞

## 4. 实施顺序与提交

1. `feat: 分区规划 partitionPlan（递归细分树）+ 测试`
2. `feat: 区块 diff（只重建受影响）+ 代码合并 mergeBlockCodes + 测试`
3. `feat: runPartitionedBuild 并行编排 + smartEngine 集成 + 测试`
4. `feat: App.jsx 分区信息回传（onPlan 文本通道）`

## 5. 交付

- 提交清单；新增断言数；lint；冒烟（3001/5173）
- 每文件改动摘要；调用链说明（谁调谁）
- 旧路径兼容说明 + 降级策略（无标记旧代码 / 区块失败 / API 限流）
- 留给用户手动验证项（smart 模式下大型建筑观察"分区构建 N 区块"状态、修改场景只重建受影响区块日志）