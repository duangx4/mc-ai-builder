/**
 * 调试方块添加功能
 */

import CDP from 'chrome-remote-interface';

async function main() {
  console.log('🔍 调试方块添加功能\n');

  const client = await CDP({ host: 'localhost', port: 9222 });
  const { Runtime, Console } = client;
  await Runtime.enable();
  await Console.enable();

  // 监听控制台消息
  const logs = [];
  Console.messageAdded(({ message }) => {
    logs.push(`[${message.level}] ${message.text}`);
  });

  // 测试 store 访问
  console.log('=== 测试 1: 检查 store 可访问性 ===');
  const storeCheck = await Runtime.evaluate({
    expression: `(function() {
      try {
        if (!window.__voxel_store) return { error: 'store not found' };

        const store = window.__voxel_store;
        const state = store.getState();

        return {
          storeType: typeof store,
          hasGetState: typeof store.getState === 'function',
          stateKeys: Object.keys(state).filter(k => typeof state[k] !== 'function').slice(0, 10),
          blocksCount: state.blocks?.length || 0,
          hasAddBlock: typeof state.addBlock === 'function',
          hasClearBlocks: typeof state.clearBlocks === 'function'
        };
      } catch (e) {
        return { error: e.message, stack: e.stack };
      }
    })()`,
    returnByValue: true
  });

  console.log(storeCheck.result.value);

  // 测试添加方块
  console.log('\n=== 测试 2: 尝试添加方块 ===');
  const addResult = await Runtime.evaluate({
    expression: `(function() {
      try {
        const store = window.__voxel_store.getState();

        console.log('[Test] Clearing blocks...');
        store.clearBlocks();
        console.log('[Test] Blocks after clear:', store.blocks.length);

        console.log('[Test] Adding stone...');
        store.addBlock({ x: 0, y: 0, z: 0, type: 'stone' });
        console.log('[Test] Blocks after stone:', store.blocks.length);

        console.log('[Test] Adding dirt...');
        store.addBlock({ x: 1, y: 0, z: 0, type: 'dirt' });
        console.log('[Test] Blocks after dirt:', store.blocks.length);

        console.log('[Test] Adding grass...');
        store.addBlock({ x: 2, y: 0, z: 0, type: 'grass_block' });
        console.log('[Test] Blocks after grass:', store.blocks.length);

        return {
          success: true,
          blocksCount: store.blocks.length,
          blocks: store.blocks.slice(0, 3).map(b => ({
            id: b.id,
            type: b.type,
            position: b.position
          }))
        };
      } catch (e) {
        console.error('[Test] Error:', e.message);
        return { success: false, error: e.message, stack: e.stack };
      }
    })()`,
    returnByValue: true
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n结果:');
  console.log(addResult.result.value);

  console.log('\n控制台日志:');
  logs.forEach(log => console.log(log));

  await client.close();
}

main().catch(console.error);
