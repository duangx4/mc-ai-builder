# CDP Browser Automation Skill

AI 使用 Chrome DevTools Protocol 自动化调试浏览器的技能。

## 何时使用此技能

- 需要验证前端页面是否正常加载
- 测试 UI 交互和渲染结果
- 检查 JavaScript 错误和控制台输出
- 验证方块渲染、Canvas 状态
- 自动化重复的浏览器测试
- 需要截图或性能监控

## 核心能力

1. **页面导航和检查**
   - 导航到 URL 并等待加载
   - 执行 JavaScript 代码获取页面状态
   - 检查 DOM 结构和元素

2. **控制台监控**
   - 监听 console.log/warn/error
   - 捕获 JavaScript 运行时错误
   - 获取错误堆栈信息

3. **状态验证**
   - 检查 React 应用加载状态
   - 验证 Zustand store 数据
   - 检查 Canvas 和 WebGL 初始化

4. **自动化测试**
   - 模拟用户交互
   - 验证方块添加和渲染
   - 截图对比

## 前置条件

启动带调试端口的 Chrome：

```bash
# Windows
chrome.exe --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug" http://localhost:5176

# 或使用项目提供的脚本
./start-chrome-debug.bat
```

## 脚本模板

### 基础结构

```javascript
import CDP from 'chrome-remote-interface';

async function main() {
  const client = await CDP({ host: 'localhost', port: 9222 });
  const { Runtime, Page, Console } = client;
  
  await Runtime.enable();
  await Page.enable();
  await Console.enable();

  try {
    // 你的测试逻辑
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
```

### 页面导航

```javascript
// 导航到页面
await Page.navigate({ url: 'http://localhost:5176' });
await Page.loadEventFired();

// 等待 React 初始化
await new Promise(resolve => setTimeout(resolve, 2000));
```

### 执行 JavaScript

```javascript
const result = await Runtime.evaluate({
  expression: `
    (function() {
      // 你的代码
      return { success: true, data: someData };
    })()
  `,
  returnByValue: true
});

console.log(result.result.value);
```

### 监听控制台

```javascript
const errors = [];

Console.messageAdded(({ message }) => {
  if (message.level === 'error') {
    errors.push(message.text);
  }
  console.log(`[${message.level}] ${message.text}`);
});

// 等待一段时间收集日志
await new Promise(resolve => setTimeout(resolve, 1000));
```

### 截图

```javascript
const screenshot = await Page.captureScreenshot({ 
  format: 'png',
  quality: 90 
});

const fs = await import('fs');
fs.writeFileSync('screenshot.png', screenshot.data, 'base64');
```

## VoxelWorld 特定检查

### 检查应用状态

```javascript
const appState = await Runtime.evaluate({
  expression: `({
    hasReact: !!document.querySelector('#root')?.children.length,
    hasStore: typeof window.__voxel_store !== 'undefined',
    canvasCount: document.querySelectorAll('canvas').length,
    hasWebGL: !!(document.querySelector('canvas')?.getContext('webgl2'))
  })`,
  returnByValue: true
});

console.log('应用状态:', appState.result.value);
```

### 检查 Store 数据

```javascript
const storeData = await Runtime.evaluate({
  expression: `(function() {
    if (!window.__voxel_store) return { error: 'Store not found' };
    
    const state = window.__voxel_store.getState();
    return {
      blocksCount: state.blocks?.length || 0,
      hasBlocks: state.blocks?.length > 0,
      blockTypes: state.blocks?.slice(0, 5).map(b => b.type) || []
    };
  })()`,
  returnByValue: true
});

console.log('Store 状态:', storeData.result.value);
```

### 设置测试方块

```javascript
const setBlocks = await Runtime.evaluate({
  expression: `(function() {
    const store = window.__voxel_store.getState();
    
    const testBlocks = [
      { id: '1', type: 'stone', position: [0, 0, 0], properties: {} },
      { id: '2', type: 'dirt', position: [1, 0, 0], properties: {} },
      { id: '3', type: 'grass_block', position: [2, 0, 0], properties: {} }
    ];
    
    store.setBlocks(testBlocks);
    
    return { 
      success: true, 
      blocksSet: testBlocks.length 
    };
  })()`,
  returnByValue: true
});

console.log('方块设置结果:', setBlocks.result.value);

// 等待渲染
await new Promise(resolve => setTimeout(resolve, 1500));
```

### 检查 Canvas 渲染

```javascript
const canvasState = await Runtime.evaluate({
  expression: `(function() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'Canvas not found' };
    
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    return {
      size: { width: canvas.width, height: canvas.height },
      clientSize: { width: canvas.clientWidth, height: canvas.clientHeight },
      hasWebGL: !!gl,
      contextType: gl?.constructor.name
    };
  })()`,
  returnByValue: true
});

console.log('Canvas 状态:', canvasState.result.value);
```

## 完整测试示例

参考项目中的测试脚本：

- `test-voxelworld-final.js` - VoxelWorld 完整功能测试
- `debug-add-block.js` - Store API 调试
- `check-current-page.js` - 页面状态检查

## 常见问题

### CDP 连接失败

```
Error: connect ECONNREFUSED 127.0.0.1:9222
```

**解决**：确保 Chrome 已启动且带 `--remote-debugging-port=9222` 参数。

### 页面未加载

检查 URL 是否正确，Vite 开发服务器是否运行：

```bash
npm run dev  # 启动前端（通常是 http://localhost:5176）
node server.js  # 启动后端（http://localhost:3001）
```

### Store 未找到

```javascript
if (!window.__voxel_store) {
  console.error('Store not found. React 应用可能未加载。');
  // 等待更长时间或检查控制台错误
}
```

### 方块未渲染

可能原因：
1. Store 更新有延迟 - 增加等待时间
2. Canvas 尺寸问题 - 检查 Canvas 是否可见
3. 方块数据格式错误 - 检查 position 和 properties

## 调试技巧

### 1. 分步验证

不要一次性运行所有测试，分步验证每个环节：

```javascript
console.log('步骤 1: 检查页面加载...');
// 验证页面
console.log('✅ 页面加载成功');

console.log('步骤 2: 检查 Store...');
// 验证 store
console.log('✅ Store 可用');

console.log('步骤 3: 添加方块...');
// 添加方块
console.log('✅ 方块已添加');
```

### 2. 捕获所有日志

```javascript
const allLogs = [];

Console.messageAdded(({ message }) => {
  const log = `[${message.level}] ${message.text}`;
  allLogs.push(log);
  console.log(log);
});

// 测试结束后导出日志
const fs = await import('fs');
fs.writeFileSync('test-logs.txt', allLogs.join('\n'));
```

### 3. 错误处理

```javascript
try {
  const result = await Runtime.evaluate({
    expression: `...`,
    returnByValue: true
  });
  
  if (result.exceptionDetails) {
    console.error('JavaScript 错误:', result.exceptionDetails.exception.description);
  }
} catch (error) {
  console.error('CDP 调用失败:', error.message);
}
```

## 最佳实践

1. **始终使用 try-finally 清理连接**
   ```javascript
   try {
     // 测试代码
   } finally {
     await client.close();
   }
   ```

2. **添加足够的等待时间**
   - 页面导航后：2-3 秒
   - Store 更新后：1-1.5 秒
   - DOM 操作后：500 毫秒

3. **检查返回值**
   ```javascript
   const result = await Runtime.evaluate({...});
   if (!result.result.value) {
     console.error('评估返回 undefined，可能有错误');
   }
   ```

4. **使用 IIFE 避免变量污染**
   ```javascript
   expression: `(function() {
     // 你的代码在隔离的作用域中
     return result;
   })()`
   ```

## 相关文档

- [Chrome DevTools Protocol 官方文档](https://chromedevtools.github.io/devtools-protocol/)
- `docs/debug-panel-guide.md` - DebugPanel 使用指南
- `docs/voxelworld-test-report-2026-08-31.md` - VoxelWorld 测试报告

## 注意事项

- CDP 脚本在 Node.js 中运行，不能直接访问浏览器全局变量
- 所有与浏览器的交互必须通过 `Runtime.evaluate`
- 大型数据应该在浏览器端处理，只返回摘要
- 截图和日志会消耗磁盘空间，定期清理
