/* test-arena-nav.js - check pickNext against every real course, not a fixture.
 *
 *   node scripts/test-arena-nav.js
 *
 * Expectations are written here first and the run is judged against them; a
 * disagreement is a bug in the code, not in the expectation. Exits non-zero on
 * failure so this can gate a rollout to the other 51 pages.
 */
const fs = require('fs');
const path = require('path');
const nav = require('../cogito-arena-nav.js');

const dir = path.join(__dirname, '..');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') &&
  !['index.html', 'review.html'].includes(f));

let checked = 0, failures = [];
const fail = (f, msg) => failures.push(f + ': ' + msg);

for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  const m = text.match(/const ARENA\s*=\s*(\[[\s\S]*?\n\]);/);
  if (!m) continue;
  let arena;
  try { arena = eval('(' + m[1] + ')'); } catch (e) { continue; }
  if (!arena.length) continue;
  checked++;

  // 1. Every step stays inside the module it started in.
  for (const q of arena) {
    const n = nav.pickNext(arena, q.id);
    if (n && n.moduleId !== q.moduleId) {
      fail(f, 'pickNext crossed modules at ' + q.id + ' -> ' + n.id);
      break;
    }
  }

  // 2. The last problem of every module returns null, and only those do.
  const lastOfModule = new Set();
  const seen = new Map();
  arena.forEach((q, i) => seen.set(q.moduleId, i));
  for (const [, i] of seen) lastOfModule.add(arena[i].id);
  for (const q of arena) {
    const n = nav.pickNext(arena, q.id);
    const isLast = lastOfModule.has(q.id);
    if (isLast && n !== null) { fail(f, q.id + ' is last in its module but returned ' + n.id); break; }
    if (!isLast && n === null) { fail(f, q.id + ' is not last but returned null'); break; }
  }

  // 3. Walking from the first problem of a module reaches every problem in it exactly
  //    once and terminates. Guards against a cycle silently trapping the reader.
  const firstId = arena[0].id;
  const walked = [];
  let cur = firstId, guard = 0;
  while (cur && guard++ < 500) {
    walked.push(cur);
    const n = nav.pickNext(arena, cur);
    cur = n ? n.id : null;
  }
  const inFirstModule = arena.filter(q => q.moduleId === arena[0].moduleId).length;
  if (walked.length !== inFirstModule) {
    fail(f, 'walk covered ' + walked.length + ' of ' + inFirstModule + ' in the first module');
  }
  if (new Set(walked).size !== walked.length) fail(f, 'walk repeated a problem');

  // 4. An id that is not in the list must not throw or guess.
  if (nav.pickNext(arena, 'definitely-not-a-real-id') !== null) fail(f, 'unknown id did not return null');

  // 5. The counter never exceeds the module size.
  const p = nav.moduleProgress(arena, arena[0].moduleId, {});
  if (p.done !== 0 || p.total !== inFirstModule) {
    fail(f, 'moduleProgress said ' + p.done + '/' + p.total + ', expected 0/' + inFirstModule);
  }
}

console.log('courses checked: ' + checked);
if (failures.length) {
  console.log('FAILURES (' + failures.length + '):');
  failures.slice(0, 20).forEach(x => console.log('  ' + x));
  process.exit(1);
}
console.log('All expectations held: advancing stays in-module, ends cleanly, covers every');
console.log('problem once, tolerates an unknown id, and counts within bounds.');
