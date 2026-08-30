// 浏览器调试脚本 - 粘贴到浏览器 console 运行
console.log('=== MC AI Builder 渲染调试 ===');

// 1. 检查 atlas 纹理是否加载
const scene = window.__three_scene; // 需要项目暴露 scene 到 window
if (!scene) {
    console.warn('无法访问 Three.js scene，请在代码里添加 window.__three_scene = scene');
} else {
    const materials = [];
    scene.traverse(obj => {
        if (obj.material) {
            materials.push(obj.material);
        }
    });
    
    console.log('场景材质数量:', materials.length);
    
    materials.forEach((mat, i) => {
        if (mat.map) {
            console.log(`材质 ${i}:`, {
                type: mat.type,
                mapLoaded: mat.map.image ? '✅' : '❌',
                mapSize: mat.map.image ? `${mat.map.image.width}×${mat.map.image.height}` : 'N/A',
                transparent: mat.transparent,
                alphaTest: mat.alphaTest
            });
        }
    });
}

// 2. 检查光源
const lights = [];
if (scene) {
    scene.traverse(obj => {
        if (obj.isLight) {
            lights.push({ type: obj.type, intensity: obj.intensity });
        }
    });
    console.log('场景光源:', lights);
}

// 3. 检查 atlas.png 直接加载
const img = new Image();
img.onload = () => console.log('✅ atlas.png 可访问:', img.width, '×', img.height);
img.onerror = () => console.error('❌ atlas.png 加载失败');
img.src = '/minecraft-1.20.1/atlas.png';

console.log('请复制上述输出发给 AI');
