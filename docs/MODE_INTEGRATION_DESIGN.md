# 建筑生成模式整合方案

> **日期**: 2026-09-04  
> **目标**: 将所有讨论的功能整合为用户可选择的模式  

---

## 🎯 核心设计理念

**用户无需理解技术细节，只需根据需求选择模式**

---

## 📋 五种用户模式

### 模式 1: ⚡ 快速模式（Fast Mode）

**适用场景**：
- 小型简单建筑（< 500 方块）
- 快速原型验证
- 不追求极致质量
- 示例：小木屋、帐篷、亭子

**用户看到的**：
```
┌─────────────────────────────┐
│  ⚡ 快速模式                │
│                             │
│  描述你的建筑：              │
│  [建造一个小木屋_________]   │
│                             │
│  预计：10秒 | 成本：$0.01   │
│                             │
│  [生成建筑]                 │
└─────────────────────────────┘
```

**技术实现**：
```javascript
// 单次 Agent V2 调用
const code = await agentV2(prompt);
executeCode(code);
```

**特点**：
- ✅ 最快（10秒）
- ✅ 最便宜
- ⚠️ 质量靠运气

---

### 模式 2: 🎨 智能模式（Smart Mode）

**适用场景**：
- 中型建筑（500-1500 方块）
- 平衡质量和速度
- 大多数用户的默认选择
- 示例：标准住宅、小型店铺、村舍

**用户看到的**：
```
┌─────────────────────────────┐
│  🎨 智能模式（推荐）        │
│                             │
│  描述你的建筑：              │
│  [建造一座中式庭院_______]   │
│                             │
│  包含三阶段：                │
│  1️⃣ 规划设计                │
│  2️⃣ 精细建造                │
│  3️⃣ 质量检查                │
│                             │
│  预计：30秒 | 成本：$0.03   │
│                             │
│  [开始建造]                 │
└─────────────────────────────┘
```

**技术实现**：
```javascript
// 三阶段 Workflow
const result = await workflow('smart-building', {
  prompt: userInput,
  phases: ['planning', 'building', 'quality']
});
```

**特点**：
- ✅ 质量稳定（提升50-70%）
- ✅ 价格合理
- ⚠️ 略慢（30秒）

---

### 模式 3: 📐 蓝图模式（Blueprint Mode）

**适用场景**：
- 大型复杂建筑（1500-2500 方块）
- 需求不明确，需要规划
- 重要项目，避免返工
- 示例：庭院、别墅、小型城堡

**用户看到的**：
```
┌─────────────────────────────┐
│  📐 蓝图模式                │
│                             │
│  适合：大型/复杂建筑         │
│                             │
│  我们会先询问详细需求，      │
│  生成施工计划供你审批。      │
│                             │
│  流程：                      │
│  1️⃣ 需求问答（5个问题）      │
│  2️⃣ 生成蓝图（含预览图）     │
│  3️⃣ 你审批确认               │
│  4️⃣ 正式建造                 │
│                             │
│  预计：2-5分钟 | 成本：$0.05 │
│                             │
│  [开始规划]                 │
└─────────────────────────────┘
```

**交互流程**：
```
Step 1: 问答阶段
┌─────────────────────────────┐
│ Q1: 建筑规模？               │
│ ○ 小型  ● 中型  ○ 大型      │
│                             │
│ Q2: 主要建筑包含？           │
│ ☑ 主殿  ☑ 配殿  ☐ 钟楼     │
│                             │
│ [下一步]                    │
└─────────────────────────────┘

Step 2: 蓝图展示
┌─────────────────────────────┐
│  施工计划                    │
│                             │
│  [平面图 ASCII]              │
│  [材料清单]                  │
│  [预计：1247方块，3分钟]     │
│                             │
│  [批准开工] [修改需求] [取消]│
└─────────────────────────────┘
```

**技术实现**：
```javascript
// Blueprint Workflow
const blueprint = await workflow('blueprint-building', {
  prompt: userInput,
  interactive: true  // 暂停等待用户审批
});

if (blueprint.status === 'approved') {
  const result = await workflow('execute-blueprint', {
    blueprint: blueprint.plan
  });
}
```

**特点**：
- ✅ 质量最高（用户参与）
- ✅ 避免浪费（事前确认）
- ⚠️ 需要交互（5个问题）
- ⚠️ 时间较长（2-5分钟）

---

### 模式 4: 🚀 极致模式（Ultra Mode）

**适用场景**：
- 超大型建筑（> 2500 方块）
- 追求极致质量
- 不在乎成本和时间
- 示例：宫殿群、大型城堡、城市区域

**用户看到的**：
```
┌─────────────────────────────┐
│  🚀 极致模式                │
│                             │
│  适合：超大型建筑/追求完美   │
│                             │
│  特性：                      │
│  • 蓝图规划（问答式）        │
│  • 多 Agent 并行建造         │
│  • 视觉反馈迭代优化          │
│  • 三轮精细打磨              │
│                             │
│  流程：                      │
│  0️⃣ 需求规划（蓝图问答）     │
│  1️⃣ 快速草图（15秒）         │
│  2️⃣ AI分析改进（30秒）       │
│  3️⃣ 多Agent精细建造（2分钟） │
│                             │
│  预计：3-5分钟 | 成本：$0.10 │
│                             │
│  [启动极致模式]             │
└─────────────────────────────┘
```

**完整流程**：
```
Phase 0: 蓝图规划（继承自蓝图模式）
┌─────────────────────────────┐
│ Q1: 建筑规模？               │
│ ○ 大型  ● 超大型  ○ 巨型    │
│                             │
│ Q2: 主要建筑包含？           │
│ ☑ 主殿  ☑ 配殿  ☑ 城墙     │
│                             │
│ Q3-5: ...                   │
│                             │
│ [生成蓝图] → [用户审批]     │
└─────────────────────────────┘
     ↓
Phase 1: 快速草图
┌─────────────────────────────┐
│  根据蓝图生成草图...         │
│  [显示低保真 3D 模型]        │
└─────────────────────────────┘
     ↓
Phase 2: Vision AI 分析
┌─────────────────────────────┐
│  AI 正在分析草图...          │
│                             │
│  发现的问题：                │
│  • 主殿与配殿间距过窄        │
│  • 缺少连接走廊              │
│  • 屋顶坡度需调整            │
│                             │
│  改进计划已生成 ✓            │
└─────────────────────────────┘
     ↓
Phase 3: 多 Agent 精细建造
┌─────────────────────────────┐
│  多 Agent 协作中...          │
│                             │
│  🏛️ Agent A: 主殿 [====✓]   │
│  🏠 Agent B: 东配殿 [===—]   │
│  🏠 Agent C: 西配殿 [===—]   │
│  🌳 Agent D: 庭院 [==——]     │
│                             │
│  已完成 847/2547 方块        │
└─────────────────────────────┘
     ↓
完成！质量报告
```

**技术实现**：
```javascript
// Ultra Mode Workflow（整合蓝图 + 视觉反馈 + 多 Agent）
export const meta = {
  name: 'ultra-building',
  description: 'Ultimate quality with planning, vision feedback, and multi-agent',
  phases: [
    { title: 'Blueprint Planning', detail: 'Interactive requirements gathering' },
    { title: 'Draft', detail: 'Quick low-fidelity draft based on blueprint' },
    { title: 'Vision Analysis', detail: 'AI analyzing the render' },
    { title: 'Multi-Agent Build', detail: 'Parallel detailed construction' }
  ]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 0: Blueprint Planning（继承自蓝图模式）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const blueprint = await agent(`
Use /blueprint-planning skill to gather detailed requirements.
User request: "${args.prompt}"

Ask questions about:
- Scale and size
- Architectural components
- Style preferences
- Detail level
- Budget/constraints

Output structured blueprint JSON.
`, {
  label: 'planning',
  phase: 'Blueprint Planning'
});

// 用户审批蓝图
if (blueprint.status !== 'approved') {
  return { error: 'Blueprint not approved' };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 1: Draft Generation（基于蓝图）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const draft = await agent(`
Generate a LOW-FIDELITY draft based on this blueprint:
${JSON.stringify(blueprint.plan)}

Requirements:
- Follow blueprint layout and dimensions
- Use basic blocks only
- Keep block count < 500 (simplified structure)
- Focus on spatial layout

Output VoxelBuilder code for the draft.
`, {
  label: 'draft',
  phase: 'Draft'
});

// 执行 draft 代码，渲染，截图
executeCode(draft);
await waitForRender();
const screenshot = await captureScreenshot();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 2: Vision Analysis
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const analysis = await agent(`
You are analyzing a draft building against the approved blueprint.

BLUEPRINT:
${JSON.stringify(blueprint.plan)}

DRAFT SCREENSHOT:
[IMAGE: screenshot]

Compare draft vs blueprint and identify:
1. Layout accuracy
2. Proportion issues
3. Missing elements
4. Style consistency
5. Improvement priorities

Output structured improvement plan.
`, {
  label: 'vision-analysis',
  phase: 'Vision Analysis',
  images: [screenshot]
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Phase 3: Multi-Agent Construction
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 根据蓝图分区
const regions = divideIntoRegions(blueprint.plan);

// 并行建造
const results = await Promise.all(
  regions.map(region => 
    agent(`
Build this region according to blueprint and improvements:

BLUEPRINT REGION:
${JSON.stringify(region)}

IMPROVEMENTS:
${JSON.stringify(analysis.improvements)}

Generate detailed VoxelBuilder code for this region.
Use appropriate materials and details.
    `, {
      label: `build-${region.name}`,
      phase: 'Multi-Agent Build'
    })
  )
);

// 整合所有区域
const finalCode = mergeRegions(results);

return { 
  code: finalCode, 
  blueprint: blueprint.plan,
  analysis: analysis,
  quality_score: calculateQualityScore(finalCode, blueprint.plan)
};
```

**特点**：
- ✅ 最高质量保证（4个阶段）
- ✅ 用户参与规划（蓝图审批）
- ✅ AI 视觉反馈（自动改进）
- ✅ 并行建造（多 Agent）
- ✅ 适合超大型建筑
- ⚠️ 最慢（3-5分钟）
- ⚠️ 最贵（$0.10）

**对比蓝图模式的区别**：
```
蓝图模式：
  规划 → 审批 → 建造（单 Agent）

极致模式：
  规划 → 审批 → 草图 → 视觉分析 → 建造（多 Agent）
  
额外价值：
  + 视觉反馈迭代
  + 多 Agent 并行（更快、更细致）
  + 更适合超大建筑（> 2500 方块）
```

---

### 模式 5: 🎯 精确修改模式（Precision Mode）

**适用场景**：
- 局部调整现有建筑
- 修复特定区域问题
- 替换某个部分
- 示例：改变屋顶样式、替换一面墙、重新设计入口

**用户看到的**：
```
┌─────────────────────────────┐
│  🎯 精确修改模式            │
│                             │
│  适合：局部调整现有建筑      │
│                             │
│  使用方法：                 │
│  1️⃣ 在 3D 视图中框选区域    │
│  2️⃣ 描述你要的改动          │
│  3️⃣ AI 仅重建选中区域       │
│                             │
│  [点击开始框选]             │
└─────────────────────────────┘
```

**交互流程**：
```
Step 1: 框选区域
┌─────────────────────────────┐
│  3D 视图                    │
│  [用户拖动鼠标框选区域]     │
│                             │
│  已选区域：                 │
│  X: 10-20, Y: 0-10, Z: 5-15│
│  包含 127 个方块            │
│                             │
│  [确认选择] [重新框选]      │
└─────────────────────────────┘

Step 2: 描述修改
┌─────────────────────────────┐
│  你想如何修改这个区域？      │
│                             │
│  [将这面墙改成玻璃墙____]   │
│                             │
│  预览当前区域：              │
│  • 材质：石砖               │
│  • 形状：平面墙体            │
│                             │
│  [生成修改]                 │
└─────────────────────────────┘

Step 3: 生成和预览
┌─────────────────────────────┐
│  正在重建选中区域... ⏳     │
│                             │
│  [显示 Before/After 对比]   │
│                             │
│  [应用修改] [取消] [重新生成]│
└─────────────────────────────┘
```

**技术实现**：
```javascript
// Precision Mode Workflow
export const meta = {
  name: 'precision-editing',
  description: 'Edit specific region only',
  phases: [
    { title: 'Region Selection' },
    { title: 'Context Analysis' },
    { title: 'Regeneration' }
  ]
};

// Phase 1: 获取选中区域
const selectedRegion = {
  bounds: {
    min: [10, 0, 5],
    max: [20, 10, 15]
  },
  existingBlocks: getBlocksInRegion(bounds),
  surroundingContext: getAdjacentBlocks(bounds, radius=2)
};

// Phase 2: AI 分析上下文
const analysis = await agent(`
You are modifying a SPECIFIC REGION of an existing building.

SELECTED REGION:
- Bounds: ${JSON.stringify(selectedRegion.bounds)}
- Current blocks: ${JSON.stringify(selectedRegion.existingBlocks)}

SURROUNDING CONTEXT (must match):
- Adjacent blocks: ${JSON.stringify(selectedRegion.surroundingContext)}

USER REQUEST:
"${userPrompt}"

IMPORTANT:
1. Only generate blocks WITHIN the selected bounds
2. Match the style of surrounding architecture
3. Ensure smooth connection at boundaries

Generate VoxelBuilder code for ONLY the selected region.
`, {
  label: 'analyze-context',
  phase: 'Context Analysis'
});

// Phase 3: 应用修改
const newBlocks = parseGeneratedCode(analysis);
replaceRegion(selectedRegion.bounds, newBlocks);
```

**特点**：
- ✅ 精确控制（只改变选中部分）
- ✅ 保留其他建筑
- ✅ 自动匹配周围风格
- ✅ 支持撤销/重做
- ⚠️ 需要良好的 3D 选择工具

---

## 🎛️ UI 设计

### 主界面：模式选择

```
┌────────────────────────────────────────────┐
│              选择建造模式                   │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────┐  ┌──────────┐               │
│  │ ⚡ 快速  │  │ 🎨 智能  │               │
│  │          │  │  推荐    │               │
│  │ 10秒     │  │ 30秒     │               │
│  │ $0.01    │  │ $0.03    │               │
│  └──────────┘  └──────────┘               │
│                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ 📐 蓝图  │  │ 🚀 极致  │  │ 🎯 精确  ││
│  │          │  │          │  │  修改    ││
│  │ 2-5分钟  │  │ 3-5分钟  │  │ 20秒     ││
│  │ $0.05    │  │ $0.10    │  │ $0.02    ││
│  └──────────┘  └──────────┘  └──────────┘│
│                                            │
│  💡 不确定选哪个？[智能推荐]               │
└────────────────────────────────────────────┘
```

---

## 🔧 精确修改模式详细设计

### 1. 区域选择工具

**实现方式**：
```javascript
// 使用 Three.js 的 BoxHelper + TransformControls
class RegionSelector {
  constructor(scene) {
    this.selectionBox = new THREE.BoxHelper();
    this.isDragging = false;
    this.startPoint = null;
    this.endPoint = null;
  }
  
  onMouseDown(event) {
    this.isDragging = true;
    this.startPoint = this.getWorldPosition(event);
  }
  
  onMouseMove(event) {
    if (!this.isDragging) return;
    this.endPoint = this.getWorldPosition(event);
    this.updateSelectionBox(this.startPoint, this.endPoint);
  }
  
  onMouseUp(event) {
    this.isDragging = false;
    const bounds = this.calculateBounds(this.startPoint, this.endPoint);
    this.onRegionSelected(bounds);
  }
  
  calculateBounds(start, end) {
    return {
      min: [
        Math.min(start.x, end.x),
        Math.min(start.y, end.y),
        Math.min(start.z, end.z)
      ],
      max: [
        Math.max(start.x, end.x),
        Math.max(start.y, end.y),
        Math.max(start.z, end.z)
      ]
    };
  }
}
```

### 2. 上下文感知

**关键技术**：
```javascript
function getContextForRegion(bounds) {
  const blocks = getAllBlocks();
  
  // 1. 选中区域内的方块
  const selectedBlocks = blocks.filter(b => 
    isInsideBounds(b.position, bounds)
  );
  
  // 2. 周围 2 格内的方块（用于匹配风格）
  const expandedBounds = expandBounds(bounds, 2);
  const contextBlocks = blocks.filter(b =>
    isInsideBounds(b.position, expandedBounds) &&
    !isInsideBounds(b.position, bounds)
  );
  
  // 3. 分析材质和风格
  const materialStats = analyzeMaterials(contextBlocks);
  const styleHints = inferStyle(contextBlocks);
  
  return {
    selected: selectedBlocks,
    context: contextBlocks,
    dominantMaterial: materialStats.most_common,
    suggestedStyle: styleHints
  };
}
```

### 3. 边界平滑连接

**算法**：
```javascript
function ensureSmoothBoundaries(newBlocks, bounds, existingBlocks) {
  const boundaryLayer = getBoundaryBlocks(bounds);
  
  boundaryLayer.forEach(pos => {
    const adjacent = getAdjacentBlocks(pos, existingBlocks);
    
    // 如果边界处有现有方块，确保新方块能连接
    if (adjacent.length > 0) {
      const newBlock = findBlockAt(newBlocks, pos);
      if (newBlock) {
        // 调整连接方块类型（如栅栏、楼梯等）
        adjustBlockForConnection(newBlock, adjacent);
      }
    }
  });
  
  return newBlocks;
}
```

### 4. Before/After 对比

**UI 实现**：
```javascript
function PreviewComparison({ before, after, bounds }) {
  const [showBefore, setShowBefore] = useState(true);
  
  return (
    <div className="comparison-view">
      <div className="slider-container">
        <input 
          type="range" 
          min="0" 
          max="100"
          onChange={(e) => setShowBefore(e.target.value < 50)}
        />
      </div>
      
      <Canvas>
        {showBefore ? (
          <BlocksRenderer blocks={before} highlight={bounds} />
        ) : (
          <BlocksRenderer blocks={after} highlight={bounds} />
        )}
      </Canvas>
      
      <div className="labels">
        <span className={showBefore ? 'active' : ''}>修改前</span>
        <span className={!showBefore ? 'active' : ''}>修改后</span>
      </div>
    </div>
  );
}
```

---

## 📊 模式对比更新

| 模式 | 适用场景 | 方块数量 | 时间 | 成本 | 质量 |
|------|---------|---------|------|------|------|
| 快速 | 全新小建筑 | < 500 | 10秒 | $0.01 | ⭐⭐⭐ |
| 智能 | 全新中型建筑 | 500-1500 | 30秒 | $0.03 | ⭐⭐⭐⭐ |
| 蓝图 | 全新大型建筑 | 1500-2500 | 2-5分 | $0.05 | ⭐⭐⭐⭐⭐ |
| 极致 | 全新超大建筑 | > 2500 | 3-5分 | $0.10 | ⭐⭐⭐⭐⭐ |
| **精确** | **局部修改** | **任意** | **20秒** | **$0.02** | **⭐⭐⭐⭐** |

---

## 🎯 精确模式的独特价值

### 1. 迭代优化
```
用户生成建筑 → 发现某部分不满意 → 框选该部分 → 重新生成
→ 比整体重建快 10 倍
```

### 2. 风格一致性
```
AI 会分析周围方块
→ 自动匹配材质和风格
→ 无缝融入现有建筑
```

### 3. 精确控制
```
只改你想改的部分
→ 其他部分完全不变
→ 避免意外破坏
```

---

## 🛠️ 实施建议

### 在第一周加入精确模式

**Day 1-2**: 模式选择器 UI（包含精确模式）
**Day 3**: **区域选择工具** ← 新增
**Day 4**: **上下文分析和边界处理** ← 新增  
**Day 5**: Workflow 框架

**额外时间**: +2 天（共 7 天完成第一周）

### 智能推荐逻辑

```javascript
function recommendMode(prompt) {
  // 分析提示词
  const analysis = analyzePrompt(prompt);
  
  // 估算方块数量
  const estimatedBlocks = estimateBlockCount(prompt);
  
  // 检测关键词
  const isSimple = /小|简单|快速|帐篷|亭子/.test(prompt);
  const isComplex = /中式|哥特|巴洛克|复杂|宫殿|城堡/.test(prompt);
  const isUltra = /巨大|城市|群|大型.*复杂/.test(prompt);
  
  // 推荐逻辑（基于方块数量）
  if (estimatedBlocks < 500 || isSimple) {
    return 'fast';      // < 500 方块
  } else if (estimatedBlocks < 1500) {
    return 'smart';     // 500-1500 方块
  } else if (estimatedBlocks < 2500 || isComplex) {
    return 'blueprint'; // 1500-2500 方块
  } else {
    return 'ultra';     // > 2500 方块
  }
}

function estimateBlockCount(prompt) {
  // 基础估算
  let estimate = 500; // 默认
  
  // 建筑类型估算
  const buildingTypes = {
    '帐篷|亭子': 200,
    '小木屋|房间': 400,
    '房子|住宅': 800,
    '别墅|庭院': 1500,
    '城堡|宫殿': 2500,
    '城市|群': 5000
  };
  
  for (const [pattern, blocks] of Object.entries(buildingTypes)) {
    if (new RegExp(pattern).test(prompt)) {
      estimate = blocks;
      break;
    }
  }
  
  // 修饰词调整
  if (/大型|巨大/.test(prompt)) estimate *= 2;
  if (/小型|迷你/.test(prompt)) estimate *= 0.5;
  if (/简单/.test(prompt)) estimate *= 0.7;
  if (/精致|复杂|详细/.test(prompt)) estimate *= 1.5;
  
  return Math.round(estimate);
}
```

---

## 📱 实施方案

### 阶段 1: 基础整合（3-5天）

**目标**：实现 4 种模式的基础版本

**任务**：
1. 创建模式选择 UI 组件
2. 实现快速模式（已有）
3. 实现智能模式（三阶段 Workflow）
4. 实现蓝图模式（基础版）
5. 极致模式先占位（"即将推出"）

**代码结构**：
```
src/
├── components/
│   └── ModeSelector.jsx          # 模式选择器
├── workflows/
│   ├── smart-building.js         # 智能模式
│   ├── blueprint-building.js     # 蓝图模式
│   └── ultra-building.js         # 极致模式（待实现）
└── utils/
    └── modeRecommender.js        # 智能推荐
```

### 阶段 2: 功能完善（1周）

**目标**：完善蓝图模式和极致模式

**任务**：
1. 完善蓝图问答流程
2. 实现蓝图可视化
3. 实现视觉反馈系统
4. 实现多 Agent 协作

### 阶段 3: 优化体验（3-5天）

**目标**：优化 UI/UX 和智能推荐

**任务**：
1. 添加模式对比说明
2. 优化智能推荐算法
3. 添加历史记录（用户偏好学习）
4. 性能优化

---

## 🎨 详细 UI 流程

### 流程 1: 快速模式

```
用户输入 → 选择"快速模式" → 10秒生成 → 完成
```

### 流程 2: 智能模式

```
用户输入 → 选择"智能模式"
    ↓
[1/3] 规划中... ⏳
    ↓
[2/3] 建造中... 🏗️
    ↓
[3/3] 质检中... ✅
    ↓
完成！
```

### 流程 3: 蓝图模式

```
用户输入 → 选择"蓝图模式"
    ↓
问答环节（5个问题）
    ↓
生成蓝图 ⏳
    ↓
┌─────────────────────┐
│  施工计划预览       │
│  [图文并茂]         │
│                     │
│ [批准] [修改] [取消]│
└─────────────────────┘
    ↓
（如果批准）正式建造
    ↓
完成！
```

### 流程 4: 极致模式

```
用户输入 → 选择"极致模式"
    ↓
Round 1: 草图 ⏳
    ↓
[显示草图预览]
    ↓
Round 2: AI分析改进 🤖
    ↓
[显示改进计划]
    ↓
Round 3: 多Agent建造 👥
    ↓
完成！[质量报告]
```

---

## 💾 数据存储

### 用户偏好学习

```javascript
// 记录用户选择
const userPreferences = {
  userId: 'user_123',
  history: [
    { prompt: '小木屋', mode: 'fast', satisfied: true },
    { prompt: '城堡', mode: 'smart', satisfied: true },
    { prompt: '宫殿', mode: 'blueprint', satisfied: true }
  ],
  // 学习得出：用户对大型建筑喜欢用 blueprint
  preferredModes: {
    simple: 'fast',
    medium: 'smart',
    large: 'blueprint'
  }
};
```

---

## 🎯 实施建议

### 立即开始（第一周）

1. **Day 1-2**: 创建模式选择 UI
2. **Day 3-4**: 实现智能模式（三阶段）
3. **Day 5**: 实现蓝图模式基础版

### 第二周

4. **Day 6-8**: 完善蓝图问答和可视化
5. **Day 9-10**: 测试和优化

---

## 📊 预期效果

| 模式 | 采用率预测 | 用户满意度 |
|------|-----------|-----------|
| 快速 | 30% | ⭐⭐⭐ |
| 智能 | 50% | ⭐⭐⭐⭐ |
| 蓝图 | 15% | ⭐⭐⭐⭐⭐ |
| 极致 | 5% | ⭐⭐⭐⭐⭐ |

**智能模式预计成为主流选择**

---

## ✅ 成功标准

1. **用户能快速理解** - 无需阅读说明即可选择
2. **推荐准确** - 智能推荐匹配用户需求 > 80%
3. **质量提升** - 智能模式比快速模式质量提升 50%+
4. **无缝切换** - 用户可以随时切换模式

---

**要不要我现在开始实现模式选择器组件？**
