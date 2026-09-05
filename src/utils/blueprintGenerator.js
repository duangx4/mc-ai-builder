/**
 * blueprintGenerator.js - 蓝图生成工具
 *
 * 功能：
 * 1. 生成 ASCII 平面图
 * 2. 统计材料清单
 * 3. 规划施工顺序
 * 4. 估算时间和成本
 */

/**
 * 生成 ASCII 平面图
 * @param {Object} size - 建筑尺寸 {width, depth, height}
 * @param {string} buildingType - 建筑类型
 * @returns {Object} - {ascii: string, legend: Object}
 */
export function generateASCIIFloorPlan(size, buildingType) {
  const { width, depth } = size;

  // 简化版：根据尺寸生成基础平面图
  const lines = [];

  // 顶部边界
  lines.push('+' + '-'.repeat(width) + '+');

  // 中间行
  for (let z = 0; z < depth; z++) {
    let line = '|';
    for (let x = 0; x < width; x++) {
      // 边界是墙
      if (z === 0 || z === depth - 1 || x === 0 || x === width - 1) {
        line += '#';
      }
      // 门的位置（中间靠前）
      else if (z === 1 && x === Math.floor(width / 2)) {
        line += 'D';
      }
      // 楼梯位置（后方角落）
      else if (z === depth - 2 && x === width - 2) {
        line += 'S';
      }
      // 窗户（侧墙）
      else if ((z === Math.floor(depth / 2) && (x === 1 || x === width - 2))) {
        line += 'W';
      }
      // 柱子（四个角）
      else if ((z === 2 || z === depth - 3) && (x === 2 || x === width - 3)) {
        line += '+';
      }
      // 地板
      else {
        line += '.';
      }
    }
    line += '|';
    lines.push(line);
  }

  // 底部边界
  lines.push('+' + '-'.repeat(width) + '+');

  const ascii = lines.join('\n');

  const legend = {
    '#': '墙体',
    '.': '地板',
    'D': '门',
    'W': '窗户',
    'S': '楼梯',
    '+': '柱子',
    '-': '边界',
    '|': '边界'
  };

  return { ascii, legend };
}

/**
 * 生成施工计划（7个标准阶段）
 * @param {string} style - 建筑风格
 * @param {Array} materials - 材料列表
 * @returns {Array} - 施工阶段数组
 */
export function generateConstructionPlan(style, materials) {
  const phases = [
    {
      name: '地基阶段',
      description: '清理地面，铺设基础结构，确保建筑稳固',
      blocks: materials.filter(m =>
        m.includes('stone') || m.includes('cobblestone') || m.includes('concrete')
      ).slice(0, 3),
      order: 1
    },
    {
      name: '主体结构',
      description: '建造墙体、柱子等承重结构，形成建筑骨架',
      blocks: materials.filter(m =>
        m.includes('planks') || m.includes('bricks') || m.includes('stone_bricks')
      ).slice(0, 3),
      order: 2
    },
    {
      name: '楼层建造',
      description: '铺设地板、建造楼梯，连接各个楼层',
      blocks: materials.filter(m =>
        m.includes('planks') || m.includes('wood') || m.includes('stairs')
      ).slice(0, 3),
      order: 3
    },
    {
      name: '屋顶封顶',
      description: '建造屋顶结构，完成建筑封闭',
      blocks: materials.filter(m =>
        m.includes('stairs') || m.includes('slab') || m.includes('tile')
      ).slice(0, 3),
      order: 4
    },
    {
      name: '外部装饰',
      description: '安装窗户、门，添加外墙装饰元素',
      blocks: ['glass', 'glass_pane', 'door', ...materials.slice(0, 2)],
      order: 5
    },
    {
      name: '内部装修',
      description: '放置家具、照明设备，添加室内细节',
      blocks: ['torch', 'lantern', 'crafting_table', 'chest', 'bed'],
      order: 6
    },
    {
      name: '景观美化',
      description: '美化周围环境，添加花园、道路等景观元素',
      blocks: ['grass_block', 'flowers', 'path', 'fence', 'leaves'],
      order: 7
    }
  ];

  return phases;
}

/**
 * 估算材料清单
 * @param {Object} size - 建筑尺寸
 * @param {Array} materials - 主要材料列表
 * @returns {Object} - {blockType: quantity}
 */
export function estimateMaterialList(size, materials) {
  const { width, height, depth } = size;
  const volume = width * height * depth;

  // 粗略估算各类材料的占比
  const materialList = {};

  // 主材料（墙体、地板）占 40%
  if (materials[0]) {
    materialList[materials[0]] = Math.floor(volume * 0.4);
  }

  // 辅助材料占 25%
  if (materials[1]) {
    materialList[materials[1]] = Math.floor(volume * 0.25);
  }

  // 装饰材料占 15%
  if (materials[2]) {
    materialList[materials[2]] = Math.floor(volume * 0.15);
  }

  // 玻璃（窗户）
  materialList['glass'] = Math.floor((width + depth) * 2 * height * 0.2);

  // 门
  materialList['door'] = Math.ceil(width / 5);

  // 照明
  materialList['torch'] = Math.floor(volume * 0.05);

  // 楼梯
  materialList['stairs'] = Math.floor(height * 8);

  return materialList;
}

/**
 * 估算建造时间
 * @param {number} blockCount - 方块总数
 * @returns {string} - 时间描述
 */
export function estimateBuildTime(blockCount) {
  if (blockCount < 500) {
    return '1-2 分钟';
  } else if (blockCount < 1500) {
    return '2-5 分钟';
  } else if (blockCount < 3000) {
    return '5-10 分钟';
  } else if (blockCount < 5000) {
    return '10-15 分钟';
  } else {
    return '15+ 分钟';
  }
}

/**
 * 从用户需求提取材料列表
 * @param {string} materialPreference - 用户材料偏好
 * @param {string} style - 建筑风格
 * @returns {Array} - 材料列表
 */
export function extractMaterials(materialPreference, style) {
  const materials = [];

  // 根据材料偏好映射到 Minecraft 方块
  const materialMap = {
    '石材': ['stone_bricks', 'cobblestone', 'smooth_stone'],
    '木材': ['oak_planks', 'spruce_planks', 'birch_planks'],
    '混凝土': ['white_concrete', 'gray_concrete', 'light_gray_concrete'],
    '砖石': ['bricks', 'stone_bricks', 'red_sandstone'],
    '混合': ['oak_planks', 'stone_bricks', 'bricks']
  };

  // 根据风格调整材料
  const styleMap = {
    '中世纪': ['stone_bricks', 'oak_planks', 'cobblestone'],
    '现代': ['quartz_block', 'white_concrete', 'glass'],
    '东方': ['red_nether_bricks', 'dark_oak_planks', 'gold_block'],
    '幻想': ['purpur_block', 'end_stone_bricks', 'sea_lantern'],
    '工业': ['iron_block', 'gray_concrete', 'dark_prismarine'],
    '自然': ['oak_log', 'moss_block', 'stone']
  };

  // 优先使用风格材料
  if (style && styleMap[style]) {
    materials.push(...styleMap[style]);
  }

  // 添加用户偏好材料
  for (const [key, values] of Object.entries(materialMap)) {
    if (materialPreference.includes(key)) {
      materials.push(...values);
    }
  }

  // 如果没有材料，使用默认
  if (materials.length === 0) {
    materials.push('oak_planks', 'stone_bricks', 'cobblestone');
  }

  // 去重并限制数量
  return [...new Set(materials)].slice(0, 5);
}

/**
 * 解析建筑尺寸
 * @param {string} scaleText - 尺寸描述文本
 * @returns {Object} - {width, height, depth}
 */
export function parseSize(scaleText) {
  // 尝试匹配 "数字x数字x数字" 格式
  const match = scaleText.match(/(\d+)\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)/i);

  if (match) {
    return {
      width: parseInt(match[1]),
      depth: parseInt(match[2]),
      height: parseInt(match[3])
    };
  }

  // 预设尺寸
  const presets = {
    '小型': { width: 10, depth: 10, height: 8 },
    '中型': { width: 20, depth: 20, height: 15 },
    '大型': { width: 30, depth: 30, height: 20 },
    '超大型': { width: 50, depth: 50, height: 30 }
  };

  for (const [key, size] of Object.entries(presets)) {
    if (scaleText.includes(key)) {
      return size;
    }
  }

  // 默认中型
  return { width: 20, depth: 20, height: 15 };
}

/**
 * 生成完整蓝图
 * @param {Object} requirements - 用户需求
 * @returns {Object} - 完整蓝图对象
 */
export function generateFullBlueprint(requirements) {
  const {
    buildingType,
    buildingScale,
    buildingStyle,
    materialPreference,
    specialFeatures
  } = requirements;

  // 解析尺寸
  const size = parseSize(buildingScale);

  // 提取材料
  const materials = extractMaterials(materialPreference, buildingStyle);

  // 生成平面图
  const floorPlan = generateASCIIFloorPlan(size, buildingType);

  // 生成施工计划
  const constructionPlan = {
    phases: generateConstructionPlan(buildingStyle, materials)
  };

  // 估算材料清单
  const materialList = estimateMaterialList(size, materials);

  // 估算方块总数
  const estimatedBlocks = Object.values(materialList).reduce((sum, qty) => sum + qty, 0);

  // 估算时间
  const estimatedTime = estimateBuildTime(estimatedBlocks);

  // 组装完整蓝图
  const blueprint = {
    metadata: {
      buildingType,
      style: buildingStyle,
      size,
      estimatedBlocks,
      estimatedTime
    },
    requirements: {
      type: buildingType,
      scale: buildingScale,
      style: buildingStyle,
      materials: materials,
      specialFeatures: specialFeatures ? specialFeatures.split(/[,，、]/).map(s => s.trim()).filter(Boolean) : []
    },
    constructionPlan,
    floorPlan,
    materialList
  };

  return blueprint;
}

/**
 * 验证蓝图完整性
 * @param {Object} blueprint - 蓝图对象
 * @returns {Object} - {valid: boolean, errors: Array}
 */
export function validateBlueprint(blueprint) {
  const errors = [];

  if (!blueprint.metadata) {
    errors.push('缺少元数据');
  }

  if (!blueprint.constructionPlan || !blueprint.constructionPlan.phases) {
    errors.push('缺少施工计划');
  } else if (blueprint.constructionPlan.phases.length !== 7) {
    errors.push(`施工阶段数量错误（期望7个，实际${blueprint.constructionPlan.phases.length}个）`);
  }

  if (!blueprint.floorPlan || !blueprint.floorPlan.ascii) {
    errors.push('缺少平面图');
  }

  if (!blueprint.materialList || Object.keys(blueprint.materialList).length === 0) {
    errors.push('缺少材料清单');
  }

  if (!blueprint.metadata?.estimatedBlocks || blueprint.metadata.estimatedBlocks <= 0) {
    errors.push('方块估算无效');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
