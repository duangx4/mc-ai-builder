/**
 * errorHandling.js - 统一的错误处理工具
 */

/**
 * 标准化 AI API 错误消息
 */
export function formatAIError(error) {
  if (!error) return '未知错误';

  // 网络错误
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return '网络连接失败，请检查网络设置';
  }

  // API Key 错误
  if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
    return 'API Key 无效或已过期，请检查设置';
  }

  // 配额错误
  if (error.message?.includes('429') || error.message?.includes('quota')) {
    return 'API 请求超出配额限制，请稍后重试';
  }

  // 超时错误
  if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
    return '请求超时，请重试';
  }

  // JSON 解析错误
  if (error.message?.includes('JSON') || error.message?.includes('parse')) {
    return 'AI 返回格式错误，请重试';
  }

  // 返回原始错误消息
  return error.message || String(error);
}

/**
 * 安全地提取 AI 响应内容
 * 处理不同的返回格式
 */
export function extractAIContent(response) {
  if (!response) return '';

  // 如果是对象且有 content 字段
  if (typeof response === 'object' && response.content) {
    return response.content;
  }

  // 如果本身就是字符串
  if (typeof response === 'string') {
    return response;
  }

  // 尝试 JSON 序列化
  try {
    return JSON.stringify(response);
  } catch {
    return String(response);
  }
}

/**
 * 从 AI 响应中提取代码块
 */
export function extractCodeBlock(content) {
  if (!content || typeof content !== 'string') return content;

  // 尝试提取 markdown 代码块
  const codeMatch = content.match(/```(?:javascript|js)?\n([\s\S]+?)\n```/);
  if (codeMatch) {
    return codeMatch[1].trim();
  }

  // 没有代码块标记，返回原内容
  return content.trim();
}

/**
 * 从 AI 响应中提取 JSON
 */
export function extractJSON(content) {
  if (!content) throw new Error('内容为空');

  const textContent = extractAIContent(content);

  // 尝试直接解析
  try {
    return JSON.parse(textContent);
  } catch (firstError) {
    // 尝试提取 JSON 代码块
    const jsonMatch = textContent.match(/```(?:json)?\n([\s\S]+?)\n```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (secondError) {
        throw new Error('JSON 格式错误: ' + secondError.message);
      }
    }

    // 尝试提取 JSON 对象（查找第一个 { 到最后一个 }）
    const jsonObjMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonObjMatch) {
      try {
        return JSON.parse(jsonObjMatch[0]);
      } catch (thirdError) {
        throw new Error('JSON 格式错误: ' + thirdError.message);
      }
    }

    throw new Error('无法找到有效的 JSON: ' + firstError.message);
  }
}

/**
 * 重试包装器
 * @param {Function} fn - 要执行的异步函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delay - 重试延迟（毫秒）
 */
export async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`尝试 ${i + 1}/${maxRetries} 失败:`, error.message);

      // 最后一次失败，直接抛出
      if (i === maxRetries - 1) {
        throw error;
      }

      // 等待后重试（指数退避）
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  throw lastError;
}

/**
 * 验证 API 设置
 */
export function validateAPISettings(settings) {
  if (!settings) {
    throw new Error('API 设置未配置');
  }

  if (!settings.apiKey || settings.apiKey.trim() === '') {
    throw new Error('请在设置中配置 API Key');
  }

  if (!settings.baseUrl || settings.baseUrl.trim() === '') {
    throw new Error('请在设置中配置 API Base URL');
  }

  if (!settings.model || settings.model.trim() === '') {
    throw new Error('请在设置中配置模型');
  }

  return true;
}

/**
 * 创建用户友好的错误消息
 */
export function createUserFriendlyError(phase, error) {
  const friendlyError = formatAIError(error);

  const phaseNames = {
    analyze: '分析',
    plan: '规划',
    generate: '生成',
    build: '建造',
    execute: '执行'
  };

  const phaseName = phaseNames[phase] || phase;

  return `${phaseName}阶段失败: ${friendlyError}`;
}
