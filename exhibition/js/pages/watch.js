/* 04 Watch · the clip player (PHASE-50 §3.8; motion M4, M10, M15, M16).
   Without this file every clip still plays with the browser's own controls and every field is visible.
   - Clips with her voice: poster plate, "Play with sound" (sound only on tap), colour on play, progress hairline,
     CC toggle remembered per viewer, full screen (landscape where allowed), one clip at a time.
   - Silent clips: play when at least half in view, pause off screen; "plays once" clips hold their last frame;
     a visible pause control; no autoplay with reduced motion.
   - The red marker sits on the current clip and travels to the next one played (FLIP, 480 ms). */
(function () {
  'use strict';
  var d = document;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = (window.NS && window.NS.reduce) || !d.documentElement.classList.contains('motion') ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage unavailable: keep the default */ } }
  };

  var voice = $$('[data-clip="voice"]');
  var rooms = $$('.room');
  var current = null;
  var voicePlaying = false;

  /* ---------- the "now playing" marker (M4 FLIP) ---------- */
  function inView(r) { return r.bottom > 0 && r.top < window.innerHeight; }
  function setCurrent(card) {
    if (!card || card === current) return;
    var oldDot = current && current.querySelector('[data-air]');
    var from = oldDot ? oldDot.getBoundingClientRect() : null;
    if (current) current.classList.remove('is-current');
    current = card;
    card.classList.add('is-current');
    var dot = card.querySelector('[data-air]');
    if (reduce || !from || !dot || !dot.animate) return;
    var to = dot.getBoundingClientRect();
    if (!inView(from) || !inView(to)) return;
    dot.animate([{ transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px)', opacity: 1 }, { transform: 'none', opacity: 1 }],
      { duration: 480, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }

  /* ---------- silent clips ---------- */
  function pauseRooms() { rooms.forEach(function (r) { if (r.__v && !r.__v.paused) { r.__v.pause(); } }); }
  function resumeRooms() { rooms.forEach(function (r) { if (r.__seen && !r.__userPaused && !r.__held && !reduce) playRoom(r); }); }
  function playRoom(r) {
    var v = r.__v;
    if (!v || voicePlaying) return;
    var p = v.play();
    if (p && p.catch) p.catch(function () { r.classList.remove('is-playing'); });
  }

  rooms.forEach(function (r) {
    var v = r.querySelector('video');
    var btn = r.querySelector('[data-loop]');
    var once = r.querySelector('[data-clip="once"]') !== null;
    var code = (r.querySelector('.clip__no .code') || {}).textContent || '';
    if (!v || !btn) return;
    r.__v = v;
    v.muted = true;
    btn.hidden = false;
    var label = function () {
      var state = r.classList.contains('is-playing') ? 'Pause' : r.__held ? 'Play again' : 'Play';
      btn.setAttribute('aria-label', state + ' · ' + code);
    };
    v.addEventListener('play', function () { r.classList.add('is-playing'); r.classList.remove('is-held'); r.__held = false; label(); });
    v.addEventListener('pause', function () { r.classList.remove('is-playing'); label(); });
    v.addEventListener('ended', function () { if (once) { r.__held = true; r.classList.add('is-held'); } label(); });
    btn.addEventListener('click', function () {
      if (r.classList.contains('is-playing')) { r.__userPaused = true; v.pause(); return; }
      r.__userPaused = false;
      if (r.__held) { v.currentTime = 0; }
      if (voicePlaying) stopVoice();
      playRoom(r);
    });
    label();
    // no autoplay with reduced motion or Data Saver: the poster and the play control stay
    if (reduce || saveData || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        r.__seen = e.isIntersecting && e.intersectionRatio >= 0.5;
        if (r.__seen) { if (!r.__userPaused && !r.__held) playRoom(r); }
        else if (!v.paused) v.pause();
      });
    }, { threshold: [0, 0.5] }).observe(r);
  });
  d.addEventListener('visibilitychange', function () { if (d.hidden) pauseRooms(); else resumeRooms(); });

  /* ---------- clips with her voice ---------- */
  var ccOn = store.get('ns-cc') === '1';
  function applyCC() {
    voice.forEach(function (card) {
      var v = card.querySelector('video');
      if (v && v.textTracks && v.textTracks[0]) v.textTracks[0].mode = ccOn ? 'showing' : 'hidden';
      var b = card.querySelector('[data-cc]');
      if (b) b.setAttribute('aria-pressed', ccOn ? 'true' : 'false');
    });
  }
  function stopVoice() { voice.forEach(function (c) { var v = c.querySelector('video'); if (v && !v.paused) v.pause(); }); }

  voice.forEach(function (card) {
    var v = card.querySelector('video');
    var play = card.querySelector('[data-play]');
    var prog = card.querySelector('[data-prog]');
    var tools = card.querySelector('[data-tools]');
    var more = card.querySelector('[data-more]');
    var fs = card.querySelector('[data-fs]');
    var cc = card.querySelector('[data-cc]');
    if (!v || !play) return;
    v.removeAttribute('controls');
    play.hidden = false;
    if (tools) tools.hidden = false;
    var raf = 0;
    var tick = function () { if (v.duration) prog.style.setProperty('--p', String(v.currentTime / v.duration)); raf = v.paused ? 0 : window.requestAnimationFrame(tick); };
    var start = function () {
      voice.forEach(function (c) { if (c !== card) { var o = c.querySelector('video'); if (o && !o.paused) o.pause(); } });
      setCurrent(card);
      v.muted = false;
      v.controls = true;
      card.classList.add('is-live');
      var p = v.play();
      if (p && p.catch) p.catch(function () { card.classList.remove('is-live'); v.controls = false; });
    };
    play.addEventListener('click', function () { start(); v.focus({ preventScroll: true }); });
    v.addEventListener('play', function () {
      voice.forEach(function (c) { if (c !== card) { var o = c.querySelector('video'); if (o && !o.paused) o.pause(); } });
      voicePlaying = true; pauseRooms(); setCurrent(card); card.classList.add('is-live');
      if (!raf) raf = window.requestAnimationFrame(tick);
    });
    v.addEventListener('pause', function () {
      window.setTimeout(function () { voicePlaying = voice.some(function (c) { var o = c.querySelector('video'); return o && !o.paused; }); if (!voicePlaying) resumeRooms(); }, 0);
    });
    v.addEventListener('ended', function () { card.classList.remove('is-live'); v.controls = false; prog.style.setProperty('--p', '1'); });
    v.addEventListener('loadedmetadata', applyCC);
    if (cc) cc.addEventListener('click', function () { ccOn = !ccOn; store.set('ns-cc', ccOn ? '1' : '0'); applyCC(); });
    if (more) {
      more.addEventListener('click', function () {
        var open = !card.classList.contains('is-open');
        card.classList.toggle('is-open', open);
        more.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    if (fs) {
      fs.addEventListener('click', function () {
        if (v.paused) start();
        var req = v.requestFullscreen || v.webkitRequestFullscreen;
        var p = null;
        if (req) p = req.call(v);
        else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
        var lock = function () { try { var o = window.screen && window.screen.orientation; if (o && o.lock) o.lock('landscape').catch(function () { /* orientation lock not allowed here */ }); } catch (e) { /* not supported */ } };
        if (p && p.then) p.then(lock, function () { /* full screen refused: the clip keeps playing in place */ }); else lock();
      });
    }
  });
  d.addEventListener('fullscreenchange', function () {
    if (!d.fullscreenElement) { try { var o = window.screen && window.screen.orientation; if (o && o.unlock) o.unlock(); } catch (e) { /* not supported */ } }
  });
  applyCC();

  /* the marker starts on the clip named in the address, else on the first */
  var target = window.location.hash && d.getElementById(window.location.hash.slice(1));
  setCurrent(target && target.getAttribute('data-clip') === 'voice' ? target : voice[0]);
  $$('.pg a').forEach(function (a) {
    a.addEventListener('click', function () {
      var t = d.getElementById(a.hash.slice(1));
      if (t && t.getAttribute('data-clip') === 'voice') window.setTimeout(function () { setCurrent(t); }, reduce ? 0 : 500);
    });
  });
})();
