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
      'body[data-bg="starfield"]::before,body[data-bg="matrix"]::before,body[data-bg="synthwave"]::before,body[data-bg="orbital"]::before,body[data-bg="circuit"]::before,body[data-bg="aurora"]::before,body[data-bg="warp"]::before,body[data-bg="quantum"]::before{opacity:0;}' +
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

  function orbital() {
    var bodies = [], i;
    for (i = 0; i < 7; i++) bodies.push({ r: 55 + i * 52, a: Math.random() * 6.28, sp: (0.0015 + Math.random() * 0.004) * (i % 2 ? 1 : -1), size: Math.random() * 2 + 1.5 });
    (function loop() {
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2;
      bodies.forEach(function (b) {
        ctx.beginPath(); ctx.arc(cx, cy, b.r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(157,78,221,0.12)'; ctx.lineWidth = 1; ctx.stroke();
        b.a += b.sp;
        var x = cx + Math.cos(b.a) * b.r, y = cy + Math.sin(b.a) * b.r;
        ctx.beginPath(); ctx.arc(x, y, b.size, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,217,255,0.85)'; ctx.shadowColor = 'rgba(0,217,255,0.9)'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      });
      raf = requestAnimationFrame(loop);
    })();
  }
  function circuit() {
    var lines = [], i;
    for (i = 0; i < 16; i++) { var hz = Math.random() < 0.5; lines.push({ hz: hz, p: hz ? Math.random() * h : Math.random() * w, prog: Math.random(), sp: 0.002 + Math.random() * 0.004, c: Math.random() < 0.5 ? '0,217,255' : '0,255,163' }); }
    (function loop() {
      ctx.clearRect(0, 0, w, h);
      lines.forEach(function (l) {
        ctx.strokeStyle = 'rgba(' + l.c + ',0.12)'; ctx.lineWidth = 1; ctx.beginPath();
        if (l.hz) { ctx.moveTo(0, l.p); ctx.lineTo(w, l.p); } else { ctx.moveTo(l.p, 0); ctx.lineTo(l.p, h); }
        ctx.stroke();
        l.prog = (l.prog + l.sp) % 1;
        var x = l.hz ? l.prog * w : l.p, y = l.hz ? l.p : l.prog * h;
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(' + l.c + ',0.95)'; ctx.shadowColor = 'rgba(' + l.c + ',0.9)'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      });
      raf = requestAnimationFrame(loop);
    })();
  }
  function aurora() {
    var t = 0, cols = ['0,255,163', '0,217,255', '157,78,221'];
    (function loop() {
      ctx.clearRect(0, 0, w, h);
      t += 0.01;
      for (var k = 0; k < 3; k++) {
        var baseY = h * 0.28 + k * h * 0.18, x;
        ctx.beginPath(); ctx.moveTo(0, baseY);
        for (x = 0; x <= w; x += 20) { var y = baseY + Math.sin(x * 0.005 + t + k) * 40 + Math.sin(x * 0.013 + t * 1.5) * 20; ctx.lineTo(x, y); }
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
        var g = ctx.createLinearGradient(0, baseY - 60, 0, h); g.addColorStop(0, 'rgba(' + cols[k] + ',0.10)'); g.addColorStop(1, 'rgba(' + cols[k] + ',0)');
        ctx.fillStyle = g; ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    })();
  }
  function warp() {
    var stars = [], i;
    function mk() { return { a: Math.random() * 6.28, r: Math.random() * 40, sp: Math.random() * 1.6 + 0.4 }; }
    for (i = 0; i < 160; i++) stars.push(mk());
    (function loop() {
      ctx.fillStyle = 'rgba(5,8,16,0.3)'; ctx.fillRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2, mx = Math.max(w, h);
      stars.forEach(function (s) {
        var x1 = cx + Math.cos(s.a) * s.r, y1 = cy + Math.sin(s.a) * s.r;
        s.r += s.sp; s.sp *= 1.04;
        var x2 = cx + Math.cos(s.a) * s.r, y2 = cy + Math.sin(s.a) * s.r;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = 'rgba(230,230,250,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
        if (s.r > mx) { var n = mk(); s.a = n.a; s.r = n.r; s.sp = n.sp; }
      });
      raf = requestAnimationFrame(loop);
    })();
  }
  function quantum() {
    var pts = [], i, count = Math.min(170, Math.floor(w * h / 9000));
    for (i = 0; i < count; i++) pts.push({ x: Math.random() * w, y: Math.random() * h, ph: Math.random() * 6.28, sp: Math.random() * 0.08 + 0.02, r: Math.random() * 2 + 0.5 });
    (function loop() {
      ctx.clearRect(0, 0, w, h);
      pts.forEach(function (p) {
        p.ph += p.sp; var o = Math.max(0, Math.sin(p.ph));
        p.x += (Math.random() - 0.5) * 0.4; p.y += (Math.random() - 0.5) * 0.4;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,245,212,' + (o * 0.7) + ')'; ctx.shadowColor = 'rgba(0,245,212,0.8)'; ctx.shadowBlur = o * 8; ctx.fill(); ctx.shadowBlur = 0;
      });
      raf = requestAnimationFrame(loop);
    })();
  }

  var SKINS = { constellation: constellation, starfield: starfield, nebula: nebula, synthwave: synthwave, matrix: matrix, orbital: orbital, circuit: circuit, aurora: aurora, warp: warp, quantum: quantum };

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
