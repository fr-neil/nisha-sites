/* C · Exhibition — 02 Works page behaviour shared by the entry pages, 02.00, 02.02 and 02.03.
   - Clip player (M15 silent clips, M16 clips with her voice): poster → video crossfade, sound only on tap,
     one voice clip at a time, a progress hairline; silent clips play at 50 % in view and pause off screen,
     "plays once" clips hold their last frame; a visible pause control; no autoplay with reduced motion.
   - A–Z rail on 02.03: tap or drag along the letters; a bubble shows the letter under the thumb.
   Without this file every clip has the browser's own controls and every list is complete. */
(function () {
  'use strict';
  var d = document;
  var root = d.documentElement;
  var NS = window.NS || {};
  var reduce = !!NS.reduce || !root.classList.contains('motion');
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  /* ---------- clips ---------- */
  var clips = $$('[data-clip]');
  var voices = [];
  function setTog(fig, playing) {
    var b = fig.querySelector('[data-clip-toggle]');
    if (!b) return;
    b.setAttribute('aria-pressed', playing ? 'true' : 'false');
    var en = b.querySelector('[data-l]');
    var hi = b.querySelector('[lang="hi"]');
    if (en) en.textContent = playing ? 'Pause' : 'Play';
    if (hi) hi.textContent = playing ? 'रोकें' : 'चलाएँ';
  }
  function silent(fig) { return fig.getAttribute('data-clip') !== 'voice'; }
  function pauseLoops() {
    clips.forEach(function (f) { if (silent(f)) { var v = f.querySelector('video'); if (v && !v.paused) { f.__held = true; v.pause(); } } });
  }
  function resumeLoops() {
    clips.forEach(function (f) { if (silent(f) && f.__held && f.__vis && !f.__user) { f.__held = false; play(f); } });
  }
  function play(fig) {
    var v = fig.querySelector('video');
    var p = v.play();
    if (p && p.catch) p.catch(function () { setTog(fig, false); });
  }
  clips.forEach(function (fig) {
    var v = fig.querySelector('video');
    if (!v) return;
    v.removeAttribute('controls');
    v.addEventListener('playing', function () { fig.classList.add('is-playing'); if (silent(fig)) setTog(fig, true); });
    v.addEventListener('pause', function () { if (silent(fig)) setTog(fig, false); });
    var bar = fig.querySelector('.clip__prog > span');
    if (!silent(fig)) {
      voices.push(fig);
      var btn = fig.querySelector('[data-clip-play]');
      var start = function () {
        voices.forEach(function (o) { if (o !== fig) { var ov = o.querySelector('video'); if (ov && !ov.paused) ov.pause(); } });
        pauseLoops();
        v.muted = false;
        v.controls = true;
        fig.classList.add('is-live');
        play(fig);
      };
      if (btn) btn.addEventListener('click', start);
      v.addEventListener('timeupdate', function () { if (bar && v.duration) bar.style.transform = 'scaleX(' + (v.currentTime / v.duration) + ')'; });
      v.addEventListener('ended', function () { fig.classList.remove('is-live', 'is-playing'); v.controls = false; v.currentTime = 0; if (bar) bar.style.transform = ''; resumeLoops(); });
      v.addEventListener('pause', function () { if (!v.ended && v.currentTime > 0 && v.paused) resumeLoops(); });
      return;
    }
    /* silent: loop or play once */
    var once = fig.getAttribute('data-clip') === 'once';
    var tog = fig.querySelector('[data-clip-toggle]');
    v.muted = true;
    if (tog) tog.addEventListener('click', function () {
      if (v.paused) { fig.__user = false; if (once && v.ended) v.currentTime = 0; play(fig); }
      else { fig.__user = true; v.pause(); }
    });
    if (once) v.addEventListener('ended', function () { setTog(fig, false); fig.classList.add('is-held'); });
    // no autoplay with reduced motion or Data Saver: the poster and the play control stay
    if (reduce || saveData || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        fig.__vis = en.intersectionRatio >= 0.5;
        if (fig.__vis) {
          var busy = voices.some(function (o) { var ov = o.querySelector('video'); return ov && !ov.paused; });
          if (!fig.__user && !busy && !(once && fig.__done)) { play(fig); if (once) fig.__done = true; }
        } else if (!v.paused) v.pause();
      });
    }, { threshold: [0, 0.5] });
    io.observe(fig);
  });
  d.addEventListener('visibilitychange', function () { if (d.hidden) clips.forEach(function (f) { if (silent(f)) { var v = f.querySelector('video'); if (v && !v.paused) v.pause(); } }); });

  /* 02.00 index rail (M9): handled by js/core.js ([data-rail]) */

  /* ---------- 02.03 A–Z rail: tap or drag ---------- */
  var az = d.querySelector('[data-azrail]');
  if (az) {
    var bub = az.querySelector('[data-azbub]');
    var last = null, hideT = 0;
    var go = function (a, smooth) {
      var t = d.getElementById('l-' + a.getAttribute('data-az').toLowerCase());
      if (!t) return;
      var bar = d.querySelector('[data-bar]');
      var y = t.getBoundingClientRect().top + window.scrollY - (bar ? bar.offsetHeight : 48) - 8;
      window.scrollTo({ top: y, behavior: smooth && !reduce ? 'smooth' : 'auto' });
    };
    var show = function (a, y) {
      if (!bub) return;
      bub.textContent = a.getAttribute('data-az');
      bub.style.transform = 'translateY(' + (y - 28) + 'px)';
      bub.classList.add('is-on');
      window.clearTimeout(hideT);
      hideT = window.setTimeout(function () { bub.classList.remove('is-on'); }, 700);
    };
    az.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-az]');
      if (!a) return;
      e.preventDefault();
      go(a, true);
    });
    var pick = function (e) {
      var t = e.touches ? e.touches[0] : e;
      var el = d.elementFromPoint(az.getBoundingClientRect().left + az.offsetWidth / 2, t.clientY);
      var a = el && el.closest && el.closest('[data-az]');
      if (!a || a === last) return;
      last = a;
      go(a, false);
      show(a, t.clientY - az.getBoundingClientRect().top);
    };
    az.addEventListener('touchstart', function (e) { last = null; pick(e); }, { passive: true });
    az.addEventListener('touchmove', function (e) { e.preventDefault(); pick(e); }, { passive: false });
  }

})();
