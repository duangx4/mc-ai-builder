/**
 * 检查页面实际状态和 VoxelWorld 组件
 */

import CDP from 'chrome-remote-interface';

async function main() {
  console.log('🔍 检查页面状态\n');

  const client = await CDP({ host: 'localhost', port: 9222 });
  const { Runtime, Page } = client;

  await Runtime.enable();
  await Page.enable();

  // 检查页面基本信息
  console.log('📄 页面信息:');
  const pageInfo = await Runtime.evaluate({
    expression: `({
      url: window.location.href,
      title: document.title,
      readyState: document.readyState,
      hasReact: typeof React !== 'undefined',
      hasUseStore: typeof window.useStore !== 'undefined'
    })`,
    returnByValue: true
  });
  console.log(pageInfo.result.value);

  // 检查 DOM 结构
  console.log('\n🌳 DOM 结构:');
  const domInfo = await Runtime.evaluate({
    expression: `({
      root: document.getElementById('root')?.outerHTML.substring(0, 200),
      canvasCount: document.querySelectorAll('canvas').length,
      canvasInfo: Array.from(document.querySelectorAll('canvas')).map(c => ({
        width: c.width,
        height: c.height,
        style: c.style.cssText,
        parent: c.parentElement?.tagName
      })),
      allElements: Array.from(document.querySelectorAll('*')).length
    })`,
    returnByValue: true
  });
  console.log(domInfo.result.value);

  // 检查 Zustand store
  console.log('\n📦 Zustand Store:');
  const storeInfo = await Runtime.evaluate({
    expression: `(function() {
      if (!window.useStore) return { error: 'useStore not found' };
      const state = window.useStore.getState();
      return {
        blocks: state.blocks?.length || 0,
        stateKeys: Object.keys(state).filter(k => typeof state[k] !== 'function')
      };
    })()`,
    returnByValue: true
  });
  console.log(storeInfo.result.value);

  // 检查控制台日志
  console.log('\n📋 控制台消息:');
  const consoleMessages = await Runtime.evaluate({
    expression: `
      window.__consoleMessages__ || []
    `,
    returnByValue: true
  });

  // 检查是否有错误
  console.log('\n🚨 检查错误:');
  const errors = await Runtime.evaluate({
    expression: `({
      hasErrors: !!window.__errorCount__,
      errorCount: window.__errorCount__ || 0
    })`,
    returnByValue: true
  });
  console.log(errors.result.value);

  // 截图
  console.log('\n📸 正在截图...');
  const screenshot = await Page.captureScreenshot({ format: 'png' });
  const fs = await import('fs');
  fs.writeFileSync('voxelworld-test-screenshot.png', screenshot.data, 'base64');
  console.log('✅ 截图已保存: voxelworld-test-screenshot.png');

  await client.close();
}

main().catch(console.error);
