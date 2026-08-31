/**
 * 检查 Structure.blocks 的实际内容
 */
import CDP from 'chrome-remote-interface';

async function inspectBlocks() {
  let client;

  try {
    client = await CDP();
    const { Page, Runtime, Console } = client;

    await Page.enable();
    await Runtime.enable();
    await Console.enable();

    await Page.navigate({ url: 'http://localhost:5173/deepslate-test.html' });
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 检查 blocks 数组内容
    const result = await Runtime.evaluate({
      expression: `
        (function() {
          if (!window.debugDeepslate || !window.debugDeepslate.structure) {
            return { error: 'debugDeepslate.structure 不存在' };
          }

          const structure = window.debugDeepslate.structure;
          const blocks = structure.blocks;

          if (!Array.isArray(blocks)) {
            return { error: 'blocks 不是数组' };
          }

          // 获取前 5 个非空方块
          const samples = [];
          for (let i = 0; i < blocks.length && samples.length < 5; i++) {
            if (blocks[i]) {
              samples.push({
                index: i,
                hasState: !!blocks[i].state,
                stateString: blocks[i].state ? blocks[i].state.toString() : null
              });
            }
          }

          return {
            length: blocks.length,
            samples
          };
        })()
      `,
      returnByValue: true
    });

    if (result.result.value) {
      const data = result.result.value;

      if (data.error) {
        console.log('❌', data.error);
      } else {
        console.log('\n========== Structure.blocks 内容 ==========');
        console.log('数组长度:', data.length);
        console.log('\n前 5 个方块:');
        data.samples.forEach(sample => {
          console.log(`  [${sample.index}] state: ${sample.stateString}`);
        });
      }
    }

  } catch (err) {
    console.error('错误:', err.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

inspectBlocks().catch(console.error);
