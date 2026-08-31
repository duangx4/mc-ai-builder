/**
 * 分析 blocks_1_21.json 中的所有方块
 * 按渲染类型分类
 */

import fs from 'fs';

// 读取方块数据
const blocksData = JSON.parse(fs.readFileSync('./src/utils/blocks_1_21.json', 'utf-8'));

console.log('🔍 MC 1.21 方块分析\n');
console.log(`总方块数: ${Object.keys(blocksData).length}\n`);

// 方块分类规则
const categories = {
  // 1. 楼梯类（需要朝向渲染）
  stairs: [],

  // 2. 栅栏/围墙（需要连接渲染）
  fences: [],
  walls: [],

  // 3. 门/活板门（需要开关状态）
  doors: [],
  trapdoors: [],

  // 4. 楼梯/台阶（需要朝向和高度）
  slabs: [],

  // 5. 按钮/拉杆/压力板（小型装饰）
  buttons: [],
  pressurePlates: [],

  // 6. 火把/灯笼（小型光源）
  torches: [],
  lanterns: [],

  // 7. 植物/花（需要透明渲染）
  plants: [],
  flowers: [],

  // 8. 玻璃/玻璃板（透明方块）
  glass: [],
  glassPane: [],

  // 9. 红石/铁轨（平面方块）
  redstone: [],
  rails: [],

  // 10. 特殊方块（需要自定义模型）
  special: [],

  // 11. 普通方块（标准立方体）
  normal: []
};

// 分类逻辑
for (const blockName of Object.keys(blocksData)) {
  const blockData = blocksData[blockName];
  const properties = blockData[0]; // 第一个元素是属性定义

  // 楼梯
  if (blockName.includes('stairs')) {
    categories.stairs.push(blockName);
  }
  // 栅栏
  else if (blockName.includes('fence') && !blockName.includes('gate')) {
    categories.fences.push(blockName);
  }
  // 围墙
  else if (blockName.includes('wall') && !blockName.includes('sign')) {
    categories.walls.push(blockName);
  }
  // 门
  else if (blockName.includes('door') && !blockName.includes('trapdoor')) {
    categories.doors.push(blockName);
  }
  // 活板门
  else if (blockName.includes('trapdoor')) {
    categories.trapdoors.push(blockName);
  }
  // 台阶
  else if (blockName.includes('slab')) {
    categories.slabs.push(blockName);
  }
  // 按钮
  else if (blockName.includes('button')) {
    categories.buttons.push(blockName);
  }
  // 压力板
  else if (blockName.includes('pressure_plate')) {
    categories.pressurePlates.push(blockName);
  }
  // 火把
  else if (blockName.includes('torch')) {
    categories.torches.push(blockName);
  }
  // 灯笼
  else if (blockName.includes('lantern')) {
    categories.lanterns.push(blockName);
  }
  // 玻璃
  else if (blockName.includes('glass') && !blockName.includes('pane')) {
    categories.glass.push(blockName);
  }
  // 玻璃板
  else if (blockName.includes('glass_pane')) {
    categories.glassPane.push(blockName);
  }
  // 植物
  else if (['grass', 'fern', 'seagrass', 'kelp', 'vine', 'bamboo', 'cactus', 'sugar_cane'].some(p => blockName.includes(p))) {
    categories.plants.push(blockName);
  }
  // 花
  else if (['flower', 'rose', 'tulip', 'orchid', 'dandelion', 'poppy', 'lily', 'sunflower', 'peony', 'lilac'].some(p => blockName.includes(p))) {
    categories.flowers.push(blockName);
  }
  // 红石
  else if (blockName.includes('redstone') || blockName.includes('repeater') || blockName.includes('comparator')) {
    categories.redstone.push(blockName);
  }
  // 铁轨
  else if (blockName.includes('rail')) {
    categories.rails.push(blockName);
  }
  // 特殊方块
  else if ([
    'chest', 'ender_chest', 'trapped_chest',
    'furnace', 'blast_furnace', 'smoker',
    'brewing_stand', 'enchanting_table', 'anvil',
    'bed', 'banner', 'sign',
    'piston', 'sticky_piston',
    'ladder', 'scaffolding',
    'hopper', 'dispenser', 'dropper',
    'observer', 'lectern',
    'dragon_egg', 'end_portal_frame',
    'beacon', 'conduit',
    'bell', 'grindstone', 'stonecutter',
    'composter', 'barrel', 'loom', 'cartography_table'
  ].some(p => blockName.includes(p))) {
    categories.special.push(blockName);
  }
  // 其他为普通方块
  else {
    categories.normal.push(blockName);
  }
}

// 输出统计
console.log('📊 方块分类统计:\n');

const renderTypes = [
  { key: 'stairs', name: '楼梯', description: '需要朝向和形状渲染' },
  { key: 'fences', name: '栅栏', description: '需要连接逻辑' },
  { key: 'walls', name: '围墙', description: '需要连接逻辑' },
  { key: 'doors', name: '门', description: '需要双格高度和开关状态' },
  { key: 'trapdoors', name: '活板门', description: '需要朝向和开关状态' },
  { key: 'slabs', name: '台阶', description: '需要上/下/双层状态' },
  { key: 'buttons', name: '按钮', description: '小型装饰，建议用回退颜色' },
  { key: 'pressurePlates', name: '压力板', description: '平面方块' },
  { key: 'torches', name: '火把', description: '小型光源，建议用回退颜色' },
  { key: 'lanterns', name: '灯笼', description: '小型光源，建议用回退颜色' },
  { key: 'plants', name: '植物', description: '需要透明和交叉平面渲染' },
  { key: 'flowers', name: '花', description: '需要透明和交叉平面渲染' },
  { key: 'glass', name: '玻璃', description: '透明方块' },
  { key: 'glassPane', name: '玻璃板', description: '透明 + 连接逻辑' },
  { key: 'redstone', name: '红石', description: '平面方块 + 连接逻辑' },
  { key: 'rails', name: '铁轨', description: '平面方块 + 连接逻辑' },
  { key: 'special', name: '特殊方块', description: '需要自定义模型（箱子、床等）' },
  { key: 'normal', name: '普通方块', description: '标准立方体，当前渲染器支持' }
];

for (const type of renderTypes) {
  const count = categories[type.key].length;
  const percentage = ((count / Object.keys(blocksData).length) * 100).toFixed(1);

  console.log(`${type.name.padEnd(10)} : ${String(count).padStart(4)} (${percentage.padStart(5)}%) - ${type.description}`);
}

console.log('\n' + '='.repeat(80));
console.log('\n🎯 需要特殊处理的方块类型:\n');

// 按优先级排序
const priorityTypes = [
  { key: 'stairs', priority: 1, effort: '中', impact: '高' },
  { key: 'slabs', priority: 2, effort: '中', impact: '高' },
  { key: 'fences', priority: 3, effort: '高', impact: '中' },
  { key: 'walls', priority: 3, effort: '高', impact: '中' },
  { key: 'doors', priority: 4, effort: '高', impact: '中' },
  { key: 'trapdoors', priority: 4, effort: '中', impact: '低' },
  { key: 'glass', priority: 5, effort: '低', impact: '高' },
  { key: 'glassPane', priority: 6, effort: '高', impact: '中' },
  { key: 'special', priority: 7, effort: '极高', impact: '中' },
  { key: 'plants', priority: 8, effort: '中', impact: '低' },
  { key: 'flowers', priority: 8, effort: '中', impact: '低' },
  { key: 'torches', priority: 9, effort: '低', impact: '低' },
  { key: 'lanterns', priority: 9, effort: '低', impact: '低' },
  { key: 'buttons', priority: 10, effort: '低', impact: '极低' },
  { key: 'pressurePlates', priority: 10, effort: '低', impact: '极低' },
  { key: 'redstone', priority: 11, effort: '中', impact: '低' },
  { key: 'rails', priority: 11, effort: '中', impact: '低' }
];

console.log('优先级 | 类型       | 数量 | 工作量 | 影响 | 说明');
console.log('-------|-----------|------|--------|------|------------------------');

for (const type of priorityTypes) {
  const info = renderTypes.find(t => t.key === type.key);
  const count = categories[type.key].length;

  console.log(
    `  ${String(type.priority).padStart(2)}   | ` +
    `${info.name.padEnd(10)} | ` +
    `${String(count).padStart(4)} | ` +
    `${type.effort.padEnd(6)} | ` +
    `${type.impact.padEnd(4)} | ` +
    `${info.description.substring(0, 40)}`
  );
}

// 导出详细列表
console.log('\n' + '='.repeat(80));
console.log('\n📝 详细方块列表已保存到 block-analysis.json\n');

const analysis = {
  totalBlocks: Object.keys(blocksData).length,
  categories: {},
  priorityList: priorityTypes.map(type => ({
    ...type,
    blocks: categories[type.key],
    count: categories[type.key].length
  }))
};

for (const [key, blocks] of Object.entries(categories)) {
  analysis.categories[key] = {
    count: blocks.length,
    blocks: blocks.sort()
  };
}

fs.writeFileSync('block-analysis.json', JSON.stringify(analysis, null, 2));

console.log('✅ 分析完成！');
