import React from 'react';

/**
 * SVGFloorPlan - SVG 平面图组件
 *
 * 将蓝图信息转换为可视化的 SVG 平面图
 */
export default function SVGFloorPlan({ blueprint }) {
  if (!blueprint || !blueprint.metadata) return null;

  const { size } = blueprint.metadata;
  const { width, depth } = size;

  // SVG 配置
  const cellSize = 20; // 每个方块的像素大小
  const padding = 40;
  const svgWidth = width * cellSize + padding * 2;
  const svgHeight = depth * cellSize + padding * 2;

  // 颜色配置
  const colors = {
    wall: '#6b7280',      // 墙体 - 灰色
    floor: '#f3f4f6',     // 地板 - 浅灰
    door: '#f59e0b',      // 门 - 橙色
    window: '#60a5fa',    // 窗户 - 蓝色
    stairs: '#8b5cf6',    // 楼梯 - 紫色
    pillar: '#374151',    // 柱子 - 深灰
    decoration: '#10b981', // 装饰 - 绿色
    grid: '#e5e7eb'       // 网格线 - 极浅灰
  };

  // 生成房间布局（简化版）
  const generateRooms = () => {
    const rooms = [];

    // 外墙
    rooms.push({
      type: 'wall',
      x: 0,
      z: 0,
      width: width,
      depth: 1,
      label: '外墙'
    });
    rooms.push({
      type: 'wall',
      x: 0,
      z: depth - 1,
      width: width,
      depth: 1,
      label: '外墙'
    });
    rooms.push({
      type: 'wall',
      x: 0,
      z: 1,
      width: 1,
      depth: depth - 2,
      label: '外墙'
    });
    rooms.push({
      type: 'wall',
      x: width - 1,
      z: 1,
      width: 1,
      depth: depth - 2,
      label: '外墙'
    });

    // 门（中间位置）
    const doorX = Math.floor(width / 2);
    rooms.push({
      type: 'door',
      x: doorX,
      z: 0,
      width: 1,
      depth: 1,
      label: '门'
    });

    // 窗户（两侧）
    if (width > 6 && depth > 6) {
      rooms.push({
        type: 'window',
        x: 2,
        z: 0,
        width: 1,
        depth: 1,
        label: '窗户'
      });
      rooms.push({
        type: 'window',
        x: width - 3,
        z: 0,
        width: 1,
        depth: 1,
        label: '窗户'
      });
    }

    // 楼梯（右后角）
    if (width > 5 && depth > 5) {
      rooms.push({
        type: 'stairs',
        x: width - 3,
        z: depth - 3,
        width: 2,
        depth: 2,
        label: '楼梯'
      });
    }

    // 柱子（四个角）
    if (width > 8 && depth > 8) {
      const pillarPositions = [
        { x: 2, z: 2 },
        { x: width - 3, z: 2 },
        { x: 2, z: depth - 3 },
        { x: width - 3, z: depth - 3 }
      ];
      pillarPositions.forEach(pos => {
        rooms.push({
          type: 'pillar',
          x: pos.x,
          z: pos.z,
          width: 1,
          depth: 1,
          label: '柱子'
        });
      });
    }

    return rooms;
  };

  const rooms = generateRooms();

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* 背景 */}
        <rect
          x={padding}
          y={padding}
          width={width * cellSize}
          height={depth * cellSize}
          fill="#1f2937"
          stroke="#374151"
          strokeWidth="2"
        />

        {/* 网格线 */}
        {Array.from({ length: width + 1 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={padding + i * cellSize}
            y1={padding}
            x2={padding + i * cellSize}
            y2={padding + depth * cellSize}
            stroke={colors.grid}
            strokeWidth="0.5"
            opacity="0.3"
          />
        ))}
        {Array.from({ length: depth + 1 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={padding}
            y1={padding + i * cellSize}
            x2={padding + width * cellSize}
            y2={padding + i * cellSize}
            stroke={colors.grid}
            strokeWidth="0.5"
            opacity="0.3"
          />
        ))}

        {/* 绘制房间元素 */}
        {rooms.map((room, idx) => {
          const x = padding + room.x * cellSize;
          const y = padding + room.z * cellSize;
          const w = room.width * cellSize;
          const h = room.depth * cellSize;

          return (
            <g key={idx}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={colors[room.type] || colors.floor}
                stroke="#000"
                strokeWidth="1"
                opacity={room.type === 'floor' ? 0.1 : 0.8}
              />
              {/* 标签（仅对特殊元素） */}
              {room.type !== 'floor' && room.type !== 'wall' && (
                <text
                  x={x + w / 2}
                  y={y + h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {room.type === 'door' && 'D'}
                  {room.type === 'window' && 'W'}
                  {room.type === 'stairs' && 'S'}
                  {room.type === 'pillar' && '+'}
                </text>
              )}
            </g>
          );
        })}

        {/* 坐标轴标签 */}
        <text
          x={padding + (width * cellSize) / 2}
          y={padding - 15}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize="12"
          fontWeight="bold"
        >
          X 轴 ({width} 格)
        </text>
        <text
          x={padding - 15}
          y={padding + (depth * cellSize) / 2}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize="12"
          fontWeight="bold"
          transform={`rotate(-90 ${padding - 15} ${padding + (depth * cellSize) / 2})`}
        >
          Z 轴 ({depth} 格)
        </text>

        {/* 尺寸标注 */}
        <text
          x={svgWidth - padding}
          y={svgHeight - 10}
          textAnchor="end"
          fill="#6b7280"
          fontSize="11"
        >
          {width} × {depth} × {size.height}
        </text>
      </svg>

      {/* 图例 */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: colors.wall }}></div>
          <span className="text-gray-300">墙体</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: colors.door }}></div>
          <span className="text-gray-300">门 (D)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: colors.window }}></div>
          <span className="text-gray-300">窗户 (W)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: colors.stairs }}></div>
          <span className="text-gray-300">楼梯 (S)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: colors.pillar }}></div>
          <span className="text-gray-300">柱子 (+)</span>
        </div>
      </div>
    </div>
  );
}
