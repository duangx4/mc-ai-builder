#!/usr/bin/env node
/**
 * MC 原版方块贴图 Atlas 打包脚本（Jimp 版本）
 *
 * 功能：
 * 1. 扫描 public/minecraft-1.20.1/textures/block/*.png
 * 2. 将所有贴图打包成一张 2048×2048 的 atlas.png
 * 3. 生成 atlas-uv-map.json（包含每张贴图的UV坐标）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Jimp } from 'jimp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const TILE_SIZE = 16; // 每张贴图尺寸
const ATLAS_SIZE = 2048; // Atlas 总尺寸（2的幂次）
const TILES_PER_ROW = ATLAS_SIZE / TILE_SIZE; // 每行格子数 = 128
const MAX_TILES = TILES_PER_ROW * TILES_PER_ROW; // 最大格子数 = 16384

const TEXTURES_DIR = path.join(__dirname, '../public/minecraft-1.20.1/textures/block');
const OUTPUT_ATLAS = path.join(__dirname, '../public/minecraft-1.20.1/atlas.png');
const OUTPUT_UV_MAP = path.join(__dirname, '../public/minecraft-1.20.1/atlas-uv-map.json');

async function main() {
    console.log('🚀 开始生成 MC 方块贴图 Atlas (Jimp版本)...\n');

    // 1. 扫描所有 PNG 文件
    console.log('📂 扫描贴图目录:', TEXTURES_DIR);
    const files = fs.readdirSync(TEXTURES_DIR)
        .filter(f => f.endsWith('.png'))
        .sort(); // 按字母排序，保证一致性

    console.log(`✅ 找到 ${files.length} 张贴图`);

    if (files.length > MAX_TILES) {
        console.error(`❌ 错误：贴图数量 ${files.length} 超过 Atlas 容量 ${MAX_TILES}`);
        console.error('   请增大 ATLAS_SIZE 到 4096');
        process.exit(1);
    }

    console.log('\n🎨 开始拼接 Atlas...');

    // 2. 创建空白 Atlas 画布
    const atlas = new Jimp({ width: ATLAS_SIZE, height: ATLAS_SIZE, color: 0x00000000 });

    // 3. 准备 UV 映射
    const uvMap = {
        atlasSize: [ATLAS_SIZE, ATLAS_SIZE],
        tileSize: TILE_SIZE,
        textures: {}
    };

    // 4. 逐个贴图处理
    for (let i = 0; i < files.length; i++) {
        const filename = files[i];
        const textureName = 'block/' + filename.replace('.png', '');
        const filePath = path.join(TEXTURES_DIR, filename);

        // 计算在 Atlas 上的位置（逐行填充）
        const col = i % TILES_PER_ROW;
        const row = Math.floor(i / TILES_PER_ROW);
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        try {
            // 读取并缩放贴图到 16×16
            const image = await Jimp.read(filePath);
            await image.resize({ w: TILE_SIZE, h: TILE_SIZE, mode: 'nearestNeighbor' });

            // 合成到 Atlas
            atlas.composite(image, x, y);

            // 计算归一化 UV 坐标
            const u0 = x / ATLAS_SIZE;
            const v0 = y / ATLAS_SIZE;
            const u1 = (x + TILE_SIZE) / ATLAS_SIZE;
            const v1 = (y + TILE_SIZE) / ATLAS_SIZE;

            uvMap.textures[textureName] = {
                x, y,
                width: TILE_SIZE,
                height: TILE_SIZE,
                uv: [u0, v0, u1, v1]
            };
        } catch (err) {
            console.warn(`⚠️  跳过损坏的贴图: ${filename}`, err.message);
        }

        // 进度显示
        if ((i + 1) % 100 === 0 || i === files.length - 1) {
            console.log(`   处理中... ${i + 1}/${files.length}`);
        }
    }

    // 5. 保存 Atlas
    console.log('\n🖼️  保存 Atlas 图像...');
    await atlas.write(OUTPUT_ATLAS);

    console.log(`✅ Atlas 已保存: ${OUTPUT_ATLAS}`);
    console.log(`   尺寸: ${ATLAS_SIZE}×${ATLAS_SIZE}`);
    console.log(`   格子数: ${Object.keys(uvMap.textures).length}/${MAX_TILES}`);

    // 6. 保存 UV 映射 JSON
    console.log('\n📝 生成 UV 映射表...');
    fs.writeFileSync(OUTPUT_UV_MAP, JSON.stringify(uvMap, null, 2), 'utf8');
    console.log(`✅ UV 映射已保存: ${OUTPUT_UV_MAP}`);
    console.log(`   贴图条目: ${Object.keys(uvMap.textures).length}`);

    console.log('\n🎉 Atlas 生成完成！');
}

main().catch(err => {
    console.error('❌ 生成失败:', err);
    process.exit(1);
});
