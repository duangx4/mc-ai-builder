# 建筑生成质量提升方案

> **日期**: 2026-09-04  
> **目标**: 全面提升 AI 建筑生成质量  
> **方法**: 多 Agent 协作 + 模式融合 + 质量保证

---

## 🎯 当前问题分析

### 现有模式的局限

#### 1. **快速模式（Agent V2）**
**优点**:
- ✅ 速度快（单次 API 调用）
- ✅ 成本低
- ✅ 适合简单建筑

**缺点**:
- ❌ 质量不稳定
- ❌ 缺乏规划阶段
- ❌ 无法处理复杂建筑
- ❌ 错误无法自我修正

#### 2. **自主模式（Multi-turn）**
**优点**:
- ✅ 有规划阶段
- ✅ 可以迭代改进
- ✅ 能处理复杂需求

**缺点**:
- ❌ 速度慢（多轮对话）
- ❌ 成本高
- ❌ 单 Agent 处理全部，容易遗漏细节
- ❌ 大型建筑容易超时

#### 3. **智能构建模式（已废弃？）**
- 多步骤工作流
- Function calling
- 但似乎已被 Agent V2 替代

---

## 💡 核心改进思路

### 思路 1: **多 Agent 分区协作**

```
大型建筑 → 分解为多个区域 → 并行生成 → 统一整合

示例：中式庭院
┌─────────────────────────────┐
│   区域 1: 主殿（Agent A）    │
├─────────────────────────────┤
│   区域 2: 东厢房（Agent B）  │
├─────────────────────────────┤
│   区域 3: 西厢房（Agent C）  │
├─────────────────────────────┤
│   区域 4: 庭院（Agent D）    │
└─────────────────────────────┘
     ↓
  协调 Agent（Master）
     ↓
  整合 + 连接 + 修饰
```

**优势**:
- ✅ 并行处理，速度快
- ✅ 每个 Agent 专注细节
- ✅ 可扩展到超大建筑
- ✅ 失败隔离（一个区域失败不影响全局）

### 思路 2: **三阶段质量保证流程**

```
阶段 1: Planning（规划）
  ├─ 风格知识查询
  ├─ 尺寸和布局规划
  └─ 材料选择

阶段 2: Building（建造）
  ├─ 结构生成
  ├─ 细节添加
  └─ 装饰完善

阶段 3: Quality Check（质量检查）
  ├─ 结构完整性验证
  ├─ 风格一致性检查
  └─ 细节完善度评分
```

### 思路 3: **模式智能融合**

```
简单建筑（< 50 方块）
  → 快速模式（Agent V2）

中型建筑（50-500 方块）
  → 增强模式（Planning + Building）

大型建筑（> 500 方块）
  → 多 Agent 协作模式
```

---

## 🏗️ 方案设计

## 方案 A: **多 Agent 分区协作系统**

### 架构设计

```javascript
// 主协调器
class BuildingCoordinator {
    async build(prompt) {
        // 1. 规划阶段
        const plan = await this.planningAgent.analyze(prompt);
        
        // 2. 分区
        const regions = this.divideIntoRegions(plan);
        
        // 3. 并行建造
        const results = await Promise.all(
            regions.map(region => 
                this.buildingAgent.buildRegion(region)
            )
        );
        
        // 4. 整合
        const integrated = await this.integrationAgent.merge(results);
        
        // 5. 质量检查
        const validated = await this.qualityAgent.validate(integrated);
        
        return validated;
    }
}
```

### Agent 角色设计

#### 1. **Planning Agent（规划师）**
**职责**:
- 理解用户需求
- 查询风格知识库
- 规划整体布局
- 计算尺寸和比例
- 选择材料

**输出**:
```json
{
  "style": "chinese_classical",
  "dimensions": { "width": 30, "length": 40, "height": 15 },
  "regions": [
    {
      "name": "main_hall",
      "bounds": { "x": [0, 15], "y": [0, 15], "z": [0, 20] },
      "materials": ["oak_planks", "stone_bricks"],
      "features": ["roof", "pillars", "entrance"]
    },
    {
      "name": "courtyard",
      "bounds": { "x": [0, 30], "y": [0, 0], "z": [20, 40] },
      "materials": ["stone", "grass"],
      "features": ["path", "plants", "pond"]
    }
  ]
}
```

#### 2. **Building Agent（建造师）** × N
**职责**:
- 根据区域规划生成代码
- 负责结构细节
- 添加装饰元素

**输入**: 单个 region
**输出**: VoxelBuilder 代码

#### 3. **Integration Agent（整合师）**
**职责**:
- 合并多个区域
- 处理边界连接
- 解决冲突
- 添加过渡元素

#### 4. **Quality Agent（质检师）**
**职责**:
- 检查结构完整性
- 验证风格一致性
- 评估细节完善度
- 提出改进建议

---

## 方案 B: **增强的三阶段流程**

### 流程设计

```
用户输入
    ↓
[Stage 1: Planning] 🎨
    ├─ 调用 /knowledge 技能
    ├─ 分析需求和风格
    ├─ 生成详细蓝图
    └─ 输出规划 JSON
    ↓
[Stage 2: Building] 🏗️
    ├─ 基础结构（主体框架）
    ├─ 细节添加（墙体、门窗）
    └─ 装饰完善（植物、灯光）
    ↓
[Stage 3: Quality Check] ✅
    ├─ 调用 /quality 技能
    ├─ 检查并修复问题
    └─ 输出最终代码
```

### 实现方式

**Option 1: Workflow 系统**
```javascript
// 使用现有 Workflow 工具
export const meta = {
  name: 'enhanced-building',
  description: 'Enhanced building with quality guarantee',
  phases: [
    { title: 'Planning' },
    { title: 'Building' },
    { title: 'Quality Check' }
  ]
};

// Planning phase
const plan = await agent('/planning <<prompt>>', {
  label: 'plan',
  phase: 'Planning',
  schema: PLANNING_SCHEMA
});

// Building phase (可能分多个 agent)
const code = await agent(`/construction ${JSON.stringify(plan)}`, {
  label: 'build',
  phase: 'Building'
});

// Quality check phase
const validated = await agent(`/quality check: ${code}`, {
  label: 'validate',
  phase: 'Quality Check',
  schema: VALIDATION_SCHEMA
});
```

**Option 2: Agent V2 + Workflow 混合**
- 简单建筑用 Agent V2
- 复杂建筑自动升级到 Workflow

---

## 方案 C: **模式智能融合**

### 自适应模式选择

```javascript
class AdaptiveBuilder {
    async build(prompt) {
        // 1. 分析复杂度
        const complexity = await this.analyzeComplexity(prompt);
        
        // 2. 选择模式
        if (complexity.score < 3) {
            // 简单：快速模式
            return this.fastMode(prompt);
        } else if (complexity.score < 7) {
            // 中等：增强模式
            return this.enhancedMode(prompt);
        } else {
            // 复杂：多 Agent 协作
            return this.collaborativeMode(prompt);
        }
    }
    
    analyzeComplexity(prompt) {
        // 复杂度评分因素：
        // - 建筑大小（词语如"大型"、"巨大"）
        // - 结构数量（多个建筑）
        // - 细节要求（"精致"、"详细"）
        // - 风格难度（中式 > 现代）
    }
}
```

---

## 🎯 推荐实施方案

### **阶段 1: 三阶段质量保证流程（2-3 天）**

**为什么先做这个**:
- ✅ 立即提升质量
- ✅ 不改变现有架构
- ✅ 基于现有技能系统
- ✅ 风险低

**实施步骤**:
1. 创建 `/planning` 技能（规划蓝图）
2. 修改 `/construction` 技能（按蓝图建造）
3. 增强 `/quality` 技能（更严格的检查）
4. 创建 Workflow 串联三个阶段

**预期效果**:
- 质量提升 50-70%
- 速度略慢（+30%）
- 成本增加 20-30%

### **阶段 2: 多 Agent 分区协作（1 周）**

**为什么后做**:
- 需要更复杂的协调逻辑
- 需要边界处理算法
- 成本更高（多个 agent）

**实施步骤**:
1. 实现区域分割算法
2. 创建 Master Agent（协调器）
3. 实现并行建造
4. 实现智能整合

**预期效果**:
- 支持超大建筑（1000+ 方块）
- 并行速度提升
- 细节更丰富

### **阶段 3: 智能模式选择（3-4 天）**

**实施步骤**:
1. 实现复杂度分析
2. 实现自适应路由
3. 优化用户体验

---

## 📊 对比分析

| 方案 | 质量提升 | 速度影响 | 成本影响 | 实施难度 | 推荐优先级 |
|------|---------|---------|---------|---------|-----------|
| 三阶段流程 | ⭐⭐⭐⭐ | 略慢 | +30% | 低 | 🥇 第一 |
| 多 Agent 协作 | ⭐⭐⭐⭐⭐ | 快（并行） | +50% | 中 | 🥈 第二 |
| 智能融合 | ⭐⭐⭐ | 持平 | 持平 | 低 | 🥉 第三 |

---

## 🚀 快速原型

### Workflow 示例（三阶段）

```javascript
export const meta = {
  name: 'quality-building',
  description: 'High-quality building with planning and validation',
  phases: [
    { title: 'Planning', detail: 'Analyzing style and creating blueprint' },
    { title: 'Building', detail: 'Generating structure code' },
    { title: 'Validation', detail: 'Quality check and refinement' }
  ]
};

// Phase 1: Planning
const plan = await agent(`
Analyze this request and create a detailed blueprint:
"${args.prompt}"

Use /knowledge skill to research the style.
Output a JSON plan with:
- style, dimensions, materials, features
`, {
  label: 'planner',
  phase: 'Planning'
});

// Phase 2: Building
const code = await agent(`
Build according to this plan:
${JSON.stringify(plan)}

Use /construction skill to generate code.
Focus on accuracy and detail.
`, {
  label: 'builder',
  phase: 'Building'
});

// Phase 3: Validation
const validated = await agent(`
Check and improve this code:
${code}

Use /quality skill to validate.
Fix any issues found.
`, {
  label: 'validator',
  phase: 'Validation'
});

return { code: validated, plan };
```

---

## 💡 其他改进方向

### 1. **知识库增强**
- 添加更多建筑风格文档
- 添加最佳实践案例
- 添加常见错误和修复方法

### 2. **提示词工程**
- 优化系统提示词
- 添加少样本示例
- 改进错误处理指令

### 3. **视觉反馈循环**
- Agent 看到当前渲染结果
- 基于视觉反馈调整
- （需要 vision API）

### 4. **用户引导**
- 智能提示词建议
- 风格选择器
- 参数调整界面

---

## 🎯 我的建议

**立即开始**: 实施**三阶段质量保证流程**

**理由**:
1. 最快见效（2-3 天）
2. 风险最低
3. 基于现有技能系统
4. 质量提升明显
5. 为后续方案打基础

**要不要我现在开始实现？**

可以先做一个 **Workflow 原型**，让你测试效果。

---

**文档完成日期**: 2026-09-04  
**预计实施时间**: 2-3 天（阶段 1）
