# MC AI Builder v2 — P0 工程化任务书（2026-08-28）

> 任务发起：OpenClaw | 执行：Claude Code（cwd 本仓库）
> 目标：P0 剩余第 1 项「工程化」：npm scripts 统一 / lint / test 底座 / 设置 Schema 迁移。全部 git 提交 + 冒烟 + lint/test 通过。

## 0. 铁律

1. 只在本仓库（mc-ai-builder-v2）内工作；`MC\builder`、`MC\ai bulider` 只读参考，绝不动。
2. 每类完成：`git diff` 自查 → 提交（中文信息，`chore`/`feat`/`test` 前缀）。
3. **别破坏运行**：App.jsx（151KB）等大文件只做必要的小改动；lint 规则调整优先于大规模改码。
4. 中文注释。
5. 验收：`npm run lint` 通过（或记录存量问题清单后新代码零 error）、`npm test` 全绿、`node server.js`（3001 /api/skills 200）+ `npm run dev`（localhost:5173 注意 Vite 7 绑 IPv6，用 `http://localhost:5173` 验证非 127.0.0.1）双端冒烟。
6. 依赖安装用 `npm install -D <pkg>`（npmmirror 已配）。

## 1. npm scripts 统一

现状 scripts：dev / build / lint / preview / electron:dev / electron:build / pack / dist。

- 新增 `test`：`vitest run`
- 新增 `check`：`npm run lint && npm test`（一键验收）
- 确认 lint script 是 `eslint .`（flat config）。

## 2. lint 现状处理

- 先跑 `npm run lint` 统计错误/警告数。
- 策略（按规模决策）：
  - 错误数少（<30）→ 用 `eslint --fix` 自动修 + 手动修剩余明显的（未使用变量等），目标 `npm run lint` 零 error。
  - 错误数多（存量历史问题）→ **不为清存量大规模改码**：跑 `eslint --fix` 自动修安全项，其余存量问题记录到 `docs/lint-debt.md`（文件+错误摘要，量化），保证**新改动的文件零 error**。
- 若 App.jsx 等大文件报错集中在某模式（如 react-hooks 规则），评估该规则是否合理适配本项目，可加 `// eslint-disable-next-line`（带注释说明）而非改逻辑。

## 3. test 底座（vitest）

- `npm install -D vitest`；package.json 加 `"test": "vitest run"`。
- 测试目录 `src/utils/__tests__/`（与 utils 相邻）。
- **写真实用例，不搭空架子**，至少覆盖：
  - `sandbox.js`：`dedupeTopLevelConsts()` —— 重复顶层 const 被去重、无重复时原样通过（含 DOOR_RX 场景）
  - `parser.js`：VoxelBuilder 代码片段的指令解析（set/fill/walls 等至少 2-3 个用例）——先读 parser.js 了解 API 再写
  - `styleKnowledge.js`：`detectStyle()` 命中 chinese_classical（关键词「中式古典」「唐风」）、命中默认/未知时不报错
  - `prompts.js` 或 ai.js 的纯函数（如消息组装）若可测则补 1-2 个
- 目标：≥15 个断言全绿。
- vitest 配置：不需要 jsdom 的纯逻辑测试放 Node 环境；若 parser/sandbox 依赖浏览器 API，评估轻量 mock 或只测纯函数。

## 4. 设置 Schema 迁移（单一默认值来源 + 旧配置迁移）

现状（先读代码确认）：
- `src/store/useStore.js` 有 storage 封装，localStorage 键 `mc-ai-builder-settings`（server-first 注释可能过时，以代码为准）。
- 旧版（builder）键是 `mc-ai-settings`，含 apiKey/baseUrl/model/maxTokens/imageUseSameApi/imageBaseUrl/imageApiKey/imageModel 等。

任务：
1. 建 `src/utils/settingsSchema.js`：**全部设置项的默认值单一来源**（从 useStore.js 初始化处提取字段：API 配置、生成参数、UI 偏好等，逐个对照列出）。
2. **旧配置迁移**：useStore.js 读设置时——若新键 `mc-ai-builder-settings` 无值且旧键 `mc-ai-settings` 有值 → 迁移已知字段到新键（保留未识别字段原样），`console.info` 记录迁移动作；不覆盖新键已有值。
3. useStore.js 改用 settingsSchema 默认值，行为不变。
4. 验证：dev 起来设置面板正常读写；浏览器 localStorage 里旧键存在时可迁移。

## 5. 打包链（本轮只评估不执行）

- 读 `electron-builder.json`（或 package.json build 段）+ `server-pkg.cjs`，列出配置缺口（如 missing 的图标/产物名/asar 设置）写入 `docs/lint-debt.md` 或独立小节，**不实际跑 electron-builder 打包**（下载重、耗时长，留到下一轮）。

## 6. 实施顺序与提交

1. `chore: npm scripts 统一（test/check）+ vitest 底座`
2. `chore: lint 存量清理或债记录（docs/lint-debt.md）`
3. `test: 核心工具单测（sandbox/parser/styleKnowledge）`
4. `feat: 设置 Schema 单一默认值来源 + 旧配置迁移`
5. `docs: 打包链配置缺口评估`

## 7. 交付

- 提交清单 + 每提交 message
- lint/test 结果数字（error 数、断言数）
- 冒烟结果（3001 / 5173）
- lint 存量债务（若有）记录位置
- 留给用户手动验证项（设置面板迁移表现）