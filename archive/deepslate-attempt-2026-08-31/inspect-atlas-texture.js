/**
 * 检查 StructureRenderer.createAtlasTexture 调用
 */
import CDP from 'chrome-remote-interface';

async function inspectCreateAtlasTexture() {
  let client;

  try {
    client = await CDP();
    const { Page, Runtime, Console } = client;

    await Page.enable();
    await Runtime.enable();
    await Console.enable();

    Console.messageAdded((params) => {
      const msg = params.message;
      if (msg.level === 'error' || msg.text.includes('[ATLAS]')) {
        console.log(`${msg.level === 'error' ? '❌' : 'ℹ️'} ${msg.text}`);
      }
    });

    await Page.navigate({ url: 'http://localhost:5173/deepslate-test.html' });
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 在创建 StructureRenderer 之前拦截并检查 TextureAtlas
    const result = await Runtime.evaluate({
      expression: `
        (function() {
          if (!window.debugDeepslate) {
            return { error: 'debugDeepslate 不存在' };
          }

          const resources = window.debugDeepslate.resources;
          if (!resources) {
            return { error: 'resources 不存在' };
          }

          const atlas = resources.getTextureAtlas();

          return {
            hasAtlas: !!atlas,
            hasImg: !!atlas?.img,
            imgType: atlas?.img?.constructor?.name,
            imgWidth: atlas?.img?.width,
            imgHeight: atlas?.img?.height,
            imgDataLength: atlas?.img?.data?.length
          };
        })()
      `,
      returnByValue: true
    });

    if (result.result.value) {
      const data = result.result.value;
      console.log('\n========== TextureAtlas 检查 ==========');
      if (data.error) {
        console.log('❌', data.error);
      } else {
        console.log('hasAtlas:', data.hasAtlas);
        console.log('hasImg:', data.hasImg);
        console.log('imgType:', data.imgType);
        console.log('imgWidth:', data.imgWidth);
        console.log('imgHeight:', data.imgHeight);
        console.log('imgDataLength:', data.imgDataLength);
        console.log('预期 data 长度:', data.imgWidth * data.imgHeight * 4);
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

inspectCreateAtlasTexture().catch(console.error);
