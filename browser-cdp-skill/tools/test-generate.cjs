const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', '.cdp-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

async function testGenerate() {
  let client;
  try {
    client = await CDP({ port: config.cdpPort });
    const { Runtime, Page } = client;
    await Runtime.enable();
    await Page.enable();

    console.log('🧪 自动化生成测试...\n');

    // 1. 输入方块名称
    console.log('1️⃣  输入方块名称: stone');
    await Runtime.evaluate({
      expression: `document.querySelector('input[type="text"]').value = 'stone'`
    });

    // 2. 点击生成按钮
    console.log('2️⃣  点击生成按钮');
    await Runtime.evaluate({
      expression: `document.querySelector('button').click()`
    });

    // 3. 等待渲染
    console.log('3️⃣  等待渲染...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. 验证结果
    console.log('4️⃣  验证结果');
    const result = await Runtime.evaluate({
      expression: `document.querySelector('canvas') ? '✅ Canvas 已渲染' : '❌ Canvas 未找到'`,
      returnByValue: true
    });
    console.log(`   ${result.result.value}`);

    // 5. 截图
    console.log('5️⃣  截图保存');
    const { data } = await Page.captureScreenshot({ format: 'png' });
    const outputPath = 'test-result.png';
    fs.writeFileSync(outputPath, Buffer.from(data, 'base64'));
    console.log(`   已保存: ${outputPath}`);

    console.log('\n✅ 测试完成');

  } catch (err) {
    console.error('❌ 测试失败:', err.message);
    console.error('请先运行: powershell .\\tools\\cdp-start.ps1');
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

testGenerate();
