/**
 * 监控最小测试页面
 */
import CDP from 'chrome-remote-interface';

async function watchMinimalTest() {
  let client;

  try {
    client = await CDP();
    const { Page, Runtime, Console } = client;

    await Page.enable();
    await Runtime.enable();
    await Console.enable();

    console.log('✓ 开始监控最小测试页面...\n');

    Console.messageAdded((params) => {
      const msg = params.message;
      const type = msg.level === 'error' ? '❌' :
                   msg.level === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${type} ${msg.text}`);
    });

    await Page.navigate({ url: 'http://localhost:5173/deepslate-minimal-test.html' });
    await Page.loadEventFired();

    console.log('\n✓ 页面已加载\n');

    // 等待 5 秒让测试运行
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (err) {
    console.error('错误:', err.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

watchMinimalTest().catch(console.error);
