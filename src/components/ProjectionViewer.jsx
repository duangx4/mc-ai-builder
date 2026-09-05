/**
 * ProjectionViewer.jsx - 2D 投影查看器（三视图 + 层切片）
 *
 * 显示建筑的俯视/正视/侧视三视图，支持层切片查看
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { computeProjection, getLayerSlice, getBounds } from '../utils/projection.js';
import { FALLBACK_COLORS } from '../utils/textureMapping.js';

/**
 * 单个投影视图渲染器
 */
function ProjectionCanvas({ projection, title, axisLabels, cellSize = 20 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { cells, width, depth } = projection;

    // 计算画布尺寸（包含边距）
    const padding = 30;
    const canvasWidth = width * cellSize + padding * 2;
    const canvasHeight = depth * cellSize + padding * 2;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // 清空画布（暗色背景）
    ctx.fillStyle = '#0f1219';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 绘制网格线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(padding + x * cellSize, padding);
      ctx.lineTo(padding + x * cellSize, padding + depth * cellSize);
      ctx.stroke();
    }

    for (let y = 0; y <= depth; y++) {
      ctx.beginPath();
      ctx.moveTo(padding, padding + y * cellSize);
      ctx.lineTo(padding + width * cellSize, padding + y * cellSize);
      ctx.stroke();
    }

    // 绘制方块
    cells.forEach(cell => {
      const x = padding + cell.x * cellSize;
      const y = padding + cell.y * cellSize;
      const color = FALLBACK_COLORS[cell.type] || '#c8c8c8';

      ctx.fillStyle = color;
      ctx.fillRect(x, y, cellSize, cellSize);

      // 方块边框
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.strokeRect(x, y, cellSize, cellSize);
    });

    // 绘制坐标轴标签
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // X 轴标签
    ctx.fillText(axisLabels.x, canvasWidth / 2, padding - 15);

    // Y 轴标签
    ctx.save();
    ctx.translate(padding - 15, canvasHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(axisLabels.y, 0, 0);
    ctx.restore();

  }, [projection, cellSize, axisLabels]);

  if (!projection || projection.cells.length === 0) {
    return (
      <div className="flex items-center justify-center bg-neutral-900/50 rounded-lg border border-neutral-700 p-8">
        <p className="text-neutral-500 text-sm">无数据</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-medium text-neutral-300 mb-2">{title}</h3>
      <canvas
        ref={canvasRef}
        className="bg-neutral-900/50 rounded-lg border border-neutral-700"
      />
      <p className="text-xs text-neutral-500 mt-2">
        {projection.width} × {projection.depth}
      </p>
    </div>
  );
}

/**
 * 主投影查看器组件
 */
export default function ProjectionViewer({ blocks, onClose }) {
  const [layerIndex, setLayerIndex] = useState(null);

  // 计算边界信息
  const bounds = useMemo(() => getBounds(blocks), [blocks]);

  // 计算三视图
  const topProjection = useMemo(() => computeProjection(blocks, 'top'), [blocks]);
  const frontProjection = useMemo(() => computeProjection(blocks, 'front'), [blocks]);
  const sideProjection = useMemo(() => computeProjection(blocks, 'side'), [blocks]);

  // 初始化层切片索引（默认最高层）
  useEffect(() => {
    if (bounds.height > 0 && layerIndex === null) {
      setLayerIndex(bounds.maxY);
    }
  }, [bounds.height, bounds.maxY, layerIndex]);

  // 计算当前层切片
  const layerSlice = useMemo(() => {
    if (layerIndex === null) return { cells: [], width: 0, depth: 0 };
    return getLayerSlice(blocks, layerIndex);
  }, [blocks, layerIndex]);

  // 统计信息
  const blockCount = blocks.filter(b =>
    b && b.type && b.type.toLowerCase() !== 'air'
  ).length;

  if (!blocks || blocks.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-neutral-900 rounded-xl border border-neutral-700 p-8 max-w-4xl">
          <p className="text-neutral-400 text-center">无可视化数据</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 p-6 max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">📐 投影查看器</h2>
            <p className="text-sm text-neutral-400 mt-1">
              三视图 · {blockCount} 个方块 · {bounds.width}×{bounds.height}×{bounds.depth}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>

        {/* 三视图 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <ProjectionCanvas
            projection={topProjection}
            title="俯视图 (Top)"
            axisLabels={{ x: 'X 轴', y: 'Z 轴' }}
          />
          <ProjectionCanvas
            projection={frontProjection}
            title="正视图 (Front)"
            axisLabels={{ x: 'X 轴', y: 'Y 轴' }}
          />
          <ProjectionCanvas
            projection={sideProjection}
            title="侧视图 (Side)"
            axisLabels={{ x: 'Z 轴', y: 'Y 轴' }}
          />
        </div>

        {/* 层切片控制 */}
        {bounds.height > 0 && (
          <div className="border-t border-neutral-700 pt-6">
            <h3 className="text-sm font-medium text-neutral-300 mb-4">
              层切片查看 (Y = {layerIndex})
            </h3>

            <div className="flex items-center gap-4 mb-4">
              <label className="text-xs text-neutral-400">高度层:</label>
              <input
                type="range"
                min={bounds.minY}
                max={bounds.maxY}
                value={layerIndex ?? bounds.maxY}
                onChange={(e) => setLayerIndex(parseInt(e.target.value))}
                className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((layerIndex - bounds.minY) / (bounds.maxY - bounds.minY)) * 100}%, #374151 ${((layerIndex - bounds.minY) / (bounds.maxY - bounds.minY)) * 100}%, #374151 100%)`
                }}
              />
              <span className="text-sm font-mono text-neutral-300 min-w-[3rem] text-right">
                {layerIndex}
              </span>
            </div>

            {/* 层切片视图 */}
            <ProjectionCanvas
              projection={layerSlice}
              title={`第 ${layerIndex} 层`}
              axisLabels={{ x: 'X 轴', y: 'Z 轴' }}
              cellSize={24}
            />
          </div>
        )}

        {/* 统计信息 */}
        <div className="border-t border-neutral-700 pt-4 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            <div>
              <p className="text-neutral-400">总方块数</p>
              <p className="text-white font-semibold text-lg">{blockCount}</p>
            </div>
            <div>
              <p className="text-neutral-400">宽度 (X)</p>
              <p className="text-white font-semibold text-lg">{bounds.width}</p>
            </div>
            <div>
              <p className="text-neutral-400">高度 (Y)</p>
              <p className="text-white font-semibold text-lg">{bounds.height}</p>
            </div>
            <div>
              <p className="text-neutral-400">深度 (Z)</p>
              <p className="text-white font-semibold text-lg">{bounds.depth}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
