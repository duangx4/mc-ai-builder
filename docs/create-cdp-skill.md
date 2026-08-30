# 任务：给 Claude Code 创建浏览器 CDP 控制技能

## 背景

用户要直接用 Claude Code 调试 MC AI Builder 项目，不再经过 OpenClaw。需要让 Claude 能：
1. 启动 CDP 连接的 Edge 浏览器
2. 导航到指定 URL
3. 执行 JavaScript 读取页面状态
4. 截图并读取图片内容（需要多模态模型）
5. 自动化测试（填表单、点击按钮、等待、验证）

## 你的任务

在 `C:\Users\21972\OneDrive\Desktop\MC\mc-ai-builder-v2\` 创建 **browser-cdp-skill** 目录，包含：

### 1. 技能说明 `SKILL.md`

简要说明：
- 这是什么技能（浏览器 CDP 自动化）
- 何时使用（调试 Web 应用、UI 测试、截图分析）
- 依赖（chrome-remote-interface、Edge CDP、多模态模型）

### 2. CDP 工具脚本 `tools/`

从 `C:\Users\21972\.openclaw\workspace-agent-401e4ca1\` 复制并整理：
- `cdp-helper.mjs` → 基础 CDP 连接和 eval
- `check-render.cjs` → 检查方块数据和渲染状态
- `list-buttons.cjs` → 列出页面按钮
- `test-generate.cjs` → 自动化生成测试
- `check-render-state.cjs` → 深度渲染状态检查

新增：
- `cdp-start.ps1` — 启动 Edge CDP（端口 9222，指定 user-data-dir 和初始 URL）
- `cdp-screenshot.js` — Node.js 截图（不依赖 PowerShell）
- `cdp-read-image.js` — 截图 + 调多模态模型读图（集成 lantian/gpt-5.6-terra）

### 3. 使用文档 `USAGE.md`

包含：
- 启动 CDP：`powershell tools/cdp-start.ps1 -Url http://localhost:5177`
- 检查状态：`node tools/check-render.cjs`
- 截图并读图：`node tools/cdp-read-image.js "描述页面状态"`
- 自动化测试：`node tools/test-generate.cjs`

### 4. 配置文件 `.cdp-config.json`

```json
{
  "edgePath": "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "userDataDir": "C:\\Users\\21972\\.openclaw\\workspace-agent-401e4ca1\\edge-cdp-profile",
  "cdpPort": 9222,
  "defaultUrl": "http://localhost:5177",
  "multimodalModel": {
    "provider": "luna",
    "model": "gpt-5.6-terra",
    "baseUrl": "https://platform.lantian.pro/v1",
    "apiKeyPath": "C:/Users/21972/.openclaw/agents/agent-401e4ca1/agent/models.json"
  }
}
```

### 5. 依赖安装脚本 `install.ps1`

```powershell
npm install chrome-remote-interface --save-dev
Write-Host "✅ CDP 技能依赖已安装"
```

## 验收

1. **技能完整性**：
   - 所有脚本可独立运行（不依赖 OpenClaw workspace）
   - `SKILL.md` + `USAGE.md` 清晰易懂
   - `.cdp-config.json` 路径正确

2. **功能测试**：
   ```bash
   cd C:\Users\21972\OneDrive\Desktop\MC\mc-ai-builder-v2\browser-cdp-skill
   powershell .\install.ps1
   powershell .\tools\cdp-start.ps1 -Url http://localhost:5177
   node tools\check-render.cjs
   node tools\cdp-read-image.js "页面是否正常显示？有没有方块？"
   ```

3. **提交**：
```bash
cd C:\Users\21972\OneDrive\Desktop\MC\mc-ai-builder-v2
git add browser-cdp-skill/
git commit -m "feat: 添加浏览器 CDP 自动化技能

- 启动 Edge CDP 连接
- 页面状态检查（方块数量、Canvas、分类文件）
- 截图 + 多模态读图（lantian gpt-5.6-terra）
- 自动化测试（填表单、点击、验证）

用法：cd browser-cdp-skill && node tools/cdp-read-image.js '描述页面'"
```

## 注意事项

- **所有路径用绝对路径**（Claude 可能在不同 cwd 运行）
- **PowerShell 脚本用 UTF-8 BOM**（中文兼容）
- **错误处理**：CDP 未启动时友好提示"请先运行 cdp-start.ps1"
- **多模态 key 读取**：从 models.json 动态读，不硬编码
- **截图压缩**：大图转 JPEG 80% 质量再发 API（省 token）

完成后，用户可以直接在 Claude Code 里说："启动 CDP，截图并分析页面"。
