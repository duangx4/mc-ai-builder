#!/usr/bin/env node
/**
 * MC 原版方块坐标自动转换脚本（修复版：支持 parent 继承链解析）
 * 输入：blockstates/*.json + models/block/*.json
 * 输出：vanilla-block-models.json（16格系 → Three.js 归一化坐标）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 路径配置
const MC_ASSETS_PATH = 'C:\\Users\\21972\\OneDrive\\Desktop\\新建文件夹\\YDJMC\\assets\\minecraft';
const BLOCKSTATES_PATH = path.join(MC_ASSETS_PATH, 'blockstates');
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

// 全局模型缓存，避免重复读取文件
const modelsCache = {};

/**
 * 加载模型文件（带缓存）
 */
function loadModel(modelPath) {
  // 清理路径
  let cleanPath = modelPath;
  if (cleanPath.startsWith('minecraft:block/')) {
    cleanPath = cleanPath.replace('minecraft:block/', '');
  } else if (cleanPath.startsWith('block/')) {
    cleanPath = cleanPath.replace('block/', '');
  }

  // 检查缓存
  if (modelsCache[cleanPath]) {
    return modelsCache[cleanPath];
  }

  const modelFile = path.join(MODELS_PATH, `${cleanPath}.json`);

  if (!fs.existsSync(modelFile)) {
    return null;
  }

  try {
    const content = fs.readFileSync(modelFile, 'utf-8');
    const modelData = JSON.parse(content);
    modelsCache[cleanPath] = modelData;
    return modelData;
  } catch (err) {
    console.warn(`   ⚠️  加载模型失败: ${cleanPath} - ${err.message}`);
    return null;
  }
}

/**
 * 递归解析模型继承链，合并 elements 和 textures
 * @param {string} modelPath - 模型路径（如 "minecraft:block/candle_one_candle"）
 * @param {Set} visitedModels - 已访问的模型集合（防止循环引用）
 * @returns {object} 完整合并后的模型 {elements, textures}
 */
function resolveModelInheritance(modelPath, visitedModels = new Set()) {
  // 清理路径
  let cleanPath = modelPath;
  if (cleanPath.startsWith('minecraft:block/')) {
    cleanPath = cleanPath.replace('minecraft:block/', '');
  } else if (cleanPath.startsWith('block/')) {
    cleanPath = cleanPath.replace('block/', '');
  }

  // 防止循环引用
  if (visitedModels.has(cleanPath)) {
    console.warn(`   ⚠️  检测到循环引用: ${cleanPath}`);
    return { elements: [], textures: {} };
  }
  visitedModels.add(cleanPath);

  // 加载当前模型
  const currentModel = loadModel(cleanPath);
  if (!currentModel) {
    return { elements: [], textures: {} };
  }

  // 如果有 parent，递归解析父模型
  let parentModel = { elements: [], textures: {} };
  if (currentModel.parent) {
    parentModel = resolveModelInheritance(currentModel.parent, new Set(visitedModels));
  }

  // 合并规则：
  // - elements: 子模型优先，没有则用父模型
  // - textures: 合并，子模型的 key 覆盖父模型同名 key
  return {
    elements: currentModel.elements || parentModel.elements || [],
    textures: {
      ...parentModel.textures,
      ...(currentModel.textures || {})
    }
  };
}

/**
 * 从 blockstate 文件中提取模型引用
 */
function extractModelsFromBlockstate(blockstatePath) {
  const models = new Set();

  try {
    const content = fs.readFileSync(blockstatePath, 'utf-8');
    const blockstate = JSON.parse(content);

    // 处理 variants 格式
    if (blockstate.variants) {
      for (const [variantKey, variantData] of Object.entries(blockstate.variants)) {
        // variants 可能是对象或数组
        const variants = Array.isArray(variantData) ? variantData : [variantData];

        for (const variant of variants) {
          if (variant.model) {
            models.add(variant.model);
          }
        }
      }
    }

    // 处理 multipart 格式
    if (blockstate.multipart) {
      for (const part of blockstate.multipart) {
        if (part.apply) {
          const applies = Array.isArray(part.apply) ? part.apply : [part.apply];

          for (const apply of applies) {
            if (apply.model) {
              models.add(apply.model);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn(`   ⚠️  解析 blockstate 失败: ${path.basename(blockstatePath)} - ${err.message}`);
  }

  return Array.from(models);
}

/**
 * 扫描所有 blockstates 并收集模型引用
 */
function collectAllModels() {
  console.log('📂 扫描 blockstates 目录...');

  if (!fs.existsSync(BLOCKSTATES_PATH)) {
    console.error(`❌ blockstates 目录不存在: ${BLOCKSTATES_PATH}`);
    process.exit(1);
  }

  const blockstateFiles = fs.readdirSync(BLOCKSTATES_PATH).filter(f => f.endsWith('.json'));
  console.log(`   找到 ${blockstateFiles.length} 个 blockstate 文件\n`);

  const modelMap = new Map(); // blockName -> modelPath

  for (const file of blockstateFiles) {
    const blockName = path.basename(file, '.json');
    const blockstatePath = path.join(BLOCKSTATES_PATH, file);
    const models = extractModelsFromBlockstate(blockstatePath);

    if (models.length > 0) {
      // 使用第一个 variant 作为默认模型
      modelMap.set(blockName, models[0]);
    }
  }

  console.log(`✅ 收集到 ${modelMap.size} 个方块的模型引用\n`);
  return modelMap;
}

/**
 * 主处理流程
 */
function processModels() {
  console.log('🚀 MC 原版方块坐标转换（修复版：支持 parent 继承链）\n');

  // 步骤 1：扫描 blockstates 收集模型引用
  const modelMap = collectAllModels();

  // 步骤 2：解析每个模型的继承链并转换坐标
  console.log('🔄 解析模型继承链并转换坐标...\n');

  const convertedModels = {};
  let successCount = 0;
  let failCount = 0;
  let emptyTexturesCount = 0;

  for (const [blockName, modelPath] of modelMap.entries()) {
    try {
      // 解析继承链，获取完整的 elements 和 textures
      const resolvedModel = resolveModelInheritance(modelPath);

      // 只处理有 elements 的模型
      if (resolvedModel.elements && resolvedModel.elements.length > 0) {
        // 转换坐标
        const converted = convertModel(resolvedModel);
        convertedModels[blockName] = converted;

        // 统计 textures 情况
        if (!converted.textures || Object.keys(converted.textures).length === 0) {
          emptyTexturesCount++;
          console.warn(`   ⚠️  ${blockName}: elements 存在但 textures 为空`);
        }

        successCount++;
      } else {
        console.warn(`   ⚠️  ${blockName}: 无 elements，跳过`);
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
  console.log(`   textures 为空: ${emptyTexturesCount}`);

  // 写入输出文件
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(convertedModels, null, 2), 'utf-8');
  console.log(`\n✅ 转换结果已保存到: ${OUTPUT_PATH}`);
  console.log(`   包含 ${Object.keys(convertedModels).length} 个方块定义`);
}

processModels();
