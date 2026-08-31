/**
 * CDP 技能示例：自定义测试模板
 *
 * AI 可以基于这个模板创建自己的测试脚本
 */

import CDP from 'chrome-remote-interface';

async function main() {
  console.log('🤖 自定义 CDP 测试\n');

  // 连接到 Chrome
  const client = await CDP({ host: 'localhost', port: 9222 });
  const { Runtime, Page, Console } = client;

  await Runtime.enable();
  await Page.enable();
  await Console.enable();

  try {
    // ==========================================
    // 步骤 1: 导航到目标页面
    // ==========================================
    console.log('📍 导航到页面...');
    await Page.navigate({ url: 'http://localhost:5176/ai-debug.html' });
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ 页面已加载\n');

    // ==========================================
    // 步骤 2: 检查基本环境
    // ==========================================
    console.log('🔍 检查环境...');
    const env = await Runtime.evaluate({
      expression: `({
        hasDebugAPI: typeof window.__ai_debug__ !== 'undefined',
        hasStore: typeof window.__voxel_store !== 'undefined',
        hasCanvas: !!document.querySelector('canvas')
      })`,
      returnByValue: true
    });

    console.log('环境检查:', env.result.value);

    if (!env.result.value.hasDebugAPI) {
      throw new Error('AI Debug Dashboard 未加载');
    }
    console.log('');

    // ==========================================
    // 步骤 3: 执行你的测试逻辑
    // ==========================================
    console.log('🧪 执行测试...');

    // 示例：添加自定义方块
    const customTest = await Runtime.evaluate({
      expression: `(function() {
        const blocks = [
          { id: 'custom-1', type: 'diamond_block', position: [0, 0, 0], properties: {} },
          { id: 'custom-2', type: 'gold_block', position: [1, 0, 0], properties: {} },
          { id: 'custom-3', type: 'iron_block', position: [2, 0, 0], properties: {} }
        ];

        window.__ai_debug__.setBlocks(blocks);

        return {
          success: true,
          blocksSet: blocks.length
        };
      })()`,
      returnByValue: true
    });

    console.log('测试结果:', customTest.result.value);
    console.log('');

    // ==========================================
    // 步骤 4: 等待并验证结果
    // ==========================================
    console.log('⏳ 等待渲染...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    const verification = await Runtime.evaluate({
      expression: `({
        blockCount: window.__ai_debug__.getState()?.blocks?.length || 0,
        blockTypes: window.__ai_debug__.getState()?.blocks?.map(b => b.type) || []
      })`,
      returnByValue: true
    });

    console.log('验证结果:', verification.result.value);
    console.log('');

    // ==========================================
    // 步骤 5: 清理
    // ==========================================
    console.log('🧹 清理测试数据...');
    await Runtime.evaluate({
      expression: `window.__ai_debug__.clearBlocks()`
    });
    console.log('✅ 清理完成\n');

    console.log('📊 测试完成！');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
