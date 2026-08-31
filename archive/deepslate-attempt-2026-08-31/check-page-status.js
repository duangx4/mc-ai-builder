/**
 * 检查页面的所有日志和错误
 */
import CDP from 'chrome-remote-interface';

async function checkPageStatus() {
  let client;

  try {
    client = await CDP();
    const { Page, Runtime, Console } = client;

    await Page.enable();
    await Runtime.enable();
    await Console.enable();

    const messages = [];

    Console.messageAdded((params) => {
      const msg = params.message;
      messages.push({
        level: msg.level,
        text: msg.text,
        url: msg.url
      });
    });

    await Page.navigate({ url: 'http://localhost:5173/deepslate-minimal-test.html' });
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('========== 所有控制台消息 ==========');
    messages.forEach(msg => {
      const prefix = msg.level === 'error' ? '❌' :
                     msg.level === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${prefix} [${msg.level}] ${msg.text}`);
    });

    console.log(`\n总共 ${messages.length} 条消息`);

  } catch (err) {
    console.error('错误:', err.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkPageStatus().catch(console.error);
