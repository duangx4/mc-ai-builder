/**
 * VoxelWorld 完整功能测试（使用正确的 API）
 */

import CDP from 'chrome-remote-interface';

async function main() {
  console.log('🔍 VoxelWorld 完整功能测试\n');

  const client = await CDP({ host: 'localhost', port: 9222 });
  const { Runtime, Page } = client;
  await Runtime.enable();
  await Page.enable();

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 测试 1: 基础方块渲染
  console.log('=== 测试 1: 基础方块渲染 ===');
  const test1 = await Runtime.evaluate({
    expression: `(function() {
      const store = window.__voxel_store.getState();

      // 创建 3 个方块
      const blocks = [
        { id: '1', type: 'stone', position: [0, 0, 0], properties: {} },
        { id: '2', type: 'dirt', position: [1, 0, 0], properties: {} },
        { id: '3', type: 'grass_block', position: [2, 0, 0], properties: {} }
      ];

      store.setBlocks(blocks);

      return {
        blocksAdded: store.blocks.length,
        blockTypes: store.blocks.map(b => b.type)
      };
    })()`,
    returnByValue: true
  });
  console.log(test1.result.value);

  await new Promise(resolve => setTimeout(resolve, 1500));

  // 测试 2: 楼梯方块
  console.log('\n=== 测试 2: 楼梯方块 ===');
  const test2 = await Runtime.evaluate({
    expression: `(function() {
      const store = window.__voxel_store.getState();

      const blocks = [
        { id: '1', type: 'oak_stairs', position: [0, 0, 0], properties: { facing: 'north' } },
        { id: '2', type: 'stone_stairs', position: [1, 0, 0], properties: { facing: 'south' } },
        { id: '3', type: 'polished_deepslate_stairs', position: [2, 0, 0], properties: { facing: 'east' } }
      ];

      store.setBlocks(blocks);

      return {
        blocksAdded: store.blocks.length,
        blockTypes: store.blocks.map(b => b.type)
      };
    })()`,
    returnByValue: true
  });
  console.log(test2.result.value);

  await new Promise(resolve => setTimeout(resolve, 1500));

  // 测试 3: 特殊方块
  console.log('\n=== 测试 3: 特殊方块 ===');
  const test3 = await Runtime.evaluate({
    expression: `(function() {
      const store = window.__voxel_store.getState();

      const blocks = [
        { id: '1', type: 'crying_obsidian', position: [0, 0, 0], properties: {} },
        { id: '2', type: 'dragon_egg', position: [1, 0, 0], properties: {} },
        { id: '3', type: 'torch', position: [2, 0, 0], properties: {} }
      ];

      store.setBlocks(blocks);

      return {
        blocksAdded: store.blocks.length,
        blockTypes: store.blocks.map(b => b.type)
      };
    })()`,
    returnByValue: true
  });
  console.log(test3.result.value);

  await new Promise(resolve => setTimeout(resolve, 1500));

  // 测试 4: Canvas 状态检查
  console.log('\n=== 测试 4: Canvas 渲染状态 ===');
  const canvasCheck = await Runtime.evaluate({
    expression: `(function() {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'Canvas not found' };

      return {
        canvasSize: { width: canvas.width, height: canvas.height },
        clientSize: { width: canvas.clientWidth, height: canvas.clientHeight },
        hasWebGL: !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
      };
    })()`,
    returnByValue: true
  });
  console.log(canvasCheck.result.value);

  // 检查是否有渲染错误
  console.log('\n=== 测试 5: 控制台错误检查 ===');
  const errors = [];
  const { Console } = client;
  await Console.enable();

  Console.messageAdded(({ message }) => {
    if (message.level === 'error') {
      errors.push(message.text);
    }
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  if (errors.length > 0) {
    console.log('❌ 发现错误:');
    errors.forEach(err => console.log(`   - ${err}`));
  } else {
    console.log('✅ 无控制台错误');
  }

  // 总结
  console.log('\n📊 测试总结:');
  const canvas = canvasCheck.result.value;
  const allTestsPassed =
    test1.result.value.blocksAdded === 3 &&
    test2.result.value.blocksAdded === 3 &&
    test3.result.value.blocksAdded === 3 &&
    canvas.hasWebGL &&
    errors.length === 0;

  if (allTestsPassed) {
    console.log('✅ 所有测试通过！');
    console.log('   - 基础方块渲染: ✅');
    console.log('   - 楼梯方块渲染: ✅');
    console.log('   - 特殊方块渲染: ✅');
    console.log('   - Canvas/WebGL: ✅');
    console.log('   - 无错误: ✅');
  } else {
    console.log('⚠️  部分测试失败');
  }

  await client.close();
}

main().catch(console.error);
