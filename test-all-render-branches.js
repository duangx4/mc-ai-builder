/**
 * 测试所有渲染分支 - 2026-09-01
 * 验证 VoxelWorld 中所有 27 种 BlockRenderType 的渲染分支
 */

import puppeteer from 'puppeteer';

const TEST_BLOCKS = {
    // 新增的渲染分支
    RAIL: ['rail', 'powered_rail', 'detector_rail', 'activator_rail'],
    PRESSURE_PLATE: ['stone_pressure_plate', 'oak_pressure_plate', 'heavy_weighted_pressure_plate'],
    FENCE: ['oak_fence', 'spruce_fence', 'birch_fence'],
    WALL: ['cobblestone_wall', 'stone_brick_wall', 'brick_wall'],
    GLASS_PANE: ['glass_pane', 'white_stained_glass_pane', 'iron_bars'],
    DOOR: ['oak_door', 'iron_door', 'birch_door'],
    TRAPDOOR: ['oak_trapdoor', 'iron_trapdoor', 'spruce_trapdoor'],
    BARREL: ['barrel'],
    SCAFFOLDING: ['scaffolding'],

    // 原有的渲染分支
    STAIRS: ['oak_stairs', 'stone_stairs', 'polished_deepslate_stairs'],
    SLAB: ['oak_slab', 'stone_slab', 'smooth_stone_slab'],
    GLASS: ['glass', 'white_stained_glass', 'blue_stained_glass'],
    PLANT: ['poppy', 'dandelion', 'grass', 'fern'],
    CARPET: ['white_carpet', 'red_carpet', 'blue_carpet'],
    BUTTON: ['oak_button', 'stone_button'],
    REDSTONE: ['redstone_wire', 'redstone_torch'],

    // 临时实现的
    CHEST: ['chest', 'ender_chest'],
    BED: ['red_bed', 'white_bed'],
    FURNACE: ['furnace', 'blast_furnace'],
    LADDER: ['ladder'],
    WORKSTATION: ['crafting_table', 'anvil'],
    GLOWING: ['beacon', 'sea_lantern'],
    SPECIAL: ['hopper', 'piston']
};

async function testRenderBranches() {
    console.log('🚀 启动渲染分支测试...\n');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    // 监听控制台
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('ERROR') || text.includes('Warning')) {
            console.log('⚠️', text);
        }
    });

    try {
        console.log('📱 打开应用: http://localhost:5173');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });

        // 等待 Canvas 加载
        await page.waitForSelector('canvas', { timeout: 10000 });
        console.log('✅ Canvas 已加载\n');

        // 等待一下让 Three.js 初始化
        await page.waitForTimeout(2000);

        // 测试每种类型
        let totalTested = 0;
        let successCount = 0;
        const results = {};

        for (const [type, blocks] of Object.entries(TEST_BLOCKS)) {
            console.log(`\n📦 测试 ${type} (${blocks.length} 个方块)`);
            results[type] = { total: blocks.length, success: 0, failed: [] };

            for (let i = 0; i < blocks.length; i++) {
                const blockType = blocks[i];
                const x = i * 2;
                const z = Object.keys(TEST_BLOCKS).indexOf(type) * 2;

                try {
                    // 添加方块
                    await page.evaluate((bt, px, pz) => {
                        const store = window.__voxel_store;
                        if (!store) throw new Error('Store not found');

                        const addBlock = store.getState().addBlock;
                        addBlock(bt, [px, 0, pz]);
                    }, blockType, x, z);

                    totalTested++;
                    successCount++;
                    results[type].success++;
                    console.log(`  ✅ ${blockType} at (${x}, 0, ${z})`);

                } catch (error) {
                    console.log(`  ❌ ${blockType} - ${error.message}`);
                    results[type].failed.push(blockType);
                }

                // 避免过快
                await page.waitForTimeout(50);
            }
        }

        // 等待渲染完成
        await page.waitForTimeout(2000);

        // 截图
        const screenshotPath = 'test-render-branches-result.png';
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`\n📸 截图已保存: ${screenshotPath}`);

        // 统计结果
        console.log('\n' + '='.repeat(60));
        console.log('📊 测试结果统计');
        console.log('='.repeat(60));

        for (const [type, result] of Object.entries(results)) {
            const rate = ((result.success / result.total) * 100).toFixed(1);
            const status = result.success === result.total ? '✅' : '⚠️';
            console.log(`${status} ${type}: ${result.success}/${result.total} (${rate}%)`);

            if (result.failed.length > 0) {
                console.log(`   失败: ${result.failed.join(', ')}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`总计: ${successCount}/${totalTested} 方块成功添加 (${((successCount/totalTested)*100).toFixed(1)}%)`);
        console.log('='.repeat(60));

        // 检查实际渲染的方块数
        const renderedCount = await page.evaluate(() => {
            const blocks = window.__voxel_store?.getState().blocks || [];
            return blocks.length;
        });

        console.log(`\n🎨 场景中的方块数: ${renderedCount}`);

        // 获取分组信息
        const groupInfo = await page.evaluate(() => {
            try {
                const blocks = window.__voxel_store?.getState().blocks || [];
                const { groupBlocksByRenderType } = window.__blockClassifier || {};

                if (!groupBlocksByRenderType) return null;

                const grouped = groupBlocksByRenderType(blocks);
                const info = {};

                for (const [type, typeBlocks] of Object.entries(grouped)) {
                    if (typeBlocks.length > 0) {
                        info[type] = typeBlocks.length;
                    }
                }

                return info;
            } catch (error) {
                return { error: error.message };
            }
        });

        if (groupInfo && !groupInfo.error) {
            console.log('\n📊 方块分组统计:');
            for (const [type, count] of Object.entries(groupInfo)) {
                console.log(`  ${type}: ${count}`);
            }
        }

        console.log('\n✅ 测试完成！浏览器将保持打开30秒供检查...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('\n❌ 测试失败:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// 运行测试
testRenderBranches().catch(console.error);
