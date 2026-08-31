# CDP Debug Skill

使用 Chrome DevTools Protocol 自动化调试浏览器。

## 用途

- 验证前端页面加载状态
- 测试方块渲染和 Canvas 状态
- 检查 JavaScript 错误
- 自动化浏览器测试
- 性能监控和截图

## 使用方法

1. 启动带调试端口的 Chrome：`./start-chrome-debug.bat`
2. 编写 CDP 脚本（参考 SKILL.md）
3. 运行脚本：`node your-test.js`

## 关键 API

- `Runtime.evaluate()` - 执行 JavaScript
- `Page.navigate()` - 导航到 URL
- `Console.messageAdded` - 监听控制台
- `Page.captureScreenshot()` - 截图

## VoxelWorld 检查

```javascript
// 检查应用状态
window.__voxel_store  // Zustand store
document.querySelector('canvas')  // Canvas 元素

// 设置方块
store.setBlocks([
  { id: '1', type: 'stone', position: [0,0,0], properties: {} }
])
```

详见 `SKILL.md` 完整文档。
