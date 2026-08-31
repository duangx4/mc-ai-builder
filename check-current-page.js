import CDP from 'chrome-remote-interface';

async function main() {
  const client = await CDP({ host: 'localhost', port: 9222 });
  const { Runtime, Page } = client;
  await Runtime.enable();
  await Page.enable();

  // 获取当前 URL
  const url = await Runtime.evaluate({
    expression: 'window.location.href',
    returnByValue: true
  });

  console.log('当前 URL:', url.result.value);

  // 获取页面 HTML
  const html = await Runtime.evaluate({
    expression: 'document.documentElement.outerHTML.substring(0, 500)',
    returnByValue: true
  });

  console.log('\n页面 HTML 预览:');
  console.log(html.result.value);

  // 导航到正确的地址
  console.log('\n正在导航到 http://localhost:5176 ...');
  await Page.navigate({ url: 'http://localhost:5176' });
  await Page.loadEventFired();

  console.log('页面已加载，等待 React 初始化...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 再次检查
  const recheckResult = await Runtime.evaluate({
    expression: `({
      url: window.location.href,
      hasReact: !!document.querySelector('#root')?.children.length,
      hasUseStore: typeof window.useStore !== 'undefined',
      rootHTML: document.querySelector('#root')?.innerHTML.substring(0, 200)
    })`,
    returnByValue: true
  });

  console.log('\n重新检查结果:');
  console.log(recheckResult.result.value);

  await client.close();
}

main().catch(console.error);
