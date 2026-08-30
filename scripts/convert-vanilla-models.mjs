#!/usr/bin/env node
/**
 * MC 原版方块坐标自动转换脚本
 * 输入：blocks-classification.json + models/block/*.json
 * 输出：vanilla-block-models.json（16格系 → Three.js 归一化坐标）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 路径配置
const MC_ASSETS_PATH = 'C:\\Users\\21972\\OneDrive\\Desktop\\新建文件夹\\YDJMC\\assets\\minecraft';
const MODELS_PATH = path.join(MC_ASSETS_PATH, 'models', 'block');
const CLASSIFICATION_PATH = path.join(__dirname, '..', 'public', 'minecraft-1.20.1', 'blocks-classification.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'minecraft-1.20.1', 'vanilla-block-models.json');

/**
 * 转换坐标数组（16格系 → 0-1归一化）
 */
function convertCoordArray(coord) {
  if (!coord || !Array.isArray(coord) || coord.length !== 3) return coord;
  return coord.map(v => v / 16);
}

/**
 * 转换UV坐标（如果存在）
 */
function convertUV(uv) {
  if (!uv || !Array.isArray(uv)) return uv;
  return uv.map(v => v / 16);
}

/**
 * 转换单个 face 数据
 */
function convertFace(face) {
  if (!face) return face;

  const converted = { ...face };

  // 转换 UV 坐标
  if (face.uv) {
    converted.uv = convertUV(face.uv);
  }

  return converted;
}

/**
 * 转换单个 element
 */
function convertElement(element) {
  const converted = {};

  // 转换 from/to 坐标
  if (element.from) {
    converted.from = convertCoordArray(element.from);
  }
  if (element.to) {
    converted.to = convertCoordArray(element.to);
  }

  // 保留 rotation（只转换 origin 坐标）
  if (element.rotation) {
    converted.rotation = {
      ...element.rotation,
      origin: convertCoordArray(element.rotation.origin)
    };
  }

  // 转换 faces
  if (element.faces) {
    converted.faces = {};
    for (const [direction, face] of Object.entries(element.faces)) {
      converted.faces[direction] = convertFace(face);
    }
  }

  // 保留其他属性
  if (element.shade !== undefined) converted.shade = element.shade;

  return converted;
}

/**
 * 转换模型数据
 */
function convertModel(modelData) {
  const converted = {};

  // 转换 elements
  if (modelData.elements) {
    converted.elements = modelData.elements.map(convertElement);
  }

  // 保留 textures 映射
  if (modelData.textures) {
    converted.textures = { ...modelData.textures };
  }

  // 保留 parent（用于继承）
  if (modelData.parent) {
    converted.parent = modelData.parent;
  }

  return converted;
}

/**
 * 递归解析 parent 继承链
 */
function resolveParent(modelData, modelName, cache = new Set()) {
  // 防止循环引用
  if (cache.has(modelName)) {
    return modelData;
  }
  cache.add(modelName);

  if (!modelData.parent) {
    return modelData;
  }

  // 解析 parent 路径
  let parentPath = modelData.parent;
  if (parentPath.startsWith('minecraft:block/')) {
    parentPath = parentPath.replace('minecraft:block/', '');
  } else if (parentPath.startsWith('block/')) {
    parentPath = parentPath.replace('block/', '');
  }

  const parentFile = path.join(MODELS_PATH, `${parentPath}.json`);

  if (!fs.existsSync(parentFile)) {
    return modelData;
  }

  try {
    const parentContent = fs.readFileSync(parentFile, 'utf-8');
    const parentData = JSON.parse(parentContent);

    // 递归解析 parent 的 parent
    const resolvedParent = resolveParent(parentData, parentPath, cache);

    // 合并：子覆盖父
    return {
      ...resolvedParent,
      ...modelData,
      textures: {
        ...(resolvedParent.textures || {}),
        ...(modelData.textures || {})
      },
      elements: modelData.elements || resolvedParent.elements
    };
  } catch (err) {
    console.warn(`   ⚠️  解析 parent 失败: ${parentPath} - ${err.message}`);
    return modelData;
  }
}

/**
 * 主处理流程
 */
function processModels() {
  console.log('🚀 MC 原版方块坐标转换');
  console.log(`   分类文件: ${CLASSIFICATION_PATH}\n`);

  // 读取分类结果
  if (!fs.existsSync(CLASSIFICATION_PATH)) {
    console.error('❌ 分类文件不存在，请先运行 classify-mc-blocks.mjs');
    process.exit(1);
  }

  const classification = JSON.parse(fs.readFileSync(CLASSIFICATION_PATH, 'utf-8'));

  // 需要转换的类别
  const targetCategories = ['multiElement', 'simpleShape', 'rotation'];
  const blockNames = new Set();

  for (const category of targetCategories) {
    if (classification[category]) {
      classification[category].forEach(name => blockNames.add(name));
    }
  }

  console.log(`📦 待转换方块数: ${blockNames.size}`);
  console.log(`   multiElement: ${classification.multiElement.length}`);
  console.log(`   simpleShape: ${classification.simpleShape.length}`);
  console.log(`   rotation: ${classification.rotation.length}\n`);

  const convertedModels = {};
  let successCount = 0;
  let failCount = 0;

  for (const blockName of blockNames) {
    const modelFile = path.join(MODELS_PATH, `${blockName}.json`);

    if (!fs.existsSync(modelFile)) {
      console.warn(`   ⚠️  模型文件不存在: ${blockName}`);
      failCount++;
      continue;
    }

    try {
      const content = fs.readFileSync(modelFile, 'utf-8');
      let modelData = JSON.parse(content);

      // 解析 parent 继承
      modelData = resolveParent(modelData, blockName);

      // 只转换有 elements 的模型
      if (modelData.elements && modelData.elements.length > 0) {
        convertedModels[blockName] = convertModel(modelData);
        successCount++;
      } else {
        failCount++;
      }
    } catch (err) {
      console.warn(`   ⚠️  转换失败: ${blockName} - ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 转换统计：`);
  console.log(`   成功: ${successCount}`);
  console.log(`   失败/跳过: ${failCount}`);

  // 写入输出文件
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(convertedModels, null, 2), 'utf-8');
  console.log(`\n✅ 转换结果已保存到: ${OUTPUT_PATH}`);
  console.log(`   包含 ${Object.keys(convertedModels).length} 个方块定义`);
}

processModels();
