const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', '.cdp-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

async function listButtons() {
  let client;
  try {
    client = await CDP({ port: config.cdpPort });
    const { Runtime } = client;
    await Runtime.enable();

    console.log('🔘 列出页面按钮...\n');

    const script = `(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'));
      return buttons.map((btn, i) => ({
        index: i,
        tag: btn.tagName,
        text: btn.textContent.trim() || btn.value || '(无文本)',
        id: btn.id || null,
        class: btn.className || null
      }));
    })()`;

    const result = await Runtime.evaluate({
      expression: script,
      returnByValue: true
    });

    const buttons = result.result.value;
    if (buttons.length === 0) {
      console.log('⚠️  未找到按钮');
    } else {
      buttons.forEach(btn => {
        console.log(`[${btn.index}] ${btn.tag}: "${btn.text}"`);
        if (btn.id) console.log(`    ID: ${btn.id}`);
        if (btn.class) console.log(`    Class: ${btn.class}`);
      });
    }

    console.log(`\n✅ 共找到 ${buttons.length} 个按钮`);

  } catch (err) {
    console.error('❌ 失败:', err.message);
    console.error('请先运行: powershell .\\tools\\cdp-start.ps1');
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

listButtons();
