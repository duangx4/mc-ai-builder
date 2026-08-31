/**
 * 调试 Structure.blocks 的实际结构
 */
import CDP from 'chrome-remote-interface';

async function debugStructureBlocks() {
  let client;

  try {
    client = await CDP();
    const { Page, Runtime, Console } = client;

    await Page.enable();
    await Runtime.enable();
    await Console.enable();

    Console.messageAdded((params) => {
      const msg = params.message;
      if (msg.text.includes('[DEBUG]')) {
        console.log(msg.text);
      }
    });

    await Page.navigate({ url: 'http://localhost:5173/deepslate-test.html' });
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 注入调试代码
    await Runtime.evaluate({
      expression: `
        // 在 DeepslateRenderer 中添加调试日志
        if (window.debugDeepslate && window.debugDeepslate.structure) {
          const structure = window.debugDeepslate.structure;

          console.log('[DEBUG] Structure 对象:', structure);
          console.log('[DEBUG] structure.blocks 类型:', structure.blocks?.constructor.name);
          console.log('[DEBUG] structure.blocks 是 Map:', structure.blocks instanceof Map);

          if (structure.blocks instanceof Map) {
            console.log('[DEBUG] blocks.size:', structure.blocks.size);

            // 打印前 3 个方块
            let count = 0;
            for (const [pos, block] of structure.blocks.entries()) {
              if (count < 3) {
                console.log('[DEBUG] Entry', count, ':', {
                  pos,
                  block,
                  state: block?.state?.toString(),
                  hasState: !!block?.state
                });
                count++;
              }
            }
          } else if (Array.isArray(structure.blocks)) {
            console.log('[DEBUG] blocks 是数组，长度:', structure.blocks.length);
            console.log('[DEBUG] 前 3 个元素:', structure.blocks.slice(0, 3));
          } else {
            console.log('[DEBUG] blocks 类型未知');
          }
        } else {
          console.log('[DEBUG] window.debugDeepslate 或 structure 不存在');
        }
      `
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

  } catch (err) {
    console.error('错误:', err.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

debugStructureBlocks().catch(console.error);
