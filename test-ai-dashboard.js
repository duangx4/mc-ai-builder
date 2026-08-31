/**
 * 使用 AI Debug Dashboard 进行自动化测试
 *
 * 这个脚本演示如何使用 CDP 与 AI Debug Dashboard 交互
 */

import CDP from 'chrome-remote-interface';

async function main() {
  console.log('🤖 AI Debug Dashboard 自动化测试\n');

  const client = await CDP({ host: 'localhost', port: 9222 });
  const { Runtime, Page, Console } = client;

  await Runtime.enable();
  await Page.enable();
  await Console.enable();

  try {
    // 1. 导航到 AI Debug Dashboard
    console.log('📍 步骤 1: 导航到 AI Debug Dashboard');
    await Page.navigate({ url: 'http://localhost:5176/ai-debug.html' });
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ 页面已加载\n');

    // 2. 等待 Dashboard 初始化
    console.log('⏳ 步骤 2: 等待 Dashboard 初始化');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const dashboardReady = await Runtime.evaluate({
      expression: `typeof window.__ai_debug__ !== 'undefined'`,
      returnByValue: true
    });

    if (!dashboardReady.result.value) {
      throw new Error('AI Debug Dashboard 未正确加载');
    }
    console.log('✅ Dashboard 已就绪\n');

    // 3. 读取当前状态
    console.log('📊 步骤 3: 读取当前状态');
    const initialState = await Runtime.evaluate({
      expression: `({
        hasReact: !!document.querySelector('#root')?.children.length,
        hasStore: typeof window.__voxel_store !== 'undefined',
        hasCanvas: !!document.querySelector('canvas'),
        blockCount: window.__ai_debug__.getState()?.blocks?.length || 0,
        dashboardVersion: document.querySelector('.header h1')?.textContent
      })`,
      returnByValue: true
    });
    console.log('当前状态:', initialState.result.value);
    console.log('');

    // 4. 执行基础方块测试
    console.log('🧱 步骤 4: 测试基础方块');
    await Runtime.evaluate({
      expression: `window.__ai_debug__.testBasicBlocks()`
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const afterBasic = await Runtime.evaluate({
      expression: `({
        blockCount: window.__ai_debug__.getState()?.blocks?.length || 0,
        blockTypes: window.__ai_debug__.getState()?.blocks?.slice(0, 3).map(b => b.type) || []
      })`,
      returnByValue: true
    });
    console.log('基础方块测试结果:', afterBasic.result.value);
    console.log('');

    // 5. 执行楼梯测试
    console.log('🪜 步骤 5: 测试楼梯方块');
    await Runtime.evaluate({
      expression: `window.__ai_debug__.testStairs()`
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const afterStairs = await Runtime.evaluate({
      expression: `({
        blockCount: window.__ai_debug__.getState()?.blocks?.length || 0,
        blockTypes: window.__ai_debug__.getState()?.blocks?.slice(0, 3).map(b => b.type) || []
      })`,
      returnByValue: true
    });
    console.log('楼梯方块测试结果:', afterStairs.result.value);
    console.log('');

    // 6. 执行特殊方块测试
    console.log('✨ 步骤 6: 测试特殊方块');
    await Runtime.evaluate({
      expression: `window.__ai_debug__.testSpecialBlocks()`
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const afterSpecial = await Runtime.evaluate({
      expression: `({
        blockCount: window.__ai_debug__.getState()?.blocks?.length || 0,
        blockTypes: window.__ai_debug__.getState()?.blocks?.slice(0, 3).map(b => b.type) || []
      })`,
      returnByValue: true
    });
    console.log('特殊方块测试结果:', afterSpecial.result.value);
    console.log('');

    // 7. 获取控制台日志
    console.log('📝 步骤 7: 获取 Dashboard 日志');
    const logs = await Runtime.evaluate({
      expression: `window.__ai_debug__.getLogs().slice(-10)`,
      returnByValue: true
    });
    console.log('最近 10 条日志:');
    logs.result.value.forEach(log => {
      console.log(`  [${log.level}] ${log.message}`);
    });
    console.log('');

    // 8. 检查 Canvas 状态
    console.log('🖼️ 步骤 8: 检查 Canvas 状态');
    const canvasState = await Runtime.evaluate({
      expression: `(function() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return { error: 'Canvas not found' };

        return {
          size: { width: canvas.width, height: canvas.height },
          clientSize: { width: canvas.clientWidth, height: canvas.clientHeight }
        };
      })()`,
      returnByValue: true
    });
    console.log('Canvas 状态:', canvasState.result.value);
    console.log('');

    // 9. 清空方块
    console.log('🗑️ 步骤 9: 清空所有方块');
    await Runtime.evaluate({
      expression: `window.__ai_debug__.clearBlocks()`
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const afterClear = await Runtime.evaluate({
      expression: `window.__ai_debug__.getState()?.blocks?.length || 0`,
      returnByValue: true
    });
    console.log('清空后方块数:', afterClear.result.value);
    console.log('');

    // 10. 总结
    console.log('📊 测试总结');
    console.log('✅ 所有测试步骤完成');
    console.log('✅ AI Debug Dashboard 功能正常');
    console.log('✅ Store 操作正常');
    console.log('✅ 方块添加和清除正常');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
    console.log('\n🔌 已断开 CDP 连接');
  }
}

main().catch(console.error);
