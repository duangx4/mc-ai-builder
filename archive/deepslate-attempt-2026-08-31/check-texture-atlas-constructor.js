/**
 * 在浏览器中检查 Deepslate TextureAtlas 构造函数
 */
import CDP from 'chrome-remote-interface';

async function checkTextureAtlasConstructor() {
  let client;

  try {
    client = await CDP();
    const { Page, Runtime } = client;

    await Page.enable();
    await Runtime.enable();

    await Page.navigate({ url: 'http://localhost:5173/deepslate-test.html' });
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 检查 TextureAtlas 构造函数
    const result = await Runtime.evaluate({
      expression: `
        (async function() {
          const { TextureAtlas } = await import('deepslate');

          // 检查 TextureAtlas 的静态方法和构造函数
          const staticMethods = Object.getOwnPropertyNames(TextureAtlas)
            .filter(name => typeof TextureAtlas[name] === 'function');

          const proto = TextureAtlas.prototype;
          const instanceMethods = Object.getOwnPropertyNames(proto)
            .filter(name => typeof proto[name] === 'function');

          // 检查构造函数签名
          const constructorStr = TextureAtlas.toString();

          return {
            staticMethods,
            instanceMethods: instanceMethods.slice(0, 10),
            constructorString: constructorStr.substring(0, 500),
            hasFromImages: typeof TextureAtlas.fromImages === 'function',
            isConstructable: typeof TextureAtlas === 'function'
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    });

    if (result.exceptionDetails) {
      console.error('执行错误:', result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    } else if (result.result.value) {
      const data = result.result.value;
      console.log('\n========== TextureAtlas API ==========');
      console.log('静态方法:', data.staticMethods);
      console.log('实例方法:', data.instanceMethods);
      console.log('hasFromImages:', data.hasFromImages);
      console.log('isConstructable:', data.isConstructable);
      console.log('\n构造函数签名:');
      console.log(data.constructorString);
    }

  } catch (err) {
    console.error('错误:', err.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkTextureAtlasConstructor().catch(console.error);
