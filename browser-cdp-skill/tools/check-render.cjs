const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', '.cdp-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

async function checkRender() {
  let client;
  try {
    client = await CDP({ port: config.cdpPort });
    const { Runtime } = client;
    await Runtime.enable();
    
    console.log('🔍 检查渲染状态...\\n');

    const checks = [
      {
        name: '方块数据',
        expr: 'window.blockData ? Object.keys(window.blockData).length : 0'
      },
      {
        name: 'Canvas 元素',
        expr: 'document.querySelector("canvas") ? "✅ 存在" : "❌ 不存在"'
      },
      {
        name: '分类文件加载',
        expr: 'window.blocksClassification ? "✅ 已加载" : "❌ 未加载"'
      },
      {
        name: '控制台错误',
        expr: '(() => { const errors = window.__consoleErrors || []; return errors.length > 0 ? errors.join(", ") : "✅ 无错误"; })()'
      }
    ];

    for (const check of checks) {
      const result = await Runtime.evaluate({
        expression: check.expr,
        returnByValue: true
      });

      const value = result.result.value;
      console.log(`[${check.name}] ${value}`);
    }

    console.log('\\n✅ 检查完成');
    
  } catch (err) {
    console.error('❌ 检查失败:', err.message);
    console.error('请先运行: powershell .\tools\cdp-start.ps1');
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

checkRender();
