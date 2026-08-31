# AI Debug Dashboard 使用说明

AI Debug Dashboard 是一个独立的调试页面，用于 AI 观察和测试 VoxelWorld 功能。

## 访问地址

```
http://localhost:5176/ai-debug.html
```

## 注意事项

⚠️ **重要**：AI Debug Dashboard 是一个**独立页面**，它本身不包含主应用的 React/Store/Canvas。

它的作用是提供一个 AI 友好的界面来：
1. 查看主应用（在其他标签页/窗口）的状态
2. 通过内联框架（iframe）或直接操作主应用的 Store
3. 提供清晰的日志和状态展示

## 工作流程

### 方式 1: 主应用内嵌 Debug Dashboard（推荐）

在主应用中集成 DebugPanel 组件（已完成），通过 UI 切换：
- 主应用：`http://localhost:5176`
- 点击右下角紫色扳手图标打开 DebugPanel

### 方式 2: 独立页面 + CDP（当前）

1. 打开主应用：`http://localhost:5176`
2. 在另一个标签页打开：`http://localhost:5176/ai-debug.html`
3. 使用 CDP 在两个页面间协调

⚠️ 当前 Dashboard 在独立页面时无法直接访问主应用的 Store，需要通过 CDP 桥接。

## 后续改进方向

1. **集成到主应用**：将 Dashboard 作为主应用的一个路由或浮窗
2. **SharedWorker/BroadcastChannel**：页面间通信
3. **WebSocket**：实时状态同步

## AI 使用示例

```javascript
// 方式 1: 主应用内使用（推荐）
// 访问 http://localhost:5176
// 打开 DevTools Console

window.__voxel_store.getState().setBlocks([...]);

// 方式 2: CDP 跨页面操作
const client = await CDP({...});
await Runtime.evaluate({
  expression: `window.__voxel_store.getState().setBlocks([...])`
});
```
