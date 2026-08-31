/**
 * 直接读取页面的日志内容
 */
import CDP from 'chrome-remote-interface';

async function readPageLog() {
  let client;

  try {
    client = await CDP();
    const { Page, Runtime } = client;

    await Page.enable();
    await Runtime.enable();

    await Page.navigate({ url: 'http://localhost:5173/deepslate-minimal-test.html' });
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 读取页面的 log 元素内容
    const result = await Runtime.evaluate({
      expression: 'document.getElementById("log").textContent',
      returnByValue: true
    });

    console.log('========== 页面日志 ==========');
    console.log(result.result.value || '(空)');

  } catch (err) {
    console.error('错误:', err.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

readPageLog().catch(console.error);
