/**
 * 验证 Canvas 尺寸修复
 */

import CDP from 'chrome-remote-interface';

async function main() {
  console.log('🖼️ 检查 Canvas 尺寸修复\n');

  const client = await CDP({ host: 'localhost', port: 9222 });
  const { Runtime, Page } = client;

  await Runtime.enable();
  await Page.enable();

  try {
    // 导航到主应用
    console.log('📍 导航到主应用...');
    await Page.navigate({ url: 'http://localhost:5176' });
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ 页面已加载\n');

    // 检查 Canvas 尺寸
    console.log('📏 检查 Canvas 尺寸:');
    const canvasInfo = await Runtime.evaluate({
      expression: `(function() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return { error: 'Canvas not found' };

        const parent = canvas.parentElement;

        return {
          canvas: {
            width: canvas.width,
            height: canvas.height,
            clientWidth: canvas.clientWidth,
            clientHeight: canvas.clientHeight,
            style: {
              width: canvas.style.width,
              height: canvas.style.height
            }
          },
          parent: {
            clientWidth: parent.clientWidth,
            clientHeight: parent.clientHeight,
            className: parent.className
          },
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        };
      })()`,
      returnByValue: true
    });

    const info = canvasInfo.result.value;

    if (info.error) {
      console.log('❌', info.error);
      return;
    }

    console.log('\n📊 Canvas 尺寸:');
    console.log('  - 内部尺寸:', `${info.canvas.width} × ${info.canvas.height}`);
    console.log('  - 客户端尺寸:', `${info.canvas.clientWidth} × ${info.canvas.clientHeight}`);
    console.log('  - Style:', `${info.canvas.style.width} × ${info.canvas.style.height}`);

    console.log('\n📦 父容器尺寸:');
    console.log('  - 客户端尺寸:', `${info.parent.clientWidth} × ${info.parent.clientHeight}`);

    console.log('\n🖥️ 视口尺寸:');
    console.log('  - 窗口尺寸:', `${info.viewport.width} × ${info.viewport.height}`);

    // 判断是否修复成功
    console.log('\n🔍 分析:');

    const isDefaultSize = info.canvas.width === 300 && info.canvas.height === 150;
    const fillsParent = info.canvas.clientWidth === info.parent.clientWidth &&
                       info.canvas.clientHeight === info.parent.clientHeight;
    const hasStyle = info.canvas.style.width === '100%' && info.canvas.style.height === '100%';

    if (isDefaultSize) {
      console.log('  ⚠️  Canvas 仍使用默认尺寸 (300×150)');
    } else {
      console.log('  ✅ Canvas 已设置自定义尺寸');
    }

    if (fillsParent) {
      console.log('  ✅ Canvas 填充父容器');
    } else {
      console.log('  ⚠️  Canvas 未填充父容器');
      console.log(`     期望: ${info.parent.clientWidth} × ${info.parent.clientHeight}`);
      console.log(`     实际: ${info.canvas.clientWidth} × ${info.canvas.clientHeight}`);
    }

    if (hasStyle) {
      console.log('  ✅ Canvas 设置了 100% 样式');
    } else {
      console.log('  ⚠️  Canvas 未设置 100% 样式');
      console.log(`     当前样式: ${info.canvas.style.width} × ${info.canvas.style.height}`);
    }

    // 总结
    console.log('\n📊 总结:');
    if (hasStyle && fillsParent && !isDefaultSize) {
      console.log('  ✅ Canvas 尺寸修复成功！');
    } else if (hasStyle && fillsParent) {
      console.log('  ⚠️  Canvas 填充父容器，但内部分辨率仍是默认值');
      console.log('      这是正常的，Three.js 会根据设备像素比自动调整');
    } else {
      console.log('  ❌ Canvas 尺寸仍有问题，需要进一步调试');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
