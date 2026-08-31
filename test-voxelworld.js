/**
 * VoxelWorld 基本功能验证脚本
 * 使用 CDP 连接到浏览器，自动化测试渲染功能
 */

import CDP from 'chrome-remote-interface';

const TEST_CASES = [
  {
    name: '基础方块渲染',
    code: `
      builder.set(0, 0, 0, 'stone');
      builder.set(1, 0, 0, 'dirt');
      builder.set(2, 0, 0, 'grass_block');
    `,
    expectedBlocks: 3
  },
  {
    name: '楼梯方块测试',
    code: `
      builder.set(0, 0, 0, 'oak_stairs?facing=north');
      builder.set(1, 0, 0, 'stone_stairs?facing=south');
      builder.set(2, 0, 0, 'polished_deepslate_stairs?facing=east');
    `,
    expectedBlocks: 3
  },
  {
    name: '特殊方块测试',
    code: `
      builder.set(0, 0, 0, 'crying_obsidian');
      builder.set(1, 0, 0, 'dragon_egg');
      builder.set(2, 0, 0, 'torch');
    `,
    expectedBlocks: 3
  },
  {
    name: '填充功能测试',
    code: `
      builder.fill(0, 0, 0, 5, 3, 5, 'stone');
    `,
    expectedBlocks: 6 * 4 * 6
  }
];

async function connectToBrowser(host = 'localhost', port = 9222) {
  try {
    const client = await CDP({ host, port });
    console.log('✅ 连接到 Chrome DevTools Protocol');
    return client;
  } catch (error) {
    console.error('❌ 无法连接到 Chrome，请确保启动了带调试端口的 Chrome：');
    console.error('   chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\\temp\\chrome-debug"');
    process.exit(1);
  }
}

async function navigateToApp(client, url = 'http://localhost:5176') {
  const { Page } = client;
  await Page.enable();
  await Page.navigate({ url });
  await Page.loadEventFired();
  console.log(`✅ 导航到 ${url}`);

  // 等待 React 应用加载
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function runTest(client, testCase) {
  const { Runtime, Console } = client;
  await Runtime.enable();
  await Console.enable();

  console.log(`\n📋 测试: ${testCase.name}`);
  console.log(`   代码: ${testCase.code.trim().substring(0, 50)}...`);

  // 清空画布
  await Runtime.evaluate({
    expression: `
      if (window.useStore) {
        window.useStore.getState().clearBlocks();
        console.log('[Test] Canvas cleared');
      }
    `
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  // 执行测试代码
  const result = await Runtime.evaluate({
    expression: `
      (function() {
        try {
          const builder = {
            blocks: [],
            set: function(x, y, z, block) {
              this.blocks.push({ x, y, z, block });
              if (window.useStore) {
                window.useStore.getState().addBlock({ x, y, z, type: block });
              }
            },
            fill: function(x1, y1, z1, x2, y2, z2, block) {
              for (let x = x1; x <= x2; x++) {
                for (let y = y1; y <= y2; y++) {
                  for (let z = z1; z <= z2; z++) {
                    this.set(x, y, z, block);
                  }
                }
              }
            }
          };

          ${testCase.code}

          return {
            success: true,
            blocksAdded: builder.blocks.length,
            storeBlocks: window.useStore ? window.useStore.getState().blocks.length : 0
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            stack: error.stack
          };
        }
      })()
    `,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    console.log('   ❌ 执行错误:', result.exceptionDetails.exception.description);
    return { passed: false, error: result.exceptionDetails };
  }

  const data = result.result.value;

  if (!data.success) {
    console.log('   ❌ 测试失败:', data.error);
    return { passed: false, error: data.error };
  }

  console.log(`   ✅ 方块添加: ${data.blocksAdded}`);
  console.log(`   ✅ Store 方块数: ${data.storeBlocks}`);

  // 等待渲染
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 检查渲染状态
  const renderCheck = await Runtime.evaluate({
    expression: `
      (function() {
        const canvas = document.querySelector('canvas');
        if (!canvas) {
          return { hasCanvas: false };
        }

        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        return {
          hasCanvas: true,
          canvasSize: { width: canvas.width, height: canvas.height },
          canvasStyle: { width: canvas.style.width, height: canvas.style.height },
          hasWebGL: !!gl,
          contextType: gl ? gl.constructor.name : null
        };
      })()
    `,
    returnByValue: true
  });

  const renderData = renderCheck.result.value;

  if (!renderData.hasCanvas) {
    console.log('   ⚠️  警告: 未找到 Canvas 元素');
    return { passed: false, warning: 'No canvas found' };
  }

  console.log(`   Canvas: ${renderData.canvasSize.width}x${renderData.canvasSize.height}`);
  console.log(`   WebGL: ${renderData.hasWebGL ? '✅' : '❌'}`);

  // 检查控制台错误
  const errors = [];
  Console.messageAdded(({ message }) => {
    if (message.level === 'error') {
      errors.push(message.text);
    }
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  if (errors.length > 0) {
    console.log('   ⚠️  控制台错误:');
    errors.forEach(err => console.log(`      - ${err}`));
  }

  const passed = data.storeBlocks === testCase.expectedBlocks && renderData.hasWebGL;

  if (passed) {
    console.log(`   ✅ 测试通过`);
  } else {
    console.log(`   ❌ 测试未完全通过 (期望: ${testCase.expectedBlocks} 方块)`);
  }

  return { passed, data, renderData, errors };
}

async function main() {
  console.log('🔍 VoxelWorld 基本功能验证\n');

  const client = await connectToBrowser();
  await navigateToApp(client);

  const results = [];

  for (const testCase of TEST_CASES) {
    const result = await runTest(client, testCase);
    results.push({ testCase: testCase.name, ...result });
  }

  console.log('\n📊 测试总结\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  console.log(`总计: ${results.length} 个测试`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 所有测试通过！VoxelWorld 基本功能正常。');
  } else {
    console.log('\n⚠️  部分测试失败，需要进一步调试。');
    console.log('\n失败的测试:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testCase}`);
      if (r.error) console.log(`    错误: ${r.error}`);
      if (r.warning) console.log(`    警告: ${r.warning}`);
    });
  }

  await client.close();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
