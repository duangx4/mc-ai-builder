# MC AI Builder v2 — P0 迁移执行报告

执行时间：2026-08-28
执行者：Claude Code

## 迁移清单完成情况

### ✅ A. 技能知识文档（已完成）

**提交**: `c65c4be` - feat: 迁移技能知识文档（来源 builder@29f2255）

迁移内容：
- ✅ `construction-skill/resources/gates.md`（103 行）→ 新增到 official/ 和 user/
- ✅ `construction-skill/resources/setDoor.md`（44 行）→ 更新到 official/ 和 user/（增加「何时使用」警告）
- ✅ `knowledge-skill/resources/chinese_classical.md`（98 行）→ 新增到 official/ 和 user/
- ✅ `src/utils/styleKnowledge.js` → 登记 chinese_classical 风格（序号 7），更新后续风格序号 8-15

验证：
- ✅ 双目录同步：official/ 和 user/ 均包含相同文件
- ✅ styleKnowledge.js 包含 chinese_classical 条目，关键词包含「中式古典」「唐风」「宋韵」等

### ✅ D. tools/ 分析工具集（已完成）

**提交**: `ed5dee0` - feat: 迁移 tools/ 分析工具集（来源 builder@bfe0e3a）

迁移内容：
- ✅ `analyze_structure.py`（564 行，结构合理性检查）
- ✅ `nbt_parser.py`（472 行）
- ✅ `extract_structures.py`（99 行）
- ✅ `json_to_case.py`（326 行）
- ✅ `extract_frontend.py`、`extract_server.py`
- ✅ `blocks.json`（464KB）、`3d-viewer.html`（460 行）
- ✅ `cases_test/`（5 个案例 md）
- ✅ `probes/`（18 个探针脚本）
- ✅ `test_nbt/`（3 个 nbt 样本）
- ✅ `copy-latest-session.cmd`
- ✅ 共 37 个文件，保留原目录结构

验证：
- ✅ tools/ 目录已创建，不在 .gitignore 中
- ✅ Python 脚本头部包含 UTF-8 编码声明

### ✅ B. 提示词优化器（已完成）

**提交**: `9b12a5a` - feat: 提示词优化器（来源 builder@29f2255 DOM 注入 → React 原生实现）

迁移内容：
- ✅ 创建 `src/components/PromptOptimizer.jsx`（147 行）
- ✅ 集成到 `src/App.jsx`：输入框上方显示「✨ 优化提示词」按钮
- ✅ 功能：调用 LLM 优化模糊需求 → 聚焦、明确、可执行的提示词
- ✅ 上下文：提取最近 8 条对话，过滤优化器生成的消息
- ✅ 系统提示：包含风格一致性、范围限定、代码安全、大门形制等规则
- ✅ 代码去重：`src/utils/sandbox.js` 新增 `dedupeTopLevelConsts()`（来源 builder@33998ec）
- ✅ 防止顶层 const 重复声明导致「Identifier has already been declared」报错

实现方式：
- 按 v2 React 规范实现，使用 Lucide-react Sparkles 图标
- 调用现有 settings 配置（apiKey, baseUrl, model）
- UI 风格与 v2 一致（橙色主题，圆角按钮）
- 错误处理：toast 提示（3 秒自动消失）

### ✅ C. 生图预览（官方原生已含，无需迁入）

**结论**：v2 官方源码已完整实现图片上传与预览功能，无需重复实现。

v2 已有功能：
- ✅ `attachedImages` state（最多 3 张）
- ✅ `handleImageFile()` 处理上传
- ✅ `FileReader` 读取图片为 base64
- ✅ 粘贴上传（`handlePaste`）
- ✅ 拖拽上传（`onDrop`）
- ✅ 图片预览区（带删除按钮）
- ✅ Vision API 集成（`imageUrl` 参数传递给 AI）
- ✅ 图片按钮（ImageIcon，左侧输入框内）

差异说明：
- 旧版（builder@61c6620）：DOM 注入方式，567 行，包含生图功能（调用 DALL-E/SD）
- v2 官方：React 原生实现，仅处理用户上传图片（Vision 输入），不包含 AI 生图按钮
- AI 生图功能：v2 已在 `src/utils/ai.js` 的 `generateImage()` 中实现（调用 imageBaseUrl/imageApiKey/imageModel）

## 未迁入的提交（说明）

根据任务书，以下提交不在迁移范围：
- `868f83b` - chore: 更新 .gitignore（纯配置调整）
- `2ebfdbb` - docs: 添加文档（纯文档）
- `339fc86` - fix: .gitignore 路径修正（纯配置调整）

原因：纯 .gitignore 和文档改动，不涉及功能代码，v2 有自己的配置体系。

## 提交记录

```
c65c4be - feat: 迁移技能知识文档（来源 builder@29f2255）
ed5dee0 - feat: 迁移 tools/ 分析工具集（来源 builder@bfe0e3a）
9b12a5a - feat: 提示词优化器（来源 builder@29f2255 DOM 注入 → React 原生实现）
```

## 下一步：冒烟测试

待执行验收测试：
1. `node server.js` → 端口 3001，访问 `/api/skills` 检查新资源是否可访问
2. `npm run dev` → 端口 5173，检查前端是否正常渲染
3. 手动验证：输入框上方是否显示「✨ 优化提示词」按钮
4. 功能测试：点击优化按钮，输入测试需求，验证优化流程
