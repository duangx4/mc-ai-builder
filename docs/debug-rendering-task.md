# MC AI Builder 渲染问题调试任务书

## 📋 任务背景

MC AI Builder 项目经过三轮修复（parent 继承链、blocks-classification、atlasMaterial），数据层正常但 **3D 场景不显示方块**。

**当前状态**：
- ✅ Atlas 加载成功（928 张贴图）
- ✅ AI 生成代码成功
- ✅ 数据层有 155 个方块
- ❌ **3D 场景空白**（只有蓝色网格地面）
- ⚠️ 新生成的代码执行后显示 `Code executed but no blocks were placed.`

---

## 🎯 你的任务

**定位并修复 3D 渲染层问题**，让方块正确显示在场景中。

---

## 🔧 可用工具

你现在拥有完整的浏览器 CDP 自动化技能包（`browser-cdp-skill/`），包含：

### 1. 启动 CDP 浏览器
```bash
cd C:\Users\21972\OneDrive\Desktop\MC\mc-ai-builder-v2\browser-cdp-skill
powershell .\tools\cdp-start.ps1 -Url http://localhost:5177
```

### 2. 检查渲染状态
```bash
# 快速检查方块数量和 Canvas 状态
node tools\check-render.cjs

# 深度检查 Three.js 场景、VanillaBlockTypes、分类文件
node tools\check-render-state.cjs
```

### 3. 截图并 AI 分析
```bash
# 截图 + 多模态模型读图（lantian gpt-5.6-terra）
node tools\cdp-read-image.js "描述页面状态：输入框、3D 场景、报错信息"
```

### 4. 自动化测试
```bash
# 填入提示词 → 点击生成 → 等待 → 验证 → 截图
node tools\test-generate.cjs
```

### 5. 列出页面元素
```bash
node tools\list-buttons.cjs
```

---

## 🔍 已知线索

### 线索 1：数据层 vs 渲染层分离
- **数据层正常**：`window.__voxel_store.getState().blocks` 有 155 个方块
- **渲染层失败**：Canvas 不显示任何方块
- **可能原因**：VoxelWorld.jsx 的渲染逻辑没触发，或者方块被错误过滤

### 线索 2：新生成代码无效
用户重新生成场景（龙蛋展览区）时，Console 显示：
```
[Voxel Diff] Add: 0, Remove: 0, Update: 0, Unchanged: 155
⚠️ Code executed but no blocks were placed.
```
说明 `builder.set()` 执行失败，但原因不明。

### 线索 3：blocks-classification.json 可能未生效
虽然 claude 已更新 `blocks-classification.json`（包含 torch/candle/stonecutter 等），但浏览器访问时返回 HTML（404），说明 dev server 没正确加载。

**重启 dev server 后端口变为 5177**（5173-5176 被占用）。

### 线索 4：Atlas 重复加载 22 次
Console 显示 `✅ Atlas 加载成功: 928 张贴图` 重复 22 次，可能是热重载导致的，也可能暴露组件重复渲染问题。

---

## 📝 调试步骤建议

### 第一步：确认当前状态
1. 启动 CDP：`powershell .\tools\cdp-start.ps1 -Url http://localhost:5177`
2. 截图并分析：`node tools\cdp-read-image.js "页面是否正常？3D 场景有方块吗？"`
3. 检查渲染状态：`node tools\check-render-state.cjs`

**预期输出**：
- 方块数量（应该是 155 或 0）
- Canvas 是否存在
- vanillaBlockTypes 是否加载成功
- blocks-classification.json 是否正确返回 JSON

### 第二步：定位渲染失败原因

**可能性 A：VanillaBlockTypes 未加载**
- 检查 `blocks-classification.json` 是否返回 JSON（不是 HTML）
- 确认 `candle/torch/stonecutter` 是否在 `multiElement` 列表里

**可能性 B：方块被错误过滤**
- 检查 `VoxelWorld.jsx` 的分组逻辑（`vanillaBlocks` vs `texturedBlocks`）
- 确认 155 个方块的 type（在 Console 运行 `window.__voxel_store.getState().blocks.slice(0, 10).map(b => b.type)`）

**可能性 C：Three.js 场景未初始化**
- 检查 Canvas 的 WebGL context 是否创建成功
- 确认 `VoxelWorld.jsx` 是否被正确渲染（React DevTools）

**可能性 D：builder.set() 失败**
- 检查 `useStore.js` 的 `builder.set()` 实现
- 确认方块类型验证逻辑（是否拒绝了 stonecutter/grindstone 等）

### 第三步：修复并验证
1. 根据定位结果修复代码
2. 刷新页面（或热重载）
3. 重新生成场景：`node tools\test-generate.cjs`
4. 截图验证：`node tools\cdp-read-image.js "方块现在显示了吗？"`

---

## 📊 关键文件位置

```
C:\Users\21972\OneDrive\Desktop\MC\mc-ai-builder-v2\
├── src/
│   ├── components/VoxelWorld.jsx          # 主渲染逻辑（分组、渲染器选择）
│   ├── utils/atlasMaterial.js              # Atlas UV 映射（已修复）
│   └── hooks/useStore.js                   # 状态管理（builder.set 实现）
├── public/minecraft-1.20.1/
│   ├── vanilla-block-models.json           # 方块几何数据（865 个，已修复 parent 继承）
│   └── blocks-classification.json          # 方块分类（已更新，但可能未生效）
└── browser-cdp-skill/                      # CDP 自动化技能包（你的工具箱）
    ├── tools/
    │   ├── cdp-start.ps1                   # 启动浏览器
    │   ├── check-render.cjs                # 快速检查
    │   ├── check-render-state.cjs          # 深度检查
    │   ├── cdp-read-image.js               # 截图 + AI 分析
    │   └── test-generate.cjs               # 自动化测试
    └── USAGE.md                            # 详细使用说明
```

---

## ✅ 验收标准

1. **数据层验证**：
   - `window.__voxel_store.getState().blocks.length > 0`
   - 方块类型包含 torch/candle/stonecutter 等

2. **渲染层验证**：
   - 截图显示 3D 场景有可见方块（不是空白网格）
   - 方块有完整贴图（不是黑色轮廓或透明）
   - Console 无报错

3. **新生成验证**：
   - 输入新提示词生成场景
   - `[Voxel Diff] Add: N` 显示新增方块数
   - 截图确认新方块显示

---

## 🚨 注意事项

1. **dev server 端口**：当前是 5177（5173-5176 被占用）
2. **多模态读图 key**：已修复为 `gpt-5.6-terra`（luna provider）
3. **CDP 浏览器**：使用独立 user-data-dir，不影响用户正常浏览
4. **修改代码后**：dev server 会自动热重载，无需手动刷新
5. **git 提交**：每个修复都提交一次，方便回滚

---

## 📞 求助方式

遇到问题时：
1. **优先用 CDP 工具自己调查**（截图 + 检查状态）
2. **Console 日志完整复制**（别截图，要文本）
3. **描述具体现象**（"没显示"不够，要说"Canvas 存在但黑屏"或"Canvas 不存在"）
4. **已尝试的方法**（避免重复建议）

---

## 🎯 最终目标

**用户在浏览器里输入提示词 → 生成场景 → 3D 场景显示完整的、有贴图的方块**。

现在开始吧！祝调试顺利 🚀
