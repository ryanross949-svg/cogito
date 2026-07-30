/* Cogito keyboard access.
   Several controls are clickable <div>s rather than <button>s: the eight course
   nav tabs, some quiz options, and a number of JS-generated rows. They could be
   clicked but never focused or activated from a keyboard.
   Converting them all to real buttons across 54 pages would touch layout and
   handlers everywhere; this makes them focusable and operable without moving a
   single element. Delegation covers rows that JavaScript creates later.
   No backticks anywhere: see the syntax rule in COGITO_CONTEXT.md. */
(function () {
  'use strict';

  var SEL = '.nav-item, .option, .lesson-row, .phase-row, .module-card, [onclick]';
  var NATIVE = { BUTTON: 1, A: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1, SUMMARY: 1 };

  function isNative(el) {
    return !el || !el.tagName || NATIVE[el.tagName] === 1;
  }

  function prepare(root) {
    if (!root || !root.querySelectorAll) return;
    var nodes = root.querySelectorAll(SEL);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (isNative(el)) continue;
      if (el.getAttribute('aria-disabled') === 'true') continue;
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('role')) {
        el.setAttribute('role', el.classList.contains('nav-item') ? 'tab' : 'button');
      }
    }
  }

  // Enter and Space activate, matching what a real button does.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    var el = e.target;
    if (isNative(el)) return;
    if (!el.matches || !el.matches(SEL)) return;
    if (el.classList && el.classList.contains('locked')) return;
    e.preventDefault();
    el.click();
  });

  function start() {
    prepare(document);
    if (typeof MutationObserver === 'function') {
      new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var added = records[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            if (added[j].nodeType === 1) prepare(added[j].parentNode || added[j]);
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
