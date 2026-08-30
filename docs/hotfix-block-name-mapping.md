# 紧急修复任务：方块名映射缺失导致火把/灯笼无法渲染

## 问题根因

**调试发现**：`vanilla-block-models.json` 里的 key 是 **`template_torch`** / **`template_lantern`**（模板名），但场景里方块的 `type` 是 **`torch`** / **`lantern`**（简化名）→ 名字对不上 → `VanillaMultiElementBlocks` 读不到模型数据 → 返回 null → 不渲染。

**影响范围**：所有使用模板（template_*）的方块都有这个问题。

---

## 修复方案

在 `src/components/VoxelWorld.jsx` 的 `VanillaMultiElementBlocks` 组件里：

### 1. 添加名字映射表（放在组件函数开头）

```javascript
function VanillaMultiElementBlocks({ blocks, blockType, onBlockClick, version = '1.20.1' }) {
    // 方块简化名 → 模板名映射表
    const BLOCK_NAME_MAPPING = {
        // 火把系列
        'torch': 'template_torch',
        'wall_torch': 'template_torch_wall',
        'soul_torch': 'template_torch',
        'soul_wall_torch': 'template_torch_wall',
        'redstone_torch': 'template_torch',
        'redstone_wall_torch': 'template_torch_wall',
        
        // 灯笼系列
        'lantern': 'template_lantern',
        'soul_lantern': 'template_lantern',
        
        // 栅栏门系列
        'oak_fence_gate': 'template_fence_gate',
        'spruce_fence_gate': 'template_fence_gate',
        'birch_fence_gate': 'template_fence_gate',
        'jungle_fence_gate': 'template_fence_gate',
        'acacia_fence_gate': 'template_fence_gate',
        'dark_oak_fence_gate': 'template_fence_gate',
        'mangrove_fence_gate': 'template_fence_gate',
        'cherry_fence_gate': 'template_fence_gate',
        'bamboo_fence_gate': 'template_fence_gate',
        'crimson_fence_gate': 'template_fence_gate',
        'warped_fence_gate': 'template_fence_gate',
        
        // 蜡烛系列
        'candle': 'template_candle',
        'white_candle': 'template_candle',
        'orange_candle': 'template_candle',
        'magenta_candle': 'template_candle',
        'light_blue_candle': 'template_candle',
        'yellow_candle': 'template_candle',
        'lime_candle': 'template_candle',
        'pink_candle': 'template_candle',
        'gray_candle': 'template_candle',
        'light_gray_candle': 'template_candle',
        'cyan_candle': 'template_candle',
        'purple_candle': 'template_candle',
        'blue_candle': 'template_candle',
        'brown_candle': 'template_candle',
        'green_candle': 'template_candle',
        'red_candle': 'template_candle',
        'black_candle': 'template_candle',
    };
    
    const [modelData, setModelData] = useState(null);
    // ... 其他 state
```

### 2. 修改模型加载逻辑（找到 fetch vanilla-block-models.json 的地方）

```javascript
// 加载模型定义
useEffect(() => {
    // 应用名字映射
    const modelKey = BLOCK_NAME_MAPPING[blockType] || blockType;
    
    fetch(`/minecraft-${version}/vanilla-block-models.json`)
        .then(r => r.json())
        .then(data => {
            const model = data[modelKey];
            if (!model) {
                console.warn(`Model not found for ${blockType} (tried ${modelKey})`);
                setModelData(null);
                return;
            }
            setModelData(model);
        })
        .catch(err => {
            console.error(`Failed to load model for ${blockType}:`, err);
            setModelData(null);
        });
}, [blockType, version]);
```

---

## 验收

1. **npm test**：确保没有破坏现有功能
2. **浏览器实测**：输入测试提示词，确认：
   - ✅ 火把/灯笼有完整贴图（不是白模）
   - ✅ 切石机能看到锯片纹理
   - ✅ 铁栏杆正常渲染

3. **提交**：
```bash
git add src/components/VoxelWorld.jsx
git commit -m "fix: 修复方块名映射缺失导致 template_* 方块无法渲染

- 添加 BLOCK_NAME_MAPPING 表（torch→template_torch、lantern→template_lantern 等）
- 修复火把/灯笼/蜡烛/栅栏门等使用模板的方块渲染问题
- 实测：火把/灯笼现在有完整贴图"
```

---

## 紧急程度

🔴 **高优先级**：这是 P2 渲染系统的致命 bug，修复后立即可见效果。
