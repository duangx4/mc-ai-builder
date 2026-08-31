// 简单的浏览器测试脚本
import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 启动浏览器测试...');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 监听 console 输出
  page.on('console', msg => {
    console.log('📝 Browser Console:', msg.text());
  });

  // 监听错误
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
  });

  console.log('🌐 导航到 http://localhost:5174');
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });

  // 等待几秒让应用加载
  await page.waitForTimeout(5000);

  // 检查 VoxelWorld 日志
  console.log('\n✅ 页面已加载，检查 console 输出（上方）');
  console.log('🔍 查找 [VoxelWorld] 日志...');

  // 检查 Canvas 是否存在
  const canvasExists = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return canvas ? {
      exists: true,
      width: canvas.width,
      height: canvas.height
    } : { exists: false };
  });

  console.log('🎨 Canvas 状态:', canvasExists);

  // 检查是否有红色测试立方体
  const hasTestCube = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;

    // 读取中心像素
    const pixels = new Uint8Array(4);
    gl.readPixels(canvas.width / 2, canvas.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    return {
      pixel: Array.from(pixels),
      hasRed: pixels[0] > 100 && pixels[1] < 100 && pixels[2] < 100
    };
  });

  console.log('🔴 测试立方体检测:', hasTestCube);

  // 检查 store 数据
  const storeData = await page.evaluate(() => {
    if (!window.__voxel_store) return { error: 'Store not exposed' };
    const state = window.__voxel_store.getState();
    return {
      blocks: state.blocks?.length || 0,
      viewMode: state.viewMode,
      controlMode: state.controlMode
    };
  });

  console.log('💾 Store 状态:', storeData);

  console.log('\n✅ 测试完成！浏览器将保持打开状态，请手动检查...');
  console.log('📌 按 Ctrl+C 关闭浏览器');

  // 保持浏览器打开
  await new Promise(() => {});
})();
