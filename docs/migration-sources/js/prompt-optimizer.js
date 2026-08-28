// prompt-optimizer.js
// MC AI Builder 提示词优化功能（DOM 注入，不修改 React 压缩 bundle）
//
// 功能：在主输入框上方注入「✨ 优化提示词」按钮，点击后把用户模糊的
//       建造/修改需求交给 LLM 优化成聚焦、范围明确、可执行的提示词，
//       再写回输入框。解决「需求模糊导致修改大脚本时破坏括号配对」的问题。
//
// 依赖的应用契约（来自 bundle 逆向，改动应用时需同步检查）：
//   - 主输入框：<textarea rows:1>，无 id/name，placeholder =「描述你的构想...」
//     / "Describe your vision..."（i18n 键 placeholder），class 含 bg-neutral-950
//   - 配置：localStorage["mc-ai-settings"] = {apiKey, baseUrl, model, maxTokens, ...}
//   - LLM API：POST {baseUrl}/chat/completions，Bearer 鉴权，
//     body {model, messages, max_tokens, stream}
(function () {
  'use strict';

  var BTN_ID = 'mc-prompt-optimizer-btn';
  var CONFIG_KEY = 'mc-ai-settings';

  // 优化改写用的系统提示：结合上文对话，把模糊需求转成聚焦、明确、可执行的提示词
  var SYSTEM_PROMPT = [
    '你是一个 Minecraft 建筑建造需求的提示词优化器。用户会输入一段建造/修改需求，并结合上文的建筑对话，把它改写为一份聚焦、明确、可执行的提示词。',
    '',
    '改写要求：',
    '1. 以上文为准：仔细阅读上文对话，确定当前建筑的真实风格、材料和建造状态（例如中式古典、哥特、现代等）。风格必须与上文一致，严禁臆造或更换风格。',
    '2. 目标明确：说清要建造/修改什么部位、用什么材料或结构。',
    '3. 范围受限：若是修改现有建筑，明确限定只改哪个局部，其余保持不动，禁止大范围推倒重建。',
    '4. 代码安全：修改类需求要提醒 AI：修改会重新生成完整代码，代码必须语法完整、括号配对；**每个变量只能声明一次**，被替换的旧代码段必须删除，严禁在保留旧代码的情况下插入新代码——同名 const 重复声明（如 DOOR_RX 出现两次）会直接报错，导致整段代码作废。',
    '5. 大门形制：若需求涉及大门/入口/城门/portal，要提醒 AI：大门规格与建筑规模匹配——小屋/内室才用木门方块；大殿/城堡/城门/宅邸大门必须用砖石砌大型门洞/拱门/门楼（半圆拱、哥特尖拱、中式门楼/牌坊、月洞门），严禁用木门方块代表大门。',
    '6. 简洁自然：用中文自然语言输出，不要输出代码，不要 Markdown 表格，控制在 6 句话以内。',
    '',
    '输出用下面几个标题分行（不要代码块）：',
    '【目标】...',
    '【改动范围】...',
    '【具体做法】...',
    '【注意事项】...'
  ].join('\n');

  // ---- 读取应用配置（localStorage）----
  function getSettings() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  // ---- 定位主输入框：无 id，靠 placeholder / class 特征 ----
  function findInput() {
    var areas = document.querySelectorAll('textarea');
    for (var i = 0; i < areas.length; i++) {
      var ph = areas[i].getAttribute('placeholder') || '';
      if (ph.indexOf('构想') >= 0 || ph.indexOf('Describe your vision') >= 0) {
        return areas[i];
      }
    }
    // 加载中 placeholder 会变「加载中...」，用 class 兜底
    for (var j = 0; j < areas.length; j++) {
      var cls = areas[j].className || '';
      if (areas[j].rows === 1 && cls.indexOf('bg-neutral-950') >= 0) {
        return areas[j];
      }
    }
    return null;
  }

  // ---- 抓取上文对话作为上下文（DOM 结构来自聊天记录区）----
  // 消息外层 class：flex gap-3 [flex-row-reverse] group
  //   - 用户消息：flex-row-reverse（橙色气泡）
  //   - AI 正常消息：flex-row + bubble 含 bg-neutral-800
  //   - 错误/系统消息：bubble 含 text-neutral-500（灰色斜体，过滤掉）
  function getChatContext() {
    var list = document.querySelector('.overflow-y-auto.space-y-6');
    if (!list) return [];
    var msgs = [];
    var items = list.children;
    for (var i = 0; i < items.length; i++) {
      var cls = String(items[i].className || '');
      if (cls.indexOf('group') < 0) continue;          // 跳过空占位节点
      var isUser = cls.indexOf('flex-row-reverse') >= 0;
      var bubble = items[i].querySelector('div.rounded-2xl');
      if (!bubble) continue;
      var bubbleCls = String(bubble.className || '');
      if (!isUser && bubbleCls.indexOf('text-neutral-500') >= 0) continue; // 跳过错误消息
      var text = bubble.textContent.trim();
      if (!text) continue;
      // 过滤掉之前优化脚本生成的伪消息（【目标】开头），避免把衍生需求误当成建筑事实
      if (text.indexOf('【目标】') >= 0) continue;
      msgs.push({ role: isUser ? 'user' : 'assistant', content: text });
    }
    return msgs;
  }

  // ---- React 受控组件写值：必须用原生 value setter + input 事件 ----
  function setReactValue(el, value) {
    var proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ---- 轻量 toast 提示 ----
  function toast(msg, ok) {
    var el = document.createElement('div');
    el.textContent = msg;
    Object.assign(el.style, {
      position: 'fixed',
      left: '50%',
      bottom: '150px',
      transform: 'translateX(-50%)',
      background: 'rgba(15,23,42,.95)',
      color: ok ? '#4ade80' : '#fbbf24',
      border: '1px solid ' + (ok ? 'rgba(74,222,128,.4)' : 'rgba(251,191,36,.4)'),
      padding: '8px 16px',
      borderRadius: '8px',
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
      zIndex: 2147483000,
      boxShadow: '0 4px 20px rgba(0,0,0,.4)',
      maxWidth: '80vw',
      pointerEvents: 'none'
    });
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  // ---- 调用 LLM 优化并写回 ----
  function callOptimize(input, btn) {
    var text = (input.value || '').trim();
    if (!text) {
      toast('请先输入建造 / 修改需求');
      return;
    }

    var cfg = getSettings();
    if (!cfg.apiKey) {
      toast('未配置 API Key，请到右上角「设置」里填写');
      return;
    }

    var baseUrl = (cfg.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    var model = cfg.model || 'gpt-4o-mini';
    var maxTokens = cfg.maxTokens || 16384;

    var oldLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = '优化中…';

    // 抓取上文对话作为上下文，让 LLM 知道当前建筑的真实风格
    var history = getChatContext();
    if (history.length) {
      var lastMsg = history[history.length - 1];
      // 去掉与当前输入重复的最后一条用户消息（点优化时输入框内容=已发送消息）
      if (lastMsg.role === 'user' && lastMsg.content === text) {
        history.pop();
      }
    }
    var recent = history.slice(-8).map(function (m) {
      return { role: m.role, content: m.content.slice(0, 1200) };
    });

    fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }]
          .concat(recent, [{ role: 'user', content: text }]),
        max_tokens: Math.min(maxTokens, 2048),
        stream: false
      }),
      signal: AbortSignal.timeout(60000)
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            throw new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
          });
        }
        return res.json();
      })
      .then(function (data) {
        var content = data && data.choices && data.choices[0]
          && data.choices[0].message && data.choices[0].message.content;
        if (!content) {
          throw new Error('AI 未返回内容');
        }
        setReactValue(input, content.trim());
        toast('已优化完成，检查后按 Enter 发送', true);
      })
      .catch(function (err) {
        toast('优化失败：' + (err && err.message ? err.message : '未知错误'));
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = oldLabel;
      });
  }

  // ---- 注入按钮到输入框所在容器上方右端 ----
  function injectButton() {
    if (document.getElementById(BTN_ID)) return;
    var input = findInput();
    if (!input) return;

    var btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.textContent = '✨ 优化提示词';
    Object.assign(btn.style, {
      position: 'absolute',
      top: '-30px',
      right: '4px',
      background: 'rgba(251,146,60,.12)',
      color: '#fb923c',
      border: '1px solid rgba(251,146,60,.35)',
      borderRadius: '9999px',
      padding: '3px 12px',
      fontSize: '12px',
      lineHeight: '20px',
      cursor: 'pointer',
      fontFamily: 'Inter, sans-serif',
      zIndex: 1000,
      whiteSpace: 'nowrap',
      transition: 'background .15s'
    });
    btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(251,146,60,.28)'; });
    btn.addEventListener('mouseleave', function () { btn.style.background = 'rgba(251,146,60,.12)'; });
    btn.addEventListener('click', function () { callOptimize(input, btn); });

    var host = input.parentElement;
    host.appendChild(btn);
    // 若宿主容器不是 relative，absolute 会相对更外层定位，退化为普通流式按钮
    if (host && !/relative/.test(host.className || '')) {
      btn.style.position = 'static';
      btn.style.top = 'auto';
      btn.style.marginBottom = '8px';
      btn.style.marginLeft = 'auto';
      host.style.display = 'flex';
      host.style.flexDirection = 'column';
      host.style.alignItems = 'flex-end';
    }
  }

  // ---- 脚本去重兜底 ----
  // 问题：AI 修改代码时偶尔把同一行 const 声明复制粘贴两遍（如 const DOOR_RX = ... 出现
  //       2 次），或插入新代码块时保留旧声明块，导致 JS 报
  //       "Identifier 'X' has already been declared"，整个脚本不执行 → 0 方块。
  // 策略：只处理 0 缩进（顶层）的 const 声明——同名保留最后一次声明、删除之前的重复行。
  //       循环内/块级作用域的 const 都有缩进（模型遵守 0/4/8 空格规范），不在此范围，不误删。
  //       对无重复的代码是 no-op，不改变任何行为。
  function dedupeTopLevelConsts(code) {
    if (typeof code !== 'string' || code.indexOf('builder.') < 0) return code;
    var RE = /^const\s+([A-Za-z_$][\w$]*)\s*=/;
    var lines = code.split('\n');
    var counts = {}, last = {}, m, i;
    for (i = 0; i < lines.length; i++) {
      m = RE.exec(lines[i]);
      if (m) { counts[m[1]] = (counts[m[1]] || 0) + 1; last[m[1]] = i; }
    }
    var hasDup = false;
    for (var k in counts) if (counts[k] > 1) { hasDup = true; break; }
    if (!hasDup) return code;
    var out = [];
    for (i = 0; i < lines.length; i++) {
      m = RE.exec(lines[i]);
      if (m && counts[m[1]] > 1 && i !== last[m[1]]) continue; // 删除非最后一次的重复顶层声明
      out.push(lines[i]);
    }
    return out.join('\n');
  }

  // 应用用 new Function("builder", code) 执行 VoxelBuilder 脚本（bundle 逆向确认）。
  // 这里包一层，仅在脚本含 builder. 时去重；其他 new Function 用法原样放行。
  (function patchScriptExecution() {
    var OrigFunction = window.Function;
    function WrappedFunction() {
      var args = Array.prototype.slice.call(arguments);
      if (args.length && typeof args[args.length - 1] === 'string') {
        args[args.length - 1] = dedupeTopLevelConsts(args[args.length - 1]);
      }
      return OrigFunction.apply(this, args);
    }
    WrappedFunction.prototype = OrigFunction.prototype;
    window.Function = WrappedFunction;
  })();

  // ---- 启动：持续轮询，保证 React 重渲染后按钮仍在 ----
  function boot() {
    setInterval(function () {
      if (!document.getElementById(BTN_ID)) {
        injectButton();
      }
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
