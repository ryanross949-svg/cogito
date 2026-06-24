/* Cogito shared theme module — used by all course pages so their theme menu
   matches the hub: 8 themes, unlock-gated by global level / streak, with the
   new theme styles injected. Theme choice persists via localStorage cogito-theme.
   (The hub keeps its own inline copy of this logic.) */
(function () {
  // Course save keys the hub sums for global level (keep in sync with APPS).
  var KEYS = ['prima-v7','nash-v7','oracle-v7','fermi-v1','darwin-v1','maestro-v1','kafka-v1','mach-v1','turing-v1','kahneman-v1','hebb-v1','lorenz-v1','hayek-v1','gibbon-v1','diffie-v1','dijkstra-v1','popper-v1','chomsky-v1','morgan-v1','bayes-v1','erdos-v1','euclid-v1','altshuller-v1','mendel-v1','wiener-v1','mandelbrot-v1','loci-v1','conway-v1','planck-v1','prigogine-v1','dantzig-v1','klein-v1','lebon-v1','wittgenstein-v1','seneca-v1','boltzmann-v1','axelrod-v1-clean','godel-v1-clean','tetlock-v1','fourier-v1','einstein-v1-clean','schumpeter-v1-clean','lakoff-v1-clean','vonbertalanffy-v1-clean','malthus-v1','neumann-v1','hamilton-v1-clean','maynard-v1','margulis-v1','pasteur-v1-clean'];

  function getLevel(xp) { return Math.floor(Math.sqrt(xp / 100)) + 1; }
  function globalXP() {
    var t = 0;
    KEYS.forEach(function (k) { try { var s = JSON.parse(localStorage.getItem(k)); if (s && typeof s.xp === 'number') t += s.xp; } catch (e) {} });
    return t;
  }
  function iso(d) { return d.toISOString().split('T')[0]; }
  function streak() {
    var act; try { act = JSON.parse(localStorage.getItem('cogito-activity') || '[]'); } catch (e) { act = []; }
    if (!act.length) return 0;
    var s = 0, d = new Date();
    if (act.indexOf(iso(d)) === -1) d.setDate(d.getDate() - 1);
    while (act.indexOf(iso(d)) !== -1) { s++; d.setDate(d.getDate() - 1); }
    return s;
  }

  var THEMES = [
    { id: 'quantum',   name: 'Quantum',   level: 1 },
    { id: 'plain',     name: 'Plain',     level: 1 },
    { id: 'light',     name: 'Light',     level: 5 },
    { id: 'nord',      name: 'Nord',      level: 15 },
    { id: 'matrix',    name: 'Matrix',    level: 35 },
    { id: 'cyberpunk', name: 'Cyberpunk', level: 55 },
    { id: 'crimson',   name: 'Crimson',   level: 75 },
    { id: 'emerald',   name: 'Emerald',   check: function () { return streak() >= 30; }, req: '30-day streak' }
  ];
  function unlocked(t) { return t.check ? t.check() : (getLevel(globalXP()) >= t.level); }

  function injectCSS() {
    if (document.getElementById('cogito-theme-css')) return;
    var s = document.createElement('style');
    s.id = 'cogito-theme-css';
    s.textContent =
      '[data-theme="plain"]{--void:#15171c;--panel:rgba(38,42,50,0.7);--panel-solid:#1e2127;--cyan:#9fb3c8;--magenta:#b9a3c9;--green:#a3c9a8;--amber:#d8c79e;--red:#d39a9a;--text:#dfe4ea;--text-dim:#9aa3af;--text-faint:#5c6470;--border:rgba(159,179,200,0.18);--border-bright:rgba(159,179,200,0.4);}' +
      '[data-theme="crimson"]{--void:#140608;--panel:rgba(40,10,14,0.78);--panel-solid:#1a0509;--cyan:#FF4D6D;--magenta:#FF8FA3;--green:#FF4D6D;--amber:#FFB3C1;--red:#FF3355;--text:#FFE5E9;--text-dim:#C98A95;--text-faint:#7A4A52;--border:rgba(255,77,109,0.2);--border-bright:rgba(255,77,109,0.5);}' +
      '[data-theme="emerald"]{--void:#04140E;--panel:rgba(10,40,28,0.78);--panel-solid:#06150F;--cyan:#2EE6A6;--magenta:#5EEAD4;--green:#2EE6A6;--amber:#A7F3D0;--red:#FF6B6B;--text:#E6FFF5;--text-dim:#7FB8A0;--text-faint:#3F6657;--border:rgba(46,230,166,0.2);--border-bright:rgba(46,230,166,0.5);}' +
      '.theme-option.locked{opacity:0.4;cursor:not-allowed;}.theme-option.locked:hover{background:none;color:var(--text-dim);}';
    document.head.appendChild(s);
  }

  function setTheme(id) {
    var t = null; for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) t = THEMES[i];
    if (t && !unlocked(t)) return;
    document.body.dataset.theme = id;
    localStorage.setItem('cogito-theme', id);
    var m = document.getElementById('themeMenu'); if (m) m.classList.remove('active');
  }

  function render() {
    var menu = document.getElementById('themeMenu'); if (!menu) return;
    menu.innerHTML = '';
    THEMES.forEach(function (t) {
      var ok = unlocked(t);
      var b = document.createElement('button');
      b.className = 'theme-option' + (ok ? '' : ' locked');
      b.textContent = ok ? t.name : (t.name + ' · ' + (t.req || ('Lv ' + t.level)));
      if (ok) b.onclick = function () { setTheme(t.id); };
      menu.appendChild(b);
    });
  }

  function init() {
    injectCSS();
    var saved = localStorage.getItem('cogito-theme');
    if (saved) document.body.dataset.theme = saved;
    render();
    var btn = document.getElementById('themeBtn');
    if (btn) btn.addEventListener('click', render); // refresh lock states on open
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
