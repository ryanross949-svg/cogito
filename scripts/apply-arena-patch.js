/* apply-arena-patch.js - write new Arena options into a course, safely.
 *
 *   node scripts/apply-arena-patch.js bayes.html patch.js      # apply and write
 *   node scripts/apply-arena-patch.js bayes.html patch.js --dry # report, write nothing
 *   node scripts/apply-arena-patch.js machiavelli.html          # rotate slots only
 *
 * Why this exists. The first three courses were fixed with three throwaway build
 * scripts that each re-derived the same things: how to find the array, how to quote a
 * string the way that particular file quotes them, how to keep the file CRLF, how to
 * check nothing broke. That is the shape of a job that should be one tool, especially
 * now that the remaining 46 courses are meant to be worked by whoever picks them up.
 *
 * The patch file is a module exporting [{ id, o:[4 strings], c:index, e:'explanation' }].
 * e is optional and replaces the explanation only when reasoning moved out of an option.
 * Anything not named in the patch is carried through untouched, so a patch can cover
 * part of a course.
 *
 * Rotation. Authoring drifts toward putting the answer in the same slot: cobra had 18
 * of 20 in slot B before it was caught, and machiavelli has 39 of 40. Rotating an
 * option list is cyclic, so paired options (yes/no, high/low) keep their reading order
 * and only the slot changes. It is applied on every run, patch or not, which is why a
 * bare invocation is a complete fix for a slot tell.
 *
 * Refuses to write on any validation failure. Silent corruption of a 100-question
 * course is much more expensive than a failed run.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const noRotate = args.includes('--no-rotate');
const positional = args.filter(a => !a.startsWith('--'));
const course = positional[0];
const patchPath = positional[1];

if (!course) {
  console.log('usage: node scripts/apply-arena-patch.js <course.html> [patch.js] [--dry] [--no-rotate]');
  process.exit(2);
}

const dir = path.join(__dirname, '..');
const file = path.join(dir, course);
const text = fs.readFileSync(file, 'utf8');
const m = text.match(/const ARENA\s*=\s*(\[[\s\S]*?\n\]);/);
if (!m) { console.log('FAIL  no ARENA array found in ' + course); process.exit(1); }
const arena = eval('(' + m[1] + ')');

const fail = [];

/* ---- apply the patch ---- */
let patched = 0;
if (patchPath) {
  const patches = require(path.resolve(patchPath));
  const byId = new Map(patches.map(p => [p.id, p]));
  for (const id of byId.keys()) {
    if (!arena.some(q => q.id === id)) fail.push('patch names ' + id + ', which is not in ' + course);
  }
  for (const q of arena) {
    const p = byId.get(q.id);
    if (!p) continue;
    if (!Array.isArray(p.o) || p.o.length !== 4) { fail.push(p.id + ' does not supply 4 options'); continue; }
    if (new Set(p.o).size !== 4) fail.push(p.id + ' repeats an option');
    if (!(p.c >= 0 && p.c < 4)) fail.push(p.id + ' has correct out of range');
    q.options = p.o.slice();
    q.correct = p.c;
    if (p.e) q.explanation = p.e;
    patched++;
  }
}

/* ---- even out the slot the answer sits in ----
   The counter runs across the whole array rather than per module: a module holds 10
   problems, which does not divide by 4, so a per-module cycle overweights the first
   two slots. Globally it lands within one of even. */
if (!noRotate) {
  arena.forEach((q, i) => {
    if (!Array.isArray(q.options) || q.options.length !== 4) return;
    const want = i % 4;
    const shift = (q.correct - want + 4) % 4;
    q.options = q.options.slice(shift).concat(q.options.slice(0, shift));
    q.correct = want;
  });
}

/* ---- gates ---- */
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
  if (fail.length > 25) console.log('      ... and ' + (fail.length - 25) + ' more');
  process.exit(1);
}

/* ---- the numbers this whole exercise is about ---- */
const rank = { 1: 0, 2: 0, 3: 0, 4: 0 }, slot = { 0: 0, 1: 0, 2: 0, 3: 0 };
let tells = 0, cc = 0, dc = 0;
for (const q of arena) {
  const l = q.options.map(o => String(o).length), me = l[q.correct];
  const bigger = l.filter(x => x > me).length;
  rank[bigger + 1]++; slot[q.correct]++;
  if (bigger === 0 && l.filter(x => x === me).length === 1) tells++;
  cc += me; dc += (l.reduce((a, b) => a + b, 0) - me) / 3;
}
const n = arena.length;
console.log(course + '   problems: ' + n + (patchPath ? '   patched: ' + patched : '   (rotation only)'));
console.log('  correct is single longest : ' + (100 * tells / n).toFixed(1) + '%   (chance 25%)');
console.log('  mean length correct/dist  : ' + (cc / n).toFixed(1) + ' / ' + (dc / n).toFixed(1));
console.log('  length rank of correct    : ' + JSON.stringify(rank));
console.log('  slot the answer sits in   : ' + JSON.stringify(slot));

/* ---- serialize ----
   Course files quote with single quotes and escape apostrophes with a backslash, and
   carry literal double quotes inside. Escaping backslash and apostrophe reproduces
   that exactly; nothing else needs touching. */
const q1 = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const line = q => '  { id:' + q1(q.id) + ', moduleId:' + q1(q.moduleId) + ', title:' + q1(q.title) +
  ', difficulty:' + q.difficulty + ', reward:' + q.reward + ', timeLimit:' + q.timeLimit +
  ', body:' + q1(q.body) + ', options:[' + q.options.map(q1).join(',') + ']' +
  ', correct:' + q.correct + ', explanation:' + q1(q.explanation) + ' },';
const body = arena.map(line).join('\n').replace(/,$/, '');
let out = text.replace(m[0], () => 'const ARENA = [\n' + body + '\n];');
out = out.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');

/* Parse what we are about to write. Four course pages carry their JS minified onto one
   line, and a malformed string there takes the whole course down with no warning. */
const vm = require('vm');
const blocks = out.match(/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/g) || [];
for (const b of blocks) {
  const src = b.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
  try { new vm.Script(src); } catch (e) {
    console.log('FAIL  the rebuilt page does not parse: ' + e.message);
    process.exit(1);
  }
}

/* And that the answer still points at the same text it did before rotation. */
const reparsed = eval('(' + out.match(/const ARENA\s*=\s*(\[[\s\S]*?\n\]);/)[1] + ')');
for (let i = 0; i < arena.length; i++) {
  if (reparsed[i].options[reparsed[i].correct] !== arena[i].options[arena[i].correct]) {
    console.log('FAIL  ' + arena[i].id + ' lost its answer in serialization');
    process.exit(1);
  }
}

if (dry) { console.log('  dry run, nothing written'); process.exit(0); }
fs.writeFileSync(file, out, 'utf8');
console.log('  written');
