/**
 * 投影查看器组件 - 2D 三视图 + 层切片
 * 使用 Canvas 2D 绘制俯视/正视/侧视三个投影
 */
import React, { useEffect, useRef, useState } from 'react';
import { computeTopProjection, computeFrontProjection, computeSideProjection, getLayerSlice } from '../utils/projection';
import { FALLBACK_COLORS } from '../utils/textureMapping';
import useStore from '../store/useStore';

const ProjectionViewer = () => {
  const { semanticVoxels } = useStore();
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [showLayerSlice, setShowLayerSlice] = useState(false);
  
  const topCanvasRef = useRef(null);
  const frontCanvasRef = useRef(null);
  const sideCanvasRef = useRef(null);
  const layerCanvasRef = useRef(null);

  // 计算投影数据
  const topProjection = computeTopProjection(semanticVoxels);
  const frontProjection = computeFrontProjection(semanticVoxels);
  const sideProjection = computeSideProjection(semanticVoxels);
  
  const maxLayer = topProjection.height > 0 ? topProjection.height - 1 : 0;
  
  // 初始化选中最高层
  useEffect(() => {
    setSelectedLayer(maxLayer);
  }, [maxLayer]);

  // 获取方块颜色
  const getBlockColor = (type) => {
    return FALLBACK_COLORS[type?.toLowerCase()] || FALLBACK_COLORS['default'] || '#888888';
  };

  // 绘制投影到 Canvas
  const drawProjection = (canvas, projection, mode) => {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const cellSize = 20;
    
    let gridWidth, gridHeight;
    
    if (mode === 'top') {
      gridWidth = projection.width;
      gridHeight = projection.depth;
    } else if (mode === 'front') {
      gridWidth = projection.width;
      gridHeight = projection.height;
    } else {
      gridWidth = projection.depth;
      gridHeight = projection.height;
    }
    
    const canvasWidth = Math.max(gridWidth * cellSize, 100);
    const canvasHeight = Math.max(gridHeight * cellSize, 100);
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    ctx.fillStyle = '#0f1219';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= gridWidth; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, gridHeight * cellSize);
      ctx.stroke();
    }
    
    for (let j = 0; j <= gridHeight; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * cellSize);
      ctx.lineTo(gridWidth * cellSize, j * cellSize);
      ctx.stroke();
    }
    
    const bounds = getBoundsFromVoxels(semanticVoxels);
    
    projection.cells.forEach(cell => {
      let canvasX, canvasY;
      
      if (mode === 'top') {
        canvasX = (cell.x - bounds.minX) * cellSize;
        canvasY = (cell.z - bounds.minZ) * cellSize;
      } else if (mode === 'front') {
        canvasX = (cell.x - bounds.minX) * cellSize;
        canvasY = (bounds.maxY - cell.y) * cellSize;
      } else {
        canvasX = (cell.z - bounds.minZ) * cellSize;
        canvasY = (bounds.maxY - cell.y) * cellSize;
      }
      
      ctx.fillStyle = getBlockColor(cell.type);
      ctx.fillRect(canvasX, canvasY, cellSize, cellSize);
      
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(canvasX, canvasY, cellSize, cellSize);
    });
  };

  const drawLayerSlice = (canvas, layer) => {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const cellSize = 20;
    
    const sliceData = getLayerSlice(semanticVoxels, layer);
    const gridWidth = sliceData.width || 1;
    const gridHeight = sliceData.depth || 1;
    
    const canvasWidth = Math.max(gridWidth * cellSize, 100);
    const canvasHeight = Math.max(gridHeight * cellSize, 100);
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    ctx.fillStyle = '#0f1219';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= gridWidth; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, gridHeight * cellSize);
      ctx.stroke();
    }
    
    for (let j = 0; j <= gridHeight; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * cellSize);
      ctx.lineTo(gridWidth * cellSize, j * cellSize);
      ctx.stroke();
    }
    
    const bounds = getBoundsFromVoxels(semanticVoxels);
    
    sliceData.cells.forEach(cell => {
      const canvasX = (cell.x - bounds.minX) * cellSize;
      const canvasY = (cell.z - bounds.minZ) * cellSize;
      
      ctx.fillStyle = getBlockColor(cell.type);
      ctx.fillRect(canvasX, canvasY, cellSize, cellSize);
      
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(canvasX, canvasY, cellSize, cellSize);
    });
  };

  const getBoundsFromVoxels = (voxels) => {
    if (!voxels || voxels.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
    }
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    voxels.forEach(v => {
      if (!v.position || v.position.length < 3) return;
      const [x, y, z] = v.position;
      if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return;
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    });
    
    if (minX === Infinity) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
    }
    
    return { minX, maxX, minY, maxY, minZ, maxZ };
  };

  useEffect(() => {
    drawProjection(topCanvasRef.current, topProjection, 'top');
    drawProjection(frontCanvasRef.current, frontProjection, 'front');
    drawProjection(sideCanvasRef.current, sideProjection, 'side');
  }, [semanticVoxels]);

  useEffect(() => {
    if (showLayerSlice && layerCanvasRef.current) {
      drawLayerSlice(layerCanvasRef.current, selectedLayer);
    }
  }, [selectedLayer, showLayerSlice, semanticVoxels]);

  if (!semanticVoxels || semanticVoxels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <p className="text-lg">暂无方块数据</p>
          <p className="text-sm mt-2">请先生成建筑</p>
        </div>
      </div>
    );
  }

  const totalBlocks = semanticVoxels.filter(v => v.type !== 'AIR').length;

  return (
    <div className="h-full overflow-auto p-6 bg-neutral-950">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">📐 投影查看器</h2>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>方块数: <span className="text-orange-400 font-medium">{totalBlocks}</span></span>
          <span>尺寸: <span className="text-orange-400 font-medium">
            {topProjection.width}×{topProjection.depth}×{topProjection.height}
          </span></span>
          <span>最高层: <span className="text-orange-400 font-medium">Y={maxLayer}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="text-blue-400">↓</span> 俯视图 (TOP)
            </h3>
            <span className="text-xs text-gray-500">X×Z 平面</span>
          </div>
          <div className="overflow-auto max-h-96 bg-neutral-950 rounded border border-neutral-800">
            <canvas ref={topCanvasRef} className="block" />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            沿 Y 轴压缩，显示每列最高方块
          </div>
        </div>

        <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="text-green-400">→</span> 正视图 (FRONT)
            </h3>
            <span className="text-xs text-gray-500">X×Y 平面</span>
          </div>
          <div className="overflow-auto max-h-96 bg-neutral-950 rounded border border-neutral-800">
            <canvas ref={frontCanvasRef} className="block" />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            从南侧观察，沿 Z 轴压缩
          </div>
        </div>

        <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="text-purple-400">←</span> 侧视图 (SIDE)
            </h3>
            <span className="text-xs text-gray-500">Z×Y 平面</span>
          </div>
          <div className="overflow-auto max-h-96 bg-neutral-950 rounded border border-neutral-800">
            <canvas ref={sideCanvasRef} className="block" />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            从东侧观察，沿 X 轴压缩
          </div>
        </div>
      </div>

      <div className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="text-orange-400">✂️</span> 层切片
          </h3>
          <button
            onClick={() => setShowLayerSlice(!showLayerSlice)}
            className="px-3 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded transition"
          >
            {showLayerSlice ? '隐藏' : '显示'}
          </button>
        </div>

        {showLayerSlice && (
          <>
            <div className="mb-4">
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-400 whitespace-nowrap">
                  Y = {selectedLayer}
                </label>
                <input
                  type="range"
                  min="0"
                  max={maxLayer}
                  value={selectedLayer}
                  onChange={(e) => setSelectedLayer(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                  style={{
                    accentColor: '#f97316'
                  }}
                />
                <span className="text-xs text-gray-500">
                  0 - {maxLayer}
                </span>
              </div>
            </div>

            <div className="overflow-auto max-h-96 bg-neutral-950 rounded border border-neutral-800">
              <canvas ref={layerCanvasRef} className="block" />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              显示第 {selectedLayer} 层的所有方块（俯视平面）
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectionViewer;
