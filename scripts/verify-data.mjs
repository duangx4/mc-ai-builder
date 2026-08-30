#!/usr/bin/env node
/**
 * 数据验证脚本 - 验证分类和模型数据完整性
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLASSIFICATION_PATH = path.join(__dirname, '..', 'public', 'minecraft-1.20.1', 'blocks-classification.json');
const MODELS_PATH = path.join(__dirname, '..', 'public', 'minecraft-1.20.1', 'vanilla-block-models.json');

console.log('🔍 验证数据文件...\n');

// 1. 验证分类文件
console.log('📦 检查分类文件...');
const classification = JSON.parse(fs.readFileSync(CLASSIFICATION_PATH, 'utf-8'));
console.log(`  ✓ fullBlock: ${classification.fullBlock.length} 个`);
console.log(`  ✓ simpleShape: ${classification.simpleShape.length} 个`);
console.log(`  ✓ multiElement: ${classification.multiElement.length} 个`);
console.log(`  ✓ rotation: ${classification.rotation.length} 个`);
console.log(`  ✓ blockEntity: ${classification.blockEntity.length} 个`);
console.log(`  ✓ multipart: ${classification.multipart.length} 个`);

// 2. 验证模型文件
console.log('\n📦 检查模型文件...');
const models = JSON.parse(fs.readFileSync(MODELS_PATH, 'utf-8'));
console.log(`  ✓ 包含 ${Object.keys(models).length} 个模型定义`);

// 3. 验证关键模型存在
console.log('\n📦 验证关键模型...');
const keyModels = [
    { name: 'chain', desc: '锁链' },
    { name: 'template_torch', desc: '火把' },
    { name: 'template_lantern', desc: '灯笼' },
    { name: 'brewing_stand', desc: '酿造台（部分）' },
    { name: 'lantern', desc: '灯笼（可能）' }
];

keyModels.forEach(({ name, desc }) => {
    if (models[name]) {
        const elemCount = models[name].elements?.length || 0;
        console.log(`  ✓ ${desc} (${name}): ${elemCount} 个元素`);
    } else {
        console.log(`  ⚠️  ${desc} (${name}): 未找到`);
    }
});

// 4. 验证火把结构（应为 3 个元素，主杆高度 0.625）
console.log('\n📦 验证火把结构...');
const torch = models.template_torch;
if (torch && torch.elements) {
    console.log(`  ✓ 火把有 ${torch.elements.length} 个元素（预期: 3）`);
    const mainPole = torch.elements[0];
    if (mainPole) {
        const height = mainPole.to[1] - mainPole.from[1];
        console.log(`  ✓ 主杆高度: ${height.toFixed(4)} (预期: 0.625)`);
        if (Math.abs(height - 0.625) < 0.001) {
            console.log(`  ✅ 火把高度正确！`);
        } else {
            console.log(`  ❌ 火把高度不正确！`);
        }
    }
}

// 5. 验证灯笼结构（应为 4 个元素，包含两个 45° 旋转元素）
console.log('\n📦 验证灯笼结构...');
const lantern = models.template_lantern;
if (lantern && lantern.elements) {
    console.log(`  ✓ 灯笼有 ${lantern.elements.length} 个元素（预期: 4）`);
    const rotatedElements = lantern.elements.filter(e => e.rotation);
    console.log(`  ✓ 带旋转的元素: ${rotatedElements.length} 个（预期: 2）`);
    if (rotatedElements.length === 2) {
        console.log(`  ✅ 灯笼提环结构正确！`);
    } else {
        console.log(`  ❌ 灯笼提环结构不完整！`);
    }
}

// 6. 验证栅栏门结构（应为 8 个元素）
console.log('\n📦 验证栅栏门结构...');
const fenceGate = models.template_fence_gate_open || models.template_fence_gate;
if (fenceGate && fenceGate.elements) {
    console.log(`  ✓ 栅栏门有 ${fenceGate.elements.length} 个元素（预期: 8）`);
    if (fenceGate.elements.length === 8) {
        console.log(`  ✅ 栅栏门镂空结构正确！`);
    } else {
        console.log(`  ⚠️  栅栏门元素数量不符！`);
    }
}

// 7. 验证锁链结构（应有旋转元素）
console.log('\n📦 验证锁链结构...');
const chain = models.chain;
if (chain && chain.elements) {
    console.log(`  ✓ 锁链有 ${chain.elements.length} 个元素`);
    const rotatedElements = chain.elements.filter(e => e.rotation);
    console.log(`  ✓ 带旋转的元素: ${rotatedElements.length} 个`);
    if (rotatedElements.length > 0) {
        const rotation = rotatedElements[0].rotation;
        console.log(`  ✓ 旋转角度: ${rotation.angle}° (轴: ${rotation.axis})`);
        console.log(`  ✅ 锁链旋转结构正确！`);
    }
}

console.log('\n✅ 数据验证完成！');
console.log('\n💡 建议：打开浏览器 http://localhost:5175 进行实际渲染测试');
console.log('   提示词示例: "在 (0,0,0) 放一根锁链，在 (2,0,0) 放一个灯笼，在 (4,0,0) 放一个火把"');
