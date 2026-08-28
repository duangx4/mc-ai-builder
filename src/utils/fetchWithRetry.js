/**
 * 统一的 AI 请求服务层：超时 + 指数退避重试
 * 
 * 功能：
 * - 超时控制（默认 120s）
 * - 指数退避重试（base 1s, ×2, +jitter, maxRetries=3）
 * - 尊重 Retry-After 响应头（429）
 * - 智能重试策略（5xx/429/网络错误重试，4xx/AbortError 不重试）
 */

const DEFAULT_TIMEOUT_MS = 120000; // 120 秒，足够流式长生成
const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 基础延迟 1 秒
const JITTER_MAX_MS = 250; // 抖动最大值 250ms

/**
 * 带超时和重试的 fetch 封装
 * @param {string} url - 请求 URL
 * @param {Object} options - fetch 选项（支持所有标准 fetch 参数）
 * @param {Object} retryConfig - 重试配置
 * @param {number} retryConfig.maxRetries - 最大重试次数（默认 3）
 * @param {number} retryConfig.timeout - 超时时间（毫秒，默认 120000）
 * @param {Function} retryConfig.onRetry - 重试回调 (attempt, delay, error) => void
 * @returns {Promise<Response>} fetch Response 对象
 */
export async function fetchWithRetry(url, options = {}, retryConfig = {}) {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    timeout = DEFAULT_TIMEOUT_MS,
    onRetry = null,
  } = retryConfig;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // 创建超时控制器
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

    // 合并用户提供的 signal 和超时 signal
    const userSignal = options.signal;
    let combinedSignal = timeoutController.signal;

    if (userSignal) {
      // 如果用户提供了 signal，需要同时监听两个 signal
      const combinedController = new AbortController();
      
      const abortHandler = () => combinedController.abort();
      userSignal.addEventListener('abort', abortHandler);
      timeoutController.signal.addEventListener('abort', abortHandler);
      
      combinedSignal = combinedController.signal;
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      // 成功响应或客户端错误（4xx，除 429）不重试
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return response;
      }

      // 服务器错误（5xx）或 429（速率限制）需要重试
      const errText = await response.text();
      lastError = new Error(`HTTP ${response.status}: ${errText}`);

      if (attempt < maxRetries) {
        let delay;

        // 429 优先尊重 Retry-After 响应头
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            // Retry-After 可能是秒数或 HTTP 日期
            const retryAfterSeconds = parseInt(retryAfter, 10);
            if (!isNaN(retryAfterSeconds)) {
              delay = retryAfterSeconds * 1000;
            } else {
              // 尝试解析为日期
              const retryDate = new Date(retryAfter);
              if (!isNaN(retryDate.getTime())) {
                delay = Math.max(0, retryDate.getTime() - Date.now());
              }
            }
          }
        }

        // 如果没有 Retry-After 或解析失败，使用指数退避
        if (!delay) {
          const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          const jitter = Math.random() * JITTER_MAX_MS;
          delay = exponentialDelay + jitter;
        }

        console.warn(
          `[fetchWithRetry] HTTP ${response.status} (attempt ${attempt}/${maxRetries}), ` +
          `retrying in ${Math.round(delay)}ms...`
        );

        if (onRetry) onRetry(attempt, delay, lastError);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      // 检查是否为超时
      if (err.name === 'AbortError') {
        // 判断是用户中止还是超时中止
        if (timeoutController.signal.aborted && (!userSignal || !userSignal.aborted)) {
          throw new Error(
            `请求超时（${timeout}ms）。请检查网络连接或增加超时设置。`
          );
        }
        // 用户主动中止，不重试
        throw err;
      }

      // 网络错误（连接失败、DNS 失败等）需要重试
      if (attempt < maxRetries) {
        const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        const jitter = Math.random() * JITTER_MAX_MS;
        const delay = exponentialDelay + jitter;

        console.warn(
          `[fetchWithRetry] Network error (attempt ${attempt}/${maxRetries}): ${err.message}, ` +
          `retrying in ${Math.round(delay)}ms...`
        );

        if (onRetry) onRetry(attempt, delay, err);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // 所有重试耗尽
  throw lastError;
}

/**
 * 流式请求封装（带超时和重试）
 * 注意：流式请求的重试仅针对连接建立阶段，数据传输中的错误不会自动重试
 * 
 * @param {string} url - 请求 URL
 * @param {Object} options - fetch 选项
 * @param {Function} onChunk - 数据块回调 (chunk: Uint8Array) => void
 * @param {Object} retryConfig - 重试配置（同 fetchWithRetry）
 * @returns {Promise<void>}
 */
export async function fetchStreamWithRetry(url, options = {}, onChunk, retryConfig = {}) {
  const response = await fetchWithRetry(url, options, retryConfig);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (onChunk) onChunk(value);
    }
  } finally {
    reader.releaseLock();
  }
}

export default fetchWithRetry;
