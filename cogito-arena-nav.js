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

    /* No button at the end of a module. The problem view already carries a "<- Arena"
       link at the top, so offering "Back to Arena" here put the same control on screen
       twice and only on the last problem, which reads as a mistake rather than a
       choice. The note below still says the module is finished; getting back is the
       link that was always there. */
    if (next) {
      var btn = document.createElement('button');
      btn.className = 'btn';
      btn.type = 'button';
      btn.textContent = 'Next Problem ->';
      btn.onclick = function () { ctx.goProblem(next.id); };
      row.appendChild(btn);
    }

    var note = document.createElement('span');
    note.className = 'text-sm text-dim';
    note.textContent = next
      ? prog.done + ' of ' + prog.total + ' solved in this module'
      : 'That was the last problem in this module.';
    row.appendChild(note);

    outcome.parentNode.insertBefore(row, outcome.nextSibling);
  }

  // ---------- auto-scroll to the verdict (Ryan, 2026-09-21) ----------
  //
  // "Whenever I answer a question I have to physically scroll down to get to
  // the reasoning and then press Continue Training. Can you make it so it
  // automatically scrolls for me?"
  //
  // Both answer paths - answerProblem in the Arena and answerPhase in the
  // project - finish by appending a `.lesson-actions` div holding the next
  // button. That append is the signal, and it fires AFTER the button exists,
  // which is exactly the moment worth scrolling to.
  //
  // Done here, in the one file all 52 course pages already load, rather than by
  // editing 52 copies of answerProblem. COGITO_CONTEXT is explicit that shared
  // behaviour belongs in a shared file: before cogito.css existed there were 32
  // divergent copies of the same stylesheet and three themes that silently did
  // nothing on every course page.
  //
  // Scrolls to the outcome, not to the button: the reasoning is what he reads
  // first, and the button follows it down the page.
  function scrollToVerdict(actions) {
    var target = document.getElementById('outcome');
    if (!target || !target.classList.contains('active')) target = actions;
    if (!target || !target.scrollIntoView) return;
    var still = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      target.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    } catch (e) {
      target.scrollIntoView();   // older WebKit takes no options object
    }
  }

  function watchForVerdict() {
    if (!global.MutationObserver || !global.document || !document.body) return;
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var el = added[j];
          if (el.nodeType === 1 && el.classList && el.classList.contains('lesson-actions')) {
            scrollToVerdict(el);
            return;
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (global.document) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', watchForVerdict);
    } else {
      watchForVerdict();
    }
  }

  global.CogitoArenaNav = { pickNext: pickNext, moduleProgress: moduleProgress, renderNext: renderNext, scrollToVerdict: scrollToVerdict };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.CogitoArenaNav; // so the pure half can be tested in node
  }
})(typeof window !== 'undefined' ? window : globalThis);
