import React, { useState } from 'react';

/**
 * PreciseModificationPlanViewer - 精确修改计划审批组件
 *
 * 展示：
 * 1. 区域分析结果
 * 2. 修改计划
 * 3. 风格建议
 * 4. 审批操作
 */
export default function PreciseModificationPlanViewer({ analysis, plan, onApprove, onCancel }) {
  const [showDetails, setShowDetails] = useState(true);

  if (!analysis || !plan) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30">
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <div>
              <h2 className="text-2xl font-bold text-white">精确修改计划</h2>
              <p className="text-purple-100 text-sm">请审批修改方案</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-white/80 hover:text-white transition-colors"
            title="取消"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-6">
          {/* 修改概述 */}
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-lg p-5 border border-purple-500/30">
            <h3 className="text-xl font-semibold text-purple-300 mb-3">📝 修改概述</h3>
            <p className="text-white text-lg leading-relaxed">{plan.summary}</p>
          </div>

          {/* 区域分析 */}
          <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between text-lg font-semibold text-cyan-400 mb-4"
            >
              <span className="flex items-center gap-2">
                <span>🔍</span> 区域分析
              </span>
              <svg
                className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDetails && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">建筑类型</h4>
                    <p className="text-white text-lg">{analysis.buildingType}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">检测风格</h4>
                    <p className="text-white text-lg">{analysis.detectedStyle}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">周边风格</h4>
                    <p className="text-white text-lg">{analysis.surroundingStyle}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">连接类型</h4>
                    <p className="text-white text-lg">{analysis.connectionType}</p>
                  </div>
                </div>

                {/* 约束条件 */}
                {analysis.constraints && analysis.constraints.length > 0 && (
                  <div className="bg-amber-900/20 rounded-lg p-4 border border-amber-500/30">
                    <h4 className="text-sm font-semibold text-amber-400 mb-3">⚠️ 修改约束</h4>
                    <ul className="space-y-2">
                      {analysis.constraints.map((constraint, idx) => (
                        <li key={idx} className="text-gray-300 flex items-start gap-2">
                          <span className="text-amber-400 mt-1">•</span>
                          <span>{constraint}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 建议 */}
                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
                    <h4 className="text-sm font-semibold text-blue-400 mb-3">💡 设计建议</h4>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-gray-300 flex items-start gap-2">
                          <span className="text-blue-400 mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 施工步骤 */}
          <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
              <span>🏗️</span> 施工步骤
            </h3>
            <div className="space-y-3">
              {plan.steps.map((step, idx) => (
                <div key={idx} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-bold text-white">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-1">{step.phase}</h4>
                      <p className="text-gray-300 text-sm mb-2">{step.description}</p>
                      {step.materials && step.materials.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {step.materials.map((material, midx) => (
                            <span
                              key={midx}
                              className="px-2 py-1 bg-gray-800 text-green-300 text-xs rounded border border-green-500/30"
                            >
                              {material}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 风格和边界处理 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
              <h4 className="text-sm font-semibold text-purple-400 mb-3">🎨 风格保持</h4>
              <p className="text-gray-300 text-sm leading-relaxed">{plan.styleNotes}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
              <h4 className="text-sm font-semibold text-cyan-400 mb-3">🔗 边界处理</h4>
              <p className="text-gray-300 text-sm leading-relaxed">{plan.boundaryHandling}</p>
            </div>
          </div>

          {/* 预估信息 */}
          <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-1">预估方块数</h4>
                <p className="text-white text-2xl font-bold">{Math.round(plan.estimatedBlocks)}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-1">预估时间</h4>
                <p className="text-white text-2xl font-bold">
                  ~{Math.ceil(plan.estimatedBlocks / 250)} 分钟
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="px-6 pb-6 flex items-center justify-end gap-3 sticky bottom-0 bg-gray-900 pt-4 border-t border-gray-800">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            取消修改
          </button>
          <button
            onClick={onApprove}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-colors font-medium shadow-lg"
          >
            ✅ 批准并开始修改
          </button>
        </div>
      </div>
    </div>
  );
}
