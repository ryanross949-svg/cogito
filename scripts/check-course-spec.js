/* check-course-spec.js - does each course actually contain what the spec says?
 *
 *   node scripts/check-course-spec.js              # every course, short rows
 *   node scripts/check-course-spec.js --course x.html
 *   node scripts/check-course-spec.js --short      # totals and the gap only
 *
 * COGITO_CONTEXT states the shape of a course: 10 modules, 120 flashcards (12 per
 * module), 100 arena problems (10 per module, 4 difficulty tiers), 10 project phases,
 * 30 real-world missions. Most courses have never met it. 46 of 52 carry 40 arena
 * problems rather than 100, one carries 20, and one course has 4 modules instead of 10.
 * Nothing was checking, so the gap stayed invisible while the spec read as satisfied.
 *
 * This is the gate for the arena build-out. A course is done when its row is clean and
 * check-arena-tell puts it near 25%, so the two scripts together answer "can I stop?"
 *
 * It does not fail the build. Every course is short today, and a check that is always
 * red gets ignored - the same reasoning as check-arena-tell.js.
 *
 * Extraction copies scripts/gen-review.js: regex the array literal out and eval it.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const only = args.includes('--course') ? args[args.indexOf('--course') + 1] : null;
const short = args.includes('--short');

const dir = path.join(__dirname, '..');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') &&
  !['index.html', 'review.html'].includes(f) && (!only || f === only));

const SPEC = { MODULES: 10, CARDS: 120, ARENA: 100, PROJECT_PHASES: 10, REAL_WORLD_MISSIONS: 30 };

function grab(text, name) {
  const m = text.match(new RegExp('const ' + name + '\\s*=\\s*(\\[[\\s\\S]*?\\n\\]);'));
  if (!m) return null;
  try { return eval('(' + m[1] + ')'); } catch (e) { return null; }
}

const rows = [];
const totals = { MODULES: 0, CARDS: 0, ARENA: 0, PROJECT_PHASES: 0, REAL_WORLD_MISSIONS: 0 };

for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  const got = {};
  for (const k of Object.keys(SPEC)) {
    const a = grab(text, k);
    got[k] = a ? a.length : -1;
    if (a) totals[k] += a.length;
  }

  /* Beyond the counts: the arena is also specified as an even spread, 10 problems per
     module across 4 difficulty tiers. A course can hit 100 and still be lopsided. */
  const arena = grab(text, 'ARENA') || [];
  const mods = grab(text, 'MODULES') || [];
  const tiers = {}, perMod = {};
  let noDifficulty = 0, noExplanation = 0, orphan = 0;
  const modIds = new Set(mods.map(m => m.id));
  for (const q of arena) {
    if (typeof q.difficulty !== 'number') noDifficulty++; else tiers[q.difficulty] = (tiers[q.difficulty] || 0) + 1;
    if (!q.explanation) noExplanation++;
    perMod[q.moduleId] = (perMod[q.moduleId] || 0) + 1;
    if (mods.length && !modIds.has(q.moduleId)) orphan++;
  }
  const counts = Object.values(perMod);
  const spread = counts.length ? Math.max.apply(null, counts) - Math.min.apply(null, counts) : 0;

  const notes = [];
  for (const k of Object.keys(SPEC)) {
    if (got[k] === -1) notes.push(k + ' missing');
    else if (got[k] !== SPEC[k]) notes.push(k.toLowerCase() + ' ' + got[k] + '/' + SPEC[k]);
  }
  if (Object.keys(tiers).length && Object.keys(tiers).length < 4) notes.push('only ' + Object.keys(tiers).length + ' difficulty tiers');
  if (noDifficulty) notes.push(noDifficulty + ' without difficulty');
  if (noExplanation) notes.push(noExplanation + ' without explanation');
  if (orphan) notes.push(orphan + ' pointing at no module');
  if (mods.length && spread > 2) notes.push('module spread ' + spread);

  rows.push({ f, got, notes, tiers });
}

if (!short) {
  console.log('file'.padEnd(22) + 'MOD  CARD  AREN  PH  RW   notes');
  rows.slice().sort((a, b) => a.notes.length - b.notes.length || a.f.localeCompare(b.f)).forEach(r => {
    console.log(r.f.padEnd(22) +
      String(r.got.MODULES).padStart(3) + String(r.got.CARDS).padStart(6) +
      String(r.got.ARENA).padStart(6) + String(r.got.PROJECT_PHASES).padStart(4) +
      String(r.got.REAL_WORLD_MISSIONS).padStart(4) + '   ' +
      (r.notes.length ? r.notes.join('; ') : 'to spec'));
  });
  console.log('');
}

const clean = rows.filter(r => !r.notes.length).length;
console.log('courses: ' + rows.length + '   to spec: ' + clean + '   short: ' + (rows.length - clean));
for (const k of Object.keys(SPEC)) {
  const want = rows.length * SPEC[k];
  const gap = want - totals[k];
  console.log('  ' + k.toLowerCase().padEnd(20) + String(totals[k]).padStart(5) + ' / ' + want +
    (gap > 0 ? '   need ' + gap + ' more' : '   complete'));
}
