/**
 * 区块衔接规划引擎 (Block Adjacency Planning Engine)
 * 
 * 功能：
 * - buildAdjacencyTable: 构建区块衔接关系表
 * - validateSeams: 校验衔接缝合并自动修复
 * 
 * 集成到 partitionEngine.js 的 runPartitionedBuild 流程
 */

// ============================================================
// 1. 构建衔接关系表 (buildAdjacencyTable)
// ============================================================

/**
 * 构建区块衔接关系表
 * 
 * 遍历任务对，找出面相邻（共享 2D 面、轴对齐相邻）的区块
 * 对角接触（仅棱/点）不算相邻
 * 
 * @param {Array} tasks - partitionPlan 输出的任务列表
 * @returns {Array} edges - 衔接边列表
 */
export function buildAdjacencyTable(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return [];
  }

  const edges = [];

  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const taskA = tasks[i];
      const taskB = tasks[j];

      const adjacency = checkFaceAdjacency(taskA, taskB);
      if (adjacency) {
        edges.push(adjacency);
      }
    }
  }

  return edges;
}

/**
 * 检查两个区块是否面相邻
 */
function checkFaceAdjacency(taskA, taskB) {
  const posA = taskA.position || [0, 0, 0];
  const sizeA = taskA.size || [1, 1, 1];
  const posB = taskB.position || [0, 0, 0];
  const sizeB = taskB.size || [1, 1, 1];

  const boxA = {
    x: [posA[0], posA[0] + sizeA[0]],
    y: [posA[1], posA[1] + sizeA[1]],
    z: [posA[2], posA[2] + sizeA[2]]
  };

  const boxB = {
    x: [posB[0], posB[0] + sizeB[0]],
    y: [posB[1], posB[1] + sizeB[1]],
    z: [posB[2], posB[2] + sizeB[2]]
  };

  const axes = ['x', 'y', 'z'];

  for (const axis of axes) {
    const otherAxes = axes.filter(a => a !== axis);

    let gap = null;
    let faceA = null;
    let faceB = null;

    if (boxA[axis][1] <= boxB[axis][0]) {
      gap = boxB[axis][0] - boxA[axis][1];
      faceA = axis + '+';
      faceB = axis + '-';
    } else if (boxB[axis][1] <= boxA[axis][0]) {
      gap = boxA[axis][0] - boxB[axis][1];
      faceA = axis + '-';
      faceB = axis + '+';
    } else if (boxA[axis][0] < boxB[axis][1] && boxB[axis][0] < boxA[axis][1]) {
      const overlapStart = Math.max(boxA[axis][0], boxB[axis][0]);
      const overlapEnd = Math.min(boxA[axis][1], boxB[axis][1]);
      gap = -(overlapEnd - overlapStart);
      faceA = axis + '+';
      faceB = axis + '-';
    }

    if (gap === null || gap > 5) {
      continue;
    }

    let hasOverlap = true;
    const overlapRange = {};

    for (const otherAxis of otherAxes) {
      const overlapMin = Math.max(boxA[otherAxis][0], boxB[otherAxis][0]);
      const overlapMax = Math.min(boxA[otherAxis][1], boxB[otherAxis][1]);

      if (overlapMin >= overlapMax) {
        hasOverlap = false;
        break;
      }

      overlapRange[otherAxis] = [overlapMin, overlapMax];
    }

    if (hasOverlap) {
      const heightALine = (taskA.size && taskA.size[1]) || 0;
      const heightBLine = (taskB.size && taskB.size[1]) || 0;
      const aligned = Math.abs(heightALine - heightBLine) <= 1;

      return {
        a: taskA.id,
        b: taskB.id,
        axis,
        faceA,
        faceB,
        overlapRange,
        gap,
        heightALine,
        heightBLine,
        aligned
      };
    }
  }

  return null;
}

// ============================================================
// 2. 校验衔接并自动修复 (validateSeams)
// ============================================================

/**
 * 校验区块衔接并生成修复代码
 * 
 * @param {Array} tasks - 任务列表
 * @param {Object} plan - BuildingPlan
 * @param {Array} table - buildAdjacencyTable 输出的边列表
 * @returns {Object} { issues[], fillCode }
 */
export function validateSeams(tasks, plan, table) {
  const issues = [];
  const fillCodeSegments = [];

  if (!Array.isArray(table) || table.length === 0) {
    return { issues, fillCode: '' };
  }

  const globalGroundY = plan?.sections?.groundY;
  const taskMap = new Map((tasks || []).map(t => [t.id, t]));

  for (const edge of table) {
    const taskA = taskMap.get(edge.a);
    const taskB = taskMap.get(edge.b);

    if (!taskA || !taskB) {
      continue;
    }

    // 1. 校验贴边连续性（gap）
    if (edge.gap < 0) {
      issues.push({
        type: 'fatal',
        message: `区块 ${edge.a} 和 ${edge.b} 重叠 (gap=${edge.gap})`,
        blocks: [edge.a, edge.b]
      });
    } else if (edge.gap > 0 && edge.gap <= 3) {
      issues.push({
        type: 'fixable',
        message: `区块 ${edge.a} 和 ${edge.b} 间有 ${edge.gap} 格缝隙，将自动填充`,
        blocks: [edge.a, edge.b]
      });

      const fillCode = generateFillCode(edge, taskA, taskB);
      if (fillCode) {
        fillCodeSegments.push(fillCode);
      }
    } else if (edge.gap > 3) {
      issues.push({
        type: 'warning',
        message: `区块 ${edge.a} 和 ${edge.b} 间缝隙过大 (${edge.gap} 格)`,
        blocks: [edge.a, edge.b]
      });
    }

    // 2. 校验墙顶对齐（heightLine）
    if (!edge.aligned) {
      const heightDiff = Math.abs(edge.heightALine - edge.heightBLine);

      if (heightDiff > 3) {
        issues.push({
          type: 'fatal',
          message: `区块 ${edge.a} 和 ${edge.b} 高度差过大 (${heightDiff} 格)`,
          blocks: [edge.a, edge.b]
        });
      } else if (heightDiff > 1) {
        issues.push({
          type: 'fixable',
          message: `区块 ${edge.a} 和 ${edge.b} 高度不一致，将拉齐到较高值`,
          blocks: [edge.a, edge.b]
        });

        const levelUpCode = generateLevelUpCode(edge, taskA, taskB);
        if (levelUpCode) {
          fillCodeSegments.push(levelUpCode);
        }
      }
    }

    // 3. 校验水平基准面（groundY）
    if (globalGroundY !== undefined) {
      const groundYA = taskA.position?.[1] || 0;
      const groundYB = taskB.position?.[1] || 0;

      if (groundYA !== globalGroundY) {
        issues.push({
          type: 'warning',
          message: `区块 ${edge.a} 的 groundY (${groundYA}) 与全局基准面 (${globalGroundY}) 不一致`,
          blocks: [edge.a]
        });
      }

      if (groundYB !== globalGroundY) {
        issues.push({
          type: 'warning',
          message: `区块 ${edge.b} 的 groundY (${groundYB}) 与全局基准面 (${globalGroundY}) 不一致`,
          blocks: [edge.b]
        });
      }
    }
  }

  const fillCode = fillCodeSegments.length > 0
    ? `// AUTO-GENERATED SEAM FILL CODE\n${fillCodeSegments.join('\n\n')}`
    : '';

  return { issues, fillCode };
}

/**
 * 生成缝合填充代码
 */
function generateFillCode(edge, taskA, taskB) {
  const { axis, gap, overlapRange } = edge;

  if (gap <= 0 || gap > 3) {
    return '';
  }

  const materialsA = taskA.materials || [];
  const materialsB = taskB.materials || [];
  const commonMaterials = materialsA.filter(m => materialsB.includes(m));
  const material = commonMaterials[0] || materialsA[0] || materialsB[0] || 'stone_bricks';

  const posA = taskA.position || [0, 0, 0];
  const sizeA = taskA.size || [1, 1, 1];

  let fillRegion;

  if (axis === 'x') {
    const fillX = posA[0] + sizeA[0];
    fillRegion = {
      x: [fillX, fillX + gap],
      y: [overlapRange.y[0], overlapRange.y[1]],
      z: [overlapRange.z[0], overlapRange.z[1]]
    };
  } else if (axis === 'y') {
    const fillY = posA[1] + sizeA[1];
    fillRegion = {
      x: [overlapRange.x[0], overlapRange.x[1]],
      y: [fillY, fillY + gap],
      z: [overlapRange.z[0], overlapRange.z[1]]
    };
  } else if (axis === 'z') {
    const fillZ = posA[2] + sizeA[2];
    fillRegion = {
      x: [overlapRange.x[0], overlapRange.x[1]],
      y: [overlapRange.y[0], overlapRange.y[1]],
      z: [fillZ, fillZ + gap]
    };
  }

  const code = `// Fill gap between ${edge.a} and ${edge.b} (axis=${axis}, gap=${gap})
for (let x = ${fillRegion.x[0]}; x < ${fillRegion.x[1]}; x++) {
  for (let y = ${fillRegion.y[0]}; y < ${fillRegion.y[1]}; y++) {
    for (let z = ${fillRegion.z[0]}; z < ${fillRegion.z[1]}; z++) {
      builder.set(x, y, z, "${material}");
    }
  }
}`;

  return code;
}

/**
 * 生成高度拉齐代码
 */
function generateLevelUpCode(edge, taskA, taskB) {
  const heightDiff = Math.abs(edge.heightALine - edge.heightBLine);

  if (heightDiff <= 1 || heightDiff > 3) {
    return '';
  }

  const lowerTask = edge.heightALine < edge.heightBLine ? taskA : taskB;
  const higherHeight = Math.max(edge.heightALine, edge.heightBLine);
  const lowerHeight = Math.min(edge.heightALine, edge.heightBLine);

  const pos = lowerTask.position || [0, 0, 0];
  const size = lowerTask.size || [1, 1, 1];
  const material = (lowerTask.materials || [])[0] || 'stone_bricks';

  const layersToAdd = higherHeight - lowerHeight;
  const topY = pos[1] + size[1];

  const code = `// Level up ${lowerTask.id} to match neighbor
for (let x = ${pos[0]}; x < ${pos[0] + size[0]}; x++) {
  for (let y = ${topY}; y < ${topY + layersToAdd}; y++) {
    for (let z = ${pos[2]}; z < ${pos[2] + size[2]}; z++) {
      builder.set(x, y, z, "${material}");
    }
  }
}`;

  return code;
}
