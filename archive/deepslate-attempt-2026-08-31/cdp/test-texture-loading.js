/**
 * 测试纹理加载 - 监控 Deepslate 渲染器的纹理加载过程
 */
import CDP from 'chrome-remote-interface';

async function testTextureLoading() {
  let client;

  try {
    client = await CDP();
    const { Network, Page, Runtime, Console } = client;

    await Network.enable();
    await Page.enable();
    await Runtime.enable();
    await Console.enable();

    console.log('✓ CDP 已连接\n');

    // 监控所有图像加载
    const imageLoads = [];
    Network.responseReceived((params) => {
      const url = params.response.url;
      if (url.includes('/textures/block/') && url.endsWith('.png')) {
        const filename = url.split('/').pop();
        const status = params.response.status;
        imageLoads.push({ filename, status, url });
        console.log(`📷 纹理加载: ${filename} [${status}]`);
      }
    });

    // 监控控制台日志
    Console.messageAdded((params) => {
      const msg = params.message;
      const text = msg.text;

      // 只显示 DeepslateLoader 相关日志
      if (text.includes('[DeepslateLoader]') || text.includes('DeepslateRenderer')) {
        const type = msg.level === 'error' ? '❌' :
                     msg.level === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${type} ${text}`);
      }
    });

    // 导航到测试页面
    console.log('正在打开测试页面...\n');
    await Page.navigate({ url: 'http://localhost:5173/deepslate-test.html' });
    await Page.loadEventFired();

    console.log('\n✓ 页面已加载，等待渲染器初始化...\n');

    // 等待 5 秒让纹理加载完成
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 检查加载的纹理
    console.log('\n========== 纹理加载统计 ==========');
    console.log(`总计加载: ${imageLoads.length} 个纹理文件`);

    const successful = imageLoads.filter(img => img.status === 200);
    const failed = imageLoads.filter(img => img.status !== 200);

    console.log(`成功: ${successful.length}`);
    console.log(`失败: ${failed.length}`);

    if (successful.length > 0) {
      console.log('\n成功加载的纹理（前 10 个）:');
      successful.slice(0, 10).forEach(img => {
        console.log(`  ✓ ${img.filename}`);
      });
    }

    if (failed.length > 0) {
      console.log('\n失败的纹理:');
      failed.forEach(img => {
        console.log(`  ✗ ${img.filename} [${img.status}]`);
      });
    }

    // 检查 TextureAtlas
    console.log('\n========== 检查 TextureAtlas ==========');
    const result = await Runtime.evaluate({
      expression: `
        (function() {
          if (!window.debugDeepslate) {
            return { error: 'debugDeepslate 未定义' };
          }

          const resources = window.debugDeepslate.resources;
          if (!resources) {
            return { error: 'resources 未定义' };
          }

          const atlas = resources.getTextureAtlas();
          return {
            hasAtlas: !!atlas,
            loadedTexturesCount: resources.loadedTextures ? resources.loadedTextures.size : 0,
            modelCacheSize: resources.modelCache ? resources.modelCache.size : 0,
            atlasType: atlas ? atlas.constructor.name : null
          };
        })()
      `,
      returnByValue: true
    });

    if (result.result.value) {
      const data = result.result.value;
      if (data.error) {
        console.log(`❌ ${data.error}`);
      } else {
        console.log(`✓ TextureAtlas 存在: ${data.hasAtlas}`);
        console.log(`✓ 已加载纹理数: ${data.loadedTexturesCount}`);
        console.log(`✓ 模型缓存数: ${data.modelCacheSize}`);
        console.log(`✓ Atlas 类型: ${data.atlasType}`);
      }
    }

    // 采样像素检查渲染结果
    console.log('\n========== 采样渲染结果 ==========');
    const pixelResult = await Runtime.evaluate({
      expression: `
        (function() {
          const canvas = document.querySelector('canvas');
          if (!canvas) return { error: '未找到 canvas' };

          const ctx = canvas.getContext('2d');
          const w = canvas.width;
          const h = canvas.height;

          // 采样中心点
          const centerPixel = ctx.getImageData(w/2, h/2, 1, 1).data;

          // 采样多个点
          const samples = [];
          for (let i = 0; i < 5; i++) {
            const x = Math.floor(w * (0.2 + i * 0.15));
            const y = Math.floor(h / 2);
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            samples.push({
              pos: [x, y],
              rgba: Array.from(pixel)
            });
          }

          return {
            canvasSize: [w, h],
            centerPixel: Array.from(centerPixel),
            samples
          };
        })()
      `,
      returnByValue: true
    });

    if (pixelResult.result.value) {
      const data = pixelResult.result.value;
      if (data.error) {
        console.log(`❌ ${data.error}`);
      } else {
        console.log(`Canvas 尺寸: ${data.canvasSize[0]}x${data.canvasSize[1]}`);
        console.log(`中心像素: [${data.centerPixel.join(', ')}]`);

        console.log('\n采样点:');
        data.samples.forEach((sample, i) => {
          const [r, g, b, a] = sample.rgba;
          const isSky = r === 135 && g === 206 && b === 235; // 天空蓝
          const isBlack = r === 0 && g === 0 && b === 0;
          const marker = isSky ? '🌤️' : isBlack ? '⬛' : '🟦';
          console.log(`  ${marker} [${sample.pos[0]}, ${sample.pos[1]}]: [${r}, ${g}, ${b}, ${a}]`);
        });
      }
    }

    console.log('\n========== 完成 ==========');

  } catch (err) {
    console.error('错误:', err.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testTextureLoading().catch(console.error);
