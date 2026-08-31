import { chromium } from 'playwright';

(async () => {
  console.log('🚀 启动 Playwright 测试...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // 监听所有 console 输出
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[VoxelWorld]')) {
      console.log('✅ FOUND:', text);
    } else {
      console.log('📝', text);
    }
  });

  // 监听错误
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
  });

  console.log('🌐 导航到 http://localhost:5174');
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });

  console.log('⏳ 等待应用加载...');
  await page.waitForTimeout(3000);

  // 检查 Canvas
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return canvas ? {
      exists: true,
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight
    } : { exists: false };
  });
  console.log('🎨 Canvas 状态:', canvasInfo);

  // 检查 Store
  const storeInfo = await page.evaluate(() => {
    if (!window.__voxel_store) return { error: 'Store not exposed' };
    const state = window.__voxel_store.getState();
    return {
      blocksCount: state.blocks?.length || 0,
      viewMode: state.viewMode,
      controlMode: state.controlMode
    };
  });
  console.log('💾 Store 状态:', storeInfo);

  // 截图
  await page.screenshot({ path: 'test-screenshot.png' });
  console.log('📸 截图已保存: test-screenshot.png');

  console.log('\n✅ 测试完成！浏览器保持打开，按 Ctrl+C 关闭');

  // 保持打开
  await new Promise(() => {});
})();
