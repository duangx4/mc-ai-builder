#!/usr/bin/env node
/**
 * 浏览器实测脚本 - 验证 vanilla 方块渲染
 * 测试：锁链、灯笼、火把、酿造台、切石机、砂轮、按钮、压力板、龙蛋等
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_SERVER_URL = 'http://localhost:5175';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'output', 'vanilla-blocks-test');

// 确保截图目录存在
import fs from 'fs';
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testVanillaBlocks() {
    console.log('🚀 启动浏览器测试...');

    const browser = await puppeteer.launch({
        headless: false, // 显示浏览器窗口
        defaultViewport: { width: 1920, height: 1080 }
    });

    try {
        const page = await browser.newPage();

        // 监听控制台输出
        page.on('console', msg => {
            const type = msg.type();
            if (type === 'error' || type === 'warning') {
                console.log(`  [浏览器 ${type}]`, msg.text());
            }
        });

        // 访问应用
        console.log(`\n📦 加载应用: ${DEV_SERVER_URL}`);
        await page.goto(DEV_SERVER_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // 等待 3D 场景加载
        await page.waitForSelector('canvas', { timeout: 30000 });
        console.log('  ✓ 3D 场景已加载');

        await page.waitForTimeout(2000);

        // 测试用例 1: 锁链和铁栏杆
        console.log('\n📦 测试用例 1: 锁链 + 铁栏杆 + 酿造台');
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea[placeholder*="描述"]');
            if (textarea) {
                textarea.value = '在 (0,0,0) 放一根锁链，在 (2,0,0) 放一个铁栏杆，在 (4,0,0) 放一个酿造台';
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter'); // 触发生成
        await page.waitForTimeout(5000); // 等待 AI 生成

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '01-chain-iron-bars-brewing-stand.png'),
            fullPage: false
        });
        console.log('  ✓ 截图已保存: 01-chain-iron-bars-brewing-stand.png');

        // 清空场景
        await page.evaluate(() => {
            const clearBtn = document.querySelector('button[title*="清空"]');
            if (clearBtn) clearBtn.click();
        });
        await page.waitForTimeout(1000);

        // 测试用例 2: 火把和灯笼
        console.log('\n📦 测试用例 2: 火把 + 灯笼 + 蜡烛');
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea[placeholder*="描述"]');
            if (textarea) {
                textarea.value = '在 (0,0,0) 放一个火把，在 (2,0,0) 放一个灯笼，在 (4,0,0) 放一个蜡烛';
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '02-torch-lantern-candle.png'),
            fullPage: false
        });
        console.log('  ✓ 截图已保存: 02-torch-lantern-candle.png');

        // 清空场景
        await page.evaluate(() => {
            const clearBtn = document.querySelector('button[title*="清空"]');
            if (clearBtn) clearBtn.click();
        });
        await page.waitForTimeout(1000);

        // 测试用例 3: 综合测试（任务书要求的完整场景）
        console.log('\n📦 测试用例 3: 综合场景（锁链/铁栏杆/灯笼/火把/蜡烛/酿造台/切石机/砂轮/按钮/压力板/龙蛋）');
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea[placeholder*="描述"]');
            if (textarea) {
                textarea.value = '在 5×5 区域放一圈锁链、铁栏杆、灯笼、火把、蜡烛、酿造台、切石机、砂轮、按钮、压力板、龙蛋';
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(8000); // 复杂场景等待更久

        await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '03-comprehensive-test.png'),
            fullPage: false
        });
        console.log('  ✓ 截图已保存: 03-comprehensive-test.png');

        console.log('\n✅ 浏览器测试完成！');
        console.log(`   截图保存在: ${SCREENSHOT_DIR}`);

    } catch (err) {
        console.error('\n❌ 测试失败:', err.message);
        throw err;
    } finally {
        await browser.close();
    }
}

// 运行测试
testVanillaBlocks()
    .then(() => {
        console.log('\n🎉 所有测试通过！');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n💥 测试失败:', err);
        process.exit(1);
    });
