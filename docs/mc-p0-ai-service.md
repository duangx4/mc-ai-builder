# MC AI Builder v2 — P0 AI 服务层任务书（2026-08-28）

> 任务发起：OpenClaw | 执行：Claude Code（cwd 本仓库）
> 目标：P0 最后一项「AI 服务层」：四档思考强度 / 超时 / 指数退避重试 / **流式跨包丢数据修复**（AI 代码缺字符根因）。全部 git 提交 + 测试 + 冒烟。

## 0. 铁律

1. 只在本仓库内工作；不改生成逻辑与 UI 行为（只动"AI 通信层"）。
2. 每类完成：diff 自查 → 提交（中文信息）。
3. 新代码 lint 零 error；`npm test` 全绿（含新增用例）。
4. 验收：`npm test`、`npm run lint`（新文件零 error）、`node server.js`（3001）+ `npm run dev`（**http://localhost:5173**，Vite7 绑 IPv6，勿用 127.0.0.1）冒烟。
5. 中文注释。

## 1. 现状盘点（已摸底，以代码为准复核）

- `src/utils/ai.js` `fetchAIResponseStream`：裸 `fetch`，**无超时无重试**；流式解析 `chunk.split("\n")` 逐行读 `data: ` —— **SSE 行被 TCP 包切开时后半行丢失**（`JSON.parse` 失败被 ignore），这就是"AI 代码缺字符"根因。已有 `checkCodeTruncation`（截断检测，保留）。`max_tokens: 323840` 硬编码。
- `src/utils/agentLoopV2.js`：已有 `fetchWithRetry`（MAX_API_RETRIES + delay 1500×attempt，5xx/429/网络错误重试，AbortError 不重试）——**保留**，评估是否与其统一。
- `src/utils/twoStepAI.js`：**5 处裸 fetch**（plan/生成/continue/refine）绕过重试层，无超时。
- 思考强度：现状仅在 agentLoopV2 system prompt 里要求"先思考"，无 API 层参数。

## 2. 任务清单

### A. 流式 SSE 跨包修复（最高优先）
- 把 SSE 解析抽成独立纯函数/类（如 `src/utils/sseParser.js`）：`createSSEParser(onData)` 或 `parseSSEChunk(buffer, chunk)` 模式，**按行缓冲**（未完成行存 buffer 等下一个 chunk），正确处理 `\n` 与 `\r\n`、空行、`data: ` 前缀、`[DONE]`、多 data 行/事件（保留 event 行处理）。
- `ai.js` 改用该解析器；行为不变，内容零丢失。
- **可测试**：导出解析函数供 vitest 直接测。

### B. 超时 + 指数退避重试（服务层统一）
- `ai.js` 的 fetch 增加超时：AbortController（默认 120s，流式长生成够用），超时报错文案清晰。
- 增加统一重试封装（可复用 agentLoopV2 的思路或抽公共 `src/utils/fetchWithRetry.js`）：
  - 不重试：4xx（除 429）、AbortError（用户/超时主动中止）
  - 重试：429（**优先尊重 Retry-After 响应头**，无则退避）、5xx、网络错误
  - 指数退避 + 抖动（base 1000ms，×2 幂次 + 随机 0-250ms jitter），maxRetries=3
- **统一接入**：twoStepAI.js 的 5 处裸 fetch 改走服务层（保持各调用行为/请求体不变，仅套超时+重试）；ai.js 的流式与非流式同样接入。
- agentLoopV2 的 fetchWithRetry：与新公共层对比，若一致则改引用公共层（低风险重构），不一致则保留并注明。

### C. 四档思考强度
- `settingsSchema.js` 增加设置项 `thinkingEffort: 'off' | 'low' | 'medium' | 'high'`（默认 `off`——保持现行为；UI 暂不加控件，仅数据层支持，SettingsModal 可选加下拉，若加则 low/high 中文标签）。
- `ai.js` 构造请求 body 时按 provider 兼容透传：
  - 默认：`reasoning_effort: thinkingEffort`（openai 兼容；`off` 时不发）
  - 对不认识的 provider 字段：服务端一般忽略未知字段或报错——控制策略：**先仅对 openai-compatible 标准字段透传，其他模型（如 gemini 系）不发思考参数**（可 `model` 名判：含 `gemini` 不发）。
- agentLoopV2 的提示词"先思考"保留不动（那是行为层）。

### D. 测试（vitest，target ≥15 新断言）
- `sseParser`：跨包场景——`data: {"a":1}\n` 拆成 `data: {"a` + `:1}\n` 两 chunk → 内容完整；`\r\n` 行；`[DONE]` 终止；空 chunk 不崩。
- `fetchWithRetry` 或服务层：429 重试计数、移动端 Retry-After 尊重、4xx 不重试、超时 abort 抛错（超时调短如 50ms 测）。
- 现有 32 断言保持全绿。

## 3. 实施顺序与提交

1. `feat: SSE 流式解析器（跨包缓冲修复）+ ai.js 接入`
2. `feat: AI 请求统一超时 + 指数退避重试服务层（ai.js/twoStepAI 接入）`
3. `feat: 四档思考强度 thinkingEffort（settingsSchema + 请求透传）`
4. `test: AI 服务层单测（SSE 跨包/重试/超时）`

## 4. 交付

- 提交清单；新测试断言数；lint 结果
- 冒烟结果（3001 / localhost:5173）
- 改动摘要：每文件改了什么
- 说明：agentLoopV2 fetchWithRetry 的处理决定（统一 or 保留）与理由
- 留给用户手动验证项（API 实际生成仍正常、思考强度设置项存在）