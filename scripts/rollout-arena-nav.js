/* rollout-arena-nav.js - wire cogito-arena-nav.js into every course page.
 *
 *   node scripts/rollout-arena-nav.js          # report what would change
 *   node scripts/rollout-arena-nav.js --apply  # change it
 *
 * Idempotent: a page that already has both edits is skipped, so this is safe to re-run
 * and safe to run after adding a new course.
 *
 * Two edits per page, and both are deliberately tiny, because the arena logic itself
 * stays where it is. Only the call site is per-page; the behaviour is in the shared
 * file. See cogito-arena-nav.js for why it was done that way round.
 *
 *   1. <script src="cogito-arena-nav.js?v=1"> after the theme script.
 *   2. One line at the end of the Arena's answerProblem.
 *
 * Anchoring. answerProblem is formatted in 48 pages and minified onto one line in the
 * other four, so no whitespace-dependent match works. "S.arena[p.id] = true" occurs
 * exactly once in every course page and only inside the Arena handler, so it locates
 * the right function; the insert then goes after the first
 * "outcome.classList.add('active')" that follows it, which is the point where the
 * outcome panel exists in the DOM. That string appears twice per page (drill and
 * arena), which is exactly why it cannot be used on its own.
 *
 * The injected line carries NO // comment. In the four minified pages a line comment
 * would swallow the remainder of the line and take the whole course page down.
 */
const fs = require('fs');
const path = require('path');

const apply = process.argv.includes('--apply');
const dir = path.join(__dirname, '..');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') &&
  !['index.html', 'review.html'].includes(f));

const TAG = '<script src="cogito-arena-nav.js?v=1"></script>';
const CALL = ' if(window.CogitoArenaNav){ CogitoArenaNav.renderNext({ arena: ARENA, currentId: p.id, moduleId: p.moduleId, solved: S.arena, goProblem: function(id){ showArenaProblem(id); } }); }';

const ANCHOR_FN = 'S.arena[p.id] = true';
const ANCHOR_DOM = "outcome.classList.add('active');";

let changed = 0, skipped = 0, problems = [];

for (const f of files) {
  const p = path.join(dir, f);
  let text = fs.readFileSync(p, 'utf8');
  const before = text;

  if (!text.includes(TAG)) {
    const theme = text.match(/<script src="cogito-theme\.js[^"]*"><\/script>/);
    if (theme) text = text.replace(theme[0], theme[0] + '\n' + TAG);
    else { problems.push(f + ': no cogito-theme.js tag to anchor the include'); continue; }
  }

  if (!text.includes('CogitoArenaNav.renderNext')) {
    const at = text.indexOf(ANCHOR_FN);
    if (at < 0) { problems.push(f + ': no ' + ANCHOR_FN); continue; }
    const dom = text.indexOf(ANCHOR_DOM, at);
    if (dom < 0) { problems.push(f + ': no outcome.classList after the anchor'); continue; }
    const cut = dom + ANCHOR_DOM.length;
    text = text.slice(0, cut) + CALL + text.slice(cut);
  }

  if (text === before) { skipped++; continue; }
  changed++;
  if (apply) fs.writeFileSync(p, text);
}

console.log((apply ? 'applied to ' : 'would change ') + changed + ' page(s); ' + skipped + ' already done');
if (problems.length) {
  console.log('PROBLEMS (' + problems.length + '):');
  problems.forEach(x => console.log('  ' + x));
  process.exit(1);
}
if (!apply) console.log('Re-run with --apply to write.');
