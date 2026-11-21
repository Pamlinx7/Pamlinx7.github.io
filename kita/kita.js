/*!
 * kita.js —— 台账页上的「捏捏机器人」
 * 拖得动、松手吸附到边、点一下会「啵」一声并弹气泡。
 * 不依赖任何库，图片就在同目录。
 */
(function () {
  "use strict";
  if (window.__KITA_LOADED__) return;
  window.__KITA_LOADED__ = true;

  var here = (function () {
    var s = document.currentScript;
    if (s && s.src) return s.src.replace(/[^/]*$/, "");
    return "/kita/";
  })();

  var SPRITES = {
    sit: here + "sit.png",
    stand: here + "stand.png",
    lie: here + "lie.png"
  };

  var LINES = [
    "前辈辛苦啦～",
    "今天也拜托你啦！",
    "这单我盯着呢，放心",
    "要不要歇一会儿？",
    "捏我的脸是要加钱的哦",
    "有新的要求就直接跟我说",
    "点一下就好啦，别捏太狠",
    "我在这儿呢，随时喊我",
    "再捏就要掉漆啦！",
    "唔……好啦好啦，我乖乖坐着"
  ];

  var css = [
    ".kita{position:fixed;z-index:80;width:132px;cursor:grab;user-select:none;",
    "-webkit-user-select:none;touch-action:none;",
    "filter:drop-shadow(0 8px 14px rgba(120,90,70,.22));transition:filter .2s;}",
    ".kita img{width:100%;height:auto;display:block;pointer-events:none;-webkit-user-drag:none;}",
    ".kita.bob img{animation:kita-bob 2.8s ease-in-out infinite;}",
    "@keyframes kita-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}",
    ".kita.squish img{animation:kita-squish .42s cubic-bezier(.34,1.56,.64,1) both;}",
    "@keyframes kita-squish{0%{transform:scale(1.14,.84)}45%{transform:scale(.94,1.08)}100%{transform:scale(1,1)}}",
    ".kita.dragging{cursor:grabbing;filter:drop-shadow(0 14px 22px rgba(120,90,70,.3));}",
    ".kita.dragging img{animation:none;transform:rotate(-6deg) scale(1.04);}",
    ".kita-bubble{position:fixed;z-index:81;max-width:230px;background:#fffdf8;color:#4a3f36;",
    "border:1px solid #e7ddcd;border-radius:14px;padding:10px 13px;",
    "font:15px/1.55 'Noto Serif SC','Songti SC',serif;",
    "box-shadow:0 10px 24px rgba(120,90,70,.16);opacity:0;transform:translateY(6px) scale(.96);",
    "transition:opacity .18s ease,transform .26s cubic-bezier(.34,1.56,.64,1);pointer-events:none;}",
    ".kita-bubble.on{opacity:1;transform:translateY(0) scale(1);}",
    ".kita-bubble:after{content:'';position:absolute;left:26px;bottom:-7px;width:12px;height:12px;",
    "background:#fffdf8;border-right:1px solid #e7ddcd;border-bottom:1px solid #e7ddcd;transform:rotate(45deg);}",
    ".kita-bubble.right:after{left:auto;right:26px;}",
    "body.kita-right .fab{bottom:158px;}",
    "@media (max-width:640px){.kita{width:96px}.kita-bubble{max-width:180px;font-size:14px}}"
  ].join("\n");

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var el = document.createElement("div");
  el.className = "kita bob";
  el.innerHTML = '<img alt="喜多" src="' + SPRITES.sit + '">';
  var img = el.firstChild;

  var bubble = document.createElement("div");
  bubble.className = "kita-bubble";

  function ready(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  // ---------- 声音：全部现场合成，不用音频文件 ----------
  var actx = null;
  function audio() {
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }

  function pop() {
    var a = audio();
    if (!a) return;
    var t = a.currentTime;
    var o = a.createOscillator(), g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(620, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.11);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.16);

    var buf = a.createBuffer(1, Math.floor(a.sampleRate * 0.05), a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.5;
    var n = a.createBufferSource(), ng = a.createGain();
    n.buffer = buf;
    ng.gain.setValueAtTime(0.12, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    n.connect(ng).connect(a.destination);
    n.start(t);
  }

  function ding() {
    var a = audio();
    if (!a) return;
    var t = a.currentTime;
    [1046.5, 1568].forEach(function (f, i) {
      var o = a.createOscillator(), g = a.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(i ? 0.07 : 0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + 0.34);
    });
  }

  // ---------- 位置 ----------
  var POS = { x: null, y: null, dock: "left" };
  try {
    var saved = JSON.parse(localStorage.getItem("wcb_kita_pos") || "null");
    if (saved && typeof saved.x === "number") POS = saved;
  } catch (e) {}

  function size() {
    return el.getBoundingClientRect();
  }

  function place(x, y) {
    var r = size();
    var maxX = window.innerWidth - r.width;
    var maxY = window.innerHeight - r.height;
    x = Math.max(0, Math.min(maxX, x));
    y = Math.max(0, Math.min(maxY, y));
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.bottom = "auto";
    el.style.right = "auto";
    POS.x = x;
    POS.y = y;
    return { x: x, y: y, maxX: maxX, maxY: maxY };
  }

  function save() {
    try { localStorage.setItem("wcb_kita_pos", JSON.stringify(POS)); } catch (e) {}
    document.body.classList.toggle("kita-right", POS.dock === "right");
  }

  function setPose(name) {
    var src = SPRITES[name] || SPRITES.sit;
    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    el.style.transform = POS.dock === "right" ? "scaleX(-1)" : "";
  }

  // ---------- 气泡 ----------
  var hideTimer = null;
  function say(text) {
    bubble.textContent = text;
    var r = el.getBoundingClientRect();
    var w = Math.min(240, window.innerWidth - 20);
    bubble.style.left = Math.max(10, Math.min(window.innerWidth - w, r.left - 16)) + "px";
    bubble.style.top = Math.max(8, r.top - 52) + "px";
    bubble.classList.toggle("right", POS.dock === "right");
    bubble.classList.add("on");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { bubble.classList.remove("on"); }, 3600);
  }

  function line() {
    var left = window.__WCB_PENDING;
    if (left > 0 && Math.random() < 0.35) {
      return "还有 " + left + " 单没交哦，前辈";
    }
    return LINES[Math.floor(Math.random() * LINES.length)];
  }

  var taps = 0;
  function touchy() {
    taps += 1;
    pop();
    el.classList.remove("squish");
    void el.offsetWidth;
    el.classList.add("squish");
    setTimeout(function () { el.classList.remove("squish"); }, 460);
    if (taps % 7 === 0) say("都捏 " + taps + " 下了，前辈你是真的很闲诶");
    else say(line());
  }

  // ---------- 拖拽 + 吸附 ----------
  var drag = null;

  el.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    var r = el.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: 0, x0: e.clientX, y0: e.clientY };
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    el.classList.add("dragging");
    el.classList.remove("bob");
    setPose("lie");
  });

  el.addEventListener("pointermove", function (e) {
    if (!drag) return;
    drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0));
    if (drag.moved > 4) place(e.clientX - drag.dx, e.clientY - drag.dy);
  });

  function endDrag() {
    if (!drag) return;
    var wasDrag = drag.moved > 6;
    drag = null;
    el.classList.remove("dragging");
    el.classList.add("bob");

    if (!wasDrag) {
      setPose("sit");
      touchy();
      return;
    }

    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var dL = cx, dR = window.innerWidth - cx, dB = window.innerHeight - cy;
    var m = Math.min(dL, dR, dB);
    var x = r.left, y = r.top;

    if (m === dB) {
      POS.dock = "left";
      y = window.innerHeight - r.height + 2;
      x = Math.max(8, Math.min(window.innerWidth - r.width - 8, r.left));
    } else if (m === dL) {
      POS.dock = "left";
      x = 10;
      y = Math.max(8, Math.min(window.innerHeight - r.height - 8, r.top));
    } else {
      POS.dock = "right";
      x = window.innerWidth - r.width - 10;
      y = Math.max(8, Math.min(window.innerHeight - r.height - 8, r.top));
    }
    place(x, y);
    save();
    setPose(POS.dock === "right" ? "stand" : "sit");
    ding();
    say("我就待这儿啦");
  }

  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);

  window.addEventListener("resize", function () {
    if (POS.x == null) return dockInitial(true);
    place(POS.x, POS.y);
  });

  function dockInitial(silent) {
    var h = window.innerHeight;
    var r = el.getBoundingClientRect();
    var x = 14;
    var y = h - r.height + 2;
    if (POS.x != null) { x = POS.x; y = POS.y; }
    place(x, y);
    save();
    if (!silent) setPose(POS.dock === "right" ? "stand" : "sit");
  }

  ready(function () {
    document.body.appendChild(el);
    document.body.appendChild(bubble);
    dockInitial(true);
    setPose(POS.dock === "right" ? "stand" : "sit");
    save();

    try {
      if (!sessionStorage.getItem("wcb_kita_hi")) {
        sessionStorage.setItem("wcb_kita_hi", "1");
        setTimeout(function () { say("前辈，今天也辛苦啦～"); }, 2200);
      }
    } catch (e) {}
  });

  window.kitaSay = function (t) { say(t); };
})();
