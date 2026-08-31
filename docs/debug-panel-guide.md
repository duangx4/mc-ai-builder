# Debug Panel 使用指南

## 概述

**Debug Panel（调试面板）** 是 MC AI Builder v2 的增强版开发者工具，提供了比原有 DevConsole 更全面的调试功能。它整合了多个调试维度，帮助 AI 和开发者更高效地诊断问题。

## 启用方式

1. 打开设置面板（齿轮图标）
2. 启用 **Debug Mode（调试模式）**
3. 界面右下角会出现两个调试按钮：
   - **橙色终端图标** - DevConsole（原有的 AI 会话日志）
   - **紫色扳手图标** - Debug Panel（新增的调试面板）

## 功能模块

### 1. Console 面板

**功能：** 拦截并显示所有浏览器 console 输出

**监控内容：**
- `console.log()` - 蓝色边框
- `console.warn()` - 黄色边框
- `console.error()` - 红色边框

**使用场景：**
- 追踪前端代码执行流程
- 查看调试输出
- 捕获运行时错误

**实时拦截：** ✅ 自动拦截，无需手动配置

---

### 2. CDP 日志面板

**功能：** Chrome DevTools Protocol 实时监控

**监控内容：**
- Console 消息（带源文件和行号）
- 网络请求（request/response/failed）
- 运行时异常（exception）
- 性能事件

**使用步骤：**

1. **启动带调试端口的 Chrome：**
   ```bash
   # Windows
   chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"
   
   # macOS
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   
   # Linux
   google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   ```

2. **连接 CDP：**
   - 在 Debug Panel 中切换到 "CDP 日志" 标签
   - 确认 Host: `localhost`，Port: `9222`
   - 点击 "连接" 按钮
   - 看到绿色 "已连接" 状态

3. **查看日志：**
   - 实时日志会自动流式显示
   - 不同类型用不同颜色区分

**使用场景：**
- AI 自动化调试（使用现有的 `browser-cdp-automation` 技能）
- 深度网络请求分析
- 捕获浏览器级别的错误

**实时拦截：** ✅ 通过 CDP 协议实时推送

---

### 3. Store 状态面板

**功能：** Zustand 全局状态查看器

**显示内容：**
- 所有 Zustand store 的数据（过滤掉函数）
- 数据类型标注
- 数组/对象长度预览
- 可展开/折叠查看详细 JSON

**使用场景：**
- 检查状态是否正确更新
- 排查状态同步问题
- 验证 AI 生成数据

**实时更新：** ✅ 随 Zustand store 变化自动更新

---

### 4. 性能面板

**功能：** 运行时性能监控

**监控指标：**
- **FPS** - 帧率（目标 60fps）
- **内存使用** - JS 堆内存（MB）
- **渲染调用** - Three.js draw calls
- **三角形数** - 渲染的几何体数量

**使用场景：**
- 性能瓶颈诊断
- 内存泄漏检测
- 渲染优化

**实时更新：** ✅ 每秒刷新一次

**注意：** 需要集成 Three.js renderer 的 `renderer.info` 来获取完整数据。

---

### 5. 网络面板

**功能：** 拦截 fetch 请求

**显示内容：**
- 请求方法（GET/POST/etc）
- 请求 URL
- 状态码（200/404/500/etc）
- 请求耗时（ms）
- 错误信息（如果失败）

**颜色标识：**
- 绿色 - 成功（2xx）
- 黄色 - 客户端错误（4xx）
- 红色 - 网络错误或服务器错误（5xx）

**使用场景：**
- API 调用追踪
- 网络性能分析
- 错误排查

**实时拦截：** ✅ 拦截 window.fetch

---

### 6. AI 会话面板

**功能：** AI 对话历史查看

**显示内容：**
- 用户消息（青色边框）
- AI 响应（绿色边框）
- 变体数量
- 消息内容预览（前 200 字符）

**使用场景：**
- 快速浏览对话历史
- 检查 AI 响应质量
- 验证变体生成

**实时更新：** ✅ 随聊天进行自动更新

---

## 通用功能

### 导出调试数据

点击右上角 **下载图标** 可导出完整调试数据为 JSON 文件，包含：
- 所有 Console 日志
- 所有 CDP 日志
- 网络请求历史
- 性能指标快照
- Store 状态摘要
- 时间戳

**用途：** 
- 离线分析
- Bug 报告附件
- AI 诊断输入

### 清空日志

点击右上角 **垃圾桶图标** 可清空所有日志（Store 和性能数据不会清空）。

### 窗口操作

- **拖动：** 点击标题栏拖动窗口
- **调整大小：** 拖动边缘或角落
- **最小宽度：** 400px
- **最小高度：** 300px

---

## AI 使用场景

### 场景 1：VoxelWorld 渲染问题诊断

1. 打开 Debug Panel → Console 面板
2. 尝试触发渲染错误
3. 查看 Console 中的错误堆栈
4. 切换到 Store 面板，检查 `blocks` 数据是否正确
5. 导出调试数据，提供给 AI 分析

### 场景 2：AI 生成代码执行追踪

1. 打开 Debug Panel → AI 会话面板
2. 查看生成的代码内容
3. 切换到 Console 面板，监控代码执行日志
4. 如果有错误，查看 Network 面板检查 API 调用

### 场景 3：CDP 自动化监控

1. 启动带调试端口的 Chrome
2. 打开 Debug Panel → CDP 日志面板
3. 连接到 CDP
4. AI 使用 `browser-cdp-automation` 技能执行自动化脚本
5. 实时查看 CDP 日志流

### 场景 4：性能优化

1. 打开 Debug Panel → 性能面板
2. 生成大型建筑（如 100x100x100）
3. 观察 FPS 下降和内存增长
4. 切换到 Store 面板，检查 `blocks.length`
5. 优化渲染策略（LOD、实例化等）

---

## 技术细节

### 架构

```
DebugPanel.jsx (主组件)
├── ConsolePanel     - 拦截 console 方法
├── CDPPanel         - 连接 cdpMonitor.js
├── StorePanel       - 读取 useStore()
├── PerformancePanel - 读取 performance.memory
├── NetworkPanel     - 拦截 window.fetch
└── AIPanel          - 读取 useStore().messages
```

### CDP 连接流程

```javascript
// cdpMonitor.js
import CDP from 'chrome-remote-interface';

const client = await CDP({ host: 'localhost', port: 9222 });
const { Console, Network, Performance, Runtime } = client;

await Console.enable();
await Network.enable();
await Performance.enable();
await Runtime.enable();

Console.messageAdded((params) => {
  // 推送日志到 DebugPanel
});
```

### 拦截实现

**Console 拦截：**
```javascript
const originalLog = console.log;
console.log = (...args) => {
  originalLog(...args);  // 保留原功能
  setConsoleLogs(prev => [...prev, { type: 'log', content: args.join(' ') }]);
};
```

**Fetch 拦截：**
```javascript
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const startTime = Date.now();
  const response = await originalFetch(...args);
  const duration = Date.now() - startTime;
  setNetworkLogs(prev => [...prev, { url, status, duration }]);
  return response;
};
```

---

## 已知限制

1. **CDP 连接：** 需要手动启动带调试端口的 Chrome，无法自动启动
2. **性能监控：** `renderer.info` 需要进一步集成才能显示完整的 Three.js 统计
3. **内存监控：** 仅支持 Chrome（`performance.memory` API）
4. **日志持久化：** 关闭面板后日志会丢失（可导出保存）

---

## 与 DevConsole 的区别

| 功能 | DevConsole | Debug Panel |
|------|-----------|-------------|
| AI 会话日志 | ✅ 完整（含工具调用） | ✅ 简化版 |
| Console 日志 | ❌ | ✅ |
| CDP 实时监控 | ❌ | ✅ |
| Store 状态查看 | ❌ | ✅ |
| 性能监控 | ❌ | ✅ |
| 网络请求 | ❌ | ✅ |
| 窗口拖动/调整 | ✅ | ✅ |
| 导出功能 | 复制文本 | JSON 导出 |

**建议：**
- **DevConsole** - 用于查看详细的 AI 对话历史和工具调用
- **Debug Panel** - 用于系统级调试、性能监控、CDP 自动化

---

## 未来增强

- [ ] Three.js 渲染统计集成（renderer.info）
- [ ] 实时 FPS 计算（requestAnimationFrame）
- [ ] 日志持久化（IndexedDB）
- [ ] 日志过滤和搜索
- [ ] CDP 截图功能集成
- [ ] CDP 性能分析（getMetrics）
- [ ] WebSocket 监控
- [ ] LocalStorage/SessionStorage 查看器

---

## 相关文件

- **组件：** `src/components/DebugPanel.jsx`
- **工具：** `src/utils/cdpMonitor.js`
- **集成：** `src/App.jsx`（第 25、318、3630-3635 行）
- **CDP 技能：** `src/skills/official/browser-cdp-automation/`

---

## 问题排查

### CDP 连接失败

**问题：** 点击"连接"后显示连接错误

**解决：**
1. 确认 Chrome 已启动，且使用了 `--remote-debugging-port=9222` 参数
2. 检查端口是否被占用：`netstat -an | grep 9222`
3. 确认防火墙没有阻止 9222 端口
4. 尝试访问 `http://localhost:9222/json` 查看 CDP 目标列表

### Console 日志不显示

**问题：** Console 面板为空

**解决：**
1. 确认 Debug Panel 已打开（拦截仅在打开时生效）
2. 在浏览器控制台手动执行 `console.log('test')` 测试
3. 检查是否有其他脚本覆盖了 console 方法

### 性能指标为 0

**问题：** 性能面板显示 FPS、渲染调用为 0

**解决：**
- 这是预期行为，需要集成 Three.js 的 `renderer.info` 才能显示数据
- FPS 计算需要实现 requestAnimationFrame 循环

---

**版本：** v2.0  
**更新日期：** 2026-08-31  
**作者：** Claude Code + duangx4
