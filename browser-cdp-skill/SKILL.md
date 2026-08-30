# 浏览器 CDP 自动化技能

## 这是什么

一套完整的浏览器自动化工具，基于 Chrome DevTools Protocol (CDP)，让 Claude 能够：
- 启动并控制 Edge 浏览器
- 执行 JavaScript 读取页面状态
- 截图并分析图片内容（多模态）
- 自动化测试（表单填写、点击、验证）

## 何时使用

- **Web 应用调试**：检查 Three.js 渲染状态、DOM 结构、控制台错误
- **UI 自动化测试**：填表单、点按钮、验证结果
- **视觉分析**：截图后用多模态模型分析页面是否正常显示
- **数据提取**：从运行中的页面提取 JavaScript 变量、状态

## 依赖

- **chrome-remote-interface**：Node.js CDP 客户端
- **Edge 浏览器**：已安装在 `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
- **多模态模型**：lantian/gpt-5.6-terra（用于图片分析）

## 技能结构

```
browser-cdp-skill/
├── SKILL.md              # 本文件
├── USAGE.md              # 使用文档
├── .cdp-config.json      # 配置文件
├── install.ps1           # 依赖安装脚本
└── tools/
    ├── cdp-start.ps1            # 启动 Edge CDP
    ├── cdp-helper.mjs           # 基础 CDP 连接和 eval
    ├── cdp-screenshot.js        # 截图工具
    ├── cdp-read-image.js        # 截图 + 多模态读图
    ├── check-render.cjs         # 检查方块渲染状态
    ├── check-render-state.cjs   # 深度渲染状态检查
    ├── list-buttons.cjs         # 列出页面按钮
    └── test-generate.cjs        # 自动化生成测试
```

## 快速开始

```bash
# 1. 安装依赖
cd browser-cdp-skill
powershell .\install.ps1

# 2. 启动 CDP 浏览器
powershell .\tools\cdp-start.ps1 -Url http://localhost:5177

# 3. 检查页面状态
node tools\check-render.cjs

# 4. 截图并分析
node tools\cdp-read-image.js "页面是否正常显示？有没有方块？"
```

## 注意事项

- 所有脚本使用绝对路径，可在任何 cwd 运行
- CDP 端口默认 9222，可在配置文件中修改
- 多模态 API key 从 `models.json` 动态读取，不硬编码
- 截图自动压缩为 JPEG 80% 质量以节省 token
