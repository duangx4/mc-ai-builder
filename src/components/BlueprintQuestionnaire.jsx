import React, { useState } from 'react';
import { CORE_QUESTIONS } from '../utils/blueprintEngine';

/**
 * BlueprintQuestionnaire - 蓝图模式问答组件
 *
 * 功能：
 * 1. 逐个展示 5 个核心问题
 * 2. 收集用户回答
 * 3. 提供示例和提示
 * 4. 支持前进/后退/跳过
 */
export default function BlueprintQuestionnaire({ onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    buildingType: '',
    buildingScale: '',
    buildingStyle: '',
    materialPreference: '',
    specialFeatures: ''
  });
  const [errors, setErrors] = useState({});

  const currentQuestion = CORE_QUESTIONS[currentStep];
  const isLastQuestion = currentStep === CORE_QUESTIONS.length - 1;
  const isFirstQuestion = currentStep === 0;

  // 处理输入变化
  const handleInputChange = (value) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: value
    });
    // 清除错误
    if (errors[currentQuestion.id]) {
      setErrors({
        ...errors,
        [currentQuestion.id]: null
      });
    }
  };

  // 验证当前问题
  const validateCurrent = () => {
    const value = answers[currentQuestion.id];
    const isValid = currentQuestion.validation(value);

    if (!isValid && currentQuestion.id !== 'specialFeatures') {
      setErrors({
        ...errors,
        [currentQuestion.id]: '请回答此问题'
      });
      return false;
    }

    return true;
  };

  // 下一步
  const handleNext = () => {
    if (!validateCurrent()) {
      return;
    }

    if (isLastQuestion) {
      // 完成问答
      onComplete(answers);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  // 上一步
  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 使用示例填充
  const handleUseExample = () => {
    const examples = {
      buildingType: '中世纪城堡',
      buildingScale: '大型（30x30x20）',
      buildingStyle: '中世纪',
      materialPreference: '石材系、木材系',
      specialFeatures: '塔楼、庭院、地下室'
    };

    handleInputChange(examples[currentQuestion.id]);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full border border-cyan-500/30">
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <h2 className="text-2xl font-bold text-white">蓝图规划问答</h2>
              <p className="text-cyan-100 text-sm">
                第 {currentStep + 1} / {CORE_QUESTIONS.length} 题
              </p>
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

        {/* 进度条 */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {CORE_QUESTIONS.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded-full transition-all ${
                  index < currentStep
                    ? 'bg-green-500'
                    : index === currentStep
                    ? 'bg-cyan-500'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 问题内容 */}
        <div className="p-6 space-y-6">
          {/* 问题标题 */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {currentQuestion.question}
            </h3>
            <p className="text-gray-400 text-sm">{currentQuestion.hint}</p>
          </div>

          {/* 输入区域 */}
          <div>
            <textarea
              value={answers[currentQuestion.id]}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="请输入您的答案..."
              className={`w-full h-32 bg-gray-800 text-white rounded-lg px-4 py-3 border-2 transition-colors resize-none focus:outline-none ${
                errors[currentQuestion.id]
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-gray-700 focus:border-cyan-500'
              }`}
            />
            {errors[currentQuestion.id] && (
              <p className="text-red-400 text-sm mt-2">{errors[currentQuestion.id]}</p>
            )}
          </div>

          {/* 示例 */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-cyan-400 font-semibold text-sm mb-2">💡 示例</h4>
                <p className="text-gray-300 text-sm">{currentQuestion.examples}</p>
              </div>
              <button
                onClick={handleUseExample}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
              >
                使用示例
              </button>
            </div>
          </div>

          {/* 已回答问题预览 */}
          {currentStep > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h4 className="text-gray-400 text-sm font-semibold mb-3">已回答的问题：</h4>
              <div className="space-y-2">
                {CORE_QUESTIONS.slice(0, currentStep).map((q, index) => (
                  <div key={q.id} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 font-bold">{index + 1}.</span>
                    <div className="flex-1">
                      <span className="text-gray-400">{q.question}</span>
                      <div className="text-white mt-1">{answers[q.id] || '（未回答）'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={handlePrevious}
            disabled={isFirstQuestion}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
          >
            ← 上一题
          </button>

          <div className="flex items-center gap-3">
            {currentQuestion.id === 'specialFeatures' && (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors font-medium"
              >
                跳过（可选）
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg"
            >
              {isLastQuestion ? '✅ 完成问答' : '下一题 →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
