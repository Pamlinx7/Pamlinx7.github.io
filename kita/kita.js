/*!
 * kita.js —— 台账页上的「喜多」小机器人
 * 可以拖、松手吸附到边、点一下会「啵」一声并说话、还能投喂辛拉面和乳酸菌。
 * 不依赖任何库，图片在同目录。
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

  var SPRITES = { sit: here + "sit.png", stand: here + "stand.png", lie: here + "lie.png" };
  var FACE_MOUTH = here + "face_surprised.jpg";

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

  var FEED_LINES = {
    noodle: [
      "唔！这个辣度刚好，谢谢前辈～",
      "吸溜吸溜……辛拉面最棒了！",
      "汤也要喝完的哦，一点不浪费",
      "吃面的时候不要跟我说话啦"
    ],
    yogurt: [
      "咕嘟咕嘟……甜甜的，舒服",
      "乳酸菌对嗓子好，前辈也来一瓶？",
      "冰的更好喝，下次冰一下嘛",
      "喝完了，瓶子我留着当收藏"
    ]
  };

  var CSS = [
    ".kita{position:fixed;z-index:80;width:132px;cursor:grab;user-select:none;",
    "-webkit-user-select:none;touch-action:none;",
    "filter:drop-shadow(0 8px 14px rgba(120,90,70,.22));}",
    ".kita img{width:100%;height:auto;display:block;pointer-events:none;-webkit-user-drag:none;}",
    ".kita.bob img{animation:kita-bob 2.8s ease-in-out infinite;}",
    "@keyframes kita-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}",
    ".kita.squish img{animation:kita-squish .42s cubic-bezier(.34,1.56,.64,1) both;}",
    "@keyframes kita-squish{0%{transform:scale(1.14,.84)}45%{transform:scale(.94,1.08)}100%{transform:scale(1,1)}}",
    ".kita.dragging{cursor:grabbing;filter:drop-shadow(0 14px 22px rgba(120,90,70,.3));}",
    ".kita.dragging img{animation:none;transform:rotate(-6deg) scale(1.04);}",

    ".kita-bubble{position:fixed;z-index:86;max-width:250px;background:#fffdf8;color:#4a3f36;",
    "border:1px solid #e7ddcd;border-radius:14px;padding:10px 13px;",
    "font:15px/1.55 'Noto Serif SC','Songti SC',serif;",
    "box-shadow:0 12px 26px rgba(120,90,70,.18);opacity:0;transform:translateY(8px) scale(.96);",
    "transition:opacity .18s ease,transform .26s cubic-bezier(.34,1.56,.64,1);pointer-events:none;}",
    ".kita-bubble.on{opacity:1;transform:none;}",
    ".kita-bubble:after{content:'';position:absolute;left:24px;bottom:-7px;width:12px;height:12px;",
    "background:#fffdf8;border-right:1px solid #e7ddcd;border-bottom:1px solid #e7ddcd;transform:rotate(45deg);}",
    ".kita-bubble.right:after{left:auto;right:24px;}",

    ".kita-feed{position:fixed;z-index:88;display:flex;gap:6px;align-items:center;padding:5px 7px 5px 6px;",
    "background:#fffefb;border:1px solid #e2d3bc;border-radius:13px;",
    "box-shadow:0 10px 26px rgba(110,80,60,.26),0 2px 6px rgba(110,80,60,.12);",
    "opacity:0;transform:translateY(-6px) scale(.94);pointer-events:none;",
    "transition:opacity .16s,transform .24s cubic-bezier(.34,1.56,.64,1);}",
    ".kita-feed.on{opacity:1;transform:none;pointer-events:auto;}",
    ".kita-feed:before{content:'';position:absolute;left:26px;top:-5px;width:9px;height:9px;",
    "background:#fffefb;border-left:1px solid #e2d3bc;border-top:1px solid #e2d3bc;transform:rotate(45deg);}",
    ".kita-feed:after{content:'投喂';position:absolute;right:8px;top:-9px;font:10px/1 'Noto Serif SC',serif;",
    "color:#ad8f74;background:#fffefb;border:1px solid #eadcc6;border-radius:7px;padding:2px 5px;letter-spacing:1px;}",
    ".kita-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid #e8d8c1;",
    "background:#fdf7ee;border-radius:9px;padding:5px 9px;font:12.5px/1 'Noto Serif SC',serif;",
    "color:#4a3f36;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s,transform .15s;}",
    ".kita-chip:hover{border-color:#d8564f;background:#fdf1ef;transform:translateY(-1px);}",
    ".kita-chip:active{transform:translateY(0) scale(.97);}",
    ".kita-chip svg{width:13px;height:13px;display:block;}",
    ".kita-count{font:10.5px/1 'Noto Serif SC',serif;color:#9c8b78;padding:0 24px 0 2px;white-space:nowrap;}",

    ".kita-mouth{position:fixed;z-index:85;width:120px;pointer-events:none;opacity:0;",
    "transition:opacity .16s,transform .3s cubic-bezier(.34,1.56,.64,1);",
    "transform:scale(.86);border-radius:14px;overflow:hidden;",
    "box-shadow:0 10px 24px rgba(120,90,70,.22);border:3px solid #fffefb;}",
    ".kita-mouth img{width:100%;display:block;}",
    ".kita-mouth.on{opacity:1;transform:scale(1);}",

    ".art.flip,.portrait.flip{animation:art-flip .42s cubic-bezier(.34,1.56,.64,1) both;}",
    "@keyframes art-flip{0%{transform:scale(1.04);opacity:.5}100%{transform:scale(1);opacity:1}}",
    ".kita-plus{position:fixed;z-index:87;font:600 15px/1 'Noto Serif SC',serif;color:#d8564f;",
    "pointer-events:none;animation:kita-up 1.1s ease forwards;}",
    "@keyframes kita-up{0%{opacity:0;transform:translateY(0)}20%{opacity:1}100%{opacity:0;transform:translateY(-40px)}}",

    "body.kita-right .fab{bottom:158px;}",
    "@media (max-width:640px){.kita{width:96px}.kita-bubble{max-width:180px;font-size:14px}}"
  ].join("\n");

  var style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  var el = document.createElement("div");
  el.className = "kita bob";
  el.innerHTML = '<img alt="喜多" src="' + SPRITES.sit + '">';
  var img = el.firstChild;

  var bubble = document.createElement("div");
  bubble.className = "kita-bubble";

  var feedBar = document.createElement("div");
  feedBar.className = "kita-feed";
  feedBar.innerHTML =
    '<button class="kita-chip" data-food="noodle" type="button">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="#d8564f" stroke-width="2" stroke-linecap="round">' +
    '<path d="M4 11h16a8 8 0 0 1-16 0z" fill="#fbe3df"/><path d="M7 7c0-1.5 1-2 1-3.5"/>' +
    '<path d="M12 7c0-1.5 1-2 1-3.5"/><path d="M17 7c0-1.5 1-2 1-3.5"/></svg>辛拉面</button>' +
    '<button class="kita-chip" data-food="yogurt" type="button">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="#6f8b6a" stroke-width="2" stroke-linecap="round">' +
    '<path d="M9 3h6l-1 4h-4z" fill="#e6efe4"/><path d="M8 7h8l-1 12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" fill="#eef4ec"/>' +
    '<path d="M9 12h6"/></svg>乳酸菌</button>' +
    '<span class="kita-count"></span>';

  var mouth = document.createElement("div");
  mouth.className = "kita-mouth";
  mouth.innerHTML = '<img alt="" src="' + FACE_MOUTH + '">';

  function ready(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  /* ---------------- 声音：现场合成 ---------------- */
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
    g.gain.exponentialRampToValueAtTime(0.26, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.16);

    var buf = a.createBuffer(1, Math.floor(a.sampleRate * 0.05), a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.5;
    var n = a.createBufferSource(), ng = a.createGain();
    n.buffer = buf;
    ng.gain.setValueAtTime(0.1, t);
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
      g.gain.exponentialRampToValueAtTime(i ? 0.06 : 0.1, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + 0.34);
    });
  }

  function slurp() {
    var a = audio();
    if (!a) return;
    var t0 = a.currentTime;
    for (var k = 0; k < 3; k++) {
      var t = t0 + k * 0.13;
      var buf = a.createBuffer(1, Math.floor(a.sampleRate * 0.12), a.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) {
        var p = i / d.length;
        d[i] = (Math.random() * 2 - 1) * Math.sin(p * Math.PI) * 0.7;
      }
      var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = buf;
      f.type = "bandpass";
      f.frequency.setValueAtTime(900 - k * 160, t);
      f.Q.value = 1.2;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      s.connect(f).connect(g).connect(a.destination);
      s.start(t);
    }
  }

  function gulp() {
    var a = audio();
    if (!a) return;
    var t0 = a.currentTime;
    for (var k = 0; k < 3; k++) {
      var t = t0 + k * 0.19;
      var o = a.createOscillator(), g = a.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(220 - k * 24, t);
      o.frequency.exponentialRampToValueAtTime(120 - k * 14, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + 0.16);
    }
  }

  /* ---------------- 位置 ---------------- */
  var POS = { x: null, y: null, dock: "left" };
  try {
    var saved = JSON.parse(localStorage.getItem("wcb_kita_pos") || "null");
    if (saved && typeof saved.x === "number") POS = saved;
  } catch (e) {}

  function place(x, y) {
    var r = el.getBoundingClientRect();
    var w = r.width || 132, h = r.height || 132;
    x = Math.max(0, Math.min(window.innerWidth - w, x));
    y = Math.max(0, Math.min(window.innerHeight - h, y));
    el.style.left = Math.round(x) + "px";
    el.style.top = Math.round(y) + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
    POS.x = Math.round(x);
    POS.y = Math.round(y);
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

  /* ---------------- 说话 ---------------- */
  var hideTimer = null;
  function say(text) {
    bubble.textContent = text;
    var r = el.getBoundingClientRect();
    var w = bubble.offsetWidth || 180;
    bubble.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
    bubble.style.top = Math.max(8, r.top - 54) + "px";
    bubble.classList.toggle("right", POS.dock === "right");
    bubble.classList.add("on");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { bubble.classList.remove("on"); }, 3800);
  }

  function line() {
    var left = window.__WCB_PENDING;
    if (left > 0 && Math.random() < 0.35) return "还有 " + left + " 单没交哦，前辈";
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
    setTimeout(showFeed, 320);
  }

  /* ---------------- 投喂 ---------------- */
  var FEED_KEY = "wcb_kita_feed";
  function feedData() {
    try {
      var d = JSON.parse(localStorage.getItem(FEED_KEY) || "{}");
      return { noodle: d.noodle | 0, yogurt: d.yogurt | 0 };
    } catch (e) { return { noodle: 0, yogurt: 0 }; }
  }
  function feedText(d) {
    if (!d.noodle && !d.yogurt) return "还没喂过呢";
    return "已投喂 " + d.noodle + " 碗 · " + d.yogurt + " 瓶";
  }

  var feedTimer = null;
  var lifted = 0;

  function hideFeed() {
    feedBar.classList.remove("on");
    if (lifted) { el.style.marginTop = "0px"; lifted = 0; }
  }

  function showFeed() {
    feedBar.querySelector(".kita-count").textContent = feedText(feedData());
    bubble.classList.remove("on");
    feedBar.classList.add("on");

    var ph = feedBar.offsetHeight || 34;
    var r = el.getBoundingClientRect();
    var needLift = Math.max(0, r.top + r.height + 8 + ph + 12 - window.innerHeight);
    if (needLift > 0) {
      lifted = Math.min(needLift + 4, Math.max(0, r.top - 6));
      el.style.marginTop = (-lifted) + "px";
      r = el.getBoundingClientRect();
    }
    var w = feedBar.offsetWidth || 200;
    var left = r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
    feedBar.style.left = Math.round(left) + "px";
    feedBar.style.top = Math.round(r.top + r.height + 6) + "px";

    clearTimeout(feedTimer);
    feedTimer = setTimeout(hideFeed, 9000);
  }

  function flashMouth() {
    var r = el.getBoundingClientRect();
    mouth.style.left = Math.max(6, r.left + 6) + "px";
    mouth.style.top = Math.max(6, r.top - 4) + "px";
    mouth.classList.add("on");
    setTimeout(function () { mouth.classList.remove("on"); }, 1200);
  }

  function plusOne(x, y) {
    var s = document.createElement("span");
    s.className = "kita-plus";
    s.textContent = "+1";
    s.style.left = x + "px";
    s.style.top = y + "px";
    document.body.appendChild(s);
    setTimeout(function () { s.remove(); }, 1150);
  }

  function feed(kind) {
    var d = feedData();
    d[kind] = (d[kind] | 0) + 1;
    try { localStorage.setItem(FEED_KEY, JSON.stringify(d)); } catch (e) {}

    var r = el.getBoundingClientRect();
    flashMouth();
    if (kind === "noodle") slurp(); else gulp();
    plusOne(r.left + r.width - 28, r.top + r.height * 0.3);

    var total = d.noodle + d.yogurt;
    var pool = FEED_LINES[kind];
    var text = total === 10
      ? "第十顿啦……前辈你是不是也想吃？"
      : pool[Math.floor(Math.random() * pool.length)];
    say(text);

    feedBar.querySelector(".kita-count").textContent = feedText(d);
    clearTimeout(feedTimer);
    feedTimer = setTimeout(hideFeed, 9000);
  }

  feedBar.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".kita-chip") : null;
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    feed(b.getAttribute("data-food"));
  });

  /* ---------------- 拖拽 + 吸附 ---------------- */
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
    hideFeed();
    bubble.classList.remove("on");
  });

  el.addEventListener("pointermove", function (e) {
    if (!drag) return;
    drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0));
    if (drag.moved > 4) {
      if (lifted) { el.style.marginTop = "0px"; lifted = 0; }
      place(e.clientX - drag.dx, e.clientY - drag.dy);
    }
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
    if (lifted) { el.style.marginTop = "0px"; lifted = 0; r = el.getBoundingClientRect(); }

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

  function dockInitial() {
    var r = el.getBoundingClientRect();
    var x = POS.x == null ? 14 : POS.x;
    var y = POS.y == null ? window.innerHeight - r.height + 2 : POS.y;
    place(x, y);
    save();
  }

  window.addEventListener("resize", dockInitial);
  window.addEventListener("load", dockInitial);

  ready(function () {
    document.body.appendChild(el);
    document.body.appendChild(bubble);
    document.body.appendChild(feedBar);
    document.body.appendChild(mouth);
    dockInitial();
    setPose(POS.dock === "right" ? "stand" : "sit");

    // 跟鼠标：靠近时轻轻歪头，离远了回正
    var target = 0, cur = 0;
    document.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      target = dist < 280 ? Math.max(-6, Math.min(6, dx / 60)) : 0;
    });
    (function loop() {
      cur += (target - cur) * 0.12;
      if (!el.classList.contains("dragging")) {
        var base = POS.dock === "right" ? " scaleX(-1)" : "";
        el.style.transform = "rotate(" + cur.toFixed(2) + "deg)" + base;
      }
      requestAnimationFrame(loop);
    })();

    if (location.search.indexOf("kitafeed") >= 0) setTimeout(showFeed, 500);

    try {
      if (!sessionStorage.getItem("wcb_kita_hi")) {
        sessionStorage.setItem("wcb_kita_hi", "1");
        setTimeout(function () { say("前辈，今天也辛苦啦～"); }, 2200);
      }
    } catch (e) {}
  });

  /* ---------------- 点大图换表情 ---------------- */
  var FACES = [
    ["smile", "今天也拜托啦"],
    ["surprised", "诶——？还有这种事"],
    ["shy", "别、别老盯着看啦"],
    ["peek", "在忙什么呢"]
  ];
  var faceIdx = 0;

  function cycleFace(t) {
    var src = t.getAttribute("src") || "";
    var wide = /_wide\.jpg$/.test(src);
    faceIdx = (faceIdx + 1) % FACES.length;
    t.setAttribute("src", here + "face_" + FACES[faceIdx][0] + (wide ? "_wide" : "") + ".jpg");
    t.classList.remove("flip");
    void t.offsetWidth;
    t.classList.add("flip");
    var cap = t.parentNode.querySelector(".artcap");
    if (cap) cap.textContent = FACES[faceIdx][1];
    pop();
  }

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("#wcb_face, .hello-art .art, .hero .portrait") : null;
    if (!t) return;
    e.preventDefault();
    cycleFace(t);
  }, true);

  window.kitaSay = function (t) { say(t); };
})();
