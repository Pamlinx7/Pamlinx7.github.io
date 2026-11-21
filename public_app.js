
/* 公网页面上的轻编辑：拖拽排序 / 改新要求 / 删新要求
   改动先存在这台设备，点「保存到线上」才会写进仓库的 edits.json。 */
(function () {
  'use strict';
  var REPO = 'Pamlinx7/Pamlinx7.github.io', FILE = 'edits.json';
  var LKEY = 'wcb_edits_v1', TKEY = 'wcb_token_v1';
  var BASE = location.pathname.indexOf('/o/') >= 0 ? '../' : '';

  function jget(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  var L = jget(LKEY, {}); L.order = L.order || []; L.reqs = L.reqs || {}; L.del = L.del || {};
  L.done = L.done || {}; L.add = L.add || {}; L.fields = L.fields || {};
  L.hidden = L.hidden || {}; L.quotes = L.quotes || {}; L.addfiles = L.addfiles || {};
  var REM = { order: [], reqs: {}, del: {}, done: {}, add: {}, fields: {}, hidden: {}, quotes: {}, addfiles: {} };

  /* 一次性口令：打开 https://…/#k=github_pat_xxx 就把令牌存进这台浏览器，然后从地址栏抹掉 */
  (function () {
    var m = (location.hash || '').match(/[#&]k=([A-Za-z0-9_\-]+)/);
    if (m) {
      localStorage.setItem(TKEY, m[1]);
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    }
  })();

  function eff() {
    var o = L.order.length ? L.order.slice() : (REM.order || []).slice();
    var reqs = {}, del = {}, done = {};
    Object.keys(REM.reqs || {}).forEach(function (k) { reqs[k] = Object.assign({}, REM.reqs[k]); });
    Object.keys(L.reqs || {}).forEach(function (k) { reqs[k] = Object.assign(reqs[k] || {}, L.reqs[k]); });
    Object.keys(REM.del || {}).forEach(function (k) { del[k] = (REM.del[k] || []).slice(); });
    Object.keys(L.del || {}).forEach(function (k) {
      var a = del[k] || [];
      L.del[k].forEach(function (t) { if (a.indexOf(t) < 0) a.push(t); });
      del[k] = a;
    });
    Object.keys(REM.done || {}).forEach(function (k) { done[k] = !!REM.done[k]; });
    Object.keys(L.done || {}).forEach(function (k) { done[k] = !!L.done[k]; });
    var add = {};
    [REM.add || {}, L.add || {}].forEach(function (src) {
      Object.keys(src).forEach(function (k) {
        var cur = add[k] || [], seen = {};
        cur.forEach(function (it) { seen[it.id] = 1; });
        (src[k] || []).forEach(function (it) {
          if (it && it.id && !seen[it.id]) { cur.push(it); seen[it.id] = 1; }
        });
        add[k] = cur;
      });
    });
    function merge2(key) {
      var out = {};
      [REM[key] || {}, L[key] || {}].forEach(function (src) {
        Object.keys(src).forEach(function (k) {
          var cur = out[k];
          if (Array.isArray(src[k])) {
            cur = (cur || []).slice();
            (src[k] || []).forEach(function (v) { if (cur.indexOf(v) < 0) cur.push(v); });
            out[k] = cur;
          } else {
            out[k] = Object.assign(cur || {}, src[k]);
          }
        });
      });
      return out;
    }
    function mergeArr(key) {
      var out = {};
      [REM[key] || {}, L[key] || {}].forEach(function (src) {
        Object.keys(src).forEach(function (k) {
          var cur = out[k] || [], seen = {};
          cur.forEach(function (it) { seen[it.name] = 1; });
          (src[k] || []).forEach(function (it) {
            if (it && it.name && !seen[it.name]) { cur.push(it); seen[it.name] = 1; }
          });
          out[k] = cur;
        });
      });
      return out;
    }
    return { order: o, reqs: reqs, del: del, done: done, add: add,
             fields: merge2('fields'), hidden: merge2('hidden'), quotes: merge2('quotes'),
             addfiles: mergeArr('addfiles') };
  }
  function persist() { localStorage.setItem(LKEY, JSON.stringify(L)); paint(); }

  /* ---------- 首页：拖拽排序 ---------- */
  var dragEl = null;
  function applyIndex() {
    var list = document.querySelector('.list'); if (!list) return;
    var e = eff(), rows = [].slice.call(list.querySelectorAll('.row'));
    rows.forEach(function (r) {
      var d = !!e.done[r.dataset.slug];
      r.classList.toggle('done', d);
      var b = r.querySelector('.chk'); if (b) b.title = d ? '点一下恢复成未完成' : '点一下标记完成';
    });
    rows.sort(function (a, b) {
      var da = a.classList.contains('done') ? 1 : 0, db = b.classList.contains('done') ? 1 : 0;
      if (da !== db) return da - db;
      var ia = e.order.indexOf(a.dataset.slug), ib = e.order.indexOf(b.dataset.slug);
      if (ia < 0) ia = 9999; if (ib < 0) ib = 9999; return ia - ib;
    });
    rows.forEach(function (r) { list.appendChild(r); r.setAttribute('draggable', 'true'); });
    refreshCounts();
  }
  function refreshCounts() {
    var list = document.querySelector('.list'); if (!list) return;
    var rows = [].slice.call(list.querySelectorAll('.row'));
    var total = rows.length;
    var left = rows.filter(function (r) { return !r.classList.contains('done'); }).length;
    var m = document.getElementById('wcb_meta');
    if (m) {
      var t = m.textContent.split('·'), upd = t.length > 2 ? t.slice(2).join('·').trim() : '';
      m.textContent = total + ' 单 · ' + left + ' 未完成' + (upd ? ' · ' + upd : '');
    }
    var l = document.getElementById('wcb_left');
    if (l) l.textContent = '台账里还有 ' + left + ' 单没完成';
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.row .chk'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    var r = b.closest('.row'), slug = r.dataset.slug;
    var now = !r.classList.contains('done');
    L.done[slug] = now; r.classList.toggle('done', now);
    b.title = now ? '点一下恢复成未完成' : '点一下标记完成';
    var list = document.querySelector('.list');
    var rows = [].slice.call(list.querySelectorAll('.row')).sort(function (a, c) {
      var da = a.classList.contains('done') ? 1 : 0, dc = c.classList.contains('done') ? 1 : 0;
      return da - dc;
    });
    rows.forEach(function (x) { list.appendChild(x); });
    refreshCounts();
    persist();
  }, true);
  document.addEventListener('dragstart', function (ev) {
    var r = ev.target.closest && ev.target.closest('.row'); if (!r) return;
    dragEl = r; r.classList.add('dragging'); ev.dataTransfer.effectAllowed = 'move';
    try { ev.dataTransfer.setData('text/plain', r.dataset.slug); } catch (e) {}
  });
  document.addEventListener('dragover', function (ev) {
    if (!dragEl) return;
    var r = ev.target.closest && ev.target.closest('.row');
    if (!r || r === dragEl) return;
    ev.preventDefault();
    var rect = r.getBoundingClientRect();
    var after = (ev.clientY - rect.top) > rect.height / 2;
    r.parentNode.insertBefore(dragEl, after ? r.nextSibling : r);
  });
  document.addEventListener('dragend', function () {
    if (!dragEl) { return; }
    dragEl.classList.remove('dragging'); dragEl = null;
    var list = document.querySelector('.list'); if (!list) return;
    L.order = [].slice.call(list.querySelectorAll('.row')).map(function (r) { return r.dataset.slug; });
    persist();
  });

  /* ---------- 详情页：改 / 删 新要求 ---------- */
  function applyDetail() {
    var box = document.querySelector('.reqbox[data-slug]'); if (!box) return;
    var slug = box.dataset.slug, e = eff();
    function wire(c, ts, rt) {
      var b1 = c.querySelector('.red'), b2 = c.querySelector('.rdel');
      if (b1) b1.onclick = function () {
        var v = prompt('改这条新要求：', rt.textContent);
        if (v == null) return; v = v.trim(); if (!v) return;
        rt.textContent = v;
        L.reqs[slug] = L.reqs[slug] || {}; L.reqs[slug][ts] = v; persist();
      };
      if (b2) b2.onclick = function () {
        if (!confirm('把这条新要求去掉？')) return;
        L.del[slug] = L.del[slug] || [];
        if (L.del[slug].indexOf(ts) < 0) L.del[slug].push(ts);
        c.remove(); persist();
      };
    }
    [].slice.call(box.querySelectorAll('.req')).forEach(function (c) {
      var ts = c.dataset.ts;
      if ((e.del[slug] || []).indexOf(ts) >= 0) { c.remove(); return; }
      var rt = c.querySelector('.rt');
      if (e.reqs[slug] && e.reqs[slug][ts] != null) rt.textContent = e.reqs[slug][ts];
      wire(c, ts, rt);
    });
    /* 公网上自己加的那些新要求（edits.json 里的 add） */
    var mine = (e.add && e.add[slug]) || [];
    mine.slice().reverse().forEach(function (it) {
      if ((e.del[slug] || []).indexOf(it.id) >= 0) return;
      if (box.querySelector(".req[data-ts='" + it.id + "']")) return;
      var c = mkCard(it.ts || '', it.id, it.text || '', it.who || '网页');
      box.insertBefore(c, box.firstChild);
      wire(c, it.id, c.querySelector('.rt'));
    });
    /* 加一条的输入框 */
    var f = document.querySelector(".addreq[data-slug='" + slug + "']");
    if (f) {
      var inp = f.querySelector('.ai'), btn = f.querySelector('.ab');
      function add() {
        var v = (inp.value || '').trim(); if (!v) { inp.focus(); return; }
        var id = 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        var ts = fmtTs();
        L.add[slug] = L.add[slug] || [];
        L.add[slug].push({ id: id, ts: ts, text: v, who: '网页' });
        var c = mkCard(ts, id, v, '网页');
        box.insertBefore(c, box.firstChild);
        wire(c, id, c.querySelector('.rt'));
        inp.value = '';
        var em = document.querySelector('.empty'); if (em && em.textContent.indexOf('还没有') >= 0) em.style.display = 'none';
        persist();
      }
      btn.onclick = add;
      inp.onkeydown = function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); add(); } };
    }
  }
  function fmtTs() {
    var d = new Date();
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function mkCard(ts, id, text, who) {
    var d = document.createElement('div');
    d.className = 'req new'; d.dataset.ts = id;
    d.innerHTML = "<div class='rh'><span class='k chg'>新要求</span><span class='w'></span>"
      + "<span class='ract'><button class='red' type='button'>改</button>"
      + "<button class='rdel' type='button'>删</button></span></div><div class='rt'></div>";
    d.querySelector('.w').textContent = ts + (who ? ' · ' + who : '');
    d.querySelector('.rt').textContent = text;
    return d;
  }

  /* ---------- 详情页：改 / 删 / 加 原要求 + 上传文件 ---------- */
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function kindOf(n) {
    n = (n || '').toLowerCase();
    if (/\.(mp4|mov|m4v|webm|mkv)$/.test(n)) return 'video';
    if (/\.(mp3|wav|m4a|flac|aac|ogg)$/.test(n)) return 'audio';
    if (/\.(jpg|jpeg|png|gif|webp|bmp)$/.test(n)) return 'image';
    return 'file';
  }
  function applyHero() {
    var h = document.querySelector('.hero[data-slug]'); if (!h) return;
    var slug = h.dataset.slug, e = eff();
    var f = (e.fields && e.fields[slug]) || {};
    var hid = (e.hidden && e.hidden[slug]) || [];
    var big = h.querySelector("[data-f='need']"), q = h.querySelector("[data-f='quote']");
    if (f.need && big) big.textContent = f.need;
    if (f.quote) {
      if (!q) {
        q = document.createElement('div'); q.className = 'quote'; q.setAttribute('data-f', 'quote');
        h.appendChild(q);
      }
      q.textContent = '单主原话：' + f.quote; q.style.display = '';
    }
    if (hid.indexOf('need') >= 0 && big) big.style.display = 'none';
    if (hid.indexOf('quote') >= 0 && q) q.style.display = 'none';

    var tools = document.createElement('div'); tools.className = 'hact';
    function btn(t, fn) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'hbtn';
      b.textContent = t; b.onclick = fn; tools.appendChild(b); return b;
    }
    btn('改需求', function () {
      var v = prompt('改这一单的需求：', big ? big.textContent : ''); if (v == null) return;
      v = v.trim(); if (!v) return;
      if (!big) { big = document.createElement('div'); big.className = 'big'; big.setAttribute('data-f', 'need'); h.appendChild(big); }
      big.textContent = v; big.style.display = '';
      L.fields[slug] = Object.assign(L.fields[slug] || {}, { need: v });
      var i = hid.indexOf('need'); if (i >= 0) hid.splice(i, 1);
      L.hidden[slug] = hid; persist();
    });
    btn('改原话', function () {
      var base = q && q.style.display !== 'none' ? q.textContent.replace(/^单主原话：/, '') : '';
      var v = prompt('单主原话（就是客户当初怎么说的）：', base); if (v == null) return;
      v = v.trim(); if (!v) return;
      if (!q) { q = document.createElement('div'); q.className = 'quote'; q.setAttribute('data-f', 'quote'); h.appendChild(q); }
      q.textContent = '单主原话：' + v; q.style.display = '';
      L.fields[slug] = Object.assign(L.fields[slug] || {}, { quote: v });
      var i = hid.indexOf('quote'); if (i >= 0) hid.splice(i, 1);
      L.hidden[slug] = hid; persist();
    });
    btn('删原话', function () {
      if (!q) return;
      if (!confirm('把「单主原话」从页面上删掉？')) return;
      q.style.display = 'none';
      if (hid.indexOf('quote') < 0) hid.push('quote');
      L.hidden[slug] = hid; persist();
    });
    btn('＋加一条原话', function () {
      var v = prompt('再加一条原要求 / 单主原话：'); if (v == null) return;
      v = v.trim(); if (!v) return;
      L.quotes[slug] = (L.quotes[slug] || []).concat([v]);
      var d = document.createElement('div'); d.className = 'quote';
      d.textContent = '单主原话：' + v; h.appendChild(d); persist();
    });
    h.appendChild(tools);
    ((e.quotes && e.quotes[slug]) || []).forEach(function (t) {
      var d = document.createElement('div'); d.className = 'quote';
      d.textContent = '单主原话：' + t; h.appendChild(d);
    });
  }

  function applyFiles() {
    var h = document.querySelector('.hero[data-slug]'); if (!h) return;
    var slug = h.dataset.slug, e = eff();
    var h2 = null, hs = document.querySelectorAll('h2');
    for (var i = 0; i < hs.length; i++) if (hs[i].textContent.indexOf('参考文件') === 0) h2 = hs[i];
    if (!h2) {
      h2 = document.createElement('h2'); h2.textContent = '参考文件';
      h.insertAdjacentElement('afterend', h2);
    }
    var wrap = document.createElement('div'); wrap.className = 'addfiles';
    ((e.addfiles && e.addfiles[slug]) || []).forEach(function (it) {
      var src = BASE + 'f/' + slug + '/' + encodeURIComponent(it.name);
      var kind = it.kind || kindOf(it.name);
      var sav = "<div class='acts'><a class='sav' href='" + src + "' download>⤓ 另存为</a></div>";
      var el = document.createElement('div');
      if (kind === 'video') el.innerHTML = "<div class='card'><video src='" + src + "' controls playsinline preload='metadata'></video><div class='cap'>" + esc(it.name) + "</div>" + sav + "</div>";
      else if (kind === 'image') el.innerHTML = "<div class='card'><a href='" + src + "' target='_blank'><img src='" + src + "' alt=''></a><div class='cap'>" + esc(it.name) + "</div>" + sav + "</div>";
      else if (kind === 'audio') el.innerHTML = "<div class='audio'><div class='cap'>" + esc(it.name) + "</div><audio src='" + src + "' controls preload='metadata'></audio>" + sav + "</div>";
      else el.innerHTML = "<div class='doc'><a href='" + src + "' download>" + esc(it.name) + "</a>" + sav + "</div>";
      wrap.appendChild(el);
    });
    var up = document.createElement('div'); up.className = 'upreq';
    up.innerHTML = "<label class='upbtn'>＋ 上传文件<input type='file' multiple hidden></label>"
      + "<span class='upmsg'>视频 / 音频 / 图片都行，单个 ≤ 90MB</span>";
    wrap.appendChild(up);
    h2.insertAdjacentElement('afterend', wrap);

    var inp = up.querySelector('input'), msg = up.querySelector('.upmsg');
    inp.onchange = function () {
      var files = [].slice.call(inp.files || []); if (!files.length) return;
      var tok = localStorage.getItem(TKEY);
      if (!tok) { alert('上传要用带 #k=… 的那条链接打开过一次才行（令牌存在浏览器里）。'); return; }
      var done = 0, total = 0;
      files.forEach(function (f) {
        if (f.size > 90 * 1024 * 1024) { alert(f.name + ' 超过 90MB，先压缩一下吧'); return; }
        total++;
        var fr = new FileReader();
        fr.onload = function () {
          msg.textContent = '上传中… ' + f.name;
          var b64 = String(fr.result).split(',')[1];
          var api = 'https://api.github.com/repos/' + REPO + '/contents/f/' + slug + '/' + encodeURIComponent(f.name);
          fetch(api, {
            method: 'PUT',
            headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '上传参考文件 ' + f.name, content: b64 })
          }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          }).then(function () {
            L.addfiles[slug] = (L.addfiles[slug] || []).concat([{ name: f.name, kind: kindOf(f.name) }]);
            done++;
            if (done >= total) {
              localStorage.setItem(LKEY, JSON.stringify(L));
              msg.textContent = '传好了，正在刷新…';
              location.reload();
            }
          }).catch(function (err) { msg.textContent = '失败：' + err.message; });
        };
        fr.readAsDataURL(f);
      });
    };
  }

  /* ---------- 底部条：还有几处没上线 ---------- */
  var bar = document.createElement('div'); bar.id = 'wcb_bar';
  function pending() {
    var n = L.order.length ? 1 : 0;
    Object.keys(L.reqs).forEach(function (k) { n += Object.keys(L.reqs[k]).length; });
    Object.keys(L.del).forEach(function (k) { n += L.del[k].length; });
    Object.keys(L.done).forEach(function (k) { n += 1; });
    Object.keys(L.add).forEach(function (k) { n += (L.add[k] || []).length; });
    Object.keys(L.fields).forEach(function (k) { n += Object.keys(L.fields[k] || {}).length; });
    Object.keys(L.hidden).forEach(function (k) { n += (L.hidden[k] || []).length; });
    Object.keys(L.quotes).forEach(function (k) { n += (L.quotes[k] || []).length; });
    Object.keys(L.addfiles).forEach(function (k) { n += (L.addfiles[k] || []).length; });
    return n;
  }
  function paint() {
    var n = pending();
    if (!n) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    bar.innerHTML = '<span>本机改了 ' + n + ' 处，还没上线</span>';
    var b = document.createElement('button'); b.className = 'sav'; b.textContent = '↑ 保存到线上';
    b.onclick = function () { commit(b); };
    var u = document.createElement('button'); u.className = 'sav'; u.textContent = '撤销';
    u.onclick = function () { localStorage.removeItem(LKEY); location.reload(); };
    bar.appendChild(b); bar.appendChild(u);
  }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function canon(o) {
    function s(v) {
      if (Array.isArray(v)) return '[' + v.map(s).join(',') + ']';
      if (v && typeof v === 'object') {
        return '{' + Object.keys(v).sort().map(function (k) {
          return JSON.stringify(k) + ':' + s(v[k]);
        }).join(',') + '}';
      }
      return JSON.stringify(v);
    }
    return s(o);
  }
  function norm(j) {
    j = j || {};
    return { order: j.order || [], reqs: j.reqs || {}, del: j.del || {}, done: j.done || {}, add: j.add || {},
             fields: j.fields || {}, hidden: j.hidden || {}, quotes: j.quotes || {}, addfiles: j.addfiles || {} };
  }
  function poll(mine, n) {
    if (n > 40) { bar.innerHTML = '<span>已提交 ✓ 过一会儿刷新页面就生效了</span>'; return; }
    setTimeout(function () {
      fetch(BASE + 'edits.json?t=' + Date.now())
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && canon(norm(j)) === mine) { localStorage.removeItem(LKEY); location.reload(); }
          else { poll(mine, n + 1); }
        })
        .catch(function () { poll(mine, n + 1); });
    }, 4000);
  }
  function commit(btn) {
    var tok = localStorage.getItem(TKEY);
    if (!tok) {
      tok = prompt('把改动存到线上，需要一次 GitHub 令牌（只保存在这台设备里）：\n\n'
        + '1) 打开 github.com/settings/personal-access-tokens/new\n'
        + '2) Repository access 选 Only select repositories → Pamlinx7.github.io\n'
        + '3) Permissions → Contents 选 Read and write\n'
        + '4) 生成并复制，粘到这里');
      if (!tok) return;
      localStorage.setItem(TKEY, tok.trim());
    }
    btn.disabled = true; btn.textContent = '保存中…';
    var body = JSON.stringify(eff(), null, 1);
    var api = 'https://api.github.com/repos/' + REPO + '/contents/' + FILE;
    fetch(api, { headers: { Authorization: 'Bearer ' + tok } })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (meta) {
        var payload = { message: '公网编辑 ' + new Date().toLocaleString(), content: b64(body) };
        if (meta && meta.sha) payload.sha = meta.sha;
        return fetch(api, {
          method: 'PUT',
          headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var mine = canon(eff());
        bar.innerHTML = '<span>已提交 ✓ 等 GitHub 生效（约半分钟）</span>';
        poll(mine, 0);
      })
      .catch(function (e) {
        btn.disabled = false; btn.textContent = '↑ 保存到线上';
        alert('没保存成功：' + e.message + '\n（令牌过期或权限不够，清掉浏览器数据可重填）');
      });
  }

  document.body.appendChild(bar);
  fetch(BASE + 'edits.json?t=' + Date.now())
    .then(function (r) { return r.ok ? r.json() : {}; })
    .catch(function () { return {}; })
    .then(function (j) {
      REM = Object.assign({ order: [], reqs: {}, del: {}, done: {}, add: {},
                            fields: {}, hidden: {}, quotes: {}, addfiles: {} }, j || {});
      applyIndex(); applyHero(); applyFiles(); applyDetail(); paint();
    });
})();
