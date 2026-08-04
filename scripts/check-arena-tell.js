/* check-arena-tell.js - can the Arena be answered without knowing anything?
 *
 *   node scripts/check-arena-tell.js            # summary + worst courses
 *   node scripts/check-arena-tell.js --course bayes.html
 *   node scripts/check-arena-tell.js --simulate # what each possible fix would buy
 *
 * The defect. With four options, someone who knows nothing and always clicks the
 * longest one should be right 25% of the time. Measured across all 52 courses it is
 * 83%. The correct option averages 58.7 characters against 21.0 for the distractors,
 * so the answer is nearly three times longer than its alternatives and the Arena is
 * not currently testing knowledge.
 *
 * COGITO_CONTEXT already says "Distractors must be plausible MBA/engineering advice."
 * They are not; most are stubs like "Cannot be determined." The content violates its
 * own spec, so this is a regression check for a rule that already existed.
 *
 * Use it as a scoreboard: fix a course, re-run, watch its number fall toward 25.
 * It does not fail the build, because 2,358 questions cannot be fixed in one pass and
 * a check that is always red gets ignored.
 *
 * Extraction copies scripts/gen-review.js: regex the array literal out and eval it.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const only = args.includes('--course') ? args[args.indexOf('--course') + 1] : null;
const simulate = args.includes('--simulate');
const fixPlan = args.includes('--fix-plan');

const dir = path.join(__dirname, '..');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') &&
  !['index.html', 'review.html'].includes(f) && (!only || f === only));

/* A clause that turns an answer into an answer-plus-its-reason. These are the ones
   that can move into the explanation field, which 99.5% of questions already have. */
const JUSTIFY = /,\s*(because|since|as|due to|so that|which|given)\b|\s\((?=[a-z])/i;

function load(f) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  const m = text.match(/const ARENA\s*=\s*(\[[\s\S]*?\n\]);/);
  if (!m) return null;
  try { return eval('(' + m[1] + ')'); } catch (e) { return null; }
}

/* Is the correct option the single longest? lengths() lets the simulation re-ask the
   same question after pretending an intervention has been applied. */
function isTell(lengths, correct) {
  const max = Math.max.apply(null, lengths);
  return lengths[correct] === max && lengths.filter(l => l === max).length === 1;
}

const rows = [];
let total = 0, tells = 0, cChars = 0, dChars = 0;
let simStrip = 0, simCap = 0, simBoth = 0, simFar = 0;

for (const f of files) {
  const arena = load(f);
  if (!arena) continue;
  let n = 0, t = 0;
  for (const q of arena) {
    if (!Array.isArray(q.options) || typeof q.correct !== 'number') continue;
    const opts = q.options.map(String);
    if (opts[q.correct] === undefined) continue;
    const lens = opts.map(o => o.length);
    n++; total++;
    if (isTell(lens, q.correct)) { t++; tells++; }
    cChars += lens[q.correct];
    dChars += (lens.reduce((a, b) => a + b, 0) - lens[q.correct]) / (lens.length - 1);

    if (simulate) {
      /* A: move an inline reason out of the correct option into the explanation. */
      const stripped = lens.slice();
      const mine = opts[q.correct];
      const cut = mine.search(JUSTIFY);
      if (cut > 0) stripped[q.correct] = cut;
      if (isTell(stripped, q.correct)) simStrip++;

      /* B: bring every distractor up to 85% of the correct option, which is what
         "make the distractors substantial" sounds like it means. This is kept
         deliberately, even though it changes nothing, because it is the intuitive fix
         and the number proves it is not a fix at all: if the correct option is still
         the longest, a guesser picking the longest is still right every time. The tell
         is about being the MAXIMUM, not about the ratio. */
      const raised = lens.map((l, i) => i === q.correct ? l : Math.max(l, Math.round(lens[q.correct] * 0.85)));
      if (isTell(raised, q.correct)) simCap++;

      /* C: length made uninformative. At least one distractor is written longer than
         the correct option, so the maximum is no longer a reliable signal. */
      const straddled = lens.slice();
      const other = q.correct === 0 ? 1 : 0;
      straddled[other] = Math.round(lens[q.correct] * 1.1);
      if (isTell(straddled, q.correct)) simBoth++;

      /* The backlog: questions where no distractor is even close, which are the ones
         a rewrite has to reach. */
      const longestOther = Math.max.apply(null, lens.filter((l, i) => i !== q.correct));
      if (longestOther < lens[q.correct] * 0.9) simFar++;
    }
  }
  if (n) rows.push({ f, pct: 100 * t / n, n });
}

const pc = v => v.toFixed(1) + '%';
console.log('questions: ' + total + '   courses: ' + rows.length);
console.log('correct option is the single longest : ' + pc(100 * tells / total) + '   (chance 25%)');
console.log('mean length correct / distractor     : ' + (cChars / total).toFixed(1) + ' / ' + (dChars / total).toFixed(1) + ' chars');

if (simulate) {
  console.log('');
  console.log('If the fix were... ');
  console.log('  A  move inline reasons into the explanation  : ' + pc(100 * simStrip / total));
  console.log('  B  raise every distractor to 85% of correct  : ' + pc(100 * simCap / total));
  console.log('  C  one distractor written LONGER than correct: ' + pc(100 * simBoth / total));
  console.log('');
  console.log('B is the intuitive fix and it changes nothing, which is the point. The tell');
  console.log('is being the MAXIMUM, not the ratio: if the answer is still the longest, a');
  console.log('guesser picking the longest is still right every time. Only C removes the');
  console.log('signal, so the authoring rule is not "write longer distractors", it is');
  console.log('"length must carry no information", which means a distractor has to be the');
  console.log('longest option roughly as often as the answer is.');
  console.log('');
  console.log('backlog: ' + pc(100 * simFar / total) + ' of questions have no distractor within 90% of');
  console.log('the correct option, so those need new text rather than editing.');
  console.log('');
}

/* --fix-plan: turn the score into a per-question work order.
 *
 * Written after four courses were fixed by hand, each of which took the same three
 * rounds: author, measure, find the number overshot, adjust. The overshoot is not a
 * judgment call, it is arithmetic the script can do. It picks which quarter of the
 * questions KEEP the answer as the longest option, because 25% is the target rather
 * than zero, and then says exactly how many characters each remaining question is off
 * by. Authoring against this is filling in blanks instead of aiming at a moving number.
 *
 * The choice of which questions keep it is deliberate: the ones where the answer is
 * already longest by the smallest margin, so the least text has to change overall.
 */
if (fixPlan) {
  if (!only) { console.log('\n--fix-plan needs --course <file>'); process.exit(2); }
  const arena = load(only) || [];
  const rowsOut = [];
  for (const q of arena) {
    if (!Array.isArray(q.options) || typeof q.correct !== 'number') continue;
    const opts = q.options.map(String);
    if (opts[q.correct] === undefined) continue;
    const lens = opts.map(o => o.length), me = lens[q.correct];
    const longestOther = Math.max.apply(null, lens.filter((l, i) => i !== q.correct));
    const cut = opts[q.correct].search(JUSTIFY);
    rowsOut.push({ id: q.id, me, longestOther, margin: me - longestOther,
      isTell: isTell(lens, q.correct), cut: cut > 0 ? cut : null,
      longestDistractor: opts.filter((o, i) => i !== q.correct).sort((a, b) => b.length - a.length)[0] });
  }
  const tellRows = rowsOut.filter(r => r.isTell);
  const keep = Math.round(rowsOut.length * 0.25);
  /* smallest margin first: these stay as they are and become the intended 25% */
  const keepIds = new Set(tellRows.slice().sort((a, b) => a.margin - b.margin).slice(0, keep).map(r => r.id));

  console.log('');
  console.log('work order for ' + only + ': ' + rowsOut.length + ' questions, ' +
    tellRows.length + ' currently give the answer away');
  console.log('keep ' + Math.min(keep, tellRows.length) + ' of them as the intended 25%; fix the rest below.');
  console.log('');
  const todo = tellRows.filter(r => !keepIds.has(r.id));
  todo.forEach(r => {
    const opt = r.cut !== null
      ? 'cut the answer at char ' + r.cut + ' (moves its reason to the explanation), or '
      : '';
    console.log('  ' + r.id.padEnd(6) + 'answer ' + String(r.me).padStart(3) +
      ', longest distractor ' + String(r.longestOther).padStart(3) + '   ' +
      opt + 'add ' + (r.margin + 1) + '+ chars to a distractor');
    console.log('         longest distractor now: ' + r.longestDistractor);
  });
  console.log('');
  console.log(todo.length + ' questions to change. ' +
    todo.filter(r => r.cut !== null).length + ' of them can be fixed by cutting the answer alone.');
  console.log('Re-run without --fix-plan after applying, and expect 25%, not 0%.');
  process.exit(0);
}

if (!only) {
  rows.sort((a, b) => b.pct - a.pct);
  console.log('');
  console.log('worst 10:');
  rows.slice(0, 10).forEach(r => console.log('  ' + r.f.padEnd(22) + r.pct.toFixed(0) + '%  of ' + r.n));
  console.log('best 5:');
  rows.slice(-5).forEach(r => console.log('  ' + r.f.padEnd(22) + r.pct.toFixed(0) + '%  of ' + r.n));
}
