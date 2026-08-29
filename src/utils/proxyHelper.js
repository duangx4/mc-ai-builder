/**
 * AI 端点代理助手
 * 部分第三方 LLM 网关（如 edge-cn.botcf.com）不返回 CORS 允许头，
 * 浏览器直连会被拦截（Failed to fetch / NetworkError）。
 * 检测到这类网关时，把请求改发到同源后端 /api/ai-proxy 转发，绕开 CORS。
 */

const PROXY_HOST_RE = /botcf\.com/i;

export function isProxyNeeded(baseUrl) {
  return PROXY_HOST_RE.test(baseUrl || '');
}

// AI 后端（server.js）默认端口；与前端 store 的 localhost:3001 约定一致
// 注意：必须在运行时（浏览器环境）取 location，Node 测试环境无此对象
function aiBackendBase() {
  if (typeof location !== 'undefined') {
    return `${location.protocol}//${location.hostname}:3001`;
  }
  return 'http://localhost:3001'; // Node/测试环境兜底
}

/**
 * 构造实际请求目标。返回 { url, fetchOptions }
 * @param {string} baseUrl 用户配置的 API Base URL
 * @param {string} path 如 '/chat/completions'
 * @param {object} options 原始 fetchOptions（method/headers/body/signal）
 */
export function wrapRequest(baseUrl, path, options = {}) {
  const fullUrl = `${(baseUrl || '').replace(/\/+$/, '')}${path}`;
  if (!isProxyNeeded(baseUrl)) {
    return { url: fullUrl, fetchOptions: options };
  }
  const body = options.body ? JSON.parse(options.body) : {};
  const fetchOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: fullUrl,
      headers: options.headers || {},
      body
    }),
    signal: options.signal
  };
  return { url: `${aiBackendBase()}/api/ai-proxy`, fetchOptions, isProxied: true };
}