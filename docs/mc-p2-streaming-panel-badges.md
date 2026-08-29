# 任务书：P2-③ 全模式流式化 + 思考面板 + 状态徽章

> 仓库：mc-ai-builder-v2 | 日期：2026-08-29 | 本轮定位：P2 渲染第三轮（AI 交互可视化）
> **只允许修改**：`src/App.jsx`（smart 分支回调接入 agentSteps + 模式徽章）、如需新组件放 `src/components/SmartStatusBadge.jsx`（可选，尽量复用现有 UI 结构）、测试如需新建

## 一、现状盘点（已取证）

1. **已有 AI AGENT WORKFLOW CARD**（App.jsx ~2721-2840）：agentSteps 驱动，header 带 RUNNING/COMPLETE 指示灯 + 可折叠 + 步骤列表（running 转圈/done ✓/error ✗ 图标）+ Blueprint 卡片。**agent 模式已用**，smart 模式生成时 `setAgentSteps([{ id:'smart-init', ... }])` 只设 1 步，**智能引擎的真实进度全在 console.log（[SmartEngine] 步骤/阶段/工具/验证...），UI 无感知**
2. **smart 引擎回调齐全**（smartEngine.js，P1 已建）：callbacks.onPhaseChange(phase, reason) / onStatus(msg) / onPlan(plan) / onToolCall(name, args, result)
3. **消息已带 generationMode 字段**（App.jsx 2430 `mode={msg.generationMode || 'fast'}`，VariantTabs 使用）——**AI 消息气泡上没有模式徽章**
4. 生成中已有全局 isProcessing / streamingText 机制（fast 流式文本）

## 二、设计

### 1. Smart 模式实时步骤流（核心）
smart 分支（App.jsx 生成处）把 `generateVariantSmart` 的 callbacks 接入 **agentSteps 动态更新**（替代现在的单步初始化）：

- **onPhaseChange**：
  - planning → `{ id:'smart-plan', label:'✨ 规划中：分析需求', status:'running' }`
  - construction → 上一步 done + `{ id:'smart-build', label:'🏗️ 构建中：生成建筑代码', status:'running' }`
  - validation → `{ id:'smart-validate', label:'✅ 验证中：检查代码与方块', status:'running' }`
  - refinement → `{ id:'smart-refine', label:'🔧 优化中：修复问题', status:'running' }`（reason 附到 label）
  - done → 全部 running → done；成功 label 附摘要（如"✅ 验证通过：生成 N 个方块"用 status 里回来的信息）
- **onPlan(plan)**：规划完成时把步骤更新为 done 并追加 plan 摘要行（style/summary/blocks 数/是否分区）——可以 props 展开 Blueprint 卡片机制（currentBlueprint 已有：smart 也要 setCurrentBlueprint({style, dimensions})）
- **onStatus(msg)**：匹配字符串给步骤加子状态/更新 label 细节（"分区规划完成：N 个任务""区块完成 (x/N)" 等），存 `step.details`（现有详情展开机制）
- **onToolCall**：追加 `{ id:'smart-tool-'+i, label:'🔧 调用 read_skill 文档阅读', status:'done' }`，失败红线
- **失败路径**：catch/error → 当前 running 步 → error 状态（升级：卡片有红色至）；分支里已有「? 智能构建失败」消息保留

**复用**：直接操作 `setAgentSteps`（已在 useStore），注意与 agent 模式共用同一卡片——smart 的步骤 id 前缀 `smart-` 防混淆；`isWorkflowCollapsed` 在 smart 开始时 `setIsWorkflowCollapsed(false)` 自动展开。

### 2. 模式徽章（AI 消息 + 输入区）
- **AI 消息气泡模式徽章**：消息渲染处（找 `msg.role === 'ai'` 气泡，~2430 VariantTabs 附近），若 `msg.generationMode` 存在，在气泡头部加小徽章：
  - fast → `⚡ 快速` / workflow → `📋 自定义` / agentSkills → `🤖 自主` / smart → `✨ 智能构建`（四色区分：黄/紫/青/绿，已有按钮样式可参考）
  - 徽章尺寸 10px，中性底、彩色文字，放在气泡内容上方一行
- **输入区模式提示（可选加分项）**：发送时输入框 placeholder 或发送按钮旁短暂显示当前模式（做不做由代码复杂度定，不做不扣分）

### 3. 徽章组件（可选）
如代码内联复杂，新建 `src/components/SmartStatusBadge.jsx`（纯展示组件：props {mode} → 徽章 JSX）并在消息渲染处引用。组件风格对齐现有 UI（font-mono、tracking-widest、rounded、bg-xxx/10 text-xxx-400）。

## 三、验收清单
1. `npx vitest run` 全绿（219 基线，新增用例不删旧）
2. `npm run build` 通过
3. CDP 实测（主 agent）：smart 模式发「三进院落」大 prompt →
   - 截图中期与结束两段：**工作流卡片步骤数 > 3**（规划/构建/验证可见）且带实时状态（RUNNING→COMPLETE）
   - **AI 消息带 ✨ 智能构建徽章**
   - 结束步骤含"验证通过：生成 N 个方块"
4. 不破坏：fast/agent/precise 模式现有工作流卡片行为

## 四、约束
- 不动 smartEngine.js（回调已够用，只改 App.jsx 消费端）
- 不动 store/server/导出/3D 渲染
- 中文注释；不提交（主 agent 提交）
- 改完跑 vitest + build，贴摘要