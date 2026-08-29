/**
 * 材质库生成脚本 (Material Library Builder)
 *
 * 功能：从 blocks_1_21.json 和 en_us.json 生成完整材质库
 * 输出：src/utils/materialLibrary.js
 *
 * 目标：1300+ 条目，分类完整，支持 1.20.1 兼容
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 路径配置
const BLOCKS_1_21_PATH = path.join(__dirname, '../src/utils/blocks_1_21.json');
const EN_US_PATH = path.join(__dirname, '../public/minecraft-1.20.1/lang/en_us.json');
const OUTPUT_PATH = path.join(__dirname, '../src/utils/materialLibrary.js');

// 木材种类（11 种）
const WOOD_TYPES = [
  'oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak',
  'mangrove', 'cherry', 'crimson', 'warped', 'bamboo'
];

// 石材种类
const STONE_TYPES = [
  'stone', 'andesite', 'diorite', 'granite', 'deepslate',
  'tuff', 'blackstone', 'basalt', 'calcite', 'dripstone'
];

// 16 色（Minecraft 标准色盘）
const COLORS = [
  'white', 'light_gray', 'gray', 'black',
  'brown', 'red', 'orange', 'yellow',
  'lime', 'green', 'cyan', 'light_blue',
  'blue', 'purple', 'magenta', 'pink'
];

/**
 * 分类规则（基于 ID 模式匹配）
 */
function categorizeBlock(id) {
  // 木材类
  for (const wood of WOOD_TYPES) {
    if (id.includes(wood) && (
      id.includes('planks') || id.includes('log') || id.includes('wood') ||
      id.includes('slab') || id.includes('stairs') || id.includes('fence') ||
      id.includes('door') || id.includes('trapdoor') || id.includes('sign') ||
      id.includes('button') || id.includes('pressure_plate')
    )) {
      return { category: 'woods', tags: [wood, 'building'] };
    }
  }

  // 混凝土
  if (id.includes('concrete')) {
    const color = COLORS.find(c => id.startsWith(c));
    return { category: 'concrete', tags: color ? [color, 'building', 'colorful'] : ['building'] };
  }

  // 羊毛
  if (id.includes('wool')) {
    const color = COLORS.find(c => id.startsWith(c));
    return { category: 'wool', tags: color ? [color, 'soft', 'colorful'] : ['soft'] };
  }

  // 陶瓦
  if (id.includes('terracotta')) {
    const color = COLORS.find(c => id.startsWith(c));
    return { category: 'terracotta', tags: color ? [color, 'building', 'colorful'] : ['building'] };
  }

  // 玻璃
  if (id.includes('glass')) {
    const color = COLORS.find(c => id.startsWith(c));
    return { category: 'glass', tags: color ? [color, 'transparent', 'colorful'] : ['transparent'] };
  }

  // 石材类
  for (const stone of STONE_TYPES) {
    if (id.includes(stone) || id.includes('brick') && !id.includes('nether_brick')) {
      return { category: 'stones', tags: [stone || 'stone', 'building'] };
    }
  }

  // 金属类
  if (id.match(/iron_|gold_|copper_|netherite_|ancient_debris|raw_.*_block/)) {
    return { category: 'metals', tags: ['metal', 'resource'] };
  }
  if (id.includes('quartz') || id.includes('amethyst')) {
    return { category: 'metals', tags: ['crystal', 'building'] };
  }

  // 红石类
  if (id.match(/redstone|repeater|comparator|observer|piston|dispenser|dropper|hopper|rail|lever|button|pressure_plate/)) {
    return { category: 'redstone', tags: ['redstone', 'mechanism'] };
  }

  // 自然类
  if (id.match(/dirt|grass|sand|gravel|clay|mud|moss|leaves|flower|mushroom|vine|lily|sea|coral|sponge|prismarine|ice|snow|podzol|mycelium/)) {
    return { category: 'natural', tags: ['natural', 'organic'] };
  }

  // 其他
  return { category: 'misc', tags: ['misc'] };
}

/**
 * 获取方块英文名（从 en_us.json）
 */
function getBlockName(id, translations) {
  const key = `block.minecraft.${id}`;
  return translations[key] || id.split('_').map(w =>
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}

/**
 * 主函数
 */
async function buildMaterialLibrary() {
  console.log('🔨 开始构建材质库...\n');

  // 1. 读取数据源
  console.log('📖 读取数据源...');
  const blocks1_21 = JSON.parse(fs.readFileSync(BLOCKS_1_21_PATH, 'utf-8'));
  const enUS = JSON.parse(fs.readFileSync(EN_US_PATH, 'utf-8'));

  const ids1_21 = Object.keys(blocks1_21);
  console.log(`   - blocks_1_21.json: ${ids1_21.length} 个方块 ID`);

  // 2. 从 en_us.json 提取所有方块 ID
  const blockKeysInEnUS = Object.keys(enUS)
    .filter(k => k.startsWith('block.minecraft.'))
    .map(k => k.replace('block.minecraft.', ''));
  console.log(`   - en_us.json: ${blockKeysInEnUS.length} 个方块翻译\n`);

  // 3. 合并 ID（1.21 + 1.20.1 独有）
  const allIds = new Set([...ids1_21]);
  const ids1_20_1Only = [];

  for (const id of blockKeysInEnUS) {
    if (!allIds.has(id)) {
      allIds.add(id);
      ids1_20_1Only.push(id);
    }
  }

  console.log(`📊 合并结果:`);
  console.log(`   - 1.21 方块: ${ids1_21.length}`);
  console.log(`   - 1.20.1 独有方块: ${ids1_20_1Only.length}`);
  console.log(`   - 总计: ${allIds.size} 个方块\n`);

  // 4. 构建材质库
  console.log('🏗️  分类与构建...');
  const materials = [];
  const categoryStats = {};

  for (const id of allIds) {
    const name = getBlockName(id, enUS);
    const { category, tags } = categorizeBlock(id);

    // 版本标记
    const version = ids1_20_1Only.includes(id) ? '1.20.1' : '1.21';

    materials.push({
      id,
      name,
      category,
      tags,
      version
    });

    // 统计
    categoryStats[category] = (categoryStats[category] || 0) + 1;
  }

  // 5. 排序（按类别、ID）
  materials.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.id.localeCompare(b.id);
  });

  // 6. 生成类别列表
  const categories = Object.keys(categoryStats).sort().map(cat => ({
    id: cat,
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    count: categoryStats[cat]
  }));

  // 7. 生成输出文件
  console.log('\n📝 生成文件...');
  const timestamp = new Date().toISOString();
  const output = `/**
 * 材质库 (Material Library)
 *
 * 自动生成于 ${timestamp}
 * 脚本: scripts/build-material-library.mjs
 *
 * 数据源:
 * - src/utils/blocks_1_21.json (1.21 方块全集)
 * - public/minecraft-1.20.1/lang/en_us.json (方块英文名)
 *
 * 总计: ${materials.length} 个材质条目
 */

/**
 * 完整材质库
 * @type {Array<{id: string, name: string, category: string, tags: string[], version: string}>}
 */
export const MATERIAL_LIBRARY = ${JSON.stringify(materials, null, 2)};

/**
 * 材质类别统计
 * @type {Array<{id: string, name: string, count: number}>}
 */
export const MATERIAL_CATEGORIES = ${JSON.stringify(categories, null, 2)};

/**
 * 运行时校验
 */
if (MATERIAL_LIBRARY.length < 1300) {
  console.warn(\`[材质库] 警告: 条目数量 \${MATERIAL_LIBRARY.length} < 1300\`);
}

// ID 唯一性校验
const idSet = new Set();
for (const material of MATERIAL_LIBRARY) {
  if (idSet.has(material.id)) {
    throw new Error(\`[材质库] 错误: 重复 ID \${material.id}\`);
  }
  idSet.add(material.id);
}
`;

  fs.writeFileSync(OUTPUT_PATH, output, 'utf-8');
  console.log(`   ✅ 已生成: ${path.relative(process.cwd(), OUTPUT_PATH)}`);

  // 8. 输出统计
  console.log('\n📊 分类统计:');
  categories.forEach(cat => {
    console.log(`   - ${cat.name.padEnd(12)}: ${cat.count.toString().padStart(4)} 条`);
  });

  console.log(`\n✨ 材质库构建完成！总计 ${materials.length} 个条目`);

  if (materials.length < 1300) {
    console.log(`\n⚠️  注意: 当前条目数 ${materials.length} < 1300 (目标)`);
  }
}

// 执行
buildMaterialLibrary().catch(err => {
  console.error('❌ 构建失败:', err);
  process.exit(1);
});
