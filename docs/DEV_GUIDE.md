# MC AI Builder - 开发文档

## 目录
1. [项目架构](#项目架构)
2. [核心模块](#核心模块)
3. [生成模式详解](#生成模式详解)
4. [API 参考](#api-参考)
5. [扩展开发](#扩展开发)
6. [调试和测试](#调试和测试)

---

## 项目架构

### 技术栈
- **前端框架**: React 18
- **3D 渲染**: Three.js + React Three Fiber
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **构建工具**: Vite

### 目录结构
```
mc-ai-builder-v2/
├── src/
│   ├── components/          # React 组件
│   │   ├── VoxelWorld.jsx         # 3D 场景渲染
│   │   ├── ChatInterface.jsx      # 对话界面
│   │   ├── ModeSelector.jsx       # 模式选择器
│   │   ├── GizmoRegionSelector.jsx # 区域框选工具
│   │   ├── BlueprintQuestionnaire.jsx  # 蓝图问卷
│   │   ├── BlueprintViewer.jsx         # 蓝图审批界面
│   │   ├── PreciseModificationPlanViewer.jsx # 精确修改审批
│   │   └── SVGFloorPlan.jsx       # SVG 平面图组件
│   │
│   ├── utils/               # 工具函数
│   │   ├── ai.js                  # AI API 调用
│   │   ├── sandbox.js             # 代码沙箱执行
│   │   ├── blueprintEngine.js     # 蓝图模式引擎
│   │   ├── blueprintGenerator.js  # 本地蓝图生成器
│   │   ├── preciseModificationEngine.js # 精确修改引擎
│   │   ├── RegionSelector.js      # 区域选择工具
│   │   ├── errorHandling.js       # 错误处理工具
│   │   ├── stateCleanup.js        # 状态清理工具
│   │   └── performanceOptimizations.js # 性能优化工具
│   │
│   ├── store/               # 状态管理
│   │   └── useStore.js            # Zustand store
│   │
│   ├── App.jsx              # 主应用组件
│   └── main.jsx             # 入口文件
│
├── docs/                    # 文档
│   ├── USER_MANUAL.md       # 用户手册
│   └── DEV_GUIDE.md         # 开发文档（本文件）
│
└── .claude/                 # Claude 相关文档
    └── planning-docs/       # 规划文档
```

### 数据流
```
用户输入 
  → App.jsx (handleSend)
  → 模式判断 (fast/blueprint/precise)
  → AI 调用 (ai.js)
  → 代码生成
  → 沙箱执行 (sandbox.js)
  → 状态更新 (useStore)
  → 视图渲染 (VoxelWorld.jsx)
```

---

## 核心模块

### 1. 状态管理 (useStore.js)

**核心状态**:
```javascript
{
  blocks: [],                    // 方块数据
  semanticVoxels: [],           // 语义化体素
  apiConversationHistory: [],   // API 对话历史
  workflowState: {},            // 工作流状态
  generationMode: 'fast',       // 生成模式
  concurrencyCount: 1,          // 并发数
  isAgentMode: false,           // Agent 模式
}
```

**关键方法**:
- `setBlocks(blocks)` - 设置方块数据
- `setSemanticVoxels(voxels)` - 设置语义体素
- `clearHistory()` - 清空对话历史
- `startConcurrentGeneration()` - 启动并发生成
- `updateVariant()` - 更新变体

### 2. AI 调用 (ai.js)

**核心函数**:

#### `fetchAIResponseStream()`
流式调用 OpenAI API
```javascript
const result = await fetchAIResponseStream(
  prompt,           // 用户提示
  apiKey,          // API 密钥
  baseUrl,         // API 地址
  model,           // 模型名称
  history,         // 对话历史
  onChunk          // 流式回调
);

// 返回: { content, messages, truncated }
```

#### `fetchAIResponse()`
非流式调用（内部调用 fetchAIResponseStream）
```javascript
const result = await fetchAIResponse(
  prompt,
  apiKey,
  baseUrl,
  model,
  history
);

// 返回: { content, messages, truncated }
```

**重要**: 所有 AI 调用都返回 `{ content, messages }` 对象，使用 `extractAIContent()` 安全提取内容。

### 3. 代码沙箱 (sandbox.js)

**核心类: VoxelBuilder**

提供建筑 API:
```javascript
class VoxelBuilder {
  setBlock(x, y, z, blockType)           // 设置单个方块
  fill(x1, y1, z1, x2, y2, z2, blockType) // 填充区域
  hollow(x1, y1, z1, x2, y2, z2, blockType) // 空心立方体
  wall(x1, z1, x2, z2, y, height, blockType) // 墙体
  floor(x1, z1, x2, z2, y, blockType)    // 地板
  cylinder(centerX, centerY, centerZ, radius, height, blockType) // 圆柱
  sphere(centerX, centerY, centerZ, radius, blockType) // 球体
  beginGroup(name)                       // 开始分组
  endGroup()                            // 结束分组
  setPriority(name, priority)           // 设置优先级
}
```

**执行函数**:
```javascript
const blocks = executeVoxelScript(code, throwOnError);
// 返回: Array<{ position: [x, y, z], blockType: string }>
```

### 4. 蓝图引擎 (blueprintEngine.js)

**工作流**:
```
需求收集 → 蓝图生成 → 用户审批 → 建造执行
```

**核心函数**:

#### `generateBlueprintWithAI(requirements, settings)`
生成蓝图（AI 增强 + 本地降级）
```javascript
const blueprint = await generateBlueprintWithAI(requirements, settings);

// 返回:
{
  metadata: { buildingType, style, size },
  floorPlan: { ascii, legend },
  constructionPlan: { phases: [...] },
  materialList: { stone: 500, wood: 200 },
  estimatedTime: 10
}
```

#### `generateBuildCodeFromBlueprint(blueprint, settings, onProgress)`
生成建造代码
```javascript
const result = await generateBuildCodeFromBlueprint(
  blueprint,
  settings,
  ({ phase, message, progress }) => {
    console.log(`${phase}: ${message} (${progress}%)`);
  }
);

// 返回: { code, summary }
```

### 5. 精确修改引擎 (preciseModificationEngine.js)

**三阶段工作流**:
```
分析 → 规划 → 生成代码
```

**核心函数**:

#### `executePreciseModificationWorkflow(params)`
执行完整工作流
```javascript
const result = await executePreciseModificationWorkflow({
  regionBlocks,        // 选中区域的方块
  surroundingBlocks,   // 周边方块
  preservedBlocks,     // 需要保留的方块
  bounds,              // 区域边界
  userRequest,         // 用户需求
  settings,            // API 设置
  onProgress           // 进度回调
});

// 返回:
{
  success: true,
  analysis: { buildingType, detectedStyle, constraints, ... },
  plan: {
    summary,
    steps: [...],
    styleNotes,
    boundaryHandling,
    code  // 生成的代码
  }
}
```

#### `analyzeRegionAndContext()`
阶段1: 分析区域和周边环境

#### `planModification()`
阶段2: 规划修改方案

#### `generateModificationCode()`
阶段3: 生成修改代码

### 6. 区域选择 (RegionSelector.js)

**核心函数**:

#### `analyzeRegionContext(blocks, bounds, expandDistance)`
分析区域上下文
```javascript
const context = analyzeRegionContext(allBlocks, regionBounds, 2);

// 返回:
{
  materials: [{ type: 'stone', count: 100 }, ...],
  surroundingBlocks: [...],
  dominantMaterial: 'stone'
}
```

---

## 生成模式详解

### 快速生成模式 (Fast)

**流程**:
```
用户输入 → AI 生成代码 → 执行代码 → 渲染方块
```

**实现位置**: `App.jsx` - `handleSend()`

**关键代码**:
```javascript
// 单次生成
const result = await fetchAIResponseStream(
  userPrompt,
  apiKey,
  baseUrl,
  model,
  history,
  onChunk  // 流式更新
);

const blocks = executeVoxelScript(result.content);
useStore.getState().setBlocks(blocks);
```

**并发生成**:
```javascript
// 启动多个并发请求
const promises = Array(concurrencyCount).fill().map(() =>
  fetchAIResponseStream(...)
);

const results = await Promise.all(promises);

// 保存所有变体
useStore.getState().updateVariant(messageId, variants);
```

### 蓝图模式 (Blueprint/Workflow)

**流程**:
```
问卷收集 → AI 生成蓝图 → 展示审批 → 生成建造代码 → 执行
```

**实现位置**:
- `App.jsx` - 主流程控制
- `BlueprintQuestionnaire.jsx` - 问卷界面
- `BlueprintViewer.jsx` - 审批界面
- `blueprintEngine.js` - 核心逻辑

**关键代码**:
```javascript
// 1. 收集需求
const handleBlueprintQuestionnaireComplete = async (requirements) => {
  const blueprint = await generateBlueprintWithAI(requirements, apiSettings);
  setBlueprintData(blueprint);
  setIsBlueprintViewerOpen(true);
};

// 2. 用户审批
const handleBlueprintApprove = async () => {
  const result = await generateBuildCodeFromBlueprint(blueprintData, apiSettings);
  const blocks = executeVoxelScript(result.code);
  useStore.getState().setBlocks(blocks);
};
```

**本地降级**:
当 AI 调用失败时，自动使用本地生成器：
```javascript
try {
  blueprint = extractJSON(aiResponse);
} catch (parseError) {
  // 降级到本地生成器
  blueprint = generateFullBlueprint(requirements);
}
```

### 精确修改模式 (Precise)

**流程**:
```
框选区域 → 分析环境 → 规划修改 → 展示审批 → 执行修改 → 合并方块
```

**实现位置**:
- `App.jsx` - 主流程控制
- `GizmoRegionSelector.jsx` - 框选工具
- `PreciseModificationPlanViewer.jsx` - 审批界面
- `preciseModificationEngine.js` - 核心逻辑

**关键代码**:
```javascript
// 1. 框选区域
const handleRegionSelect = (bounds, blocks) => {
  setRegionBounds(bounds);
  setSelectedRegionBlocks(blocks);
};

// 2. 执行工作流
const result = await executePreciseModificationWorkflow({
  regionBlocks,
  surroundingBlocks,
  preservedBlocks,
  bounds,
  userRequest,
  settings
});

// 3. 用户审批后执行
const modifiedBlocks = executeVoxelScript(result.plan.code);
const finalBlocks = [...preservedBlocks, ...modifiedBlocks];
useStore.getState().setBlocks(finalBlocks);
```

**方块保留机制**:
```javascript
// 提取区域外的方块（需要保留）
const preservedBlocks = allBlocks.filter(block => {
  const [x, y, z] = block.position;
  return !(
    x >= bounds.min.x && x <= bounds.max.x &&
    y >= bounds.min.y && y <= bounds.max.y &&
    z >= bounds.min.z && z <= bounds.max.z
  );
});

// 修改后合并
const finalBlocks = [...preservedBlocks, ...modifiedBlocks];
```

---

## API 参考

### 错误处理工具 (errorHandling.js)

#### `formatAIError(error)`
格式化 AI 错误为用户友好的消息
```javascript
const message = formatAIError(error);
// "网络连接失败，请检查网络设置"
```

#### `extractAIContent(response)`
安全提取 AI 响应内容
```javascript
const content = extractAIContent(response);
// 兼容 { content: "..." } 和 "..." 两种格式
```

#### `extractJSON(content)`
从响应中提取 JSON
```javascript
const data = extractJSON(response);
// 支持代码块和裸对象
```

#### `extractCodeBlock(content)`
提取代码块
```javascript
const code = extractCodeBlock(response);
// 提取 ```javascript ... ``` 中的代码
```

#### `validateAPISettings(settings)`
验证 API 设置
```javascript
try {
  validateAPISettings(apiSettings);
} catch (error) {
  console.error(error.message); // "请在设置中配置 API Key"
}
```

#### `createUserFriendlyError(phase, error)`
创建用户友好的错误消息
```javascript
const message = createUserFriendlyError('analyze', error);
// "分析阶段失败: 网络连接失败"
```

### 状态清理工具 (stateCleanup.js)

#### `cleanupBlueprintState(setters)`
清理蓝图模式状态
```javascript
cleanupBlueprintState({
  setIsBlueprintQuestionnaireOpen,
  setIsBlueprintViewerOpen,
  setBlueprintData,
  setBlueprintRequirements,
  setIsProcessing
});
```

#### `cleanupPreciseModificationState(setters, refs)`
清理精确修改状态
```javascript
cleanupPreciseModificationState(
  { setIsPrecisePlanViewerOpen, ... },
  { preservedBlocksRef, regionSelectorRef }
);
```

#### `createOperationLock()`
创建操作锁（防止并发）
```javascript
const lock = createOperationLock();

try {
  await lock.withLock(async () => {
    // 执行操作
  });
} catch (error) {
  console.error(error.message); // "操作正在进行中，请稍候"
}
```

### 性能优化工具 (performanceOptimizations.js)

#### `batchProcessBlocksAsync(blocks, batchSize, processFn, onProgress)`
异步批量处理方块
```javascript
const results = await batchProcessBlocksAsync(
  blocks,
  1000,  // 每批 1000 个
  (batch) => processBatch(batch),
  (progress, batchNum, totalBatches) => {
    console.log(`进度: ${progress}%`);
  }
);
```

#### `deduplicateBlocks(blocks)`
方块去重
```javascript
const uniqueBlocks = deduplicateBlocks(blocks);
```

#### `createBlockIndex(blocks)`
创建快速索引
```javascript
const index = createBlockIndex(blocks);
const block = index.get(10, 5, 20);  // 快速查找
```

#### `LRUCache`
LRU 缓存
```javascript
const cache = new LRUCache(50);
cache.set('key', value);
const value = cache.get('key');
```

#### `calculateBounds(blocks)`
计算边界
```javascript
const bounds = calculateBounds(blocks);
// { min, max, size, center }
```

---

## 扩展开发

### 添加新的生成模式

1. **在 useStore 中添加模式**:
```javascript
// store/useStore.js
generationModes: ['fast', 'blueprint', 'precise', 'custom'],
```

2. **在 ModeSelector 中添加按钮**:
```javascript
// components/ModeSelector.jsx
<button onClick={() => setGenerationMode('custom')}>
  Custom Mode
</button>
```

3. **在 App.jsx 中处理模式**:
```javascript
// App.jsx - handleSend()
if (generationMode === 'custom') {
  // 自定义模式逻辑
}
```

### 添加新的 VoxelBuilder API

在 `sandbox.js` 中扩展 VoxelBuilder 类:
```javascript
class VoxelBuilder {
  // 新方法
  pyramid(centerX, centerY, centerZ, baseSize, height, blockType) {
    // 实现金字塔
    for (let y = 0; y < height; y++) {
      const size = baseSize - y * 2;
      // ...
    }
  }
}
```

### 自定义蓝图生成器

在 `blueprintGenerator.js` 中添加新的生成函数:
```javascript
export function generateCustomBlueprint(requirements) {
  return {
    metadata: { /* ... */ },
    floorPlan: { /* ... */ },
    constructionPlan: { /* ... */ },
    materialList: { /* ... */ }
  };
}
```

### 添加新的错误处理

在 `errorHandling.js` 中添加新的错误类型:
```javascript
export function formatAIError(error) {
  // 新的错误类型
  if (error.message?.includes('custom_error')) {
    return '自定义错误提示';
  }
  // ...
}
```

---

## 调试和测试

### 启用调试日志

在需要调试的地方添加:
```javascript
console.log('[ModuleName]', 'debug info', data);
```

约定前缀:
- `[AI]` - AI 调用相关
- `[Sandbox]` - 代码执行相关
- `[Blueprint]` - 蓝图模式相关
- `[Precise]` - 精确修改相关
- `[Performance]` - 性能监控相关

### 性能监控

使用 PerformanceMonitor:
```javascript
import { PerformanceMonitor } from './utils/performanceOptimizations';

const monitor = new PerformanceMonitor();
monitor.start('operation_name');

// 执行操作...

monitor.end('operation_name');  // 自动输出耗时
console.log(monitor.report());  // 查看所有监控项
```

### 测试场景

#### 测试快速生成
```javascript
// 在浏览器控制台
window.testFastGeneration = async () => {
  // 模拟发送消息
  const event = new CustomEvent('send-message', {
    detail: { message: '建造一个10x10的石制房屋' }
  });
  window.dispatchEvent(event);
};
```

#### 测试蓝图模式
```javascript
window.testBlueprintMode = () => {
  // 切换到蓝图模式
  useStore.getState().setGenerationMode('workflow');
  // 触发问卷
  document.querySelector('[data-mode="workflow"]').click();
};
```

#### 测试精确修改
```javascript
window.testPreciseMode = () => {
  // 先生成一个建筑
  // 然后切换到精确模式
  useStore.getState().setGenerationMode('precise');
  // 开始框选
  document.querySelector('[data-action="start-region-select"]').click();
};
```

### 常见问题排查

#### AI 调用失败
1. 检查 API Key 是否正确
2. 检查网络连接
3. 查看浏览器控制台错误
4. 检查 API 配额

#### 代码执行失败
1. 查看 sandbox.js 中的错误日志
2. 检查生成的代码是否有语法错误
3. 使用 `throwOnError: true` 获取详细错误

#### 方块不渲染
1. 检查 blocks 数组是否正确
2. 检查坐标是否在合理范围内
3. 查看 VoxelWorld 组件的 console 输出

#### 状态不更新
1. 检查 useStore 中的状态是否正确设置
2. 使用 React DevTools 查看组件状态
3. 检查是否有异步问题

---

## 贡献指南

### 代码风格
- 使用 2 空格缩进
- 使用单引号
- 函数名使用 camelCase
- 组件名使用 PascalCase
- 常量使用 UPPER_SNAKE_CASE

### 提交消息格式
```
feat(module): 添加新功能
fix(module): 修复 bug
docs: 更新文档
refactor: 重构代码
perf: 性能优化
test: 添加测试
```

### Pull Request 流程
1. Fork 项目
2. 创建特性分支
3. 提交代码
4. 编写测试
5. 更新文档
6. 提交 PR

---

## 附录

### 环境变量
```env
VITE_API_KEY=your_api_key
VITE_API_BASE_URL=https://api.openai.com/v1
VITE_DEFAULT_MODEL=gpt-4
```

### 构建和部署
```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 依赖版本
- React: ^18.2.0
- Three.js: ^0.150.0
- @react-three/fiber: ^8.11.0
- Zustand: ^4.3.0
- Tailwind CSS: ^3.2.0

---

**版本**: v2.0  
**最后更新**: 2024年  
**维护者**: 开发团队
