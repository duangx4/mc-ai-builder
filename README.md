# MC AI Builder v2

基于 AI 的 Minecraft 建筑生成器，支持智能建造、蓝图规划和精确修改。

## 快速开始

### 安装
```bash
npm install
npm run dev
```

### 配置
1. 打开应用后点击右上角 ⚙️ 设置
2. 填写 OpenAI API Key
3. 选择模型（推荐 gpt-4）

## 三种生成模式

### ⚡ 快速生成
适合快速创建和修改建筑
```
建造一个中世纪风格的石制塔楼，15x15，高度25格
```

### 📐 蓝图模式
适合大型建筑的详细规划
- 5个问题收集需求
- SVG 平面图可视化
- 施工计划和材料清单
- 审批后建造

### 🎯 精确修改
适合建筑群的局部修改
- 框选要修改的区域
- 智能分析周边风格
- 只修改选中部分
- 其他建筑完全保留

## 文档

- 📖 [用户手册](./docs/USER_MANUAL.md) - 详细使用指南
- 🛠️ [开发文档](./docs/DEV_GUIDE.md) - 技术文档和 API 参考

## 项目结构

```
src/
├── components/          # React 组件
│   ├── VoxelWorld.jsx           # 3D 渲染
│   ├── ChatInterface.jsx        # 对话界面
│   ├── BlueprintViewer.jsx      # 蓝图审批
│   └── PreciseModificationPlanViewer.jsx  # 精确修改审批
│
├── utils/              # 核心工具
│   ├── ai.js                    # AI API 调用
│   ├── sandbox.js               # 代码执行沙箱
│   ├── blueprintEngine.js       # 蓝图模式引擎
│   ├── preciseModificationEngine.js  # 精确修改引擎
│   ├── errorHandling.js         # 统一错误处理
│   └── performanceOptimizations.js   # 性能优化
│
└── store/              # 状态管理
    └── useStore.js              # Zustand store
```

## 核心功能

- ✅ 三种生成模式（快速/蓝图/精确）
- ✅ 并发生成多个方案
- ✅ Agent 深度推理模式
- ✅ SVG 平面图可视化
- ✅ 区域框选和精确修改
- ✅ 智能降级（AI 失败 → 本地生成）
- ✅ 统一错误处理
- ✅ 3D 实时预览

## 技术栈

- **前端**: React 18 + Vite
- **3D 渲染**: Three.js + React Three Fiber
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **AI**: OpenAI API

## 开发

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 预览构建
npm run preview
```

## 最近更新

### P1 阶段完成 ✅
- ✅ P1.1: 快速生成模式
- ✅ P1.2: 并发生成和 Agent 模式
- ✅ P1.3: 精确修改模式基础
- ✅ P1.4: 区域框选工具
- ✅ P1.5: 蓝图模式工作流
- ✅ P1.6: 精确修改工作流增强
- ✅ P1.7: 集成测试和优化

### 提交记录
```
b378e7bb - feat(P1.7): 统一错误处理和 API 响应解析
f7d8d6a6 - feat(P1.7): 添加状态管理和性能优化工具
d0f0fdc3 - feat(P1.6): 实现精确修改模式工作流
75dd8e28 - fix(P1.5): 修复蓝图模式的多个问题
f9c53123 - feat(P1.5): 实现蓝图模式完整工作流
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可

MIT License

---

**版本**: v2.0  
**作者**: MC AI Builder Team  
**更新**: 2024
