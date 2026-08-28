/**
 * SSE (Server-Sent Events) 流式解析器
 * 解决 TCP 包切分导致的数据丢失问题
 * 
 * 核心原理：缓冲未完成的行，等待下一个 chunk 到达后拼接
 */

/**
 * 创建 SSE 解析器实例
 * @param {Function} onData - 数据回调 (data: Object) => void
 * @param {Function} onDone - 完成回调 () => void (可选)
 * @returns {Object} { feed: (chunk: string) => void, reset: () => void }
 */
export function createSSEParser(onData, onDone = null) {
  let buffer = ''; // 缓冲区：存储未完成的行

  /**
   * 喂入新的 chunk 数据
   * @param {string} chunk - 新的文本块
   */
  function feed(chunk) {
    // 将新数据追加到缓冲区
    buffer += chunk;

    // 按行分割（支持 \n 和 \r\n）
    const lines = buffer.split(/\r?\n/);

    // 最后一个元素可能是不完整的行，保留在缓冲区
    buffer = lines.pop() || '';

    // 处理完整的行
    for (const line of lines) {
      processLine(line);
    }
  }

  /**
   * 处理单行数据
   * @param {string} line - 完整的行
   */
  function processLine(line) {
    // 跳过空行
    if (!line.trim()) {
      return;
    }

    // 处理 SSE 事件类型行（event: xxx）
    if (line.startsWith('event:')) {
      // 当前实现忽略 event 类型，但保留解析能力
      return;
    }

    // 处理数据行（data: xxx）
    if (line.startsWith('data:')) {
      const dataStr = line.slice(5).trim(); // 移除 "data:" 前缀

      // 检查是否为结束标记
      if (dataStr === '[DONE]') {
        if (onDone) onDone();
        return;
      }

      // 尝试解析 JSON
      try {
        const data = JSON.parse(dataStr);
        if (onData) onData(data);
      } catch {
        // JSON 解析失败时忽略（可能是格式错误或部分数据）
        // 在生产环境中可以选择记录日志
      }
    }

    // 其他类型的行（如注释行 ":xxx"）忽略
  }

  /**
   * 重置解析器状态
   */
  function reset() {
    buffer = '';
  }

  return { feed, reset };
}

/**
 * 同步解析完整的 SSE 文本（用于测试）
 * @param {string} text - 完整的 SSE 文本
 * @returns {Array} 解析出的数据对象数组
 */
export function parseSSEText(text) {
  const results = [];
  const parser = createSSEParser((data) => results.push(data));
  parser.feed(text);
  return results;
}

/**
 * 模拟跨包场景的解析（用于测试）
 * @param {Array<string>} chunks - 按 TCP 包切分的文本块数组
 * @returns {Array} 解析出的数据对象数组
 */
export function parseSSEChunks(chunks) {
  const results = [];
  const parser = createSSEParser((data) => results.push(data));
  
  for (const chunk of chunks) {
    parser.feed(chunk);
  }
  
  return results;
}
