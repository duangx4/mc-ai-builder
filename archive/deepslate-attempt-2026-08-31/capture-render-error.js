/**
 * 捕获详细的渲染错误
 */
import CDP from 'chrome-remote-interface';

async function captureRenderError() {
  let client;

  try {
    client = await CDP();
    const { Page, Runtime, Console } = client;

    await Page.enable();
    await Runtime.enable();
    await Console.enable();

    let errorCount = 0;

    Console.messageAdded((params) => {
      const msg = params.message;
      if (msg.level === 'error' && msg.text.includes('Error rendering block')) {
        errorCount++;
        if (errorCount === 1) {
          console.log('❌ 首个渲染错误:', msg.text);
          if (msg.stackTrace) {
            console.log('堆栈:', msg.stackTrace);
          }
        }
      }
    });

    await Page.navigate({ url: 'http://localhost:5173/deepslate-test.html' });
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 检查 StructureRenderer 是否创建成功
    const result = await Runtime.evaluate({
      expression: `
        (function() {
          if (!window.debugDeepslate) {
            return { created: false, reason: 'debugDeepslate 不存在' };
          }

          const renderer = window.debugDeepslate.renderer;
          if (!renderer) {
            return { created: false, reason: 'renderer 不存在' };
          }

          return {
            created: true,
            hasResources: !!renderer.resources,
            resourcesType: renderer.resources?.constructor?.name
          };
        })()
      `,
      returnByValue: true
    });

    console.log('\n========== StructureRenderer 状态 ==========');
    if (result.result.value) {
      const data = result.result.value;
      console.log('创建成功:', data.created);
      if (data.created) {
        console.log('有 resources:', data.hasResources);
        console.log('resources 类型:', data.resourcesType);
      } else {
        console.log('失败原因:', data.reason);
      }
    }

    console.log('\n捕获到的错误数:', errorCount);

  } catch (err) {
    console.error('错误:', err.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

captureRenderError().catch(console.error);
