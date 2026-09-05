import React from 'react';
import { X, Zap, Sparkles, FileText, Rocket, Target, Clock, DollarSign, Star } from 'lucide-react';

/**
 * 模式介绍弹窗
 */
const ModeInfoModal = ({ isOpen, onClose, language = 'zh' }) => {
  if (!isOpen) return null;

  const modes = [
    {
      id: 'fast',
      icon: Zap,
      nameEn: 'Fast Mode',
      nameZh: '快速模式',
      descEn: 'Single-pass code generation, best for simple structures and quick prototypes.',
      descZh: '单次代码生成，适合简单结构和快速原型。',
      color: 'from-blue-500 to-cyan-500',
      time: '~10s',
      cost: '$0.01',
      blocks: '< 500',
      stars: 3,
      features: language === 'zh'
        ? ['最快速度', '适合修改', '简单建筑', '低成本']
        : ['Fastest', 'Good for edits', 'Simple builds', 'Low cost']
    },
    {
      id: 'smart',
      icon: Sparkles,
      nameEn: 'Smart Mode',
      nameZh: '智能模式',
      descEn: 'Three-stage workflow: Planning → Building → Quality Check. Balanced quality and speed.',
      descZh: '三阶段流程：规划 → 建造 → 质检。质量和速度平衡。',
      color: 'from-purple-500 to-pink-500',
      time: '~30s',
      cost: '$0.03',
      blocks: '500-1500',
      stars: 4,
      features: language === 'zh'
        ? ['三阶段流程', '质量更高', '中型建筑', '推荐使用']
        : ['3-stage flow', 'Better quality', 'Medium builds', 'Recommended']
    },
    {
      id: 'workflow',
      icon: FileText,
      nameEn: 'Blueprint Mode',
      nameZh: '蓝图模式',
      descEn: 'Interactive planning with user approval before building. Best for large structures.',
      descZh: '交互式规划，构建前需用户审批。适合大型建筑。',
      color: 'from-orange-500 to-red-500',
      time: '2-5m',
      cost: '$0.05',
      blocks: '1500-2500',
      stars: 5,
      features: language === 'zh'
        ? ['交互规划', '用户审批', '大型建筑', '可控性强']
        : ['Interactive', 'User approval', 'Large builds', 'High control']
    },
    {
      id: 'agentSkills',
      icon: Rocket,
      nameEn: 'Ultra Mode',
      nameZh: '极致模式',
      descEn: 'Ultimate quality with visual feedback and multi-agent collaboration. For massive projects.',
      descZh: '极致质量，视觉反馈 + 多 Agent 协作。适合超大项目。',
      color: 'from-green-500 to-emerald-500',
      time: '3-5m',
      cost: '$0.10',
      blocks: '> 2500',
      stars: 5,
      features: language === 'zh'
        ? ['视觉反馈', '多Agent', '超大建筑', '最高质量']
        : ['Visual feedback', 'Multi-agent', 'Massive builds', 'Best quality']
    },
    {
      id: 'precise',
      icon: Target,
      nameEn: 'Precision Mode',
      nameZh: '精确模式',
      descEn: 'Edit specific regions by selecting an area. AI rebuilds only the selected part.',
      descZh: '框选特定区域进行编辑，AI 仅重建选中部分。',
      color: 'from-indigo-500 to-blue-500',
      time: '~20s',
      cost: '$0.02',
      blocks: 'Local',
      stars: 4,
      features: language === 'zh'
        ? ['区域编辑', '局部重建', '精确控制', '风格匹配']
        : ['Region edit', 'Local rebuild', 'Precise control', 'Style match']
    }
  ];

  const t = (en, zh) => language === 'zh' ? zh : en;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🎨</span>
            {t('Generation Modes Guide', '生成模式指南')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all text-neutral-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <div
                key={mode.id}
                className="bg-neutral-800/50 rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    {/* Title */}
                    <h3 className="text-lg font-bold text-white mb-2">
                      {language === 'zh' ? mode.nameZh : mode.nameEn}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-neutral-300 mb-3">
                      {language === 'zh' ? mode.descZh : mode.descEn}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-3 text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Clock size={14} />
                        <span>{mode.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <DollarSign size={14} />
                        <span>{mode.cost}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Target size={14} />
                        <span>{mode.blocks} {t('blocks', '方块')}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array(5).fill(0).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={i < mode.stars ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-600'}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2">
                      {mode.features.map((feature, index) => (
                        <span
                          key={index}
                          className="px-2.5 py-1 bg-white/5 rounded-full text-xs text-neutral-300 border border-white/10"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-neutral-800/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              💡 {t('Tip: Start with Smart mode for best balance', '提示：智能模式是最佳平衡选择')}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              {t('Got it', '知道了')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeInfoModal;
