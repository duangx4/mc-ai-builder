# 视觉反馈驱动的建筑生成系统

> **日期**: 2026-09-04  
> **核心思路**: AI 看到自己生成的结果 → 视觉反馈 → 改进提示词 → 更好的建筑  
> **技术栈**: Vision API + Multi-agent + Iterative Refinement

---

## 🎯 核心思路解析

### 传统流程 vs 视觉反馈流程

**传统流程（盲目生成）**:
```
用户: "建造中式庭院"
  ↓
AI: 生成代码（凭想象）
  ↓
渲染: 可能不符合预期
  ↓
用户: "不对，重新来"
  ↓
AI: 再次盲目生成
```

**视觉反馈流程（看着建）**:
```
用户: "建造中式庭院"
  ↓
AI: 生成初步草图（快速、粗糙）
  ↓
渲染: 3D 预览图
  ↓
Vision AI: 分析图像
  - "主建筑位置合适"
  - "但缺少侧殿"
  - "屋顶坡度不够陡"
  - "装饰细节不足"
  ↓
AI: 生成改进提示词
  - "添加东西两侧的配殿"
  - "增加屋顶坡度到 45°"
  - "添加飞檐和彩绘细节"
  ↓
Multi-agent: 分区精细建造
  ↓
最终高质量建筑
```

---

## 🏗️ 完整系统架构

### 三轮迭代设计

```
┌─────────────────────────────────────────────────────────┐
│                Round 1: 快速草图                         │
├─────────────────────────────────────────────────────────┤
│  目标：快速生成基本结构，建立空间感                      │
│  方法：简化模型（只用基础方块）                          │
│  输出：低保真 3D 模型                                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                Round 2: 结构优化                         │
├─────────────────────────────────────────────────────────┤
│  Vision AI 分析 Round 1 的渲染图：                       │
│    ✓ 布局是否合理                                        │
│    ✓ 比例是否正确                                        │
│    ✓ 缺少哪些建筑                                        │
│    ✓ 风格是否准确                                        │
│                                                          │
│  生成改进提示词 → 结构层建造                             │
│  输出：中保真 3D 模型（结构完整）                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                Round 3: 细节完善                         │
├─────────────────────────────────────────────────────────┤
│  Vision AI 分析 Round 2 的渲染图：                       │
│    ✓ 细节是否到位                                        │
│    ✓ 装饰是否丰富                                        │
│    ✓ 材质是否合适                                        │
│    ✓ 整体美感评分                                        │
│                                                          │
│  Multi-agent 分区精细建造：                              │
│    Agent A: 主建筑细节                                   │
│    Agent B: 装饰元素                                     │
│    Agent C: 植被和环境                                   │
│                                                          │
│  输出：高保真最终建筑                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 技术实现

### 1. Round 1: 快速草图生成

**目标**: 10-15 秒内生成基本结构

```javascript
// Workflow: visual-feedback-building.js

export const meta = {
  name: 'visual-feedback-building',
  description: 'Building with visual feedback and iterative refinement',
  phases: [
    { title: 'Draft', detail: 'Quick low-fidelity draft' },
    { title: 'Vision Analysis', detail: 'AI analyzing the render' },
    { title: 'Structure', detail: 'Building refined structure' },
    { title: 'Details', detail: 'Multi-agent detail work' }
  ]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Round 1: Draft Generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const draft = await agent(`
Generate a LOW-FIDELITY draft for:
"${args.prompt}"

Requirements:
- Use ONLY basic blocks (stone, wood, glass)
- Focus on LAYOUT and PROPORTIONS
- Keep block count < 200
- Generate in 10 seconds

Output VoxelBuilder code for the draft.
`, {
  label: 'draft',
  phase: 'Draft'
});

// 执行 draft 代码，渲染到场景
executeCode(draft);

// 等待渲染完成
await waitForRender();

// 截图
const screenshot = await captureScreenshot();
```

**草图示例**:
```javascript
// 中式庭院 - 快速草图
builder.box(0, 0, 0, 15, 8, 20, 'oak_planks');  // 主殿（简化）
builder.box(-10, 0, 10, 8, 6, 10, 'oak_planks'); // 东配殿
builder.box(17, 0, 10, 8, 6, 10, 'oak_planks');  // 西配殿
builder.floor(-5, -1, 0, 27, 30, 'stone');       // 庭院地面
```

---

### 2. Vision AI 分析

**使用 Claude 3.5 Sonnet 的 Vision 能力**:

```javascript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Round 2: Vision Analysis
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const analysis = await agent(`
You are an expert architect analyzing a 3D building render.

Original request: "${args.prompt}"
Draft code: ${draft}

Analyze this screenshot of the draft building:
[IMAGE: screenshot]

Provide detailed feedback:

1. **Layout Analysis**
   - Is the overall layout correct?
   - Are proportions realistic?
   - Missing buildings or elements?

2. **Style Compliance**
   - Does it match the requested style?
   - What architectural features are missing?
   - Material choices appropriate?

3. **Structural Issues**
   - Any obvious problems?
   - Symmetry issues?
   - Scale problems?

4. **Improvement Priorities**
   - Top 3 things to add
   - Top 3 things to fix

Output structured JSON feedback.
`, {
  label: 'vision-analysis',
  phase: 'Vision Analysis',
  images: [screenshot]  // 传入截图
});

// 示例 Vision AI 输出:
const feedback = {
  layout: {
    score: 7,
    issues: [
      "Main hall position is good",
      "Side halls are too far apart",
      "Missing courtyard entrance gate"
    ]
  },
  style: {
    score: 5,
    issues: [
      "Roof style is flat, should be curved (飞檐)",
      "Missing decorative brackets (斗拱)",
      "No color scheme (red/gold)"
    ]
  },
  priorities: [
    "Add curved roof structure",
    "Position side halls closer",
    "Add entrance gate",
    "Use traditional colors"
  ]
};
```

---

### 3. 生成改进提示词

```javascript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Generate Refined Prompt
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const refinedPrompt = await agent(`
Based on the visual analysis:
${JSON.stringify(analysis)}

Generate an IMPROVED and DETAILED prompt for building the structure.

Original prompt: "${args.prompt}"

Enhanced prompt should include:
- Specific dimensions and proportions
- Architectural details mentioned in feedback
- Material specifications
- Structural fixes

Output the enhanced prompt as a string.
`, {
  label: 'refine-prompt',
  phase: 'Vision Analysis'
});

// 示例输出:
const enhanced = `
Build a traditional Chinese courtyard complex:

MAIN HALL (中心位置):
- Size: 15m wide × 20m deep × 12m high
- Curved roof (重檐歇山顶) with upturned eaves
- Red pillars and walls
- Gold decorative brackets (斗拱)
- Large front entrance

SIDE HALLS (东西两侧，距离主殿各 8 米):
- Size: 10m × 15m × 10m each
- Single-eave hip roof
- Symmetrical placement
- Connected by corridors

ENTRANCE GATE (南侧):
- Traditional archway (牌楼)
- Height: 8m
- Red and gold colors

COURTYARD:
- Stone brick flooring
- Central axis design
- Trees and plants along sides
`;
```

---

### 4. Multi-agent 精细建造

```javascript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Round 3: Multi-agent Construction
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 分解为多个区域
const regions = [
  {
    name: "main_hall",
    bounds: { x: [0, 15], y: [0, 12], z: [0, 20] },
    description: "Main hall with curved roof and decorative brackets"
  },
  {
    name: "east_hall",
    bounds: { x: [-10, -2], y: [0, 10], z: [10, 25] },
    description: "East side hall"
  },
  {
    name: "west_hall",
    bounds: { x: [17, 25], y: [0, 10], z: [10, 25] },
    description: "West side hall"
  },
  {
    name: "courtyard",
    bounds: { x: [-5, 27], y: [-1, 0], z: [0, 30] },
    description: "Courtyard with stone flooring and plants"
  }
];

// 并行建造
const results = await Promise.all(
  regions.map(region => 
    agent(`
Build this region according to the enhanced plan:
${refinedPrompt}

Region: ${region.name}
Bounds: ${JSON.stringify(region.bounds)}
Description: ${region.description}

Generate VoxelBuilder code for this region ONLY.
Use appropriate materials and details.
    `, {
      label: `build-${region.name}`,
      phase: 'Details'
    })
  )
);

// 整合所有区域
const finalCode = mergeRegions(results);
```

---

## 🎨 UI/UX 设计

### 用户看到的流程

```
┌─────────────────────────────────────────────┐
│  🏗️ 视觉驱动建造模式                        │
├─────────────────────────────────────────────┤
│                                             │
│  ⏱️ Round 1/3: 生成草图中...               │
│  ▓▓▓▓▓▓▓░░░░░░░ 60%                        │
│                                             │
│  已生成 187 个方块                          │
│  预计完成：10 秒                            │
│                                             │
└─────────────────────────────────────────────┘

        ↓ [草图渲染完成]

┌─────────────────────────────────────────────┐
│  📸 AI 正在分析草图...                      │
├─────────────────────────────────────────────┤
│  [草图 3D 预览]                             │
│                                             │
│  🤖 AI 发现：                               │
│  ✓ 布局合理                                 │
│  ⚠️ 侧殿位置需调整                          │
│  ⚠️ 缺少屋顶装饰                            │
│  ⚠️ 建议添加入口门楼                        │
│                                             │
│  正在生成优化方案...                        │
└─────────────────────────────────────────────┘

        ↓ [分析完成]

┌─────────────────────────────────────────────┐
│  🔨 Round 2/3: 结构优化中...               │
├─────────────────────────────────────────────┤
│                                             │
│  优化内容：                                 │
│  • 调整侧殿间距（18m → 23m）               │
│  • 添加飞檐屋顶                             │
│  • 添加装饰斗拱                             │
│  • 建造南侧门楼                             │
│                                             │
│  ▓▓▓▓▓▓▓▓▓▓░░░ 80%                        │
│                                             │
└─────────────────────────────────────────────┘

        ↓ [结构完成]

┌─────────────────────────────────────────────┐
│  ✨ Round 3/3: 细节完善中...               │
├─────────────────────────────────────────────┤
│                                             │
│  多 Agent 协作：                            │
│  🏛️ Agent A: 主殿细节 ✓                    │
│  🎨 Agent B: 彩绘装饰 🔄                    │
│  🌳 Agent C: 植被环境 ⏳                    │
│                                             │
│  已完成 1,247 方块                          │
│                                             │
└─────────────────────────────────────────────┘

        ↓ [完成！]

┌─────────────────────────────────────────────┐
│  🎉 建造完成！                              │
├─────────────────────────────────────────────┤
│  [最终渲染效果]                             │
│                                             │
│  📊 质量报告：                              │
│  • 结构完整度: 95%                          │
│  • 风格准确度: 90%                          │
│  • 细节丰富度: 88%                          │
│                                             │
│  💰 成本：1,247 方块 / 3 分钟 / 25k tokens │
│                                             │
│  [查看代码] [重新生成] [微调细节]           │
└─────────────────────────────────────────────┘
```

---

## 🔬 技术挑战与解决方案

### 挑战 1: 截图时机

**问题**: 什么时候截图？需要等渲染完成

**解决方案**:
```javascript
async function captureScreenshot() {
  // 1. 等待所有方块加载
  await waitForBlocksLoaded();
  
  // 2. 等待纹理加载
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 3. 调整相机到最佳视角
  adjustCameraToFitAll();
  
  // 4. 截图（多角度）
  const screenshots = {
    front: await capture({ angle: 'front' }),
    top: await capture({ angle: 'top' }),
    perspective: await capture({ angle: '45deg' })
  };
  
  return screenshots;
}
```

### 挑战 2: Vision API 成本

**问题**: 每次迭代都要发送图片，成本高

**解决方案**:
- 只在关键轮次使用 Vision（Round 1 → 2，Round 2 → 3）
- 压缩图片质量（1024x768 足够）
- 使用更便宜的模型做初步分析

### 挑战 3: 迭代次数控制

**问题**: 可能无限迭代

**解决方案**:
```javascript
const MAX_ROUNDS = 3;  // 最多 3 轮

// 质量阈值
if (round >= MAX_ROUNDS || qualityScore > 85) {
  // 停止迭代
  return finalResult;
}
```

---

## 📊 与其他方案对比

| 方案 | 质量 | 速度 | 成本 | 创新性 | 实施难度 |
|------|------|------|------|--------|---------|
| 三阶段模式 | ⭐⭐⭐⭐ | ⚡⚡ | $ | ⭐⭐ | 低 |
| Blueprint 模式 | ⭐⭐⭐⭐⭐ | ⚡ | $$ | ⭐⭐⭐ | 中 |
| **视觉反馈模式** | **⭐⭐⭐⭐⭐** | **⚡** | **$$$** | **⭐⭐⭐⭐⭐** | **高** |

---

## 💡 混合方案：三种模式协同

```
小型建筑（< 50 方块）
  → 快速模式

中型建筑（50-200 方块）
  → 三阶段模式
  
大型建筑（> 200 方块）+ 用户选择详细规划
  → Blueprint 模式（交互式规划）
  
超大/复杂建筑 + 追求极致质量
  → 视觉反馈模式（AI 看着建）
```

---

## 🚀 实施建议

### 优先级排序

**1. 先做 Blueprint 模式**（推荐立即开始）
- **原因**: 更实用，成本可控，技术难度低
- **时间**: 2-3 天
- **收益**: 立即提升用户体验

**2. 再做视觉反馈模式**（技术探索）
- **原因**: 创新性强，但需要 Vision API
- **时间**: 1-2 周
- **收益**: 差异化竞争优势

### 视觉反馈模式实施路径

**MVP 版（1 周）**:
- ✅ 单轮视觉反馈（Draft → Vision → Final）
- ✅ 基础截图功能
- ✅ 简单的改进提示词生成

**完整版（+1 周）**:
- ✅ 三轮迭代
- ✅ 多角度截图
- ✅ Multi-agent 细节建造
- ✅ 质量评分系统

---

## 🎯 我的建议

**方案组合**:
1. **现在做**: Blueprint 模式（交互式规划）
2. **并行探索**: 视觉反馈模式的 MVP
3. **最终目标**: 所有模式打通，智能选择

**原因**:
- Blueprint 立即可用，风险低
- 视觉反馈是长期竞争力
- 两者互补（一个是事前规划，一个是迭代改进）

---

**你想先做哪一个？或者我们可以先做一个视觉反馈模式的技术验证（POC），看看效果？**
