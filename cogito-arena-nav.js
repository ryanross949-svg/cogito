/* cogito-arena-nav.js - "Next problem" for the Arena, in one place.
 *
 * Load after the course page's own script:
 *   <script src="cogito-arena-nav.js"></script>
 *
 * Why this file exists rather than 52 edits. showArenaProblem lives inline in every
 * course page, and the copies have already drifted (arrow glyphs, whitespace, one
 * shortened sentence) exactly the way 32 stylesheets did before cogito.css. Adding a
 * feature to all 52 would make it the next thing to drift. The existing logic is left
 * where it is; only the new behaviour lives here, so it starts shared and stays shared.
 *
 * What it fixes. There was no way forward from a solved Arena problem. You answered,
 * read the explanation, then had to hit back to the Arena list and hunt for the next
 * row. That is three actions to continue doing the thing you were already doing.
 *
 * Why a button and not auto-advance. Drill auto-advances because a flashcard's rating
 * IS the feedback and stopping adds nothing. The Arena is the opposite: the outcome
 * panel holds the explanation, and that explanation is the only thing separating this
 * from a quiz. Auto-advancing on a correct answer would skip the moment the product
 * exists for. Same interaction, opposite answer, because the surfaces teach differently.
 *
 * Advancing stays inside the current module on purpose. Progression is lesson, then
 * arena, then the next module unlocks; walking straight into another module's problems
 * would step around that. At the end of a module the button becomes a way back.
 *
 * Syntax note: no backticks anywhere. Template literals inside these pages have caused
 * fatal parse errors before, so the house rule is single quotes and concatenation.
 */
(function (global) {
  'use strict';

  /* Pure, and therefore the only part worth testing directly: given the problem list
     and where you are, what comes next? Returns the next problem in the same module,
     or null at the end of it. Solved problems are deliberately NOT skipped: a list
     that silently reorders itself is harder to trust than one that does not. */
  function pickNext(arena, currentId) {
    if (!arena || !arena.length) return null;
    var i = -1;
    for (var n = 0; n < arena.length; n++) {
      if (arena[n].id === currentId) { i = n; break; }
    }
    if (i < 0) return null;
    var moduleId = arena[i].moduleId;
    for (var j = i + 1; j < arena.length; j++) {
      if (arena[j].moduleId === moduleId) return arena[j];
    }
    return null;
  }

  /* How many of this module's problems are solved, for the "3 of 10" counter. The
     solved map is the course's own S.arena, whose keys are problem ids. */
  function moduleProgress(arena, moduleId, solved) {
    var total = 0, done = 0;
    for (var n = 0; n < arena.length; n++) {
      if (arena[n].moduleId !== moduleId) continue;
      total++;
      if (solved && solved[arena[n].id]) done++;
    }
    return { done: done, total: total };
  }

  /* The DOM half. Called after the outcome panel is filled in. Everything is looked up
     late and defensively, because this file is shared by 52 pages whose namespace
     object has a different name on each of them (ORACLE, GODEL, LAKOFF, BERT...). */
  function renderNext(ctx) {
    var outcome = document.getElementById('outcome');
    if (!outcome) return;
    if (document.getElementById('arenaNextRow')) return; // already placed

    var next = pickNext(ctx.arena, ctx.currentId);
    var prog = moduleProgress(ctx.arena, ctx.moduleId, ctx.solved);

    var row = document.createElement('div');
    row.id = 'arenaNextRow';
    row.className = 'mt-2';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '1rem';
    row.style.flexWrap = 'wrap';

    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.type = 'button';
    btn.textContent = next ? 'Next Problem ->' : 'Back to Arena';
    btn.onclick = function () {
      if (next) ctx.goProblem(next.id);
      else ctx.goArena();
    };
    row.appendChild(btn);

    var note = document.createElement('span');
    note.className = 'text-sm text-dim';
    note.textContent = next
      ? prog.done + ' of ' + prog.total + ' solved in this module'
      : 'That was the last problem in this module.';
    row.appendChild(note);

    outcome.parentNode.insertBefore(row, outcome.nextSibling);
  }

  global.CogitoArenaNav = { pickNext: pickNext, moduleProgress: moduleProgress, renderNext: renderNext };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.CogitoArenaNav; // so the pure half can be tested in node
  }
})(typeof window !== 'undefined' ? window : globalThis);
