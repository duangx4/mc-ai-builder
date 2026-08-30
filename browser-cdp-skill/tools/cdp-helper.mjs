import CDP from 'chrome-remote-interface';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), '.cdp-config.json');

export async function getConfig() {
  const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(configContent);
}

export async function connectCDP() {
  const config = await getConfig();
  try {
    const client = await CDP({ port: config.cdpPort });
    return client;
  } catch (err) {
    console.error('❌ CDP 连接失败');
    console.error('请先运行: powershell .\tools\cdp-start.ps1');
    throw err;
  }
}

export async function evalInPage(expression) {
  const client = await connectCDP();
  const { Runtime } = client;
  await Runtime.enable();
  
  const result = await Runtime.evaluate({ expression, returnByValue: true });
  await client.close();
  
  if (result.exceptionDetails) {
    throw new Error('Eval error: ' + JSON.stringify(result.exceptionDetails));
  }
  
  return result.result.value;
}

export async function screenshot(outputPath = 'screenshot.png') {
  const client = await connectCDP();
  const { Page } = client;
  await Page.enable();
  
  const { data } = await Page.captureScreenshot({ format: 'png' });
  fs.writeFileSync(outputPath, Buffer.from(data, 'base64'));
  
  await client.close();
  return outputPath;
}
