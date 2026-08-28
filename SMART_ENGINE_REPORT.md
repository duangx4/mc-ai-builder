# 智能构建引擎实施报告

## 执行时间
2026-08-28

## 任务概述
按照 `docs/mc-p1-smart-engine.md` 的要求，完成智能构建引擎的完整实现。

## 实施内容

### 1. 提交清单

#### Commit 1: 阶段状态机 + BuildingPlan 解析（纯逻辑）+ 测试
- **文件**: `src/utils/smartEngine.js` (新增)
- **测试**: `src/utils/smartEngine.test.js` (新增)
- **功能**:
  - 五阶段状态机: planning → construction → validation → refinement → done
  - 工具护栏: 每个阶段只允许特定工具调用
  - BuildingPlan 结构化解析器（支持 JSON/Markdown 包裹/字段补全）
  - 代码截断检测（复用自 ai.js）
- **测试覆盖**: 26 个断言（状态机、plan 解析、截断检测）

#### Commit 2: smartEngine 主循环（工具护栏/熔断/复用服务层）+ 测试
- **文件**: `src/utils/smartEngine.js` (扩展)
- **测试**: `src/utils/smartEngine.test.js` (扩展)
- **功能**:
  - `generateWithSmartEngine` 主入口函数
  - 阶段执行逻辑: planning/construction/validation/refinement
  - 全局护栏: MAX_STEPS=30, MAX_REFINE=3, 连续空响应熔断
  - 复用现有基础设施:
    - `fetchWithRetry`: 统一 HTTP 重试服务层（超时 60s, 重试 3 次）
    - `createSSEParser`: 流式响应解析
    - `executeVoxelScript` + `dedupeTopLevelConsts`: 代码沙箱执行
    - `executeToolV2`: 工具执行器（带阶段护栏包装）
    - `generateAgentSkillsPrompt`: 系统提示生成
  - 回调支持: onPhaseChange, onChunk, onStatus, onPlan, onToolCall
  - AbortSignal 支持（尊重用户中止）
- **测试覆盖**: 新增 5 个集成测试断言

#### Commit 3: App.jsx 接入 smart 模式（分发/模式选项/阶段状态显示）
- **文件**: `src/App.jsx` (修改)
- **功能**:
  - 新增 `generateVariantSmart` 函数（调用智能引擎）
  - `generateVariant` 分发逻辑新增 smart 模式判断
  - UI 新增「智能构建 Smart」模式按钮（绿色主题，Sparkles 图标）
  - 阶段状态显示（集成到现有 variant 系统）
  - 默认模式保持 `fast`（智能引擎需实战验证后再调整）
- **位置**: 模式选择器（快速/自定义/自主/智能构建）

### 2. 测试结果

#### 单元测试
```
Test Files  6 passed (6)
Tests       85 passed (85)
Duration    284ms
```

**新增断言**: 31 个（smartEngine.test.js）
- 状态机: 13 个断言
- BuildingPlan 解析: 7 个断言
- 代码截断检测: 5 个断言
- 集成测试: 6 个断言

**总断言数**: 54 (原有) + 31 (新增) = 85

#### Lint 检查
- **smartEngine.js**: ✅ 零 error
- **App.jsx**: ✅ 零 error（新增代码部分）

#### 冒烟测试
- **server.js (3001)**: ✅ 运行中 (`{"status":"ok"}`)
- **npm run dev (5173)**: ✅ 运行中（Vite 7）

### 3. 改动摘要

#### src/utils/smartEngine.js (新增 794 行)
- **导出函数**:
  - `generateWithSmartEngine`: 主入口
  - `getAllowedTools`: 获取阶段允许的工具
  - `canTransition`: 状态转换验证
  - `checkToolAllowed`: 工具调用护栏
  - `parseBuildingPlan`: BuildingPlan JSON 解析
  - `checkCodeTruncation`: 代码截断检测
- **常量**:
  - `PHASES`: 阶段枚举
  - `PHASE_ORDER`: 阶段顺序数组
- **内部实现**:
  - 阶段执行函数（4 个）
  - `callLLMWithTools`: 流式 LLM 调用 + 工具处理
- **中文注释**: 全覆盖

#### src/utils/smartEngine.test.js (新增 215 行)
- 6 个 describe 块
- 31 个测试用例
- Mock 策略: vi.fn() for fetch

#### src/App.jsx (修改)
- **新增**: `import { generateWithSmartEngine } from './utils/smartEngine'`
- **新增函数**: `generateVariantSmart` (80 行)
- **修改**: `generateVariant` 分发逻辑（新增 smart 分支）
- **UI 修改**: 模式选择器新增「智能构建」按钮

### 4. executeToolV2 复用方式说明

**无适配层，直接复用**:
- `executeToolV2(toolName, args, context)` 原始签名完全兼容
- 护栏包装在调用前: `checkToolAllowed(toolName, currentPhase)`
- context 对象直接传递（包含 currentCode, userMessage, config）
- 工具结果通过 tool role 消息返回给 LLM（OpenAI 标准格式）

**ownership 分工**:
- smartEngine: 阶段管理、护栏检查、流程控制
- agentLoopV2: 工具实现、执行逻辑（read_skill, generate_code 等）
- sandbox: 代码执行、去重处理
- fetchWithRetry: HTTP 层重试、超时、Retry-After
- sseParser: 流式解析（跨包事件重组）

### 5. 阶段状态机 + plan 结构的取舍说明

#### 阶段状态机设计
- **单向推进为主**: planning → construction → validation → refinement → done
- **特殊回退**: validation ↔ refinement（最多 3 次）
- **理由**: 防止 LLM 陷入循环（如反复 planning），确保收敛

#### BuildingPlan 结构
- **当前实现**: 基础 JSON schema（style, summary, blocks, globalNotes, sections）
- **预留字段**: `sections.groundY`, `sections.heightLine`（为 P1-③ 区块衔接预留）
- **容错策略**: 解析失败不阻塞，带警告进入 construction（避免过度依赖规划质量）
- **与 P1-②③④ 的接口**:
  - P1-②（分区流水线）: `blocks` 数组可按 `position` 分区并行生成
  - P1-③（区块衔接）: `sections.heightLine` 定义地面线，确保相邻区块对齐
  - P1-④（材质直通）: `blocks[].materials` 数组可扩展为 `{ primary, secondary, accent }`

#### 阶段外工具调用拒绝机制
- **错误格式**: `[SmartEngine] Tool X not allowed in phase Y`
- **返回方式**: 工具结果的 `error` 字段（LLM 可见）
- **预期行为**: LLM 收到错误后自行调整（如等待进入下一阶段）

### 6. 留给用户手动验证项

#### 功能验证
1. **模式下拉**: 打开 http://localhost:5173，检查生成模式选择器是否显示「智能构建」按钮（绿色）
2. **阶段显示**: 选择 smart 模式，输入「建造一座中式宫殿」，观察生成过程中是否显示阶段变化：
   - 🎯 规划中
   - 🏗️ 构建中
   - ✅ 验证中
   - ✨ 完成
3. **与 fast 对比**: 相同需求分别用 fast 和 smart 模式生成，对比质量（smart 应有更完整的规划和错误修复）
4. **护栏验证**: DevConsole 查看日志，确认阶段工具限制生效（如 planning 阶段不调用 generate_code）

#### 回归测试
1. **旧模式无回归**: fast/workflow/agentSkills 模式正常工作
2. **并发生成**: concurrencyCount > 1 时（非 smart 模式）正常并发
3. **修改模式**: 已有代码基础上修改，各模式路径正常

### 7. 已知限制与后续改进

#### 当前限制
- **无增量计划更新**: planning 阶段一次性完成，construction 无法动态调整 plan
- **阶段状态 UI**: 未独立显示（集成在 variant 内部），可视化不强
- **多轮对话**: smart 模式每次从头开始，不支持基于历史 plan 续建

#### P1 后续阶段改进方向
- **P1-②**: 分区流水线（blocks 并行生成，减少 LLM 单次输出长度）
- **P1-③**: 区块衔接（相邻 blocks 材质/高度对齐）
- **P1-④**: 材质直通（风格库直接注入 plan，减少 LLM 幻觉）
- **P2**: 流式化 UI（实时显示阶段面板、代码生成进度）

## 技术亮点

1. **零破坏**: 旧三模式代码路径完全保留，可随时回滚
2. **高复用**: 服务层（fetchWithRetry）、沙箱（executeVoxelScript）、工具（AGENT_TOOLS_V2）完全复用
3. **护栏设计**: 阶段工具限制 + 熔断机制（连续空响应/最大步数/最大修复次数）
4. **容错策略**: 解析失败不阻塞、验证失败自动进入 refinement、AbortError 不重试
5. **测试覆盖**: 31 个新增断言，状态机/解析器/集成流程全覆盖

## 参考资料

- 任务书: `docs/mc-p1-smart-engine.md`
- 提交历史: `git log --oneline -3`
- 测试报告: `npm test`
