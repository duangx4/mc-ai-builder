// 修复：方块名映射（简化名 → 模板名）
// 放在 VanillaMultiElementBlocks 组件开头

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
    'hanging_lantern': 'template_hanging_lantern',
    
    // 其他可能需要映射的
    // 'oak_fence_gate': 'template_fence_gate',
    // ...
};

// 在加载模型数据时使用映射
const modelKey = BLOCK_NAME_MAPPING[blockType] || blockType;
fetch(\`/minecraft-\${version}/vanilla-block-models.json\`)
    .then(r => r.json())
    .then(data => {
        const model = data[modelKey];
        if (!model) {
            console.warn(\`Model not found for \${blockType} (tried \${modelKey})\`);
        }
        setModelData(model);
    });
