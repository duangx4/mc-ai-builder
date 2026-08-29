/**
 * 材质搜索工具 (Material Search)
 * 
 * 提供材质库的查询功能，支持按 ID、名称、类别搜索
 */

import { MATERIAL_LIBRARY } from './materialLibrary.js';

/**
 * 搜索材质
 * 
 * @param {string} query - 搜索关键词（材质名/类别/用途词）
 * @param {Array} library - 材质库（默认使用 MATERIAL_LIBRARY）
 * @returns {Array} 匹配的材质列表（最多 20 条，按匹配度排序）
 */
export function searchMaterial(query, library = MATERIAL_LIBRARY) {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) {
    return [];
  }

  const results = [];

  // 匹配度评分
  for (const material of library) {
    let score = 0;
    const id = material.id.toLowerCase();
    const name = material.name.toLowerCase();
    const category = material.category.toLowerCase();
    const tags = material.tags.map(t => t.toLowerCase());

    // ID 精确匹配（最高优先级）
    if (id === normalizedQuery) {
      score = 1000;
    }
    // ID 前缀匹配
    else if (id.startsWith(normalizedQuery)) {
      score = 900;
    }
    // ID 包含
    else if (id.includes(normalizedQuery)) {
      score = 700;
    }
    // 名称精确匹配
    else if (name === normalizedQuery) {
      score = 800;
    }
    // 名称包含
    else if (name.includes(normalizedQuery)) {
      score = 600;
    }
    // 类别匹配
    else if (category === normalizedQuery) {
      score = 500;
    }
    // 标签匹配
    else if (tags.includes(normalizedQuery)) {
      score = 400;
    }
    // 类别包含
    else if (category.includes(normalizedQuery)) {
      score = 300;
    }
    // 标签部分匹配
    else if (tags.some(tag => tag.includes(normalizedQuery))) {
      score = 200;
    }

    if (score > 0) {
      results.push({ ...material, _matchScore: score });
    }
  }

  // 按匹配度排序，取前 20 条
  results.sort((a, b) => b._matchScore - a._matchScore);
  
  const topResults = results.slice(0, 20);
  
  // 移除内部评分字段
  return topResults.map(({ _matchScore, ...material }) => material);
}

/**
 * 按类别获取材质
 * 
 * @param {string} category - 类别名称
 * @param {number} limit - 返回数量限制（默认 20）
 * @returns {Array} 指定类别的材质列表
 */
export function getMaterialsByCategory(category, limit = 20) {
  const materials = MATERIAL_LIBRARY.filter(m => 
    m.category.toLowerCase() === category.toLowerCase()
  );
  return materials.slice(0, limit);
}

/**
 * 按标签获取材质
 * 
 * @param {string} tag - 标签名称
 * @param {number} limit - 返回数量限制（默认 20）
 * @returns {Array} 包含指定标签的材质列表
 */
export function getMaterialsByTag(tag, limit = 20) {
  const normalizedTag = tag.toLowerCase();
  const materials = MATERIAL_LIBRARY.filter(m =>
    m.tags.some(t => t.toLowerCase() === normalizedTag)
  );
  return materials.slice(0, limit);
}

/**
 * 获取随机材质（用于测试或示例）
 * 
 * @param {number} count - 返回数量
 * @returns {Array} 随机材质列表
 */
export function getRandomMaterials(count = 5) {
  const shuffled = [...MATERIAL_LIBRARY].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
