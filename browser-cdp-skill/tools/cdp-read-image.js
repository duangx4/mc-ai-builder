const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');
const https = require('https');

const configPath = path.join(__dirname, '..', '.cdp-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const prompt = process.argv[2] || '描述这个页面的状态';

async function getApiKey() {
  const modelsPath = config.multimodalModel.apiKeyPath;
  if (!fs.existsSync(modelsPath)) {
    throw new Error(`API key file not found: ${modelsPath}`);
  }
  const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
  const provider = models.find(m => m.provider === config.multimodalModel.provider);
  if (!provider) {
    throw new Error(`Provider not found: ${config.multimodalModel.provider}`);
  }
  return provider.apiKey;
}

async function screenshotAndAnalyze() {
  let client;
  try {
    client = await CDP({ port: config.cdpPort });
    const { Page } = client;
    await Page.enable();
    
    console.log('📸 截图中...');
    const { data } = await Page.captureScreenshot({ format: 'jpeg', quality: 80 });
    const base64Image = data;
    
    console.log('🤖 调用多模态模型分析...');
    const apiKey = await getApiKey();
    const response = await callMultimodalAPI(base64Image, prompt, apiKey);
    
    console.log('\\n=== AI 分析结果 ===');
    console.log(response);
    console.log('==================\\n');
    
  } catch (err) {
    console.error('❌ 失败:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('请先运行: powershell .\tools\cdp-start.ps1');
    }
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

function callMultimodalAPI(base64Image, prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: config.multimodalModel.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      max_tokens: 1000
    });

    const url = new URL(config.multimodalModel.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content);
          } else {
            reject(new Error('Unexpected API response: ' + data));
          }
        } catch (err) {
          reject(err);
        }
      });
    });
    
    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

screenshotAndAnalyze();
