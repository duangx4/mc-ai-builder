# MC AI Builder v2 — P1-① 智能构建引擎任务书（2026-08-28）

> 任务发起：OpenClaw | 执行：Claude Code（cwd 本仓库）
> 范围：P1 第一阶段——**智能构建引擎核心**（阶段状态机 + 工具护栏 + 结构化规划）。分区流水线 / 区块衔接 / 材质直通拆到 P1-②③④。

## 0. 铁律

1. 只在本仓库内工作；**只新增不破坏**：旧三模式（fast/workflow/agentSkills）代码路径保持不变（可回滚）。
2. 每类提交（中文信息）；新文件 lint 零 error；`npm test` 全绿（现有 54 断言 + 新增）。
3. 验收：`npm test`、新文件 lint 零 error、`node server.js`（3001）+ `npm run dev`（**http://localhost:5173**，Vite7 绑 IPv6）冒烟；旧模式分发无回归。
4. 中文注释。AI 服务层（fetchWithRetry/sseParser）与沙箱（executeVoxelScript）**复用**，不重造。

## 1. 现状（已摸底，以代码为准复核）

- `generationMode`：`fast`（单轮硬编码提示，App.jsx `generateVariantFast`）/ `workflow`（`twoStepAI.twoStepGenerateWithContext`：plan→code）/ `agentSkills`（`agentLoopV2.runAgentLoopV2`：20 轮上限+全自主工具）。
- App.jsx `generateVariant` 分发：workflow/agentSkills → `generateVariantAgent`；其余 → `generateVariantFast`。模式默认 `fast`（从设置读）。
- 可复用：`src/utils/fetchWithRetry.js`（超时+退避）、`src/utils/sseParser.js`（流式跨包）、`src/utils/sandbox.js` `executeVoxelScript`（代码沙箱执行 + `dedupeTopLevelConsts`）、`agentLoopV2.js` 的 `AGENT_TOOLS_V2`/`getToolsSchemaV2`/`executeToolV2`/`SKILLS_DATABASE`/`generateAgentSkillsPrompt`、`checkCodeTruncation`（twoStepAI 或 ai.js 导出）。

## 2. 设计：新文件 `src/utils/smartEngine.js`

### 2.1 阶段状态机（护栏核心）

```
PHASES: planning → construction → validation → refinement → done
```

| 阶段 | 允许工具 | 进入条件 | 退出条件 | 失败处理 |
|------|---------|---------|---------|---------|
| planning | read 类（read_skill/read_subdoc，见 AGENT_TOOLS_V2 实际名） | 引擎启动 | 输出结构化 BuildingPlan 可解析 | 解析失败→带"无规划"警告直接进 construction（不阻塞） |
| construction | generate_code / modify_code | plan 完成 | 代码生成成功且非空 | 连续 2 次空响应→熔断报错终止 |
| validation | 无工具（本地执行） | 代码就绪 | `executeVoxelScript` 语法/执行通过 + `checkCodeTruncation` 无截断 | 有错误→进 refinement |
| refinement | modify_code（带错误信息回炉） | validation 失败 | 通过 或 达 MAX_REFINE=3 | 耗尽→返回最终代码 + errors 警告（不阻塞交付） |
| done | — | refinement 通过/耗尽 | 返回结果 | — |

- **阶段外工具调用一律拒绝**（返回明确错误消息给 LLM：`[SmartEngine] Tool X not allowed in phase Y`）。
- 全局护栏：MAX_STEPS=30 总步数上限；尊重 `signal`（AbortError 抛给上层，不重试——服务层已处理）；每轮 LLM 调用走 `fetchWithRetry` + 流式 `sseParser`。
- 状态机核心**抽成纯逻辑导出**供单测：`getAllowedTools(phase)`、`canTransition(from, to, reason)`、`PHASE_ORDER`。

### 2.2 结构化 BuildingPlan（为 P1-②③④铺路）

`parseBuildingPlan(text)` 纯函数：从 LLM 输出提取 JSON plan。
```js
{
  "style": "chinese_classical",
  "summary": "一句话说明",
  "blocks": [ { "id": "main_hall", "name": "主殿", "position": [0,0,0], "size": [9,8,11], "materials": [...], "notes": "..." } ],
  "globalNotes": "整体要求",
  "sections": { "groundY": 0, "heightLine": 8 }   // 衔接规划预留字段（P1-③）
}
```
- 容错：支持 markdown 代码块包裹 / 裸 JSON / 字段缺失补默认；解析失败返回 `{ ok:false, reason }`。
- 调 `read_subdoc` 风格名（中式古典）会由 planning 阶段的 read 工具完成——引擎不强制。

### 2.3 引擎入口

```js
export async function generateWithSmartEngine({
  userMessage, apiKey, baseUrl, model,
  callbacks = {},        // { onPhaseChange, onChunk, onStatus, onPlan, onToolCall }
  currentCode = null, imageUrl = null, signal = null,
  conversationHistory = null, settings = {}
})
```
- 返回 `{ content, plan, phases: [{name, toolsUsed, outcome}] , truncated, lastErrors }`。
- 复用 `executeToolV2`（传入 phase 校验包一层）与 `fetchWithRetry`/sseParser；系统提示 = `generateAgentSkillsPrompt` 基础上加阶段状态机说明（说明当前阶段+允许工具，让 LLM 配合）。
- 内部 ownership：不在 smartEngine 里重复实现工具逻辑，全部走 agentLoopV2 已有的执行器（需确认 executeToolV2 的调用签名，必要时做薄适配层）。

### 2.4 App.jsx 集成（新模式，默认不动）

- `generationMode` 枚举加入 `'smart'`；**默认保持 `'fast'`**（新引擎未经实测不抢默认；P1 全阶段完成后整体切换，理由：可回滚优先）。模式下拉/UI 加「智能构建 Smart」（中文标签，与现有风格一致）。
- `generateVariant` 分发：`effectiveMode === 'smart'` → `generateVariantSmart`（React 侧新函数，调 `generateWithSmartEngine`，把 callbacks 接上现有状态 UI：阶段名显示在生成进度位置/状态徽章文本；**不做大 UI 重构**，P2 流式化再补面板）。
- 顺带核对：App.jsx 里 `loadSettings('mc-ai-settings', 'mc-ai-settings')` 的 newKey/oldKey 是否应统一为 `mc-ai-builder-settings`/`mc-ai-settings`（settingsSchema 已支持；若确认是遗留笔误则修正，低风险）。

## 3. 测试（vitest，新增 ≥15 断言）

- `parseBuildingPlan`：完整 plan / 缺 blocks / 空输入 / 非 JSON / markdown 包裹 → 各返回预期
- 状态机：`getAllowedTools` 各阶段集合正确；`canTransition` 合法链 planning→construction→…→done 放行、非法（construction→planning 回跳、done 后继续）拒绝
- 引擎流：mock fetch 流式返回（sseParser 兼容格式）：
  - 路径 A：plan 成功 → 生成代码 → 验证通过 → done
  - 路径 B：验证失败 → refinement（mock 第二次生成成功）→ done
  - 阶段外工具调用被拒（mock LLM 第一轮就调 generate_code → 应返回拒绝消息让它改）

## 4. 实施顺序与提交

1. `feat: 智能构建引擎阶段状态机 + BuildingPlan 解析（纯逻辑）+ 测试`
2. `feat: smartEngine 主循环（工具护栏/熔断/复用服务层与工具执行器）+ 测试`
3. `feat: App.jsx 接入 smart 模式（分发/模式选项/阶段状态显示）`

## 5. 交付

- 提交清单；新增断言数；lint 结果；冒烟结果（3001/5173）
- 改动摘要（每文件）；executeToolV2 复用方式说明（有无适配层）
- 阶段状态机 + plan 结构的取舍说明（与路线图 P1-②③的接口预留）
- 留给用户手动验证项（模式下拉出现"智能构建"、生成时阶段徽章变化、可与 fast 对比质量）