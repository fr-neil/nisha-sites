/* C · Exhibition — core behaviour shared by every page (PHASE-50 §1.3, §2.2).
   Section bar (M8), Index sheet (M7), thumb dock, page top, reveals (M1, M2, M5, M4), counters (M3),
   quote lines, swipe rows (M14). Everything is readable without this file; it only adds motion and sheets.
   Public hook for page scripts: window.NS = { reduce, onIn(el, fn, ratio), sheet: { open, close } }. */
(function () {
  'use strict';
  var d = document;
  var root = d.documentElement;
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () {} }; };
  var reduce = mq('(prefers-reduced-motion: reduce)').matches || !root.classList.contains('motion');
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); };
  root.classList.add('core');

  /* ---------- in-view helper (one observer per threshold) ---------- */
  var observers = {};
  function onIn(el, fn, ratio) {
    ratio = ratio || 0;
    if (!('IntersectionObserver' in window)) { fn(el); return; }
    var key = String(ratio);
    if (!observers[key]) {
      observers[key] = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && en.intersectionRatio >= ratio) {
            observers[key].unobserve(en.target);
            var cb = en.target.__nsIn; en.target.__nsIn = null;
            if (cb) cb(en.target);
          }
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: ratio ? [ratio] : [0] });
    }
    el.__nsIn = fn;
    observers[key].observe(el);
  }
  var mark = function (el) { el.classList.add('is-in'); };

  /* ---------- M1 rules, M2 rows, generic reveals, quote lines ---------- */
  $$('[data-rows]').forEach(function (list) {
    var rows = $$(':scope > .r', list);
    rows.forEach(function (r, i) { r.style.setProperty('--i', String(Math.min(i, 12))); });
  });
  $$('[data-lines]').forEach(function (q) {
    $$('.ql', q).forEach(function (l, i) { l.style.setProperty('--i', String(i)); });
  });
  if (reduce) {
    $$('[data-draw],.reg3,[data-rows],.rv,[data-lines],.plate').forEach(mark);
  } else {
    $$('[data-draw],.reg3,.rv').forEach(function (el) { onIn(el, mark); });
    $$('[data-rows]').forEach(function (el) { onIn(el, mark, 0.05); });
    $$('[data-lines]').forEach(function (el) { onIn(el, mark, 0.4); });
  }

  /* ---------- M5 plates: unveil, then the LQIP resolves when the image has loaded ---------- */
  $$('.plate').forEach(function (fig) {
    var img = fig.querySelector('img');
    var loaded = function () { fig.classList.add('is-loaded'); };
    if (!img || (img.complete && img.naturalWidth)) loaded();
    else { img.addEventListener('load', loaded, { once: true }); img.addEventListener('error', loaded, { once: true }); }
    if (reduce) return;
    // a plate with its own circle moment waits until 60 % is in view (00.04)
    onIn(fig, mark, fig.hasAttribute('data-circle-moment') ? 0.6 : 0.08);
  });

  /* ---------- M3 counters: real counts from 0 to the printed value, once, at 50 % in view ---------- */
  function countUp(el) {
    var txt = el.textContent.trim();
    var end = parseInt(txt, 10);
    if (!isFinite(end) || String(end) !== txt) return;
    var t0 = null, dur = 900;
    el.setAttribute('aria-live', 'off');
    el.style.minWidth = el.offsetWidth + 'px';
    var step = function (t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(end * e));
      if (p < 1) window.requestAnimationFrame(step); else { el.textContent = txt; el.style.minWidth = ''; }
    };
    window.requestAnimationFrame(step);
  }
  if (!reduce) $$('[data-counter]').forEach(function (el) { onIn(el, countUp, 0.5); });

  /* ---------- Section bar: ruled after the first screen; sub-code rolls (M8) ---------- */
  var bar = d.querySelector('[data-bar]');
  var roll = d.querySelector('[data-roll]');
  var ptop = d.querySelector('[data-ptop]');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    var past = y > window.innerHeight * 0.85;
    if (bar) bar.classList.toggle('is-stuck', y > 8);
    if (ptop) ptop.classList.toggle('is-on', past);
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (ptop) {
    ptop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var main = d.getElementById('main');
      if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
    });
  }
  var subs = $$('[data-sub]');
  if (roll && subs.length && 'IntersectionObserver' in window) {
    var current = roll.textContent;
    var setSub = function (code) {
      if (!code || code === current) return;
      current = code;
      roll.textContent = code;
      if (!reduce) { roll.classList.remove('is-rolling'); void roll.offsetWidth; roll.classList.add('is-rolling'); }
    };
    var subIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setSub(en.target.getAttribute('data-sub')); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    subs.forEach(function (s) { subIO.observe(s); });
  }

  /* ---------- Index sheet (目次): bottom sheet with two detents on phone (M7) ---------- */
  var ix = d.getElementById('index-sheet');
  var panel = ix && ix.querySelector('[data-sheet]');
  var lastFocus = null, closeTimer = null;
  var phone = mq('(max-width: 767.98px)');
  function setExpanded(v) { $$('[data-index-open]').forEach(function (b) { b.setAttribute('aria-expanded', v ? 'true' : 'false'); }); }
  function focusables() { return ix ? $$('a[href],button:not([disabled])', ix).filter(function (el) { return el.offsetParent !== null; }) : []; }
  /* while a modal sheet is open, everything outside it is inert (screen-reader swipe and the iOS rotor included) */
  function inertOutside(el, on) {
    for (var n = el; n && n !== d.body; n = n.parentElement) {
      var p = n.parentElement; if (!p) break;
      Array.prototype.forEach.call(p.children, function (sib) {
        if (sib === n || /^(SCRIPT|STYLE)$/.test(sib.tagName)) return;
        if (on) { if (!sib.inert) { sib.inert = true; sib.setAttribute('data-was-inert', ''); } }
        else if (sib.hasAttribute('data-was-inert')) { sib.inert = false; sib.removeAttribute('data-was-inert'); }
      });
    }
  }
  function openSheet(e) {
    if (!ix) return;
    window.clearTimeout(closeTimer);
    lastFocus = e && e.currentTarget ? e.currentTarget : d.activeElement;
    ix.classList.remove('is-full', 'is-closing');
    if (panel) panel.style.removeProperty('--sheet-y');
    ix.hidden = false;
    void ix.offsetWidth;
    ix.classList.add('is-open');
    root.style.overflow = 'hidden';
    inertOutside(ix, true);
    setExpanded(true);
    var target = ix.querySelector('[data-index-close].ix__close') || focusables()[0];
    if (target) target.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (!ix || ix.hidden) return;
    ix.classList.add('is-closing');
    ix.classList.remove('is-open');
    if (panel) panel.style.removeProperty('transform');
    root.style.overflow = '';
    inertOutside(ix, false);
    setExpanded(false);
    closeTimer = window.setTimeout(function () { ix.hidden = true; ix.classList.remove('is-closing', 'is-full'); }, reduce ? 0 : 240);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  $$('[data-index-open]').forEach(function (b) { b.addEventListener('click', openSheet); });
  $$('[data-index-close]').forEach(function (b) { b.addEventListener('click', closeSheet); });
  if (ix) {
    ix.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (a && a.hash && a.pathname === window.location.pathname) closeSheet();
    });
    d.addEventListener('keydown', function (e) {
      if (ix.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  /* drag: follows the finger; past 30 % down or a fast flick closes; an upward drag opens the full detent */
  if (panel) {
    var body = panel.querySelector('.ix__body');
    var startY = 0, startT = 0, baseY = 0, dy = 0, dragging = false;
    var detentPx = function () { return ix.classList.contains('is-full') ? 0 : window.innerHeight * 0.32; };
    panel.addEventListener('touchstart', function (e) {
      if (!phone.matches || e.touches.length !== 1) return;
      var inBody = body && body.contains(e.target);
      if (inBody && body.scrollTop > 0) return; // let the list scroll
      dragging = true; startY = e.touches[0].clientY; startT = Date.now(); baseY = detentPx(); dy = 0;
      panel.style.transition = 'none';
    }, { passive: true });
    panel.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      dy = e.touches[0].clientY - startY;
      if (body && body.contains(e.target) && dy < 0 && ix.classList.contains('is-full')) { dragging = false; panel.style.transition = ''; return; }
      var y = Math.max(0, baseY + dy);
      panel.style.transform = 'translateY(' + y + 'px)';
    }, { passive: true });
    panel.addEventListener('touchend', function () {
      if (!dragging) return;
      dragging = false;
      panel.style.transition = '';
      panel.style.removeProperty('transform');
      var v = dy / Math.max(1, Date.now() - startT); // px per ms
      // settle at the nearest detent (full · half · closed); a fast flick wins
      var y = baseY + dy, half = window.innerHeight * 0.32;
      if (v > 0.8 || y > half + (panel.offsetHeight - half) * 0.35) closeSheet();
      else if (v < -0.6 || y < half / 2) ix.classList.add('is-full');
      else ix.classList.remove('is-full');
    });
  }

  /* ---------- Thumb dock: hidden while the page's own actions show, the keyboard is open, or video is full screen ---------- */
  var dockApi = { hide: function () {} };
  var dock = d.querySelector('[data-dock]');
  if (dock) {
    d.body.classList.add('has-dock');
    var hideBy = { own: false, kb: false, fs: false, page: false };
    var sync = function () { dock.classList.toggle('is-off', hideBy.own || hideBy.kb || hideBy.fs || hideBy.page); };
    dockApi.hide = function (on) { hideBy.page = !!on; sync(); };
    var own = $$('[data-dock-hide]');
    if (own.length && 'IntersectionObserver' in window) {
      var seen = new Set();
      var ownIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target); });
        hideBy.own = seen.size > 0; sync();
      }, { rootMargin: '-56px 0px 0px 0px' }); // the sticky bar covers the top 48–56 px
      own.forEach(function (el) { ownIO.observe(el); });
    }
    var isField = function (el) { return el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !/^(checkbox|radio|button|submit)$/.test(el.type || ''); };
    d.addEventListener('focusin', function (e) { if (isField(e.target)) { hideBy.kb = true; sync(); } });
    d.addEventListener('focusout', function (e) { if (isField(e.target)) { hideBy.kb = false; sync(); } });
    d.addEventListener('fullscreenchange', function () { hideBy.fs = !!d.fullscreenElement; sync(); });
    sync();
  }

  /* ---------- M14 swipe rows: snap, a slim counter, arrows at 768+ ---------- */
  $$('[data-swipe]').forEach(function (sw) {
    var track = sw.querySelector('.swipe__track');
    var count = sw.querySelector('[data-swipe-count]');
    var prev = sw.querySelector('[data-swipe-prev]');
    var next = sw.querySelector('[data-swipe-next]');
    if (!track) return;
    var items = $$(':scope > *', track);
    var n = items.length;
    var pad = function (v) { return (v < 10 ? '0' : '') + v; };
    var idx = 0;
    var update = function () {
      var x = track.scrollLeft;
      var best = 0, bestD = Infinity;
      items.forEach(function (it, i) { var dd = Math.abs(it.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft) - x); if (dd < bestD) { bestD = dd; best = i; } });
      idx = best;
      if (count) count.textContent = pad(idx + 1) + ' / ' + pad(n);
      if (prev) prev.disabled = x < 4;
      if (next) next.disabled = x > track.scrollWidth - track.clientWidth - 4;
    };
    var raf = 0;
    track.addEventListener('scroll', function () { if (!raf) raf = window.requestAnimationFrame(function () { raf = 0; update(); }); }, { passive: true });
    var go = function (dir) {
      var target = items[Math.max(0, Math.min(n - 1, idx + dir))];
      if (target) track.scrollTo({ left: target.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft), behavior: reduce ? 'auto' : 'smooth' });
    };
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    update();
  });

  /* ---------- M9 index rail: the active sub-number follows the reading position ----------
     <nav data-rail> with links data-rail-for="id" (or data-rail-link="id") and an optional .rail__tick / [data-rail-tick].
     The fixed margin rail (.rail, 1200+) shows only between its first and last section; an in-column rail is always on. */
  $$('[data-rail]').forEach(function (rail) {
    if (!('IntersectionObserver' in window)) return;
    var key = function (a) { return a.getAttribute('data-rail-for') || a.getAttribute('data-rail-link'); };
    var links = $$('[data-rail-for],[data-rail-link]', rail);
    var tick = rail.querySelector('.rail__tick,[data-rail-tick]');
    var targets = links.map(function (a) { return d.getElementById(key(a)); }).filter(Boolean);
    if (!targets.length) return;
    rail.hidden = false;
    if (reduce) rail.classList.add('is-still');
    var active = null;
    var setActive = function (id) {
      if (id === active) return;
      active = id;
      links.forEach(function (a) {
        var on = key(a) === id;
        a.classList.toggle('is-on', on);
        if (on) {
          a.setAttribute('aria-current', 'location');
          if (tick) { tick.style.transform = 'translateY(' + a.offsetTop + 'px)'; tick.style.height = a.offsetHeight + 'px'; }
        } else a.removeAttribute('aria-current');
      });
      if (tick) tick.classList.toggle('is-on', !!id);
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    targets.forEach(function (t) { io.observe(t); });
    if (rail.classList.contains('rail')) {
      var first = targets[0], last = targets[targets.length - 1], zoneTick = false;
      var zone = function () {
        zoneTick = false;
        var h = window.innerHeight;
        var on = first.getBoundingClientRect().top < h * 0.6 && last.getBoundingClientRect().bottom > h * 0.4;
        rail.classList.toggle('is-on', on);
        if (!on && first.getBoundingClientRect().top >= h * 0.6) setActive(null);
      };
      window.addEventListener('scroll', function () { if (!zoneTick) { zoneTick = true; window.requestAnimationFrame(zone); } }, { passive: true });
      window.addEventListener('resize', zone, { passive: true });
      zone();
    }
    rail.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-rail-for],[data-rail-link]');
      var t = a && d.getElementById(key(a));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (window.history && window.history.replaceState) window.history.replaceState(null, '', '#' + t.id);
      var h = t.querySelector('h2,h3') || t;
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    });
  });

  window.NS = { reduce: reduce, onIn: onIn, inertOutside: inertOutside, dock: dockApi, sheet: { open: openSheet, close: closeSheet } };
})();
