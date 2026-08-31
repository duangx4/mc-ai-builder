/**
 * 检查 Deepslate TextureAtlas API
 */
import CDP from 'chrome-remote-interface';

async function checkDeepslateAPI() {
  let client;

  try {
    client = await CDP();
    const { Page, Runtime, Console } = client;

    await Page.enable();
    await Runtime.enable();
    await Console.enable();

    Console.messageAdded((params) => {
      console.log(`[Browser] ${params.message.text}`);
    });

    // 导航到测试页面
    await Page.navigate({ url: 'http://localhost:5173/deepslate-test.html' });
    await Page.loadEventFired();

    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 检查 Deepslate API
    const result = await Runtime.evaluate({
      expression: `
        (async function() {
          const { TextureAtlas, BlockDefinition, BlockModel } = await import('/node_modules/deepslate/dist/deepslate.js');

          // 检查 TextureAtlas 的可用方法
          const methods = Object.getOwnPropertyNames(TextureAtlas)
            .filter(name => typeof TextureAtlas[name] === 'function');

          const prototype = Object.getOwnPropertyNames(TextureAtlas.prototype)
            .filter(name => typeof TextureAtlas.prototype[name] === 'function');

          return {
            staticMethods: methods,
            instanceMethods: prototype,
            hasFromImages: typeof TextureAtlas.fromImages === 'function',
            hasConstructor: typeof TextureAtlas === 'function'
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });

    if (result.exceptionDetails) {
      console.error('执行错误:', result.exceptionDetails.text);
    } else if (result.result.value) {
      const data = result.result.value;
      console.log('\n========== TextureAtlas API ==========');
      console.log('静态方法:', data.staticMethods);
      console.log('实例方法:', data.instanceMethods);
      console.log('hasFromImages:', data.hasFromImages);
      console.log('hasConstructor:', data.hasConstructor);
    }

  } catch (err) {
    console.error('错误:', err.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkDeepslateAPI().catch(console.error);
