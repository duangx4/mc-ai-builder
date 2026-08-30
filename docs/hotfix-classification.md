# 紧急修复：blocks-classification.json 缺失实际方块名

## 问题根因（浏览器实测 + 代码追踪）

**症状**：方块还是透明，atlas 系统修好了但没用上

**追踪链路**：
1. 主渲染逻辑从 `blocks-classification.json` 加载 `vanillaBlockTypes`
2. `vanillaBlockTypes` 只有 `template_torch`，没有 `torch` / `candle` 等实际方块名
3. `torch` / `candle` 不在 `vanillaBlockTypes` 里 → 不走 `VanillaMultiElementBlocks`
4. 被 `isComposite` 标记劫持 → 走旧的 `TorchLanternInstancedBlocks` → 无 atlas 支持 → 透明

**根本原因**：`blocks-classification.json` 是旧数据，只有 template 名，没更新为实际方块名

---

## 你的任务

**方案 A（快速）**：手动补全 `blocks-classification.json`

在 `multiElement` 数组里加上所有实际方块名（从 `vanilla-block-models.json` 的 keys）：

```json
{
  "multiElement": [
    "template_torch",
    "torch",
    "wall_torch",
    "soul_torch",
    "soul_wall_torch",
    "redstone_torch",
    "redstone_wall_torch",
    "lantern",
    "soul_lantern",
    "candle",
    "white_candle",
    "black_candle",
    "red_candle",
    "blue_candle",
    "... 所有颜色的蜡烛 ...",
    "chain",
    "iron_bars",
    "stonecutter",
    "brewing_stand",
    "... 其他 multiElement 方块 ..."
  ],
  "rotation": [...],
  "simpleShape": [...]
}
```

**方案 B（正确）**：改转换脚本自动生成完整分类

修改 `convert-vanilla-models.mjs`，输出时同步更新 `blocks-classification.json`：
- `multiElement`: 所有有 2+ elements 的方块
- `rotation`: 所有有 rotation 的方块
- `simpleShape`: 其他方块

---

## 验收

1. **验证分类文件**：
   ```bash
   node -e "const cls = require('./public/minecraft-1.20.1/blocks-classification.json'); console.log('torch 在 multiElement:', cls.multiElement.includes('torch')); console.log('candle 在 multiElement:', cls.multiElement.includes('candle'));"
   ```
   
   预期输出：
   ```
   torch 在 multiElement: true
   candle 在 multiElement: true
   ```

2. **浏览器实测**：
   - 刷新页面
   - 重新生成场景
   - 方块有完整贴图（不再透明）

3. **提交**：
```bash
git add public/minecraft-1.20.1/blocks-classification.json
git commit -m "fix: 更新 blocks-classification 包含实际方块名

- 添加 torch/candle 等实际方块名到 multiElement 列表
- 修复方块被错误路由到旧渲染器导致无贴图的问题

实测：方块现在正确走 VanillaMultiElementBlocks，有完整 atlas 贴图。"
```

---

## 注意

- **优先用方案 A（手动补全）**，5 分钟搞定；方案 B 需要改脚本，耗时更长
- 补全时参考 `vanilla-block-models.json` 的 keys（`node -e "console.log(Object.keys(require('./public/minecraft-1.20.1/vanilla-block-models.json')).join('\n'))" | grep -E 'torch|candle|chain|lantern'`）
- 所有颜色的蜡烛都要加（`candle`, `white_candle`, `black_candle`, ...）
- 确认 `isComposite` 标记不影响路由（或者直接删掉 `BLOCK_SHAPES` 里 torch/candle 的 `isComposite: true`）

**这是最后一个拦路虎，修复后整个 P2 渲染系统就能正常工作了。**
