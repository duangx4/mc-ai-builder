/**
 * 直接在页面检查已加载的 Deepslate
 */
import CDP from 'chrome-remote-interface';

async function checkLoadedDeepslate() {
  let client;

  try {
    client = await CDP();
    const { Page, Runtime, Console } = client;

    await Page.enable();
    await Runtime.enable();
    await Console.enable();

    Console.messageAdded((params) => {
      const msg = params.message;
      if (msg.level === 'error') {
        console.log(`❌ ${msg.text}`);
      }
    });

    await Page.navigate({ url: 'http://localhost:5173/deepslate-test.html' });
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 检查已导入的 Deepslate
    const result = await Runtime.evaluate({
      expression: `
        (function() {
          // 从 DeepslateRenderer 导入中检查
          const deepslate = window.deepslate || {};

          // 检查 TextureAtlas
          const checkClass = (name, cls) => {
            if (!cls) return { exists: false };

            const staticMethods = Object.getOwnPropertyNames(cls)
              .filter(n => typeof cls[n] === 'function' && n !== 'prototype');

            const proto = cls.prototype || {};
            const instanceMethods = Object.getOwnPropertyNames(proto)
              .filter(n => typeof proto[n] === 'function' && n !== 'constructor');

            return {
              exists: true,
              staticMethods,
              instanceMethods
            };
          };

          return {
            TextureAtlas: checkClass('TextureAtlas', window.TextureAtlas),
            BlockDefinition: checkClass('BlockDefinition', window.BlockDefinition),
            BlockModel: checkClass('BlockModel', window.BlockModel),
            Structure: checkClass('Structure', window.Structure)
          };
        })()
      `,
      returnByValue: true
    });

    if (result.result.value) {
      const data = result.result.value;
      console.log('\n========== Deepslate 导出检查 ==========\n');

      for (const [name, info] of Object.entries(data)) {
        console.log(`${name}:`);
        if (info.exists) {
          console.log(`  ✓ 存在`);
          console.log(`  静态方法: ${info.staticMethods.join(', ') || '(无)'}`);
          console.log(`  实例方法: ${info.instanceMethods.slice(0, 5).join(', ')}...`);
        } else {
          console.log(`  ✗ 不存在`);
        }
        console.log();
      }
    }

  } catch (err) {
    console.error('错误:', err.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkLoadedDeepslate().catch(console.error);
