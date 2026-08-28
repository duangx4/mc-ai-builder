// image-preview.js
// MC AI Builder 生图预览功能（DOM 注入，不修改 React 压缩 bundle）
//
// 功能：输入框左上角注入「⏻ 生图预览：开/关」开关 +「🖼️ 生图预览」按钮。
//   点击生图按钮：读输入框描述 → 调生图 API 生成正面立面图 → 浮层展示
//   → 用户确认（可重生成）后把图注入现有图片预览区 → 按发送，
//   AI 结合图片 + 文本 + skill 知识库建造（agent 模式均支持 image_url）。
//
// 依赖的应用契约（来自 bundle 逆向，改动应用时需同步检查）：
//   - 主输入框：<textarea rows:1>，placeholder「描述你的构想...」/ "Describe your vision..."
//   - 图片链路：隐藏 input[type=file] + textarea onPaste/onDrop → Je(file) →
//     FileReader.readAsDataURL → state ee（≤3 张）→ 发送时取 ee[0] 传给
//     eb/GP/JP 的多模态消息（{role:"user",content:[{type:"text"},{type:"image_url"}]}）
//   - 配置：localStorage["mc-ai-settings"] = {apiKey, baseUrl, model, imageUseSameApi,
//     imageBaseUrl, imageApiKey, imageModel, ...}
//   - 生图 API：POST {baseUrl}/images/generations，body {model, prompt, n:1, size,
//     response_format:"b64_json"}（优先，免 CORS/鉴权/二次请求）
//   - 开关：localStorage["mc-ai-image-preview-enabled"]（"true"/"false"，默认开）
(function () {
  'use strict';

  var CTRL_ID = 'mc-image-preview-controls';
  var TOGGLE_ID = 'mc-image-preview-toggle';
  var BTN_ID = 'mc-image-preview-btn';
  var OVERLAY_ID = 'mc-image-preview-overlay';
  var CONFIG_KEY = 'mc-ai-settings';
  var ENABLE_KEY = 'mc-ai-image-preview-enabled';
  var MAX_IMAGES = 3;

  // 浮层状态（模块级）
  var overlay = null;      // 遮罩 DOM
  var overlayImg = null;   // 生成结果图片元素
  var promptArea = null;   // 可编辑生图 Prompt textarea
  var currentDataUrl = null; // 当前生成图 data URL
  var currentPrompt = null;  // 当前生图 Prompt

  // ---- 配置读取 ----
  function getSettings() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  // ---- 开关 ----
  function isEnabled() {
    return localStorage.getItem(ENABLE_KEY) !== 'false'; // 默认开
  }
  function setEnabled(v) {
    localStorage.setItem(ENABLE_KEY, v ? 'true' : 'false');
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
    for (var j = 0; j < areas.length; j++) {
      var cls = areas[j].className || '';
      if (areas[j].rows === 1 && cls.indexOf('bg-neutral-950') >= 0) {
        return areas[j];
      }
    }
    return null;
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // ---- 预览区当前图片数 ----
  function previewImageCount() {
    return document.querySelectorAll('img[alt^="Upload"]').length;
  }

  // ---- 生图配置解析（支持独立生图配置）----
  function resolveImageConfig(cfg) {
    var useSame = cfg.imageUseSameApi !== false;
    var apiKey = useSame ? (cfg.apiKey || '') : (cfg.imageApiKey || cfg.apiKey || '');
    var baseUrl = (useSame ? (cfg.baseUrl || '') : (cfg.imageBaseUrl || cfg.baseUrl || '')) ||
      'https://api.openai.com/v1';
    return {
      apiKey: apiKey,
      baseUrl: baseUrl.replace(/\/+$/, ''),
      model: cfg.imageModel || 'dall-e-3',
      useSame: useSame
    };
  }

  // ---- 生图 Prompt 模板（正面立面图）----
  function buildPrompt(subject) {
    return 'Minecraft voxel style, front elevation view of ' + subject + '. ' +
      'Pure white background, single isolated building, centered, symmetrical, no text, no grid, high resolution';
  }

  // ---- 中文 → 英文翻译（尽力而为，生图模型对英文理解更准）----
  function translateToEnglish(cfg, text) {
    if (!/[一-鿿]/.test(text)) return Promise.resolve(text);
    if (!cfg.apiKey) return Promise.resolve(text); // 无主 key 只能回退原文
    var baseUrl = (cfg.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    return fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({
        model: cfg.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Translate this Minecraft building description into concise English for an AI image generator. Output ONLY the English translation, nothing else.' },
          { role: 'user', content: text }
        ],
        max_tokens: 200,
        stream: false
      }),
      signal: AbortSignal.timeout(20000)
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      var t = data && data.choices && data.choices[0] &&
        data.choices[0].message && data.choices[0].message.content;
      return t ? t.trim() : text;
    }).catch(function () {
      return text; // 翻译失败回退原文
    });
  }

  // ---- 生图 API 调用（b64_json 优先，url 兜底）----
  function callImageGen(cfg, prompt) {
    var r = resolveImageConfig(cfg);
    if (!r.apiKey) throw new Error('未配置生图 API Key，请到「设置」填写');
    return fetch(r.baseUrl + '/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + r.apiKey },
      body: JSON.stringify({
        model: r.model, prompt: prompt, n: 1, size: '1024x1024', response_format: 'b64_json'
      }),
      signal: AbortSignal.timeout(180000) // 生图可长达 60-120s
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (e) {
          throw new Error((e.error && e.error.message) || ('HTTP ' + res.status));
        });
      }
      return res.json();
    }).then(function (d) {
      var item = d && d.data && d.data[0];
      if (item && item.b64_json) return 'data:image/png;base64,' + item.b64_json;
      if (item && item.url) return urlToDataURL(item.url);
      throw new Error('生图接口返回格式异常');
    });
  }

  // URL → data URL（兜底；CDN 通常免鉴权）
  function urlToDataURL(url) {
    return fetch(url, { signal: AbortSignal.timeout(30000) }).then(function (r) {
      if (!r.ok) throw new Error('无法读取图片地址 HTTP ' + r.status);
      return r.blob();
    }).then(function (blob) {
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.onerror = function () { reject(new Error('读取图片失败')); };
        fr.readAsDataURL(blob);
      });
    });
  }

  // 多图扩展预留：MVP 传 n=1，未来三视图可分别用 front/side/top 模板生成 n=3
  function generateImages(cfg, prompt, n) {
    var count = n || 1;
    var tasks = [];
    for (var i = 0; i < count; i++) tasks.push(callImageGen(cfg, prompt));
    return Promise.all(tasks);
  }

  // ---- data URL → File（含 5MB 防线：超限 canvas 降采样）----
  function dataURLtoFile(dataUrl, name) {
    var parts = dataUrl.split(',');
    var mime = (parts[0].match(/:(.*?);/) || [null, 'image/png'])[1];
    var bin = atob(parts[1]);
    var u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new File([u8], name, { type: mime });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('图片加载失败')); };
      img.src = src;
    });
  }

  function normalizeToFile(dataUrl) {
    var b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    var bytes = Math.floor(b64.length * 0.75);
    if (bytes <= 4.5 * 1024 * 1024) {
      return Promise.resolve(dataURLtoFile(dataUrl, 'mc-elevation.png'));
    }
    // 超限：降采样到最长边 1024 + JPEG q0.85（白底）
    return loadImage(dataUrl).then(function (img) {
      var c = document.createElement('canvas');
      var sc = Math.min(1, 1024 / Math.max(img.width, img.height));
      c.width = Math.round(img.width * sc);
      c.height = Math.round(img.height * sc);
      var x = c.getContext('2d');
      x.fillStyle = '#fff';
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      return dataURLtoFile(c.toDataURL('image/jpeg', 0.85), 'mc-elevation.jpg');
    });
  }

  // ---- 注入图片到现有预览区（三入口 + 校验）----
  // 优先走应用自己的 onDrop → Je 链路，其次 input[file].files + change，最后 paste
  function injectFile(file) {
    return new Promise(function (resolve) {
      var input = findInput();
      if (!input) { resolve(false); return; }
      var before = previewImageCount();
      var attempts = 0;
      function tryNext() {
        if (previewImageCount() > before) { resolve(true); return; }
        if (attempts >= 3) { resolve(false); return; }
        attempts++;
        if (attempts === 1) {
          // 首选：drop 事件（应用自己写了 onDrop → Je）
          var dt = new DataTransfer();
          dt.items.add(file);
          input.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        } else if (attempts === 2) {
          // 兜底：隐藏 input[type=file].files + change
          var fi = input.parentElement.querySelector('input[type=file]');
          if (fi) {
            fi.value = '';
            var dt2 = new DataTransfer();
            dt2.items.add(file);
            try { fi.files = dt2.files; } catch (e) { /* files 只读时忽略 */ }
            fi.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else if (attempts === 3) {
          // 兜底：paste 事件（onPaste → Ot → getAsFile → Je）
          var dt3 = new DataTransfer();
          dt3.items.add(file);
          input.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt3 }));
        }
        setTimeout(tryNext, 200);
      }
      tryNext();
    });
  }

  // ---- 生成流程 ----
  function onGenerate() {
    var input = findInput();
    if (!input || input.disabled) { toast('界面加载中，请稍候'); return; }
    var text = (input.value || '').trim();
    if (!text) { toast('请先输入建筑描述'); return; }
    var cfg = getSettings();
    var r = resolveImageConfig(cfg);
    if (!r.apiKey) { toast('未配置生图 API Key，请到「设置」填写'); return; }

    openOverlay();
    renderOverlayLoading('🎨 正在生成…');
    translateToEnglish(cfg, text).then(function (en) {
      currentPrompt = buildPrompt(en);
      return callImageGen(cfg, currentPrompt);
    }).then(function (dataUrl) {
      currentDataUrl = dataUrl;
      renderOverlayReady(dataUrl, currentPrompt);
    }).catch(function (err) {
      renderOverlayError(err && err.message ? err.message : '未知错误');
    });
  }

  function onRegenerate() {
    var prompt = promptArea ? promptArea.value.trim() : currentPrompt;
    if (!prompt) { toast('请输入生图 Prompt'); return; }
    currentPrompt = prompt;
    var cfg = getSettings();
    if (!resolveImageConfig(cfg).apiKey) { toast('未配置生图 API Key'); return; }
    renderOverlayLoading('🎨 正在重新生成…');
    callImageGen(cfg, currentPrompt).then(function (dataUrl) {
      currentDataUrl = dataUrl;
      renderOverlayReady(dataUrl, currentPrompt);
    }).catch(function (err) {
      renderOverlayError(err && err.message ? err.message : '未知错误');
    });
  }

  function onUseImage() {
    if (!currentDataUrl) return;
    if (previewImageCount() >= MAX_IMAGES) { toast('最多 ' + MAX_IMAGES + ' 张图片'); return; }
    normalizeToFile(currentDataUrl).then(function (file) {
      return injectFile(file);
    }).then(function (ok) {
      if (ok) {
        closeOverlay();
        toast('图片已就绪，输入内容后发送', true);
      } else {
        toast('自动注入失败，请手动拖拽图片到输入框');
      }
    }).catch(function (err) {
      toast('注入失败：' + (err && err.message ? err.message : '未知错误'));
    });
  }

  // ---- 浮层 ----
  function openOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
      background: 'rgba(0,0,0,.6)', zIndex: 2147483001,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeOverlay(); // 点遮罩（非卡片）关闭
    });
    document.body.appendChild(overlay);
  }

  function closeOverlay() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    overlayImg = null;
    promptArea = null;
  }

  function makeCard() {
    var card = document.createElement('div');
    Object.assign(card.style, {
      background: '#0f172a', border: '1px solid rgba(255,255,255,.15)', borderRadius: '12px',
      width: 'min(640px, 92vw)', maxHeight: '86vh', overflowY: 'auto',
      boxShadow: '0 20px 60px rgba(0,0,0,.6)', fontFamily: 'Inter, sans-serif'
    });
    return card;
  }

  function mkBtn(text, bg, color) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    Object.assign(b.style, {
      background: bg, color: color,
      border: bg === 'transparent' ? '1px solid currentColor' : '1px solid transparent',
      borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
      cursor: 'pointer', fontFamily: 'Inter, sans-serif'
    });
    return b;
  }

  function renderOverlayLoading(msg) {
    if (!overlay) return;
    overlay.innerHTML = '';
    var card = makeCard();
    var div = document.createElement('div');
    div.style.cssText = 'padding:32px;text-align:center;color:#fb923c;font-size:14px';
    div.textContent = msg;
    card.appendChild(div);
    overlay.appendChild(card);
  }

  function renderOverlayReady(dataUrl, prompt) {
    if (!overlay) return;
    overlay.innerHTML = '';
    var card = makeCard();

    // header
    var head = document.createElement('div');
    Object.assign(head.style, {
      padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.1)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    });
    var title = document.createElement('div');
    title.textContent = '🎨 生成结果';
    title.style.cssText = 'color:#fff;font-size:15px;font-weight:600';
    var close = document.createElement('button');
    close.textContent = '✖';
    close.style.cssText = 'background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px';
    close.addEventListener('click', closeOverlay);
    head.appendChild(title);
    head.appendChild(close);
    card.appendChild(head);

    // 图片
    var img = document.createElement('img');
    img.src = dataUrl;
    Object.assign(img.style, {
      width: '100%', maxHeight: '50vh', objectFit: 'contain', background: '#fff', display: 'block'
    });
    card.appendChild(img);
    overlayImg = img;

    // 可编辑 Prompt
    var pwrap = document.createElement('div');
    pwrap.style.cssText = 'padding:12px 18px 6px';
    var plabel = document.createElement('div');
    plabel.textContent = '生图 Prompt（可编辑，重新生成时使用）';
    plabel.style.cssText = 'color:#94a3b8;font-size:12px;margin-bottom:6px';
    var pta = document.createElement('textarea');
    pta.value = prompt;
    pta.style.cssText = 'width:100%;background:#020617;border:1px solid rgba(255,255,255,.15);' +
      'border-radius:8px;color:#e2e8f0;font-size:12px;font-family:monospace;padding:8px;' +
      'resize:vertical;min-height:60px';
    pwrap.appendChild(plabel);
    pwrap.appendChild(pta);
    card.appendChild(pwrap);
    promptArea = pta;

    // 动作按钮
    var btns = document.createElement('div');
    Object.assign(btns.style, { padding: '6px 18px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' });
    var useBtn = mkBtn('✅ 用这张图建造', '#f97316', '#0f172a');
    useBtn.addEventListener('click', onUseImage);
    var reBtn = mkBtn('🔄 重新生成', 'transparent', '#fb923c');
    reBtn.addEventListener('click', onRegenerate);
    var cancelBtn = mkBtn('✖ 取消', 'transparent', '#94a3b8');
    cancelBtn.addEventListener('click', closeOverlay);
    btns.appendChild(useBtn);
    btns.appendChild(reBtn);
    btns.appendChild(cancelBtn);
    card.appendChild(btns);

    overlay.appendChild(card);
  }

  function renderOverlayError(errMsg) {
    if (!overlay) return;
    overlay.innerHTML = '';
    var card = makeCard();
    var div = document.createElement('div');
    div.style.cssText = 'padding:24px;text-align:center;color:#f87171;font-size:13px';
    div.innerHTML = '❌ ' + escapeHtml(errMsg);
    card.appendChild(div);
    var btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'padding:0 24px 20px;display:flex;gap:8px;justify-content:center';
    var closeBtn = mkBtn('✖ 关闭', 'transparent', '#94a3b8');
    closeBtn.addEventListener('click', closeOverlay);
    btnWrap.appendChild(closeBtn);
    card.appendChild(btnWrap);
    overlay.appendChild(card);
  }

  // ---- 控件注入（开关 + 生图按钮，放输入框左上角）----
  function injectControls() {
    if (document.getElementById(CTRL_ID)) return;
    var input = findInput();
    if (!input) return;
    var host = input.parentElement;
    if (!host) return;

    var ctrl = document.createElement('div');
    ctrl.id = CTRL_ID;
    Object.assign(ctrl.style, {
      position: 'absolute', top: '-30px', left: '4px',
      display: 'flex', gap: '6px', alignItems: 'center', zIndex: 1000, whiteSpace: 'nowrap'
    });

    // 开关
    var toggle = document.createElement('button');
    toggle.id = TOGGLE_ID;
    toggle.type = 'button';
    toggle.addEventListener('click', function () {
      setEnabled(!isEnabled());
      renderToggleState();
    });
    ctrl.appendChild(toggle);

    // 生图按钮
    var btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.textContent = '🖼️ 生图预览';
    btn.addEventListener('click', onGenerate);
    Object.assign(btn.style, {
      background: 'rgba(59,130,246,.15)', color: '#60a5fa',
      border: '1px solid rgba(59,130,246,.4)', borderRadius: '9999px',
      padding: '3px 12px', fontSize: '12px', lineHeight: '20px', cursor: 'pointer',
      fontFamily: 'Inter, sans-serif', transition: 'background .15s'
    });
    btn.addEventListener('mouseenter', function () { btn.style.background = 'rgba(59,130,246,.3)'; });
    btn.addEventListener('mouseleave', function () { btn.style.background = 'rgba(59,130,246,.15)'; });
    ctrl.appendChild(btn);

    host.appendChild(ctrl);
    renderToggleState();

    // 宿主非 relative 时退化为普通流式
    if (!/relative/.test(host.className || '')) {
      ctrl.style.position = 'static';
      ctrl.style.top = 'auto';
      ctrl.style.marginBottom = '8px';
      host.style.display = 'flex';
      host.style.flexDirection = 'column';
      host.style.alignItems = 'flex-end';
    }
  }

  // 同步开关视觉 + 按钮显隐
  function renderToggleState() {
    var toggle = document.getElementById(TOGGLE_ID);
    var btn = document.getElementById(BTN_ID);
    if (!toggle) return;
    var on = isEnabled();
    toggle.textContent = on ? '⏻ 生图预览：开' : '⏻ 生图预览：关';
    Object.assign(toggle.style, {
      background: on ? 'rgba(251,146,60,.15)' : 'rgba(255,255,255,.06)',
      color: on ? '#fb923c' : '#94a3b8',
      border: '1px solid ' + (on ? 'rgba(251,146,60,.4)' : 'rgba(148,163,184,.3)'),
      borderRadius: '9999px', padding: '3px 12px', fontSize: '12px', lineHeight: '20px',
      cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background .15s'
    });
    if (btn) btn.style.display = on ? '' : 'none';
  }

  // ---- 启动：持续轮询，保证 React 重渲染后控件仍在 ----
  function boot() {
    setInterval(function () {
      if (!document.getElementById(CTRL_ID)) {
        injectControls();
      } else {
        renderToggleState();
      }
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
