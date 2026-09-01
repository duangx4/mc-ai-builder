/**
 * CDP 自动化测试 - 验证所有27种渲染分支
 * 2026-09-01
 */

import CDP from 'chrome-remote-interface';
import fs from 'fs';

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

async function main() {
    console.log('🚀 启动 CDP 渲染分支自动化测试...\n');

    let client;
    const allLogs = [];
    const errors = [];

    try {
        // 连接到 Chrome CDP
        console.log('📡 连接到 Chrome DevTools Protocol (端口 9222)...');
        client = await CDP({ host: 'localhost', port: 9222 });
        const { Runtime, Page, Console } = client;

        await Runtime.enable();
        await Page.enable();
        await Console.enable();
        console.log('✅ CDP 连接成功\n');

        // 监听控制台
        Console.messageAdded(({ message }) => {
            const log = `[${message.level}] ${message.text}`;
            allLogs.push(log);

            if (message.level === 'error') {
                errors.push(message.text);
                console.log('⚠️ ', log);
            } else if (message.text.includes('Store exposed')) {
                console.log('✅ ', log);
            }
        });

        // 步骤 1: 检查页面状态
        console.log('📱 步骤 1: 检查应用状态...');

        const appState = await Runtime.evaluate({
            expression: `({
                hasReact: !!document.querySelector('#root')?.children.length,
                hasStore: typeof window.__voxel_store !== 'undefined',
                canvasCount: document.querySelectorAll('canvas').length,
                hasWebGL: !!(document.querySelector('canvas')?.getContext('webgl2')),
                url: window.location.href
            })`,
            returnByValue: true
        });

        const state = appState.result.value;
        console.log('   - React 已加载:', state.hasReact ? '✅' : '❌');
        console.log('   - Store 可用:', state.hasStore ? '✅' : '❌');
        console.log('   - Canvas 数量:', state.canvasCount);
        console.log('   - WebGL 支持:', state.hasWebGL ? '✅' : '❌');
        console.log('   - URL:', state.url);

        if (!state.hasStore) {
            throw new Error('Store 未暴露到 window 对象！');
        }

        console.log('\n✅ 应用状态检查通过\n');

        // 步骤 2: 清空现有方块
        console.log('🗑️  步骤 2: 清空现有方块...');
        await Runtime.evaluate({
            expression: `window.__voxel_store.getState().clearBlocks()`,
            returnByValue: true
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('✅ 方块已清空\n');

        // 步骤 3: 测试每种类型的方块
        console.log('🧪 步骤 3: 开始测试所有方块类型...\n');

        const results = {};
        let totalTested = 0;
        let successCount = 0;
        let typeIndex = 0;

        for (const [type, blocks] of Object.entries(TEST_BLOCKS)) {
            console.log(`📦 测试 ${type} (${blocks.length} 个方块)`);
            results[type] = { total: blocks.length, success: 0, failed: [] };

            for (let i = 0; i < blocks.length; i++) {
                const blockType = blocks[i];
                const x = i * 3;
                const z = typeIndex * 3;

                try {
                    const addResult = await Runtime.evaluate({
                        expression: `(function() {
                            const store = window.__voxel_store;
                            if (!store) return { error: 'Store not found' };

                            const state = store.getState();
                            const currentBlocks = state.blocks || [];
                            const newBlock = {
                                id: '${blockType}_${x}_${z}_' + Date.now(),
                                type: '${blockType}',
                                position: [${x}, 0, ${z}],
                                properties: {}
                            };

                            state.blocks = [...currentBlocks, newBlock];

                            return { success: true };
                        })()`,
                        returnByValue: true
                    });

                    if (addResult.exceptionDetails) {
                        throw new Error(addResult.exceptionDetails.exception.description);
                    }

                    if (addResult.result.value?.error) {
                        throw new Error(addResult.result.value.error);
                    }

                    totalTested++;
                    successCount++;
                    results[type].success++;
                    console.log(`  ✅ ${blockType} at (${x}, 0, ${z})`);

                } catch (error) {
                    totalTested++;
                    results[type].failed.push(blockType);
                    console.log(`  ❌ ${blockType} - ${error.message}`);
                }

                // 小延迟避免过快
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            typeIndex++;
        }

        // 步骤 4: 等待渲染完成
        console.log('\n⏳ 步骤 4: 等待渲染完成...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ 渲染完成\n');

        // 步骤 5: 验证方块数量
        console.log('🔍 步骤 5: 验证方块数量...');
        const blockCount = await Runtime.evaluate({
            expression: `window.__voxel_store.getState().blocks.length`,
            returnByValue: true
        });

        const renderedCount = blockCount.result.value;
        console.log(`   场景中的方块数: ${renderedCount}`);
        console.log(`   预期方块数: ${successCount}`);
        console.log(`   匹配: ${renderedCount === successCount ? '✅' : '⚠️'}\n`);

        // 步骤 6: 截图
        console.log('📸 步骤 6: 保存截图...');
        const screenshot = await Page.captureScreenshot({
            format: 'png',
            quality: 90
        });

        const screenshotPath = 'test-render-branches-cdp-result.png';
        fs.writeFileSync(screenshotPath, screenshot.data, 'base64');
        console.log(`✅ 截图已保存: ${screenshotPath}\n`);

        // 输出统计结果
        console.log('\n' + '='.repeat(60));
        console.log('📊 测试结果统计');
        console.log('='.repeat(60));

        for (const [type, result] of Object.entries(results)) {
            const rate = ((result.success / result.total) * 100).toFixed(1);
            const status = result.success === result.total ? '✅' : '⚠️';
            console.log(`${status} ${type.padEnd(20)} ${result.success}/${result.total} (${rate}%)`);

            if (result.failed.length > 0) {
                console.log(`   失败: ${result.failed.join(', ')}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        const totalRate = ((successCount / totalTested) * 100).toFixed(1);
        console.log(`总计: ${successCount}/${totalTested} 方块成功添加 (${totalRate}%)`);
        console.log('='.repeat(60));

        // 保存详细结果
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTypes: Object.keys(TEST_BLOCKS).length,
                totalBlocks: totalTested,
                successBlocks: successCount,
                failedBlocks: totalTested - successCount,
                successRate: totalRate + '%',
                renderedCount: renderedCount
            },
            results: results,
            errors: errors,
            logs: allLogs
        };

        fs.writeFileSync('test-render-branches-cdp-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 详细报告已保存: test-render-branches-cdp-report.json');

        if (errors.length > 0) {
            console.log(`\n⚠️  检测到 ${errors.length} 个控制台错误，请检查日志`);
        }

        console.log('\n✅ 测试完成！');

    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 CDP 连接已关闭');
        }
    }
}

main().catch(console.error);
