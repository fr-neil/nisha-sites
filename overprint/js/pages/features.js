/* Overprint · Issue 01 · Features (pp. 4–15). Keyboard page turns, the way a reader leafs through an issue:
   → / ← move to the next / previous page (a spread at ≥ 1100 px); past the last page → turns to the next story,
   before the first ← turns back to the previous one (both through the same links as the folio bar and turn panel,
   so the B3 page turn and its direction apply). Anchor moves inside a story scroll instantly, as the IA asks.
   Ignored while typing, in a dialog, on a media control, or with a modifier key. Nothing here is needed to read. */
(() => {
  'use strict';
  const d = document;
  const wide = window.matchMedia('(min-width: 1100px)');
  const units = () => Array.from(d.querySelectorAll(wide.matches ? 'main .spread' : 'main .pg'));
  const top = (el) => el.getBoundingClientRect().top;
  const barH = () => (d.querySelector('[data-tb]') || { offsetHeight: 0 }).offsetHeight;

  // the unit whose top is nearest above the reading line (just under the top bar)
  function current(list) {
    const line = barH() + 24;
    let i = 0;
    list.forEach((el, k) => { if (top(el) <= line) i = k; });
    return i;
  }
  function go(el) {
    const pg = el.classList.contains('pg') ? el : el.querySelector('.pg');
    const y = window.scrollY + top(el) - barH() - (wide.matches ? 0 : 8);
    window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
    if (pg && pg.id) {
      try { history.replaceState(null, '', '#' + pg.id); } catch (_) { /* file or sandboxed: keep the URL */ }
      pg.focus({ preventScroll: true });
    }
  }
  function follow(sel) { const a = d.querySelector(sel); if (a && a.href) { a.click(); return true; } return false; }

  const SKIP = 'input, textarea, select, video, [contenteditable], [data-ctl]';
  const ignored = (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return true;
    const t = e.target instanceof Element ? e.target : null;
    return Boolean((t && t.closest(SKIP)) || d.querySelector('dialog[open]'));
  };
  // → : the next page; at the foot of the story (the next page already in view) the next story
  function forward(list, i) {
    const atEnd = window.innerHeight + window.scrollY >= d.documentElement.scrollHeight - 4;
    if (i < list.length - 1 && !atEnd) { go(list[i + 1]); return true; }
    return follow('.turn [data-turn]');
  }
  // ← : first back to the top of the page being read, then the previous page, then the previous story
  function back(list, i) {
    if (top(list[i]) < barH() - 40) { go(list[i]); return true; }
    if (i > 0) { go(list[i - 1]); return true; }
    return follow('a[aria-label^="Previous story"]');
  }
  d.addEventListener('keydown', (e) => {
    if (ignored(e)) return;
    const list = units();
    if (!list.length) return;
    const i = current(list);
    if ((e.key === 'ArrowRight' ? forward : back)(list, i)) e.preventDefault();
  });
})();
