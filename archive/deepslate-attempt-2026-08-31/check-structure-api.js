/**
 * 检查 Structure API
 */
import CDP from 'chrome-remote-interface';

async function checkStructureAPI() {
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

    // 检查 Structure API
    const result = await Runtime.evaluate({
      expression: `
        (function() {
          if (!window.debugDeepslate || !window.debugDeepslate.structure) {
            return { error: 'debugDeepslate.structure 不存在，等待初始化...' };
          }

          const structure = window.debugDeepslate.structure;

          // 检查 Structure 的方法
          const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(structure))
            .filter(name => typeof structure[name] === 'function');

          // 尝试获取一个方块的状态
          let firstBlock = null;
          try {
            firstBlock = structure.getBlock([0, 0, 0]);
          } catch (e) {
            firstBlock = { error: e.message };
          }

          // 检查 palette
          const paletteInfo = {
            exists: !!structure.palette,
            type: structure.palette?.constructor?.name,
            length: Array.isArray(structure.palette) ? structure.palette.length : undefined
          };

          return {
            methods,
            firstBlock: firstBlock ? (firstBlock.error || firstBlock.toString()) : null,
            paletteInfo,
            blocksLength: structure.blocks?.length
          };
        })()
      `,
      returnByValue: true
    });

    if (result.result.value) {
      const data = result.result.value;

      if (data.error) {
        console.log('⚠️', data.error);
      } else {
        console.log('\n========== Structure API ==========');
        console.log('可用方法:', data.methods.join(', '));
        console.log('\n第一个方块 getBlock([0,0,0]):', data.firstBlock);
        console.log('\nPalette 信息:', data.paletteInfo);
        console.log('Blocks 长度:', data.blocksLength);
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

checkStructureAPI().catch(console.error);
