/* Field Note · field-note behaviour (PHASE-51 §6 A8, A15). Runs after js/core.js; no dependencies.
   Each moment that is a span of a clip or a loop plays only that span:
   - a clip with her voice plays on tap, with sound, one at a time, and turns from grey to colour while it plays;
   - a silent loop span plays once when half in view, then holds its last frame (no autoplay with reduced motion);
   - the tick ruler under the frame fills one tick per second. */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function (s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); };
  var active = null;

  function Player(fig) {
    var span = fig.getAttribute('data-span').split(',').map(Number);
    var a = span[0]; var b = span[1];
    var clip = fig.getAttribute('data-kind') === 'clip';
    var v = $('video', fig); var btn = $('[data-spanplay]', fig);
    var bar = $('.pf__prog i', fig); var txt = $('.pf__pt', btn);
    var raf = 0; var self = this; var played = false;
    var label = function (state) {
      var range = fmt(a) + '–' + fmt(b);
      if (state === 'playing') { txt.textContent = 'Pause'; btn.setAttribute('aria-label', 'Pause ' + range); }
      else if (state === 'done') { txt.textContent = (clip ? '▶ ' : '') + 'Again ' + range; btn.setAttribute('aria-label', (clip ? 'Play again with sound, ' : 'Play again, ') + range); }
      else { txt.textContent = (clip ? '▶ ' : '') + range; btn.setAttribute('aria-label', (clip ? 'Play with sound, ' : 'Play, ') + range); }
    };
    var tick = function () {
      raf = 0;
      var t = v.currentTime;
      if (bar) bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, (t - a) / (b - a))) + ')';
      if (t >= b - 0.03) { v.pause(); v.currentTime = Math.min(t, b); done(); return; }
      if (!v.paused) raf = requestAnimationFrame(tick);
    };
    var done = function () { fig.classList.remove('is-playing'); played = true; label('done'); if (active === self) active = null; };
    this.stop = function () { if (!v.paused) v.pause(); fig.classList.remove('is-playing'); label(played ? 'done' : 'idle'); };
    this.play = function () {
      if (active && active !== self) active.stop();
      active = self;
      if (!v.src) { v.preload = 'auto'; v.src = v.getAttribute('data-src'); }
      var go = function () {
        if (v.currentTime < a || v.currentTime >= b - 0.05) v.currentTime = a;
        var p = v.play();
        if (p && p.catch) p.catch(function () { fig.classList.remove('is-playing'); label('idle'); });
      };
      if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true });
    };
    v.addEventListener('playing', function () { fig.classList.add('is-on', 'is-playing'); label('playing'); if (!raf) raf = requestAnimationFrame(tick); });
    v.addEventListener('pause', function () { fig.classList.remove('is-playing'); });
    btn.addEventListener('click', function () { if (!v.paused) self.stop(); else self.play(); });
    if (!clip && !reduce && 'IntersectionObserver' in window) {
      // A15: a silent span plays through once when it is half in view, then holds its frame
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.intersectionRatio >= 0.5 && !played && !doc.hidden) { io.disconnect(); self.play(); } });
      }, { threshold: [0.5] });
      io.observe(fig);
    }
    label('idle');
  }
  $$('.pf--span').forEach(function (f) { if ($('video', f) && $('[data-spanplay]', f)) f.player = new Player(f); });
  doc.addEventListener('visibilitychange', function () { if (doc.hidden && active) active.stop(); });
}());
