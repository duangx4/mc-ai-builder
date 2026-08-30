const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', '.cdp-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

async function checkRenderState() {
  let client;
  try {
    client = await CDP({ port: config.cdpPort });
    const { Runtime } = client;
    await Runtime.enable();

    console.log('🔬 深度渲染状态检查...\n');

    const checkScript = `(() => {
      const scene = window.__three_scene;
      if (!scene) return { error: 'Three.js scene 未暴露到 window.__three_scene' };

      const materials = [];
      const geometries = [];
      const lights = [];

      scene.traverse(obj => {
        if (obj.material) materials.push(obj.material);
        if (obj.geometry) geometries.push(obj.geometry);
        if (obj.isLight) lights.push({ type: obj.type, intensity: obj.intensity });
      });

      const textureInfo = materials.map((mat, i) => ({
        index: i,
        hasMap: !!mat.map,
        mapLoaded: mat.map && mat.map.image ? true : false,
        mapSize: mat.map && mat.map.image ? \`\${mat.map.image.width}x\${mat.map.image.height}\` : null,
        transparent: mat.transparent,
        alphaTest: mat.alphaTest
      }));

      return {
        materials: materials.length,
        geometries: geometries.length,
        lights: lights,
        textureInfo: textureInfo.slice(0, 5)
      };
    })()`;

    const result = await Runtime.evaluate({
      expression: checkScript,
      returnByValue: true
    });

    if (result.exceptionDetails) {
      console.error('❌ 执行错误:', result.exceptionDetails);
    } else {
      const data = result.result.value;
      if (data.error) {
        console.log('⚠️ ', data.error);
        console.log('提示: 在项目代码中添加 window.__three_scene = scene');
      } else {
        console.log('场景统计:');
        console.log('  材质数量:', data.materials);
        console.log('  几何体数量:', data.geometries);
        console.log('  光源:', JSON.stringify(data.lights, null, 2));
        console.log('\n前 5 个材质纹理状态:');
        data.textureInfo.forEach(t => {
          console.log(`  [${t.index}] Map: ${t.hasMap ? '✅' : '❌'}, Loaded: ${t.mapLoaded ? '✅' : '❌'}, Size: ${t.mapSize || 'N/A'}`);
        });
      }
    }

    console.log('\n✅ 深度检查完成');

  } catch (err) {
    console.error('❌ 检查失败:', err.message);
    console.error('请先运行: powershell .\\tools\\cdp-start.ps1');
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

checkRenderState();
