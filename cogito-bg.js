/* Cogito shared background engine.
   Renders the equipped background "skin" (localStorage 'cogito-bg') onto the
   page's <canvas id="particles">. Shared by the hub and all course pages.
   Exposes window.initBackground() and window.applyBackground(skin). */
(function () {
  var canvas, ctx, w = 0, h = 0, raf = null, resizeBound = false;

  function injectCSS() {
    if (document.getElementById('cogito-bg-css')) return;
    var s = document.createElement('style');
    s.id = 'cogito-bg-css';
    s.textContent =
      'body[data-bg="starfield"]::before,body[data-bg="matrix"]::before,body[data-bg="synthwave"]::before{opacity:0;}' +
      'body[data-bg="nebula"]::before{opacity:0.35;}';
    document.head.appendChild(s);
  }

  function resize() { if (!canvas) return; w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  function ensureCanvas() {
    canvas = document.getElementById('particles');
    if (!canvas) return false;
    ctx = canvas.getContext('2d');
    if (!resizeBound) { window.addEventListener('resize', resize); resizeBound = true; }
    resize();
    return true;
  }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  // --- skins ---
  function constellation() {
    var ps = [], count = Math.min(60, Math.floor(w * h / 25000)), i;
    for (i = 0; i < count; i++) ps.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15, r: Math.random() * 1.2 + 0.3, o: Math.random() * 0.5 + 0.1 });
    (function loop() {
      ctx.clearRect(0, 0, w, h);
      ps.forEach(function (p) { p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(157,78,221,' + p.o + ')'; ctx.fill(); });
      for (var a = 0; a < ps.length; a++) for (var b = a + 1; b < ps.length; b++) { var dx = ps[a].x - ps[b].x, dy = ps[a].y - ps[b].y, d = Math.sqrt(dx * dx + dy * dy); if (d < 120) { ctx.beginPath(); ctx.moveTo(ps[a].x, ps[a].y); ctx.lineTo(ps[b].x, ps[b].y); ctx.strokeStyle = 'rgba(0,245,212,' + (0.1 * (1 - d / 120)) + ')'; ctx.lineWidth = 0.5; ctx.stroke(); } }
      raf = requestAnimationFrame(loop);
    })();
  }
  function starfield() {
    var st = [], count = Math.min(240, Math.floor(w * h / 6000)), i;
    for (i = 0; i < count; i++) st.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 + 0.2, t: Math.random() * 6.28, sp: Math.random() * 0.05 + 0.01, vy: Math.random() * 0.06 + 0.02 });
    (function loop() {
      ctx.clearRect(0, 0, w, h);
      st.forEach(function (s) { s.t += s.sp; s.y += s.vy; if (s.y > h) s.y = 0; var o = 0.35 + 0.65 * Math.abs(Math.sin(s.t)); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(230,230,250,' + o + ')'; ctx.fill(); });
      raf = requestAnimationFrame(loop);
    })();
  }
  function nebula() {
    var cols = ['0,217,255', '157,78,221', '255,45,156'], bl = [], i;
    for (i = 0; i < 5; i++) bl.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 220 + 160, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, c: cols[i % 3] });
    (function loop() {
      ctx.clearRect(0, 0, w, h);
      bl.forEach(function (b) { b.x += b.vx; b.y += b.vy; if (b.x < -b.r) b.x = w + b.r; if (b.x > w + b.r) b.x = -b.r; if (b.y < -b.r) b.y = h + b.r; if (b.y > h + b.r) b.y = -b.r; var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); g.addColorStop(0, 'rgba(' + b.c + ',0.10)'); g.addColorStop(1, 'rgba(' + b.c + ',0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); });
      raf = requestAnimationFrame(loop);
    })();
  }
  function synthwave() {
    var off = 0;
    (function loop() {
      ctx.clearRect(0, 0, w, h);
      var hz = h * 0.5, x, y;
      var g = ctx.createLinearGradient(0, hz - 100, 0, hz); g.addColorStop(0, 'rgba(255,45,156,0.45)'); g.addColorStop(1, 'rgba(255,184,0,0.35)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w / 2, hz, 80, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(0,217,255,0.35)'; ctx.lineWidth = 1;
      off = (off + 0.5) % 36;
      for (y = 0; y < h - hz; y += 36) { var yy = hz + y + off, p = (yy - hz) / (h - hz); ctx.globalAlpha = Math.min(1, p); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke(); }
      ctx.globalAlpha = 1;
      for (x = -8; x <= 8; x++) { ctx.beginPath(); ctx.moveTo(w / 2, hz); ctx.lineTo(w / 2 + x * (w / 7), h); ctx.stroke(); }
      raf = requestAnimationFrame(loop);
    })();
  }
  function matrix() {
    var fs = 14, cols = Math.max(1, Math.floor(w / fs)), drops = [], i;
    for (i = 0; i < cols; i++) drops[i] = Math.random() * h / fs;
    var chars = 'アイウエオカキクケコサシスセソ0123456789ABCDEF';
    (function loop() {
      ctx.fillStyle = 'rgba(5,8,16,0.08)'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,255,163,0.65)'; ctx.font = fs + 'px monospace';
      for (var k = 0; k < drops.length; k++) { var ch = chars.charAt(Math.floor(Math.random() * chars.length)); ctx.fillText(ch, k * fs, drops[k] * fs); if (drops[k] * fs > h && Math.random() > 0.975) drops[k] = 0; drops[k]++; }
      raf = requestAnimationFrame(loop);
    })();
  }

  var SKINS = { constellation: constellation, starfield: starfield, nebula: nebula, synthwave: synthwave, matrix: matrix };

  function apply(skin) {
    injectCSS();
    if (!ensureCanvas()) return;
    if (!SKINS[skin]) skin = 'constellation';
    document.body.setAttribute('data-bg', skin);
    stop();
    ctx.clearRect(0, 0, w, h);
    SKINS[skin]();
  }

  window.applyBackground = apply;
  window.initBackground = function () { apply(localStorage.getItem('cogito-bg') || 'constellation'); };
})();
