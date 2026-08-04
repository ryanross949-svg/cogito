/* check-contrast.js - report WCAG contrast for every theme in cogito.css.
 *
 *   node scripts/check-contrast.js
 *
 * Why this exists. "AA contrast" was the last commit here, and AA is a floor, not a
 * target. The default Quantum theme came out at 16.6:1, which passes everything and
 * is genuinely painful: near-white on near-black at that ratio causes halation, where
 * glyphs bleed into the background over a long read. The spec has no upper bound, so
 * nothing was going to catch it. This prints the actual numbers for all eight themes
 * so the palette is judged on evidence instead of on whether it passes.
 *
 * Bands used below:
 *   under 4.5  fails AA for body text
 *   4.5 - 7    AA
 *   7 - 13     AAA, comfortable
 *   over 13    passes everything, likely to strain on a dark theme
 *
 * Only text-on-background pairs are checked. Borders and bullet squares are
 * decorative and carry no meaning, so they are out of scope by design.
 */
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'cogito.css'), 'utf8');

function srgb(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function lum(hex) {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(x => x + x).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function ratio(fg, bg) {
  const a = lum(fg), b = lum(bg);
  const hi = Math.max(a, b), lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

/* Themes are single-line blocks: [data-theme="x"] { --a:#hex; ... }.
   The default lives in :root and is spread over several lines, so it is read from
   the whole prelude rather than one line. */
function tokens(block) {
  const out = {};
  const re = /(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g;
  let m;
  while ((m = re.exec(block))) out[m[1]] = m[2];
  return out;
}

const themes = [];
const rootBlock = css.slice(0, css.indexOf('[data-theme='));
themes.push(['quantum (default)', tokens(rootBlock)]);
const re = /\[data-theme="([^"]+)"\]\s*\{([^}]*)\}/g;
let m;
while ((m = re.exec(css))) themes.push([m[1], tokens(m[2])]);

const band = r =>
  r < 4.5 ? 'FAILS AA' :
  r < 7 ? 'AA' :
  r <= 13 ? 'AAA' : 'strains (>13)';

let problems = 0;
for (const [name, t] of themes) {
  const bg = t['--void'];
  if (!bg) { console.log(name.padEnd(18) + '  (no --void, skipped)'); continue; }
  console.log(name);
  for (const key of ['--text', '--text-dim', '--text-faint', '--accent']) {
    const fg = t[key];
    if (!fg) { console.log('  ' + key.padEnd(14) + ' (inherited)'); continue; }
    const r = ratio(fg, bg);
    const b = band(r);
    if (r < 4.5) problems++;
    console.log('  ' + key.padEnd(14) + fg.padEnd(9) + r.toFixed(2).padStart(6) + ':1  ' + b);
  }
  console.log('');
}
console.log(problems === 0
  ? "No pair fails AA. Anything marked strains is a comfort judgment, not a failure."
  : problems + " pair(s) FAIL AA and must be fixed.");
process.exit(problems === 0 ? 0 : 1);
