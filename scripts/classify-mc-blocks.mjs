#!/usr/bin/env node
/**
 * MC 原版方块自动化分类扫描脚本
 * 输入：MC 1.20.1 assets (models/block + blockstates)
 * 输出：blocks-classification.json（6类分类）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MC 资源路径
const MC_ASSETS_PATH = 'C:\\Users\\21972\\OneDrive\\Desktop\\新建文件夹\\YDJMC\\assets\\minecraft';
const MODELS_PATH = path.join(MC_ASSETS_PATH, 'models', 'block');
const BLOCKSTATES_PATH = path.join(MC_ASSETS_PATH, 'blockstates');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'minecraft-1.20.1', 'blocks-classification.json');

// 分类结果
const classification = {
  fullBlock: [],
  simpleShape: [],
  multiElement: [],
  rotation: [],
  blockEntity: [],
  multipart: []
};

/**
 * 判断是否为满格方块 [0,0,0] → [16,16,16]
 */
function isFullBlock(element) {
  if (!element.from || !element.to) return false;
  return JSON.stringify(element.from) === '[0,0,0]' &&
         JSON.stringify(element.to) === '[16,16,16]';
}

/**
 * 判断元素是否包含旋转
 */
function hasRotation(element) {
  return element.rotation !== undefined;
}

/**
 * 分类单个模型文件
 */
function classifyModel(modelName, modelData) {
  // blockEntity：空模型或仅有 textures（床/头颅/旗帜/钟/箱子/告示牌）
  if (!modelData.elements || modelData.elements.length === 0) {
    classification.blockEntity.push(modelName);
    return;
  }

  const elements = modelData.elements;

  // 单 element
  if (elements.length === 1) {
    const elem = elements[0];

    // fullBlock：满格
    if (isFullBlock(elem)) {
      classification.fullBlock.push(modelName);
      return;
    }

    // rotation：带旋转
    if (hasRotation(elem)) {
      classification.rotation.push(modelName);
      return;
    }

    // simpleShape：单元素非满格
    classification.simpleShape.push(modelName);
    return;
  }

  // 多 element
  // 先检查是否有旋转
  const hasAnyRotation = elements.some(hasRotation);
  if (hasAnyRotation) {
    classification.rotation.push(modelName);
  } else {
    classification.multiElement.push(modelName);
  }
}

/**
 * 扫描所有模型文件
 */
function scanModels() {
  console.log('📦 开始扫描模型文件...');

  if (!fs.existsSync(MODELS_PATH)) {
    console.error(`❌ 模型路径不存在: ${MODELS_PATH}`);
    process.exit(1);
  }

  const files = fs.readdirSync(MODELS_PATH);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  console.log(`   找到 ${jsonFiles.length} 个模型文件`);

  for (const file of jsonFiles) {
    const modelName = path.basename(file, '.json');
    const filePath = path.join(MODELS_PATH, file);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const modelData = JSON.parse(content);

      classifyModel(modelName, modelData);
    } catch (err) {
      console.warn(`   ⚠️  解析失败: ${file} - ${err.message}`);
    }
  }
}

/**
 * 扫描 blockstates 识别 multipart 类型
 */
function scanBlockstates() {
  console.log('\n📦 开始扫描 blockstates...');

  if (!fs.existsSync(BLOCKSTATES_PATH)) {
    console.error(`❌ blockstates 路径不存在: ${BLOCKSTATES_PATH}`);
    process.exit(1);
  }

  const files = fs.readdirSync(BLOCKSTATES_PATH);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  console.log(`   找到 ${jsonFiles.length} 个 blockstate 文件`);

  for (const file of jsonFiles) {
    const blockName = path.basename(file, '.json');
    const filePath = path.join(BLOCKSTATES_PATH, file);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const blockstateData = JSON.parse(content);

      // multipart 类型（栅栏/墙/玻璃板等连接类）
      if (blockstateData.multipart) {
        // 从其他分类中移除（如果存在）
        for (const key in classification) {
          const idx = classification[key].indexOf(blockName);
          if (idx !== -1) {
            classification[key].splice(idx, 1);
          }
        }

        classification.multipart.push(blockName);
      }
    } catch (err) {
      console.warn(`   ⚠️  解析失败: ${file} - ${err.message}`);
    }
  }
}

/**
 * 输出分类结果
 */
function outputResults() {
  console.log('\n📊 分类统计：');
  console.log(`   fullBlock: ${classification.fullBlock.length}`);
  console.log(`   simpleShape: ${classification.simpleShape.length}`);
  console.log(`   multiElement: ${classification.multiElement.length}`);
  console.log(`   rotation: ${classification.rotation.length}`);
  console.log(`   blockEntity: ${classification.blockEntity.length}`);
  console.log(`   multipart: ${classification.multipart.length}`);
  console.log(`   总计: ${Object.values(classification).reduce((sum, arr) => sum + arr.length, 0)}`);

  // 确保输出目录存在
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 写入文件
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(classification, null, 2), 'utf-8');
  console.log(`\n✅ 分类结果已保存到: ${OUTPUT_PATH}`);
}

// 主流程
console.log('🚀 MC 原版方块自动化分类扫描');
console.log(`   资源路径: ${MC_ASSETS_PATH}\n`);

scanModels();
scanBlockstates();
outputResults();
