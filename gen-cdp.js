const fs = require('fs');
const path = require('path');

console.log('Creating CDP Skill Package...');

// Create .cdp-config.json
const config = {
  "edgePath": "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "userDataDir": "C:\\Users\\21972\\.openclaw\\workspace-agent-401e4ca1\\edge-cdp-profile",
  "cdpPort": 9222,
  "defaultUrl": "http://localhost:5177",
  "multimodalModel": {
    "provider": "luna",
    "model": "gpt-5.6-terra",
    "baseUrl": "https://platform.lantian.pro/v1",
    "apiKeyPath": "C:/Users/21972/.openclaw/agents/agent-401e4ca1/agent/models.json"
  }
};

fs.writeFileSync('browser-cdp-skill/.cdp-config.json', JSON.stringify(config, null, 2));
console.log('✅ .cdp-config.json');

// Create SKILL.md
const skillMd = `# 浏览器 CDP 自动化技能

## 这是什么

一套完整的浏览器自动化工具，基于 Chrome DevTools Protocol (CDP)，让 Claude 能够：
- 启动并控制 Edge 浏览器
- 执行 JavaScript 读取页面状态
- 截图并分析图片内容（多模态）
- 自动化测试（表单填写、点击、验证）

## 何时使用

- **Web 应用调试**：检查 Three.js 渲染状态、DOM 结构、控制台错误
- **UI 自动化测试**：填表单、点按钮、验证结果
- **视觉分析**：截图后用多模态模型分析页面是否正常显示
- **数据提取**：从运行中的页面提取 JavaScript 变量、状态

## 依赖

- **chrome-remote-interface**：Node.js CDP 客户端
- **Edge 浏览器**：已安装在 \`C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe\`
- **多模态模型**：lantian/gpt-5.6-terra（用于图片分析）

## 技能结构

\`\`\`
browser-cdp-skill/
├── SKILL.md              # 本文件
├── USAGE.md              # 使用文档
├── .cdp-config.json      # 配置文件
├── install.ps1           # 依赖安装脚本
└── tools/
    ├── cdp-start.ps1            # 启动 Edge CDP
    ├── cdp-helper.mjs           # 基础 CDP 连接和 eval
    ├── cdp-screenshot.js        # 截图工具
    ├── cdp-read-image.js        # 截图 + 多模态读图
    ├── check-render.cjs         # 检查方块渲染状态
    ├── check-render-state.cjs   # 深度渲染状态检查
    ├── list-buttons.cjs         # 列出页面按钮
    └── test-generate.cjs        # 自动化生成测试
\`\`\`

## 快速开始

\`\`\`bash
# 1. 安装依赖
cd browser-cdp-skill
powershell .\\install.ps1

# 2. 启动 CDP 浏览器
powershell .\\tools\\cdp-start.ps1 -Url http://localhost:5177

# 3. 检查页面状态
node tools\\check-render.cjs

# 4. 截图并分析
node tools\\cdp-read-image.js "页面是否正常显示？有没有方块？"
\`\`\`

## 注意事项

- 所有脚本使用绝对路径，可在任何 cwd 运行
- CDP 端口默认 9222，可在配置文件中修改
- 多模态 API key 从 \`models.json\` 动态读取，不硬编码
- 截图自动压缩为 JPEG 80% 质量以节省 token
`;

fs.writeFileSync('browser-cdp-skill/SKILL.md', skillMd);
console.log('✅ SKILL.md');

// Create check-render-state.cjs
const checkRenderStateCjs = `const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', '.cdp-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

async function checkRenderState() {
  let client;
  try {
    client = await CDP({ port: config.cdpPort });
    const { Runtime } = client;
    await Runtime.enable();

    console.log('🔬 深度渲染状态检查...\\n');

    const checkScript = \`(() => {
      const scene = window.__three_scene;
      if (!scene) return { error: 'Three.js scene 未暴露到 window.__three_scene' };

      const materials = [];
      const geometries = [];
      const lights = [];

      scene.traverse(obj => {
        if (obj.material) materials.push(obj.material);
        if (obj.geometry) geometries.push(obj.geometry);
        if (obj.isLight) lights.push({ type: obj.type, intensity: obj.intensity });
      });

      const textureInfo = materials.map((mat, i) => ({
        index: i,
        hasMap: !!mat.map,
        mapLoaded: mat.map && mat.map.image ? true : false,
        mapSize: mat.map && mat.map.image ? \\\`\\\${mat.map.image.width}x\\\${mat.map.image.height}\\\` : null,
        transparent: mat.transparent,
        alphaTest: mat.alphaTest
      }));

      return {
        materials: materials.length,
        geometries: geometries.length,
        lights: lights,
        textureInfo: textureInfo.slice(0, 5)
      };
    })()\`;

    const result = await Runtime.evaluate({
      expression: checkScript,
      returnByValue: true
    });

    if (result.exceptionDetails) {
      console.error('❌ 执行错误:', result.exceptionDetails);
    } else {
      const data = result.result.value;
      if (data.error) {
        console.log('⚠️ ', data.error);
        console.log('提示: 在项目代码中添加 window.__three_scene = scene');
      } else {
        console.log('场景统计:');
        console.log('  材质数量:', data.materials);
        console.log('  几何体数量:', data.geometries);
        console.log('  光源:', JSON.stringify(data.lights, null, 2));
        console.log('\\n前 5 个材质纹理状态:');
        data.textureInfo.forEach(t => {
          console.log(\`  [\${t.index}] Map: \${t.hasMap ? '✅' : '❌'}, Loaded: \${t.mapLoaded ? '✅' : '❌'}, Size: \${t.mapSize || 'N/A'}\`);
        });
      }
    }

    console.log('\\n✅ 深度检查完成');

  } catch (err) {
    console.error('❌ 检查失败:', err.message);
    console.error('请先运行: powershell .\\\\tools\\\\cdp-start.ps1');
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

checkRenderState();
`;

fs.writeFileSync('browser-cdp-skill/tools/check-render-state.cjs', checkRenderStateCjs);
console.log('✅ check-render-state.cjs');

// Create list-buttons.cjs
const listButtonsCjs = `const CDP = require('chrome-remote-interface');
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

    console.log('🔘 列出页面按钮...\\n');

    const script = \`(() => {
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'));
      return buttons.map((btn, i) => ({
        index: i,
        tag: btn.tagName,
        text: btn.textContent.trim() || btn.value || '(无文本)',
        id: btn.id || null,
        class: btn.className || null
      }));
    })()\`;

    const result = await Runtime.evaluate({
      expression: script,
      returnByValue: true
    });

    const buttons = result.result.value;
    if (buttons.length === 0) {
      console.log('⚠️  未找到按钮');
    } else {
      buttons.forEach(btn => {
        console.log(\`[\${btn.index}] \${btn.tag}: "\${btn.text}"\`);
        if (btn.id) console.log(\`    ID: \${btn.id}\`);
        if (btn.class) console.log(\`    Class: \${btn.class}\`);
      });
    }

    console.log(\`\\n✅ 共找到 \${buttons.length} 个按钮\`);

  } catch (err) {
    console.error('❌ 失败:', err.message);
    console.error('请先运行: powershell .\\\\tools\\\\cdp-start.ps1');
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

listButtons();
`;

fs.writeFileSync('browser-cdp-skill/tools/list-buttons.cjs', listButtonsCjs);
console.log('✅ list-buttons.cjs');

// Create test-generate.cjs
const testGenerateCjs = `const CDP = require('chrome-remote-interface');
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

    console.log('🧪 自动化生成测试...\\n');

    // 1. 输入方块名称
    console.log('1️⃣  输入方块名称: stone');
    await Runtime.evaluate({
      expression: \`document.querySelector('input[type="text"]').value = 'stone'\`
    });

    // 2. 点击生成按钮
    console.log('2️⃣  点击生成按钮');
    await Runtime.evaluate({
      expression: \`document.querySelector('button').click()\`
    });

    // 3. 等待渲染
    console.log('3️⃣  等待渲染...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. 验证结果
    console.log('4️⃣  验证结果');
    const result = await Runtime.evaluate({
      expression: \`document.querySelector('canvas') ? '✅ Canvas 已渲染' : '❌ Canvas 未找到'\`,
      returnByValue: true
    });
    console.log(\`   \${result.result.value}\`);

    // 5. 截图
    console.log('5️⃣  截图保存');
    const { data } = await Page.captureScreenshot({ format: 'png' });
    const outputPath = 'test-result.png';
    fs.writeFileSync(outputPath, Buffer.from(data, 'base64'));
    console.log(\`   已保存: \${outputPath}\`);

    console.log('\\n✅ 测试完成');

  } catch (err) {
    console.error('❌ 测试失败:', err.message);
    console.error('请先运行: powershell .\\\\tools\\\\cdp-start.ps1');
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

testGenerate();
`;

fs.writeFileSync('browser-cdp-skill/tools/test-generate.cjs', testGenerateCjs);
console.log('✅ test-generate.cjs');

console.log('\n✅ All CDP skill files created!');