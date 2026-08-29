# 任务书：Smart Planning 解析鲁棒化 + P1 分区/衔接全链激活

> 仓库：mc-ai-builder-v2（**只允许修改以下文件**：`src/utils/smartEngine.js`、`src/utils/smartEngine.test.js`、如需新建测试文件可新增）
> 日期：2026-08-29 | 本轮定位：P1 收尾（智能构建模式核心价值激活）

## 一、现状盘点（已取证）

1. **smart 引擎 5 阶段已打通**（planning → construction → validation → done），凉亭生成成功（277 blocks 渲染正常）
2. **但 planning 阶段每轮都失败**，实测日志：
   ```
   [SmartEngine] 警告: 无法解析规划 (Block missing required fields (id, name))，直接进入构建阶段
   [SmartEngine] Phase: construction (Planning parse failed, proceed anyway)
   ```
3. **后果**：`executePlanningPhase()` 解析失败 → 跳过 `shouldPartition` 分支 → **P1 的分区引擎（partitionPlan/runPartitionedBuild）和衔接规划从未被激活**——智能构建退化成"单块直出"，丢失了 P1①②③ 的全部工程价值
4. **根因**（看 `src/utils/smartEngine.js:134-172` `parseBuildingPlan`）：
   - `normalizedPlan.blocks` 非空时，要求每个 block 严格有 `id` 和 `name` 字段，否则返回失败
   - LLM（claude-opus-5）实际输出常缺 `id`（或给了中文名但没有标识符字段）→ 整体失败
   - 解析器**零容错**：缺字段即拒，没有自动补齐/归一化

## 二、设计

### 1. `parseBuildingPlan` 宽容化（smartEngine.js:134 起）

保持导出签名不变 `parseBuildingPlan(text) → { ok, plan?, reason? }`，增强：

- **blocks 元素字段归一化/补齐**（不再因单字段缺失整体失败）：
  - `id` 缺失 → 自动生成：`b${index}`（如 `b0`, `b1`...）或由 `name` 转 slug（仅当 name 为安全 ASCII）——优先用 `b${index}`，简单确定
  - `name` 缺失 → 用 `id` 或 `Part ${index}`
  - `size` 缺失 → 默认 `[10, 10, 10]`；非数组 → 默认
  - 保留并使用：`materials`（数组）、`notes`（字符串）、以及 plan 顶层 `summary/style/globalNotes/sections`
- **整体容错**：
  - blocks 不是数组 → 视为 `[]`（ok:true，空规划仍走常规构建）
  - 顶层缺字段 → 用现有默认（已是）
  - 只有 JSON 完全不可解析才 `ok:false`
- 每个归一化动作打 `console.warn('[parseBuildingPlan] 已补齐字段:', ...)` 便于排查

### 2. planning 系统提示词强化（smartEngine.js:330-360 阶段说明区 + 规划 JSON 模板区）

在现有 BuildingPlan JSON 模板（约 470-485 行的 blocks 示例）前加一段「字段要求」，明确：

```
blocks 数组元素字段要求（严格遵循）：
- "id": 英文小写短标识符，如 "main_hall"、"left_wing"（必填，唯一）
- "name": 中文或英文显示名，如 "正殿"（必填）
- "size": [宽, 高, 深]，三个正整数（必填）
- "materials": 主要材料中文名数组（选填）
- "notes": 该区块备注（选填）
```

并补充一条规则：「**输出前逐项检查每个 block 是否都有 id 和 name，缺失会让整个规划作废**」。

### 3. 规划成功日志增强（executePlanningPhase，约 503-507 行）

`parseResult.ok` 时追加：

```js
console.log('[SmartEngine] Plan parsed:', {
  blockCount: plan.blocks.length,
  blocks: plan.blocks.map(b => ({ id: b.id, name: b.name, size: b.size }))
});
```

### 4. 单测补齐（smartEngine.test.js 或新建 smartEngine.plan.test.js）

用 vitest 覆盖（注意仓库测试规范：Windows 下 `npm test` 走 `node --test`/vitest，看现有测试文件风格模仿）：

- 完整 JSON（含 id/name）→ ok:true
- **缺 id** → ok:true 且自动补 `b0` 风格 id
- **缺 name** → ok:true 且自动补
- **完全无 blocks 字段** → ok:true 空 blocks
- blocks 不是数组 → ok:true 空 blocks
- markdown 代码块包裹 → ok:true
- 顶层坏 JSON → ok:false + reason

## 三、验收清单

1. `npm test`（或仓库现有测试命令）全绿，**新增用例通过**
2. `npm run build` 通过
3. **CDP 全流程实测**（主 agent 做）：
   - 中式小凉亭 prompt（单区块）：planning 解析成功 → "规划完成: ..." 出现
   - **大型/多区块 prompt（如"三进院落 正殿15x12x9 厢房9x7x6"）→ 出现"检测到多区块或大区块，启用分区构建模式..." + "分区规划完成：N 个任务"** → 分区引擎激活
   - 最终场景正常渲染（有建筑）
4. 不破坏现有行为：解析彻底失败仍走 fallback（警告进入 construction）

## 四、约束

- **只改 smartEngine.js + 测试文件**；不改 App.jsx / store / server
- 保持 `parseBuildingPlan` 导出签名与 `{ ok, plan, reason }` 结构不变（App.jsx/smartEngine 内部使用处不动）
- 中文注释、中文 commit message
- 完成后跑测试 + build，把结果贴出来