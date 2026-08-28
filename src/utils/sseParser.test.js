/**
 * SSE Parser 单元测试
 * 测试跨包场景、\r\n 行尾、[DONE] 标记、空 chunk 等
 */

import { describe, it, expect } from 'vitest';
import { createSSEParser, parseSSEChunks, parseSSEText } from './sseParser.js';

describe('SSE Parser', () => {
  it('应该正确解析完整的 SSE 数据', () => {
    const sseText = 'data: {"a":1}\n\ndata: {"b":2}\n\n';
    const results = parseSSEText(sseText);
    expect(results).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('应该处理跨包切分的场景（data 行被切开）', () => {
    const results = [];
    const parser = createSSEParser((data) => results.push(data));

    // 模拟真实场景：SSE 行在 TCP 包边界被切开
    parser.feed('data: {"a":');  // 第一个包
    expect(results).toEqual([]); // 还没有完整行

    parser.feed('1}\n');  // 第二个包：完成行
    expect(results).toEqual([{ a: 1 }]); // 现在有完整数据了
  });

  it('应该处理复杂的跨包场景（多个数据跨多个包）', () => {
    const chunks = [
      'data: {"ke',
      'y":"val',
      'ue"}\n\ndata: {"num":42',
      '}\n\n',
    ];
    const results = parseSSEChunks(chunks);
    expect(results).toEqual([{ key: 'value' }, { num: 42 }]);
  });

  it('应该支持 \r\n 行尾', () => {
    const sseText = 'data: {"a":1}\r\n\r\ndata: {"b":2}\r\n\r\n';
    const results = parseSSEText(sseText);
    expect(results).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('应该正确处理 [DONE] 标记', () => {
    let doneCallbackCalled = false;
    const parser = createSSEParser(
      () => {},
      () => { doneCallbackCalled = true; }
    );
    parser.feed('data: [DONE]\n\n');
    expect(doneCallbackCalled).toBe(true);
  });

  it('应该忽略空行', () => {
    const sseText = '\n\ndata: {"a":1}\n\n\n\ndata: {"b":2}\n\n';
    const results = parseSSEText(sseText);
    expect(results).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('应该忽略 event 行', () => {
    const sseText = 'event: message\ndata: {"a":1}\n\n';
    const results = parseSSEText(sseText);
    expect(results).toEqual([{ a: 1 }]);
  });

  it('应该忽略注释行', () => {
    const sseText = ': this is a comment\ndata: {"a":1}\n\n';
    const results = parseSSEText(sseText);
    expect(results).toEqual([{ a: 1 }]);
  });

  it('应该处理空 chunk（不崩溃）', () => {
    const parser = createSSEParser(() => {});
    expect(() => parser.feed('')).not.toThrow();
    expect(() => parser.feed('\n')).not.toThrow();
  });

  it('应该忽略解析失败的 JSON', () => {
    const results = [];
    const parser = createSSEParser((data) => results.push(data));
    parser.feed('data: invalid json\n\n');
    parser.feed('data: {"valid":true}\n\n');
    expect(results).toEqual([{ valid: true }]);
  });

  it('应该支持 reset 重置缓冲区', () => {
    const parser = createSSEParser(() => {});
    parser.feed('data: {"incomplete');
    parser.reset();
    parser.feed('data: {"a":1}\n\n');
    // 如果 reset 生效，不会因为之前的不完整数据而报错
    expect(() => parser.feed('data: {"b":2}\n\n')).not.toThrow();
  });

  it('应该处理 OpenAI 风格的流式响应', () => {
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" World"}}]}\n\n',
      'data: [DONE]\n\n',
    ];
    
    const results = parseSSEChunks(chunks);
    expect(results).toHaveLength(2);
    expect(results[0].choices[0].delta.content).toBe('Hello');
    expect(results[1].choices[0].delta.content).toBe(' World');
  });

  it('应该处理真实的跨包切分场景（JSON 对象被切开）', () => {
    // 模拟真实场景：一个 JSON 对象在传输时被切成多个 TCP 包
    const chunks = [
      'data: {"choices":[{"delta":{"con',
      'tent":"测试"},',
      '"index":0}]}\n\n',
    ];
    
    const results = parseSSEChunks(chunks);
    expect(results).toHaveLength(1);
    expect(results[0].choices[0].delta.content).toBe('测试');
  });
});
