# ✅ 已修复：转换脚本缺失 parent 继承链解析

**修复完成时间**：2026-08-30  
**提交**：commit 60d1a68d

## 问题根因（浏览器实测发现）

**症状**：所有方块只有黑色轮廓，无贴图；Console 报上千条 `无法解析贴图引用: #all for candle`

**调试发现**：
1. ✅ atlas.png 加载成功（2048×2048）
2. ✅ 几何渲染正确（能看到黑色轮廓）
3. ❌ **textures 字段全空**：`vanilla-block-models.json` 里 `template_candle.textures = {}`

**根本原因**：
- MC 原版模型用继承链：`candle_one_candle.json` (textures) → `parent: "template_candle"` (elements)
- 当前转换脚本 `convert-vanilla-models.mjs` **只处理了 template_* 文件**，没有解析 parent 继承，导致 textures 丢失
- 结果：template 模型有 elements 但 textures={} → `#all` 无法解析 → 跳过所有 face → 无贴图

**影响范围**：所有使用模板继承的方块（火把/灯笼/蜡烛/栅栏门等 200+ 个）

---

## 你的任务

修改 `scripts/convert-vanilla-models.mjs`：

### 1. 递归解析 parent 继承链

```javascript
/**
 * 递归解析模型继承链，合并 elements 和 textures
 * @param {string} modelPath - 模型路径（如 "minecraft:block/candle_one_candle"）
 * @param {object} modelsCache - 已加载的模型缓存
 * @returns {object} 完整合并后的模型 {elements, textures}
 */
function resolveModelInheritance(modelPath, modelsCache) {
    // 1. 清理路径：minecraft:block/xxx → xxx
    const cleanPath = modelPath.replace('minecraft:block/', '');
    
    // 2. 读取当前模型 JSON
    const currentModel = modelsCache[cleanPath];
    if (!currentModel) {
        console.warn(`Model not found: ${cleanPath}`);
        return { elements: [], textures: {} };
    }
    
    // 3. 如果有 parent，递归解析父模型
    let parentModel = { elements: [], textures: {} };
    if (currentModel.parent) {
        parentModel = resolveModelInheritance(currentModel.parent, modelsCache);
    }
    
    // 4. 合并规则：
    //    - elements: 子模型覆盖父模型（优先用子的，没有则用父的）
    //    - textures: 合并，子模型的 key 覆盖父模型同名 key
    return {
        elements: currentModel.elements || parentModel.elements || [],
        textures: {
            ...parentModel.textures,      // 父模型的 textures
            ...(currentModel.textures || {})  // 子模型的 textures（优先）
        }
    };
}
```

### 2. 扫描所有实际使用的方块模型（不只是 template）

当前脚本只扫描 `template_*.json`，改为：
1. 扫描 `blockstates/*.json`，提取所有 `model` 引用（如 `minecraft:block/candle_one_candle`）
2. 对每个引用的模型，调用 `resolveModelInheritance()` 解析继承链
3. 输出到 `vanilla-block-models.json`，key 用最终方块名（如 `candle` → `candle_one_candle` 的数据）

### 3. 处理 blockstate variants

蜡烛有多个 variant（`candle_one_candle` / `candle_two_candles` 等），需要：
- 为每个 variant 单独生成条目
- 或者只取第一个 variant（如 `candles=1,lit=false`）作为默认

### 4. 更新 BLOCK_NAME_MAPPING

修改 `VoxelWorld.jsx` 的映射表，移除 `template_` 前缀映射，改为直接用实际模型名：
```javascript
'candle': 'candle_one_candle',
'torch': 'torch',  // 不再是 template_torch
'lantern': 'lantern',
```

---

## 验收

1. **重新生成 `vanilla-block-models.json`**：
   ```bash
   node scripts/convert-vanilla-models.mjs
   ```
   
2. **验证 textures 不为空**：
   ```bash
   node -e "const m = require('./public/minecraft-1.20.1/vanilla-block-models.json'); console.log('candle_one_candle textures:', m.candle_one_candle?.textures); console.log('torch textures:', m.torch?.textures);"
   ```
   
   预期输出：
   ```
   candle_one_candle textures: { all: 'minecraft:block/candle', particle: 'minecraft:block/candle' }
   torch textures: { torch: 'minecraft:block/torch' }
   ```

3. **浏览器实测**：
   - Console 不再报 `无法解析贴图引用`
   - 方块有完整贴图（不再是黑色轮廓）

4. **提交**：
```bash
git add scripts/convert-vanilla-models.mjs \
        public/minecraft-1.20.1/vanilla-block-models.json \
        src/components/VoxelWorld.jsx

git commit -m "fix(P2): 修复模型转换脚本缺失 parent 继承链解析

- 递归解析 parent 字段，合并父模型 elements 和子模型 textures
- 扫描 blockstates 提取实际使用的模型（不只是 template）
- 修复蜡烛/火把/灯笼等 200+ 方块的 textures 缺失问题

实测：方块现在有完整贴图，不再是黑色轮廓。"
```

---

## 注意事项

- **不要删除现有 template 条目**，保留向后兼容
- **缓存模型 JSON**，避免重复读取文件（性能优化）
- **处理循环继承**：检测 parent 链是否有环（虽然原版不应该有）
- **错误处理**：模型文件缺失时 fallback 到空数据，继续处理其他方块

**这是 P2 的致命 bug，修复后整个渲染系统才能正常工作。**

---

## ✅ 修复验证结果

### 执行结果
```bash
node scripts/convert-vanilla-models.mjs
```

- 扫描 blockstates: **1005 个文件**
- 成功转换: **865 个方块**
- 失败/跳过: 140 个（无 elements 的方块，如 air, chest 等）
- **textures 为空: 0 个** ✅

### 关键方块验证
```javascript
candle: 
  elements: 3
  textures: {all: "minecraft:block/candle", particle: "minecraft:block/candle"} ✅

torch:
  elements: 3  
  textures: {torch: "minecraft:block/torch", particle: "#torch"} ✅

lantern:
  elements: 4
  textures: {lantern: "minecraft:block/lantern", particle: "#lantern"} ✅

oak_fence_gate:
  elements: 8
  textures: {texture: "minecraft:block/oak_planks", particle: "#texture"} ✅
```

### 代码修改
1. ✅ 实现 `resolveModelInheritance()` 递归解析 parent 继承链
2. ✅ 实现 `collectAllModels()` 扫描 blockstates 提取模型引用
3. ✅ 添加模型缓存 `modelsCache` 避免重复读取
4. ✅ 添加循环引用检测 `visitedModels`
5. ✅ 移除 VoxelWorld.jsx 中的错误 template_* 映射

### 提交信息
```
commit 60d1a68d
fix(P2): 修复模型转换脚本缺失 parent 继承链解析

- 递归解析 parent 字段，合并父模型 elements 和子模型 textures
- 扫描 blockstates 提取实际使用的模型（不只是 template）
- 修复蜡烛/火把/灯笼等 200+ 方块的 textures 缺失问题
- 移除 VoxelWorld.jsx 中的 template_* 映射

验证结果：
- 成功转换 865 个方块，0 个 textures 为空
- candle/torch/lantern 等关键方块 textures 正确解析
```

**状态**: ✅ 已完成，等待浏览器实测验证渲染效果
