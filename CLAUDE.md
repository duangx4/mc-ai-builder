# CLAUDE.md — MC AI Builder v2（重构升级项目）

本文件给 Claude Code / OpenClaw 等 AI agent 提供本仓库工作指引。

## 项目本质

**MC AI Builder** — 用自然语言生成 Minecraft 建筑的 AI 工具（用户描述 → AI 按技能流程生成 VoxelBuilder JS 代码 → 3D 预览 → 多格式导出 WorldEdit/Litematica/Axiom/数据包/单指令）。

v2 = 基于**官方完整源码**（`github.com/Justcnds/mc-ai-builder`，GPL-3.0）重建的开发项目，**彻底摆脱旧版"逆向 exe 改 bundle"工作流**。与旧目录的关系：

- `C:\Users\21972\OneDrive\Desktop\MC\ai bulider` — 被改坏的旧工作副本（已归档，**不要再动**）
- `C:\Users\21972\OneDrive\Desktop\MC\builder` — 旧 git 仓库（10 个实战提交，基线 9b25e99；有价值的改动需**评估迁入 v2**，见 `重构升级计划.md` §三）
- `C:\Users\21972\OneDrive\Desktop\MC\mc-ai-builder-v2` — **本仓库（唯一活动目录）**

## 技术栈

React 19 + Vite 7 + Tailwind 4 + Three.js 0.182 (@react-three/fiber 9) + Zustand 5 + Express 5（后端）+ Electron 33（打包，electron-builder）。

## 运行

```bash
npm install      # 已装（npmmirror 源）
npm run dev      # 终端1：vite 前端 http://localhost:5173
node server.js   # 终端2：后端 http://localhost:3001
npm run build && npm run electron:build   # 打包
```

⚠ 网络备忘：本机直连 github.com 不通，git 已配 `http.proxy http://127.0.0.1:7892`（系统代理）；npm 用 npmmirror 镜像。

## 目录结构

- `src/App.jsx` + `src/components/` — 前端（VoxelWorld 3D 渲染、MinecraftHUD、PropertiesPanel、SettingsModal、VariantTabs 并发变体等）
- `src/utils/` — AI 引擎：`ai.js`（API 调用）、`agentLoopV2.js`（自主模式 agent 循环）、`twoStepAI.js`（两步生成）、`prompts.js`（系统提示）、`sandbox.js`（代码沙箱）、`parser.js` / `exporter.js`（解析与多格式导出）、`architectureEngine.js`、`styleKnowledge.js`（风格知识）、`versionConfig.js` / `validBlocks.js`（版本方块映射）
- `src/store/useStore.js` — Zustand 全局状态
- `src/skills/` — 技能知识库（**核心业务内容**，`official/` 与 `user/` 双目录，`registry.js` 注册）。官方 6 技能：**knowledge → planning → construction → inspection → decoration → quality**（生成管线顺序）。⚠ 旧 ai bulider 的 4 技能精简版（design/construction/decoration/review）是错误删改，**不要沿用**。
- `server.js` / `server-pkg.cjs` — Express 后端（/api/skills CRUD、同步 official→user、AI 代理等）
- `public/minecraft/` — 完整 vanilla 资源包（渲染用，一般不改）
- `scripts/` — 方块映射生成/校验脚本
- `docs/` — 使用/API/视频宣发文档

## 关键机制

- **三种生成模式**（前端 generationMode）：快速（单轮硬编码提示）/ 自定义（带画布代码的修改模式）/ 自主（agent 循环：PHASE 1 PLANNING → read_skill/read_subdoc/run_script/generate_code 工具调用，读技能库）
- **并发变体**：concurrencyCount 并发启动多个变体，VariantTabs 管理
- **VoxelBuilder API**：AI 代码操作核心对象（set/fill/walls/line/drawCylinder/drawSphere/beginGroup·endGroup/setPriority/defineComponent·placeComponent 等；方块属性 `block?prop=value` 语法），完整参考见 `src/skills/official/construction-skill/SKILL.md`
- **已知坑**：自主模式过滤对话历史时若剔除带 tool_calls 的 assistant 消息而保留 tool 响应 → OpenAI 报 `insufficient tool messages following toolcalls`（旧版有补丁思路，重构时规避：过滤必须成对）

## 待办（重构方向，见 `重构升级计划.md`）

1. ✅ 评估迁入 `MC\builder` 的 10 个提交（gates 大门形制 / prompt-optimizer / 生图预览 / 中式古典风格等）——**2026-08-28 完成**，见 `MIGRATION_REPORT.md` 与 `docs/mc-p0-migration.md`（c65c4be / ed5dee0 / 9b12a5a / 403cca0；生图预览官方原生已含，未重复实现）
2. 模型配置成本地持久化（现为浏览器 localStorage `mc-ai-settings`）
3. 生成质量控制（结构合理性检查前端化）
4. 工程化补齐：lint/test/CI/打包链
5. 技能 CRUD UI、多版本方块映射、导出格式补全

## 铁律

- 所有改动在 v2 提交 git，改前 `git diff`，改后 commit（旧目录不动）
- 技能 official/ 与 user/ 双目录同步
- 中文注释与业务文案
- GPL-3.0：保留原作者信息，衍生代码开源