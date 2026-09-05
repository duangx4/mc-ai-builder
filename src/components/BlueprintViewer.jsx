import React, { useState } from 'react';
import useStore from '../store/useStore';

/**
 * BlueprintViewer - 蓝图展示和审批组件
 *
 * 功能：
 * 1. 显示 ASCII 平面图
 * 2. 展示施工计划和材料清单
 * 3. 提供审批操作（批准/修改/取消）
 */
export default function BlueprintViewer({ blueprint, onApprove, onModify, onCancel }) {
  const [showDetails, setShowDetails] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState(null);

  if (!blueprint) {
    return null;
  }

  const { metadata, requirements, constructionPlan, floorPlan, materialList } = blueprint;

  // 计算总材料数量
  const totalMaterials = Object.values(materialList || {}).reduce((sum, qty) => sum + qty, 0);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-cyan-500/30">
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📐</span>
            <div>
              <h2 className="text-2xl font-bold text-white">建筑蓝图</h2>
              <p className="text-cyan-100 text-sm">{metadata?.buildingType} · {metadata?.style}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-white/80 hover:text-white transition-colors"
            title="关闭"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 主内容区 */}
        <div className="p-6 space-y-6">
          {/* 基本信息卡片 */}
          <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
              <span>ℹ️</span> 基本信息
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-gray-400 text-sm">建筑类型</div>
                <div className="text-white font-medium">{metadata?.buildingType}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">建筑风格</div>
                <div className="text-white font-medium">{metadata?.style}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">尺寸 (长×宽×高)</div>
                <div className="text-white font-medium">
                  {metadata?.size?.width} × {metadata?.size?.depth} × {metadata?.size?.height}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">预计方块数</div>
                <div className="text-white font-medium">{metadata?.estimatedBlocks?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">预计时间</div>
                <div className="text-white font-medium">{metadata?.estimatedTime}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">材料种类</div>
                <div className="text-white font-medium">{Object.keys(materialList || {}).length} 种</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">施工阶段</div>
                <div className="text-white font-medium">{constructionPlan?.phases?.length || 0} 个</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">总材料数</div>
                <div className="text-white font-medium">{totalMaterials.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* 平面图 */}
          <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
              <span>🗺️</span> 平面图（俯视图）
            </h3>
            <div className="bg-black rounded-lg p-4 overflow-x-auto">
              <pre className="text-cyan-300 font-mono text-sm leading-relaxed whitespace-pre">
                {floorPlan?.ascii}
              </pre>
            </div>
            {floorPlan?.legend && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(floorPlan.legend).map(([symbol, meaning]) => (
                  <div key={symbol} className="flex items-center gap-2 text-sm">
                    <code className="bg-black text-cyan-300 px-2 py-1 rounded font-mono">{symbol}</code>
                    <span className="text-gray-300">{meaning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 施工计划 */}
          <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
              <span>🏗️</span> 施工计划
            </h3>
            <div className="space-y-3">
              {constructionPlan?.phases?.map((phase, index) => (
                <div
                  key={index}
                  className={`bg-gray-900 rounded-lg p-4 border transition-all cursor-pointer ${
                    selectedPhase === index
                      ? 'border-cyan-500 shadow-lg shadow-cyan-500/20'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedPhase(selectedPhase === index ? null : index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="flex items-center justify-center w-8 h-8 bg-cyan-600 text-white rounded-full font-bold text-sm">
                          {phase.order || index + 1}
                        </span>
                        <h4 className="text-white font-semibold">{phase.name}</h4>
                      </div>
                      <p className="text-gray-400 text-sm ml-11">{phase.description}</p>
                      {selectedPhase === index && phase.blocks && (
                        <div className="mt-3 ml-11">
                          <div className="text-cyan-400 text-xs font-semibold mb-2">主要方块：</div>
                          <div className="flex flex-wrap gap-2">
                            {phase.blocks.map((block, i) => (
                              <span
                                key={i}
                                className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs border border-gray-700"
                              >
                                {block}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        selectedPhase === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 材料清单 */}
          <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                <span>📦</span> 材料清单
              </h3>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {showDetails ? '收起' : '展开'}
              </button>
            </div>
            {showDetails && materialList && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(materialList).map(([block, qty]) => (
                  <div key={block} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">{block}</span>
                      <span className="text-cyan-400 font-semibold">{qty?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 用户需求回顾（可选） */}
          {requirements && (
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                <span>📋</span> 需求回顾
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="text-gray-400 w-32">建筑类型：</span>
                  <span className="text-white">{requirements.type}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-400 w-32">规模：</span>
                  <span className="text-white">{requirements.scale}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-400 w-32">风格：</span>
                  <span className="text-white">{requirements.style}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-400 w-32">材料偏好：</span>
                  <span className="text-white">{requirements.materials?.join('、')}</span>
                </div>
                {requirements.specialFeatures && requirements.specialFeatures.length > 0 && (
                  <div className="flex">
                    <span className="text-gray-400 w-32">特殊功能：</span>
                    <span className="text-white">{requirements.specialFeatures.join('、')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            ❌ 取消
          </button>
          <button
            onClick={onModify}
            className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
          >
            🔄 修改需求
          </button>
          <button
            onClick={onApprove}
            className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-colors font-medium shadow-lg"
          >
            ✅ 批准并建造
          </button>
        </div>
      </div>
    </div>
  );
}
