/* Field Note · Method: figures that play, and the contact-strip counters.
   - Silent loops (A15) play while at least half in view and pause off screen; a visible 44 px control pauses them,
     and a loop the visitor paused stays paused. With reduced motion they never start on their own.
   - Clips with her voice play only on request, turn from grey to colour (A8), ink a tick per second as they play,
     and pause when scrolled away. One clip plays at a time.
   - Strips count their position (A16): "02 / 07". */
(function () {
  'use strict';
  var doc = document;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var mmss = function (s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); };

  function setBtn(btn, playing, labelEl) {
    btn.setAttribute('aria-pressed', String(playing));
    if (labelEl) labelEl.textContent = playing ? 'Pause' : 'Play';
  }
  function fail(fig, btn) {
    fig.classList.remove('is-live', 'is-playing');
    if (btn) btn.hidden = true;
  }

  /* ---------- silent loops ---------- */
  $$('video[data-loop]').forEach(function (v) {
    var fig = v.closest('.pf');
    var btn = fig.querySelector('[data-loop-btn]');
    var lab = fig.querySelector('[data-loop-t]');
    var userPaused = false;
    var inView = false;
    var play = function () {
      var p = v.play();
      if (p && p.catch) p.catch(function () { setBtn(btn, false, lab); });
    };
    v.addEventListener('playing', function () { fig.classList.add('is-live'); setBtn(btn, true, lab); });
    v.addEventListener('pause', function () { setBtn(btn, false, lab); });
    v.addEventListener('error', function () { fail(fig, btn); }, true);
    btn.addEventListener('click', function () {
      if (v.paused) { userPaused = false; play(); } else { userPaused = true; v.pause(); }
    });
    if (reduce || !hasIO) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        inView = en.intersectionRatio >= 0.5;
        if (inView && !userPaused && v.paused) play();
        else if (!inView && !v.paused) v.pause();
      });
    }, { threshold: [0, 0.5] }).observe(fig);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden && !v.paused) v.pause(); else if (!doc.hidden && inView && !userPaused) play(); });
  });

  /* ---------- clips with her voice ---------- */
  var clips = [];
  $$('video[data-clip]').forEach(function (v) {
    var fig = v.closest('.pf');
    var btn = fig.querySelector('[data-clip-btn]');
    var lab = fig.querySelector('[data-clip-t]');
    var time = fig.querySelector('[data-clip-time]');
    var prog = fig.querySelector('.pf__prog');
    var total = time ? time.textContent : '';
    clips.push(v);
    var reset = function () {
      fig.classList.remove('is-playing');
      if (prog) prog.style.setProperty('--p', '-1');
      if (time) time.textContent = total;
    };
    v.addEventListener('playing', function () { fig.classList.add('is-live', 'is-playing'); setBtn(btn, true, lab); });
    v.addEventListener('pause', function () { fig.classList.remove('is-playing'); setBtn(btn, false, lab); });
    v.addEventListener('timeupdate', function () {
      if (prog) prog.style.setProperty('--p', String(Math.floor(v.currentTime)));
      if (time) time.textContent = mmss(v.currentTime) + ' / ' + total;
    });
    v.addEventListener('ended', function () { fig.classList.remove('is-live'); v.currentTime = 0; reset(); setBtn(btn, false, lab); });
    v.addEventListener('error', function () { fail(fig, btn); }, true);
    btn.addEventListener('click', function () {
      if (!v.paused) { v.pause(); return; }
      clips.forEach(function (o) { if (o !== v && !o.paused) o.pause(); });
      var p = v.play();
      if (p && p.catch) p.catch(function () { setBtn(btn, false, lab); });
    });
    if (hasIO) new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (!en.isIntersecting && !v.paused) v.pause(); });
    }, { threshold: [0] }).observe(fig);
  });

  /* ---------- strip counters ---------- */
  if (hasIO) $$('[data-fst]').forEach(function (s) {
    var track = s.querySelector('.fst__track');
    var out = s.querySelector('[data-fst-n]');
    if (!track || !out) return;
    var items = Array.prototype.slice.call(track.children);
    var seen = items.map(function () { return false; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { seen[items.indexOf(en.target)] = en.intersectionRatio >= 0.6; });
      var i = seen.indexOf(true);
      if (i > -1) out.textContent = (i < 9 ? '0' : '') + (i + 1);
    }, { root: track, threshold: [0, 0.6] });
    items.forEach(function (it) { io.observe(it); });
  });
})();
