/* add-arena-questions.js - append new Arena problems to a course, safely.
 *
 *   node scripts/add-arena-questions.js boltzmann.html additions.js --dry
 *   node scripts/add-arena-questions.js boltzmann.html additions.js
 *
 * Why this exists. apply-arena-patch.js rewrites options on problems that already
 * exist and refuses ids it does not recognise, so the other half of the work has no
 * tool at all. That half is much larger: 45 courses hold 40 problems against the
 * specified 100, which is 2,700 new questions. Hand-appending them would re-derive the
 * same things apply-arena-patch was built to stop re-deriving, on a file where a stray
 * backtick takes the whole course down.
 *
 * The additions file is a module exporting whole problems:
 *
 *   [{ id, moduleId, title, difficulty, body, options:[4 strings], correct, explanation }]
 *
 * reward and timeLimit are derived from difficulty rather than supplied, because the
 * spec fixes them and an author copying a template gets them wrong. Existing problems
 * are carried through untouched apart from the slot rotation below.
 *
 * Ordering. COGITO_CONTEXT specifies 10 problems per module ordered by difficulty,
 * 1,1,1,2,2,2,3,3,3,4. Appending at the end would satisfy the count and break the
 * ladder, so the merged array is laid out module by module in MODULES order, and by
 * difficulty within each module. Ids stay attached to their own content, which is what
 * saved SM-2 scheduling and solved flags are keyed on. They end up out of numeric
 * order in the file, and that is correct.
 *
 * Duplicate detection. Writing 97 new problems for cobra produced 17 that duplicated a
 * problem already in the module, and they were only caught by reading. This compares
 * every new body against every other body in the course and fails on a near match, so
 * that read is no longer the only line of defence. --allow-similar downgrades it to a
 * warning for the case where two problems genuinely share wording and differ in what
 * they ask.
 *
 * Refuses to write on any validation failure, for the same reason apply-arena-patch
 * does: silent corruption of a course is much more expensive than a failed run.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const noRotate = args.includes('--no-rotate');
const allowSimilar = args.includes('--allow-similar');
const positional = args.filter(a => !a.startsWith('--'));
const course = positional[0];
const addPath = positional[1];

if (!course || !addPath) {
  console.log('usage: node scripts/add-arena-questions.js <course.html> <additions.js> [--dry] [--no-rotate] [--allow-similar]');
  process.exit(2);
}

/* The spec fixes both of these per tier; see COGITO_CONTEXT, Arena Difficulties. */
const TIER = { 1: { reward: 50, timeLimit: 45 }, 2: { reward: 100, timeLimit: 60 },
               3: { reward: 200, timeLimit: 90 }, 4: { reward: 500, timeLimit: 120 } };

const dir = path.join(__dirname, '..');
const file = path.join(dir, course);
const text = fs.readFileSync(file, 'utf8');
const m = text.match(/const ARENA\s*=\s*(\[[\s\S]*?\n\]);/);
if (!m) { console.log('FAIL  no ARENA array found in ' + course); process.exit(1); }
const arena = eval('(' + m[1] + ')');

const modMatch = text.match(/const MODULES\s*=\s*(\[[\s\S]*?\n\]);/);
const modules = modMatch ? eval('(' + modMatch[1] + ')') : [];
const modOrder = new Map(modules.map((mod, i) => [mod.id, i]));

const additions = require(path.resolve(addPath));
const fail = [];
const warn = [];

/* ---- gate the additions before they touch the array ---- */
if (!Array.isArray(additions) || !additions.length) {
  console.log('FAIL  ' + addPath + ' does not export a non-empty array');
  process.exit(1);
}

const existingIds = new Set(arena.map(q => q.id));
const seen = new Set();
for (const q of additions) {
  const at = 'addition ' + (q && q.id ? q.id : '(no id)');
  if (!q || !q.id) { fail.push(at + ' has no id'); continue; }
  if (existingIds.has(q.id)) fail.push(at + ' already exists in ' + course + '; new problems need new ids');
  if (seen.has(q.id)) fail.push(at + ' appears twice in the additions file');
  seen.add(q.id);
  if (!q.moduleId) fail.push(at + ' has no moduleId');
  else if (modOrder.size && !modOrder.has(q.moduleId)) fail.push(at + ' points at module ' + q.moduleId + ', which is not in this course');
  if (!q.title) fail.push(at + ' has no title');
  if (!q.body) fail.push(at + ' has no body');
  if (!q.explanation) fail.push(at + ' has no explanation');
  if (!TIER[q.difficulty]) fail.push(at + ' has difficulty ' + q.difficulty + ', which is not 1, 2, 3 or 4');
  if (!Array.isArray(q.options) || q.options.length !== 4) fail.push(at + ' does not supply 4 options');
  else {
    if (q.options.some(o => typeof o !== 'string' || !o.trim())) fail.push(at + ' has an empty option');
    if (new Set(q.options).size !== 4) fail.push(at + ' repeats an option');
    if (!(q.correct >= 0 && q.correct < 4)) fail.push(at + ' has correct out of range');
  }
  if ('reward' in q || 'timeLimit' in q) warn.push(at + ' supplies reward or timeLimit; both are derived from difficulty and were ignored');
}

/* ---- near-duplicate detection ----
   Bodies only. Two problems can share options and still ask different things, but two
   that ask the same thing in the same module are the failure cobra actually hit. */
const STOP = new Set(['a','an','the','is','are','was','were','of','to','in','on','for','and','or','it','its','this','that','you','your','what','why','how','which','does','do','if','as','at','be','by','with','from','has','have']);
const bag = s => new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)));
const jaccard = (a, b) => {
  let hit = 0;
  a.forEach(w => { if (b.has(w)) hit++; });
  return hit / (a.size + b.size - hit || 1);
};
const pool = arena.map(q => ({ id: q.id, moduleId: q.moduleId, bag: bag(q.body), body: q.body }));
for (const q of additions) {
  if (!q || !q.body) continue;
  const mine = bag(q.body);
  for (const other of pool) {
    const score = jaccard(mine, other.bag);
    if (score < 0.55) continue;
    const where = other.moduleId === q.moduleId ? 'same module' : 'module ' + other.moduleId;
    const msg = q.id + ' is ' + (100 * score).toFixed(0) + '% the same question as ' + other.id +
      ' (' + where + '): ' + JSON.stringify(other.body);
    if (allowSimilar) warn.push(msg); else fail.push(msg);
  }
  pool.push({ id: q.id, moduleId: q.moduleId, bag: mine, body: q.body });
}

if (fail.length) {
  fail.slice(0, 25).forEach(f => console.log('FAIL  ' + f));
  if (fail.length > 25) console.log('      ... and ' + (fail.length - 25) + ' more');
  process.exit(1);
}

/* ---- merge ---- */
for (const q of additions) {
  arena.push({ id: q.id, moduleId: q.moduleId, title: q.title, difficulty: q.difficulty,
    reward: TIER[q.difficulty].reward, timeLimit: TIER[q.difficulty].timeLimit,
    body: q.body, options: q.options.slice(), correct: q.correct, explanation: q.explanation });
}

/* Module order, then the difficulty ladder inside each module. Stable within a tier,
   so problems that were already adjacent stay adjacent. */
const rank = q => (modOrder.has(q.moduleId) ? modOrder.get(q.moduleId) : modOrder.size) * 100 + q.difficulty;
arena.sort((a, b) => rank(a) - rank(b));

/* ---- even out the slot the answer sits in ----
   Same reasoning as apply-arena-patch.js: the counter runs across the whole array,
   because 10 problems per module does not divide by 4. */
if (!noRotate) {
  arena.forEach((q, i) => {
    if (!Array.isArray(q.options) || q.options.length !== 4) return;
    const want = i % 4;
    const shift = (q.correct - want + 4) % 4;
    q.options = q.options.slice(shift).concat(q.options.slice(0, shift));
    q.correct = want;
  });
}

/* ---- gates on the merged array, identical to apply-arena-patch.js ---- */
for (const q of arena) {
  if (!Array.isArray(q.options) || q.options.length !== 4) fail.push(q.id + ' does not have 4 options');
  else if (!(q.correct >= 0 && q.correct < q.options.length)) fail.push(q.id + ' has correct out of range');
  if (!q.explanation) fail.push(q.id + ' has no explanation');
  if (typeof q.difficulty !== 'number') fail.push(q.id + ' has no difficulty');
  const bad = [q.title, q.body, q.explanation].concat(q.options || [])
    .find(s => typeof s === 'string' && s.indexOf('`') >= 0);
  if (bad) fail.push(q.id + ' contains a backtick, which has taken course pages down before');
}
if (fail.length) {
  fail.slice(0, 25).forEach(f => console.log('FAIL  ' + f));
  process.exit(1);
}

/* ---- what the course looks like now ---- */
const tiers = {}, perMod = {};
for (const q of arena) {
  tiers[q.difficulty] = (tiers[q.difficulty] || 0) + 1;
  perMod[q.moduleId] = (perMod[q.moduleId] || 0) + 1;
}
const counts = Object.values(perMod);
const rankSpread = { 1: 0, 2: 0, 3: 0, 4: 0 }, slot = { 0: 0, 1: 0, 2: 0, 3: 0 };
let tells = 0, cc = 0, dc = 0;
for (const q of arena) {
  const l = q.options.map(o => String(o).length), me = l[q.correct];
  const bigger = l.filter(x => x > me).length;
  rankSpread[bigger + 1]++; slot[q.correct]++;
  if (bigger === 0 && l.filter(x => x === me).length === 1) tells++;
  cc += me; dc += (l.reduce((a, b) => a + b, 0) - me) / 3;
}
const n = arena.length;
console.log(course + '   problems: ' + n + '   added: ' + additions.length);
console.log('  per module                : ' + JSON.stringify(perMod));
console.log('  spread (max-min)          : ' + (Math.max.apply(null, counts) - Math.min.apply(null, counts)));
console.log('  difficulty tiers          : ' + JSON.stringify(tiers));
console.log('  correct is single longest : ' + (100 * tells / n).toFixed(1) + '%   (chance 25%)');
console.log('  mean length correct/dist  : ' + (cc / n).toFixed(1) + ' / ' + (dc / n).toFixed(1));
console.log('  length rank of correct    : ' + JSON.stringify(rankSpread));
console.log('  slot the answer sits in   : ' + JSON.stringify(slot));
warn.forEach(w => console.log('  warn  ' + w));

/* ---- serialize, exactly as apply-arena-patch.js does ---- */
const q1 = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const line = q => '  { id:' + q1(q.id) + ', moduleId:' + q1(q.moduleId) + ', title:' + q1(q.title) +
  ', difficulty:' + q.difficulty + ', reward:' + q.reward + ', timeLimit:' + q.timeLimit +
  ', body:' + q1(q.body) + ', options:[' + q.options.map(q1).join(',') + ']' +
  ', correct:' + q.correct + ', explanation:' + q1(q.explanation) + ' },';
const body = arena.map(line).join('\n').replace(/,$/, '');
let out = text.replace(m[0], () => 'const ARENA = [\n' + body + '\n];');
out = out.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');

/* Parse what we are about to write; four course pages carry their JS on one line. */
const vm = require('vm');
const blocks = out.match(/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/g) || [];
for (const b of blocks) {
  const src = b.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
  try { new vm.Script(src); } catch (e) {
    console.log('FAIL  the rebuilt page does not parse: ' + e.message);
    process.exit(1);
  }
}

/* And that every answer still points at the text it pointed at before rotation. */
const reparsed = eval('(' + out.match(/const ARENA\s*=\s*(\[[\s\S]*?\n\]);/)[1] + ')');
if (reparsed.length !== arena.length) { console.log('FAIL  serialization lost a problem'); process.exit(1); }
for (let i = 0; i < arena.length; i++) {
  if (reparsed[i].id !== arena[i].id) { console.log('FAIL  ' + arena[i].id + ' moved in serialization'); process.exit(1); }
  if (reparsed[i].options[reparsed[i].correct] !== arena[i].options[arena[i].correct]) {
    console.log('FAIL  ' + arena[i].id + ' lost its answer in serialization');
    process.exit(1);
  }
}

if (dry) { console.log('  dry run, nothing written'); process.exit(0); }
fs.writeFileSync(file, out, 'utf8');
console.log('  written');
