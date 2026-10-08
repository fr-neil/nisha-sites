/* Overprint · Issue 01 · core behaviour (every page; no dependencies).
   Contents sheet (B4), folio roll (B5), registration settle and plate wipe (B1, B2), page-break rules (B14),
   numbering-machine counters (B6), press-check players (B9), the play-once loop (B10), the cover's top-bar mark,
   and the page turn's direction (B3). Every page works without it; the LCP picture never waits for it. */
(() => {
  'use strict';
  const d = document;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = (fn, opts) => ('IntersectionObserver' in window ? new IntersectionObserver(fn, opts) : null);

  /* ---------- B3 · page turn direction: a back turn runs in reverse ---------- */
  const BACK_KEY = 'op-turn-back';
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[aria-label^="Previous story"]');
    try { if (a) sessionStorage.setItem(BACK_KEY, '1'); } catch (_) { /* storage off: forward turn */ }
  });
  window.addEventListener('pagereveal', (e) => {
    if (!e.viewTransition) return;
    let back = false;
    try { back = sessionStorage.getItem(BACK_KEY) === '1'; sessionStorage.removeItem(BACK_KEY); } catch (_) { back = false; }
    const nav = window.navigation && window.navigation.activation;
    if (nav && nav.navigationType === 'traverse' && nav.from && nav.entry && nav.from.index > nav.entry.index) back = true;
    if (back && e.viewTransition.types) e.viewTransition.types.add('back');
  });

  /* ---------- B4 · Contents sheet ---------- */
  const sheet = $('[data-sheet]');
  let opener = null;
  function openSheet(from) {
    if (!sheet || typeof sheet.showModal !== 'function') return false;
    opener = from || null;
    sheet.classList.remove('is-closing', 'is-full');
    sheet.classList.add('is-anim');
    sheet.showModal();
    $$('[data-sheet-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
    const cur = $('.toc__row[aria-current]', sheet);
    if (cur) cur.scrollIntoView({ block: 'nearest' });
    return true;
  }
  function closeSheet(then) {
    if (!sheet || !sheet.open) { if (then) then(); return; }
    const done = () => {
      sheet.classList.remove('is-closing', 'is-anim');
      sheet.style.transform = '';
      sheet.close();
      $$('[data-sheet-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      if (opener && !then) opener.focus();
      if (then) then();
    };
    if (reduce()) { done(); return; }
    sheet.classList.add('is-closing');
    sheet.addEventListener('animationend', done, { once: true });
    setTimeout(() => { if (sheet.open) done(); }, 320);
  }
  if (sheet) {
    $$('[data-sheet-open]').forEach((b) => {
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', (e) => { if (openSheet(b)) e.preventDefault(); });
    });
    $$('[data-sheet-close]', sheet).forEach((b) => b.addEventListener('click', () => closeSheet()));
    sheet.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(); });
    sheet.addEventListener('click', (e) => {
      if (e.target === sheet) {
        const r = sheet.getBoundingClientRect();
        if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) closeSheet();
      }
    });
    // a row on this page: close, then go to the anchor
    sheet.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const u = new URL(a.href, location.href);
      if (u.pathname === location.pathname && u.hash) {
        e.preventDefault();
        closeSheet(() => { const t = d.getElementById(u.hash.slice(1)); history.pushState(null, '', u.hash); if (t) t.scrollIntoView({ behavior: 'auto' }); if (t) t.focus({ preventScroll: true }); });
      }
    });
    // drag the grab bar: up to the 94 % detent, down past 30 % (or a flick) to close
    const grab = $('[data-grab]', sheet);
    if (grab) {
      let y0 = 0, t0 = 0, dy = 0, dragging = false;
      grab.addEventListener('pointerdown', (e) => { dragging = true; y0 = e.clientY; t0 = performance.now(); dy = 0; grab.setPointerCapture(e.pointerId); sheet.style.transition = 'none'; });
      grab.addEventListener('pointermove', (e) => { if (!dragging) return; dy = e.clientY - y0; if (dy > 0) sheet.style.transform = `translateY(${dy}px)`; });
      const end = () => {
        if (!dragging) return; dragging = false; sheet.style.transition = '';
        const v = dy / Math.max(1, performance.now() - t0);
        if (dy < -40) sheet.classList.add('is-full');
        if (dy > sheet.offsetHeight * 0.3 || v > 0.8) closeSheet(); else sheet.style.transform = '';
      };
      grab.addEventListener('pointerup', end);
      grab.addEventListener('pointercancel', end);
    }
    $$('section[id]').forEach((s) => { if (!s.hasAttribute('tabindex')) s.setAttribute('tabindex', '-1'); });
  }

  /* ---------- the cover: the top-bar mark appears once the masthead has gone ---------- */
  const mast = $('.cover__mast');
  if (mast) {
    const o = io((en) => d.body.classList.toggle('is-cover-top', en[0].isIntersecting), { rootMargin: '-48px 0px 0px 0px' });
    if (o) o.observe(mast);
  } else d.body.classList.remove('is-cover-top');

  /* ---------- B5 · folio roll (phone and 768) ---------- */
  const fbNo = $('[data-folio-no]');
  const fbName = $('[data-folio-name]');
  const pages = $$('.pg[data-folio]');
  function roll(el, text) {
    if (el.textContent === text) return;
    if (reduce()) { el.textContent = text; return; }
    const old = el.textContent;
    el.textContent = '';
    const max = Math.max(old.length, text.length);
    for (let i = 0; i < max; i++) {
      const a = old[old.length - max + i] || ' ', b = text[text.length - max + i] || ' ';
      const cell = d.createElement('i');
      cell.textContent = b;
      if (a !== b && /\d/.test(b)) cell.animate([{ transform: 'translateY(-100%)' }, { transform: 'none' }], { duration: 160, easing: 'steps(10, end)' });
      el.appendChild(cell);
    }
    el.setAttribute('aria-label', text);
  }
  if (fbNo && pages.length) {
    const onCover = d.body.dataset.story === 'cover';
    const o = io((en) => {
      en.forEach((x) => {
        if (!x.isIntersecting) return;
        const n = x.target.dataset.folio;
        // the cover's folio points at the Contents (p. 2) until the reader is there
        roll(fbNo, 'p. ' + (onCover && n === '1' ? '2' : n));
        if (fbName) {
          const t = x.target.dataset.title;
          if (t && fbName.textContent !== t) { fbName.style.opacity = '0'; setTimeout(() => { fbName.textContent = t; fbName.style.opacity = ''; }, 120); }
        }
      });
    }, { rootMargin: '-40% 0px -59% 0px' });
    if (o) pages.forEach((p) => o.observe(p));
  }

  /* ---------- B1 · settle, B2 · wipe, B14 · page breaks: once, in view ---------- */
  const seen = io((en, obs) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('is-in'); x.target.classList.remove('is-pending'); obs.unobserve(x.target); } }), { threshold: 0.2 });
  const below = (el) => el.getBoundingClientRect().top > window.innerHeight;
  if (seen && !reduce()) {
    $$('.settle, .wipe').forEach((el) => seen.observe(el));
    const brk = io((en, obs) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.remove('is-pending'); obs.unobserve(x.target); } }), { rootMargin: '0px 0px -12% 0px' });
    if (brk) pages.slice(1).forEach((p) => { if (below(p)) { p.classList.add('is-pending'); brk.observe(p); } });
  } else $$('.settle, .wipe').forEach((el) => el.classList.add('is-in'));

  /* ---------- B6 · numbering-machine counters (final value in the HTML) ---------- */
  const counters = $$('[data-count]');
  if (counters.length && !reduce()) {
    const o = io((en, obs) => en.forEach((x) => {
      if (!x.isIntersecting) return; obs.unobserve(x.target);
      const el = x.target; const final = el.textContent.trim();
      el.setAttribute('aria-label', final); el.setAttribute('aria-live', 'off');
      el.textContent = '';
      [...final].forEach((ch, i) => {
        const c = d.createElement('i'); c.className = 'roll';
        if (/\d/.test(ch)) {
          const strip = d.createElement('i');
          strip.textContent = '0123456789'.slice(0, Number(ch) + 1).split('').join('\n');
          strip.style.whiteSpace = 'pre';
          c.appendChild(strip);
          strip.animate([{ transform: 'translateY(0)' }, { transform: `translateY(-${Number(ch)}em)` }], { duration: 500, delay: i * 60, easing: 'steps(' + Math.max(1, Number(ch)) + ', end)', fill: 'forwards' });
        } else c.textContent = ch;
        el.appendChild(c);
      });
    }, { threshold: 0.5 }));
    if (o) counters.forEach((c) => o.observe(c));
  }

  /* ---------- B9 · press-check players: one clip at a time, sound only on tap ---------- */
  const LABEL = { play: ['Play with sound', 'आवाज़ के साथ चलाएँ'], loop: ['Play', 'चलाएँ'], pause: ['Pause', 'रोकें'], again: ['Play again', 'फिर से चलाएँ'] };
  // the icon follows the label: a triangle to play, two bars to pause
  const ICON = { play: 'M3 1.5 12.5 7 3 12.5Z', loop: 'M3 1.5 12.5 7 3 12.5Z', again: 'M3 1.5 12.5 7 3 12.5Z', pause: 'M3 2h3v10H3zM8 2h3v10H8z' };
  const say = (btn, k) => {
    const a = $('[data-label]', btn), b = $('[data-label-hi]', btn), p = $('svg path', btn);
    if (a) a.textContent = LABEL[k][0]; if (b) b.textContent = LABEL[k][1]; if (p) p.setAttribute('d', ICON[k]);
  };
  const clips = $$('.vid[data-clip]');
  let playing = null;
  function stopOthers(v) { $$('video').forEach((x) => { if (x !== v && !x.paused) x.pause(); }); }
  clips.forEach((box) => {
    const v = $('video', box); const fig = box.closest('figure'); if (!v || !fig) return;
    const btn = $('[data-play]', fig); const perf = $('[data-perf]', fig); const ctl = $('[data-ctl]', fig);
    if (!btn) return;
    box.classList.add('is-enhanced'); v.removeAttribute('controls'); v.preload = 'none';
    if (ctl) ctl.hidden = false; if (perf) perf.hidden = false;
    const shape = box.closest('.block, .arch');
    btn.addEventListener('click', () => {
      if (v.paused) {
        stopOthers(v); v.muted = false; box.classList.add('is-live');
        if (shape) shape.classList.add('is-press');
        const p = v.play(); if (p && p.catch) p.catch(() => { box.classList.remove('is-live'); });
      } else v.pause();
    });
    // captions: shown while the clip plays unless the reader turned them off (the CC button)
    const cc = $('[data-cc]', fig);
    const track = () => (v.textTracks && v.textTracks.length ? v.textTracks[0] : null);
    let ccOn = true;
    const setCc = () => { const t = track(); if (t) t.mode = ccOn ? 'showing' : 'hidden'; if (cc) cc.setAttribute('aria-pressed', String(ccOn)); };
    if (cc) cc.addEventListener('click', () => { ccOn = !ccOn; setCc(); });
    v.addEventListener('play', () => { playing = v; say(btn, 'pause'); setCc(); });
    v.addEventListener('pause', () => { say(btn, v.ended ? 'again' : 'play'); if (playing === v) playing = null; });
    v.addEventListener('ended', () => say(btn, 'again'));
    v.addEventListener('timeupdate', () => { if (perf && v.duration) perf.style.setProperty('--p', (v.currentTime / v.duration).toFixed(3)); });
    // tapping the picture also plays (native full screen stays available from the browser)
    v.addEventListener('click', () => btn.click());
  });

  /* ---------- B10 · the silent loop: plays once at ≥ 50 % in view and holds its last frame ---------- */
  $$('.vid[data-loop]').forEach((box) => {
    const v = $('video', box); const fig = box.closest('figure'); if (!v || !fig) return;
    const btn = $('[data-loop-btn]', fig); const ctl = $('[data-ctl]', fig);
    box.classList.add('is-enhanced', 'is-live'); v.removeAttribute('controls'); v.removeAttribute('loop'); v.muted = true;
    if (ctl) ctl.hidden = false;
    const setLabel = () => { if (btn) say(btn, v.ended ? 'again' : v.paused ? 'loop' : 'pause'); };
    ['play', 'pause', 'ended'].forEach((ev) => v.addEventListener(ev, setLabel));
    setLabel();
    let userPaused = false, once = false;
    if (btn) btn.addEventListener('click', () => {
      if (v.ended) { v.currentTime = 0; userPaused = false; v.play(); }
      else if (v.paused) { userPaused = false; v.play(); }
      else { userPaused = true; v.pause(); }
    });
    if (reduce()) return; // no autoplay: the hold frame stands as the poster, with the play control
    const o = io((en) => en.forEach((x) => {
      if (x.isIntersecting && x.intersectionRatio >= 0.5) { if (!userPaused && !v.ended && (!once || v.currentTime > 0)) { once = true; v.preload = 'auto'; const p = v.play(); if (p && p.catch) p.catch(setLabel); } }
      else if (!v.paused) v.pause();
    }), { threshold: [0, 0.5] });
    if (o) o.observe(box);
    d.addEventListener('visibilitychange', () => { if (d.hidden && !v.paused) v.pause(); });
  });
  d.addEventListener('visibilitychange', () => { if (d.hidden && playing) playing.pause(); });

  /* ---------- folded index groups (colophon): open the one a link points at; all of them on a desktop page ---------- */
  const folds = $$('details.ix__d');
  if (folds.length) {
    const openTarget = () => { const t = location.hash && d.getElementById(location.hash.slice(1)); const f = t && (t.matches('details') ? t : t.querySelector('details') || t.closest('details')); if (f) f.open = true; };
    if (window.matchMedia('(min-width: 1100px)').matches) folds.forEach((f) => { f.open = true; });
    openTarget();
    window.addEventListener('hashchange', openTarget);
  }
})();
