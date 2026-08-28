# MC AI Builder v2 — P0 迁移任务书（builder 10 提交评估迁入）

> 任务发起：OpenClaw（2026-08-28）
> 执行：Claude Code（本仓库 cwd）
> 目标：把旧 git 仓库 `C:\Users\21972\OneDrive\Desktop\MC\builder`（基线 9b25e99 之后的 10 个实战提交）中有价值的成果**评估 + 迁入** v2 源码项目，全部改动 git 提交，跑通冒烟。

## 0. 铁律（必须遵守）

1. 只改 `C:\Users\21972\OneDrive\Desktop\MC\mc-ai-builder-v2`（本仓库）；`MC\builder` 与 `MC\ai bulider` 是只读参考，**绝不动**。
2. 每完成一类迁移：`git diff` 自查 → `git add` → 提交（中文信息，`feat/fix/docs` 前缀，标注来源 commit hash）。基线已有 7 个提交，别 squash。
3. skills 的 `official/` 与 `user/` 双目录必须同步（v2 运行时 server.js 有 syncOfficialToUser，但源码两侧都要有）。
4. 中文注释、中文业务文案。
5. 验收：`node server.js`（3001，/api/skills 完整）+ `npm run dev`（5173）双端冒烟通过；改完杀进程。
6. 旧版是「逆向 exe 改压缩 bundle 的 DOM 注入补丁」——**不要照抄 DOM 注入 hack**，按 v2 React 源码能力实现（找得到原生实现就用原生，找不到再新增组件）。

## 1. 迁移清单（4 类）

> ⚠ 源文件已由 OpenClaw 从 `MC\builder` 仓库（git show <hash>:<path>，最新完成版）提取到本仓库 **`docs/migration-sources/`**（42 个文件），**只读本仓库即可，无需访问外部目录**：
> - `docs/migration-sources/skills/knowledge-skill/resources/chinese_classical.md`（29f2255 最终版）
> - `docs/migration-sources/skills/construction-skill/resources/gates.md` + `setDoor.md`（29f2255）
> - `docs/migration-sources/js/prompt-optimizer.js`（29f2255 最终版，含 dcd10a4/6baeb13/33998ec 三个提交演进）
> - `docs/migration-sources/js/image-preview.js`（61c6620）
> - `docs/migration-sources/tools/`（bfe0e3a 整目录，38 文件）

### A. 技能知识文档（直接复制 + 双目录）

来源：`docs/migration-sources/skills/`：

| 文件 | 目标位置（both official/ 和 user/） | 说明 |
|------|-----------------------------------|------|
| `chinese_classical.md` | `src/skills/{official,user}/knowledge-skill/resources/` | 中式古典风格知识（梁思成《中国建筑史》熔炼），87+12 行 |
| `gates.md` | `src/skills/{official,user}/construction-skill/resources/` | 大门/拱门形制决策规则，103 行 |
| `setDoor.md` | `src/skills/{official,user}/construction-skill/resources/` | setDoor 用法，6 行 |

对照检查：
- v2 `knowledge-skill/SKILL.md`、`construction-skill/SKILL.md` 是否引用了 resources 清单（旧版 SKILL.md 有修改？用 git show aae3fbc / 29f2255 对比旧版 SKILL.md 的 diff，把「登记新资源」的动作等价落到 v2 SKILL.md：如 read_subdoc 可用资源列表 / 风格枚举）。
- v2 `src/utils/styleKnowledge.js` 是否维护风格枚举（官方 18 风格），确认是否登记 chinese_classical（v2 路线图决策点 2：知识文档保留为技能库按需读，不强行注入——所以 styleKnowledge.js 只登记名字即可，知识正文在 resources/chinese_classical.md）。

### B. 提示词优化器（DOM 注入 → React 功能移植）

来源：`docs/migration-sources/js/prompt-optimizer.js`（29f2255 最终版，含 dcd10a4 初版 + 6baeb13 上文上下文 + 33998ec 防重复声明三个提交的演进）。

要点（旧版头注释已写明）：
- 功能：主输入框上方「优化提示词」按钮 → 把模糊需求（结合上文对话，防臆造风格）交给 LLM 重写为聚焦、范围明确、可执行的提示词 → 写回输入框。解决「需求模糊 → 改大脚本破坏括号配对」。
- LLM 重写要求：以上文为准、风格一致、范围限定（只改指定部分不重写整建筑）、输出可执行、禁止臆造不存在的 API。
- 33998ec 的防重复声明：脚本顶层 const 去重兜底（DOOR_RX 等变量重复声明会崩）——这条其实是**生成代码后处理**，评估是否值得进 v2 的 code sanitize 层（`src/utils/` 找生成代码清洗逻辑，如 sandbox.js/parser.js 附近）。

实现方式（v2 React 源码）：
- 先读 `src/App.jsx` 找主输入框（textarea, placeholder「描述你的构想...」）与发送流程、`src/store/useStore.js` 的对话/生成状态，确定在哪个组件挂按钮、状态放哪。
- 调现有 AI 服务层 `src/utils/ai.js`（拿配置与 API 调用），不要自己再造 fetch。
- 做一个独立 React 组件（如 `src/components/PromptOptimizer.jsx`），UI 风格与现有界面一致。

### C. 生图预览（先探查官方源码是否已有，有则跳过/评估差异）

来源：`docs/migration-sources/js/image-preview.js`（61c6620 完整版，567 行）。

⚠ 重要：旧版注释显示官方 bundle **本身已支持图片上传**（隐藏 input[type=file] + 粘贴/拖拽 → ≤3 张图 → 多模态消息 image_url 发送）。v2 是官方源码，很可能 `src/App.jsx` 已含图片上传能力。
- **第一步：确认 v2 是否已有**（grep image_url / FileReader / image 相关）。已有 → 记录差异，不重复实现，此项标记「官方原生已含」并说明。
- 若没有 → 把「开关 + 生图按钮 + 浮层确认/重生成 + 注入图片预览区」按 React 方式移植（生图 API 走配置里 imageBaseUrl/imageApiKey/imageModel 或同 API，参照旧脚本与 Settings）。

### D. tools/ 分析工具集（脚本资产整体复制）

来源：`docs/migration-sources/tools/`（bfe0e3a 提交的完整 tools 目录，38 个文件）：
- `analyze_structure.py`（564 行，结构合理性检查——P3 要前端化的那个）
- `nbt_parser.py`（472 行）、`extract_structures.py`（99 行）、`json_to_case.py`（326 行）、`extract_frontend.py` / `extract_server.py`
- `blocks.json`、`3d-viewer.html`（460 行）
- `cases_test/`（5 个案例 md）、`probes/`（18 个探针脚本）、`test_nbt/`（2 个 nbt 样本）、`copy-latest-session.cmd`

做法：`git show bfe0e3a:<path>` 逐个取内容，复制到本仓库 `tools/`（保留结构）。检查 `tools/` 是否已被 .gitignore 排除（builder 的 .gitignore 曾改过 dist 规则——本仓库若忽略 tools/ 则改为不忽略或放 docs 邻近目录）。Python 脚本若有 GBK 编码/路径假设，顺手修正为 UTF-8 与 v2 路径。

## 2. 实施顺序

A（文档，低风险先做）→ D（脚本资产）→ B（提示词优化器）→ C（生图预览，先探查）。每步一提交。

## 3. 交付

- 产出文件清单 + 每个提交的 message
- 冒烟测试结果（3001 /api/skills 有无新资源；5173 是否正常渲染）
- 对「未迁入」的提交（868f83b/2ebfdbb/339fc86 纯 gitignore/docs）一句话说明为何跳过
- 留给用户手动验证项（UI 交互部分：按钮出现、点击流程）