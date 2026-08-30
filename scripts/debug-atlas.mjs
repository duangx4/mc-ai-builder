// 调试脚本：检查 Atlas + UV 映射是否正确
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// 1. 检查 atlas.png 是否存在且有效
const atlasPath = path.join(projectRoot, 'public/minecraft-1.20.1/atlas.png');
const atlasExists = fs.existsSync(atlasPath);
const atlasSize = atlasExists ? fs.statSync(atlasPath).size : 0;

console.log('=== 1. Atlas 文件检查 ===');
console.log('atlas.png 存在:', atlasExists);
console.log('atlas.png 大小:', (atlasSize / 1024).toFixed(2), 'KB');
console.log(atlasSize > 100000 ? '✅ 文件大小正常' : '❌ 文件可能损坏');

// 2. 检查 atlas-uv-map.json
const uvMapPath = path.join(projectRoot, 'public/minecraft-1.20.1/atlas-uv-map.json');
const uvMap = JSON.parse(fs.readFileSync(uvMapPath, 'utf8'));

console.log('\n=== 2. UV Map 数据检查 ===');
console.log('Atlas 尺寸:', uvMap.atlasSize);
console.log('贴图总数:', Object.keys(uvMap.textures).length);

// 3. 检查关键方块的贴图引用
const modelsPath = path.join(projectRoot, 'public/minecraft-1.20.1/vanilla-block-models.json');
const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));

console.log('\n=== 3. 关键方块模型检查 ===');

const testBlocks = ['torch', 'lantern', 'stonecutter', 'iron_bars_post', 'chain'];

testBlocks.forEach(blockType => {
    const model = models[blockType];
    if (!model) {
        console.log(`❌ ${blockType}: 模型不存在`);
        return;
    }
    
    console.log(`\n${blockType}:`);
    console.log('  - elements 数量:', model.elements?.length || 0);
    console.log('  - textures 定义:', JSON.stringify(model.textures));
    
    // 检查第一个 element 的第一个 face
    if (model.elements && model.elements[0]) {
        const firstElement = model.elements[0];
        const faces = firstElement.faces || {};
        const faceNames = Object.keys(faces);
        
        if (faceNames.length > 0) {
            const firstFace = faces[faceNames[0]];
            console.log(`  - 第一个面(${faceNames[0]}):`);
            console.log('    texture:', firstFace.texture);
            console.log('    uv:', firstFace.uv || '[默认 0,0,16,16]');
            
            // 解析贴图引用
            let texPath = firstFace.texture;
            if (texPath && texPath.startsWith('#')) {
                const key = texPath.slice(1);
                texPath = model.textures?.[key] || texPath;
            }
            
            // 检查在 atlas 里是否存在
            const inAtlas = !!uvMap.textures[texPath];
            console.log(`    解析后: ${texPath} ${inAtlas ? '✅' : '❌ 不在 atlas 里'}`);
            
            if (inAtlas) {
                const atlasUV = uvMap.textures[texPath];
                console.log('    atlas UV:', atlasUV.uv);
            }
        }
    }
});

// 4. UV 映射公式验证
console.log('\n=== 4. UV 映射公式验证 ===');
console.log('测试: torch 的第一个面');

const torchModel = models['torch'];
if (torchModel && torchModel.elements[0]) {
    const firstFace = torchModel.elements[0].faces?.down;
    if (firstFace) {
        const faceUV = firstFace.uv || [0, 0, 16, 16]; // 像素坐标
        const texPath = 'block/torch'; // 已知
        const atlasUV = uvMap.textures[texPath].uv; // [u0, v0, u1, v1]
        
        console.log('face.uv (像素):', faceUV);
        console.log('atlas UV (归一化):', atlasUV);
        
        // 按照代码里的公式计算最终 UV
        const u0 = atlasUV[0] + (faceUV[0] / 16) * (atlasUV[2] - atlasUV[0]);
        const v0 = atlasUV[1] + (faceUV[1] / 16) * (atlasUV[3] - atlasUV[1]);
        const u1 = atlasUV[0] + (faceUV[2] / 16) * (atlasUV[2] - atlasUV[0]);
        const v1 = atlasUV[1] + (faceUV[3] / 16) * (atlasUV[3] - atlasUV[1]);
        
        console.log('最终顶点 UV:', [u0, v0, u1, v1]);
        console.log('UV 范围检查:', u0 >= 0 && u1 <= 1 && v0 >= 0 && v1 <= 1 ? '✅ 合法' : '❌ 超出范围');
    }
}

// 5. 检查 atlasMaterial.js 是否正确导出
const atlasMatPath = path.join(projectRoot, 'src/utils/atlasMaterial.js');
const atlasMatContent = fs.readFileSync(atlasMatPath, 'utf8');

console.log('\n=== 5. atlasMaterial.js 检查 ===');
console.log('文件存在:', fs.existsSync(atlasMatPath));
console.log('包含 loadAtlas:', atlasMatContent.includes('export async function loadAtlas'));
console.log('包含 createAtlasMaterial:', atlasMatContent.includes('export function createAtlasMaterial'));
console.log('包含 resolveTextureRef:', atlasMatContent.includes('export function resolveTextureRef'));
console.log('包含 getTextureUV:', atlasMatContent.includes('export function getTextureUV'));

console.log('\n=== 检查完成 ===');
console.log('如果以上全部 ✅，说明数据层正常，问题在 Three.js 渲染层。');
console.log('如果有 ❌，请先修复对应问题。');
