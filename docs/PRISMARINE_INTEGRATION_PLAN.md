# Prismarine Viewer 集成计划

## ✅ 已完成

1. **安装依赖**
   - prismarine-viewer@1.33.0 ✅
   - minecraft-data@3.114.0 ✅
   - vec3@0.2.0 ✅

2. **创建测试组件**
   - `src/components/PrismarineTest.jsx` ✅

## 📋 集成步骤

### Phase 1: 基础集成（Day 1）

#### 1.1 创建 Prismarine 包装器
```javascript
// src/components/PrismarineWorld.jsx
// 替代现有的 VoxelWorld.jsx
```

**功能**：
- 初始化 Prismarine Viewer
- 与 React 生命周期集成
- 处理 canvas 挂载

#### 1.2 数据适配层
```javascript
// src/utils/prismarineAdapter.js
// 将我们的 block 数据格式转换为 Prismarine 格式
```

**转换**：
```javascript
// 我们的格式
{ id: 1, type: 'oak_fence', position: [0, 0, 0], properties: {...} }

// Prismarine 格式
viewer.world.setBlockStateId(new Vec3(0, 0, 0), blockStateId)
```

#### 1.3 Builder API 适配
```javascript
// src/utils/prismarineBuilder.js
// 保持 builder.set() / builder.fill() API 不变
```

### Phase 2: 功能迁移（Day 2）

#### 2.1 方块放置
- ✅ builder.set(x, y, z, type, properties)
- ✅ builder.fill(x1, y1, z1, x2, y2, z2, type)
- ✅ 方块状态支持

#### 2.2 摄像机控制
- ✅ 轨道控制（orbit）
- ✅ 飞行控制（fly）
- ✅ 缩放/平移

#### 2.3 交互系统
- ✅ 方块点击选择
- ✅ 高亮显示
- ✅ 多选支持

### Phase 3: UI 集成（Day 3）

#### 3.1 状态管理
- 保持 Zustand store 不变
- 添加 Prismarine 同步逻辑

#### 3.2 现有功能迁移
- ✅ AI 建造系统
- ✅ 聊天界面
- ✅ 设置面板

#### 3.3 测试验证
- 测试所有方块类型
- 验证 AI 建造
- 性能测试

## 🔧 技术细节

### Prismarine Viewer 架构
```
Prismarine Viewer
├── World (方块数据)
├── Renderer (Three.js)
├── Controls (摄像机)
└── Physics (可选)
```

### 集成点
```
App.jsx
└── PrismarineWorld.jsx (新)
    ├── Prismarine Viewer 初始化
    ├── Builder API 适配
    └── 事件处理
```

### API 映射

| 当前 API | Prismarine API |
|---------|----------------|
| `setBlocks(blocks)` | `world.setBlockStateId(pos, id)` |
| `builder.set(x,y,z,type)` | `setBlockStateId(Vec3, id)` |
| `onBlockClick(id)` | `raycast() + getBlock()` |

## 📊 预期改进

### 渲染质量
- ✅ 100% MC 原版模型
- ✅ 所有方块类型支持
- ✅ 正确的方块状态
- ✅ 纹理动画（水、岩浆）

### 性能
- ✅ 优化的区块渲染
- ✅ 视锥剔除
- ✅ LOD 支持
- ✅ 实例化渲染

### 维护成本
- ✅ 自动 MC 版本更新
- ✅ 社区支持
- ✅ Bug 修复

## ⚠️ 潜在问题

### 1. React 集成
**问题**：Prismarine Viewer 不是 React 组件
**解决**：创建 React 包装器，管理生命周期

### 2. 状态同步
**问题**：Zustand store vs Prismarine World
**解决**：单向数据流，Store → Prismarine

### 3. 性能
**问题**：大量方块更新
**解决**：批量更新，debounce

## 🎯 成功标准

- [ ] 所有方块类型正确渲染
- [ ] AI 建造功能正常
- [ ] 性能不低于当前系统
- [ ] UI/UX 保持一致
- [ ] 无明显 bug

## 📝 回滚计划

如果集成失败：
```bash
git reset --hard v0.3.0-pre-prismarine
```

所有更改都在新分支进行，可以安全回滚。

## 🚀 开始！

下一步：创建 `PrismarineWorld.jsx` 组件
