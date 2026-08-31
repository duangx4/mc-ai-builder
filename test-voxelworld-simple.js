/**
 * 简化版 VoxelWorld 功能测试
 */

import CDP from 'chrome-remote-interface';

async function main() {
  console.log('🔍 VoxelWorld 功能测试\n');

  let client;
  try {
    client = await CDP({ host: 'localhost', port: 9222 });
    console.log('✅ 已连接 CDP\n');

    const { Runtime, Page } = client;
    await Runtime.enable();
    await Page.enable();

    // 等待页面稳定
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试 1: 检查基本环境
    console.log('=== 测试 1: 基本环境 ===');
    const envCheck = await Runtime.evaluate({
      expression: `({
        canvasCount: document.querySelectorAll('canvas').length,
        hasVoxelStore: typeof window.__voxel_store !== 'undefined',
        hasReact: !!document.querySelector('#root')?.children.length
      })`,
      returnByValue: true
    });
    console.log(envCheck.result.value);

    // 测试 2: 添加方块
    console.log('\n=== 测试 2: 添加方块 ===');
    const addBlocksResult = await Runtime.evaluate({
      expression: `(function() {
        if (!window.__voxel_store) return { error: 'voxel_store not found' };

        const store = window.__voxel_store.getState();
        store.clearBlocks();
        store.addBlock({ x: 0, y: 0, z: 0, type: 'stone' });
        store.addBlock({ x: 1, y: 0, z: 0, type: 'dirt' });
        store.addBlock({ x: 2, y: 0, z: 0, type: 'grass_block' });

        return {
          blocksAdded: store.blocks.length,
          blocks: store.blocks.map(b => ({ x: b.position[0], y: b.position[1], z: b.position[2], type: b.type }))
        };
      })()`,
      returnByValue: true
    });
    console.log(addBlocksResult.result.value);

    // 等待渲染
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试 3: 检查 Canvas
    console.log('\n=== 测试 3: Canvas 渲染 ===');
    const canvasCheck = await Runtime.evaluate({
      expression: `(function() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return { error: 'Canvas not found' };

        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        return {
          canvasSize: { width: canvas.width, height: canvas.height },
          styleSize: { width: canvas.style.width, height: canvas.style.height },
          hasWebGL: !!gl,
          contextType: gl?.constructor.name
        };
      })()`,
      returnByValue: true
    });
    console.log(canvasCheck.result.value);

    // 测试 4: 检查控制台错误
    console.log('\n=== 测试 4: 控制台错误 ===');
    let hasErrors = false;
    const { Console } = client;
    await Console.enable();

    Console.messageAdded(({ message }) => {
      if (message.level === 'error') {
        console.log('❌ 控制台错误:', message.text);
        hasErrors = true;
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    if (!hasErrors) {
      console.log('✅ 无控制台错误');
    }

    // 总结
    const result = addBlocksResult.result.value;
    const canvas = canvasCheck.result.value;

    console.log('\n📊 测试总结:');
    if (result.blocksAdded === 3 && canvas.hasWebGL) {
      console.log('✅ VoxelWorld 基本功能正常');
      console.log('   - 方块添加: ✅');
      console.log('   - Canvas 渲染: ✅');
      console.log('   - WebGL 初始化: ✅');
    } else {
      console.log('⚠️  部分功能异常:');
      if (result.blocksAdded !== 3) console.log(`   - 方块数量错误: 期望 3, 实际 ${result.blocksAdded}`);
      if (!canvas.hasWebGL) console.log('   - WebGL 未初始化');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (client) await client.close();
  }
}

main();
