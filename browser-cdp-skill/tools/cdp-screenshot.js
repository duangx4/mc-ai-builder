const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', '.cdp-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const outputPath = process.argv[2] || 'screenshot.png';

async function takeScreenshot() {
  let client;
  try {
    client = await CDP({ port: config.cdpPort });
    const { Page } = client;
    await Page.enable();
    
    console.log('📸 截图中...');
    const { data } = await Page.captureScreenshot({ format: 'png' });
    fs.writeFileSync(outputPath, Buffer.from(data, 'base64'));
    
    console.log();
  } catch (err) {
    console.error('❌ 截图失败:', err.message);
    console.error('请先运行: powershell .\tools\cdp-start.ps1');
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

takeScreenshot();
