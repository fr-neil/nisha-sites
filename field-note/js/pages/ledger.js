/* Field Note · Ledger pages (volume spreads). Loaded after core.js. No dependencies.
   - the line sheet: tap a row for when / where / what, then step to the newer or older line (A9)
   - the month headers roll to the line at the top of the view (A12); the month ruler marks the month in view
   - the mini atlas: a place capsule lights its cross (acid square, A7)
   - figures: silent loops play in view and pause off screen; clips play with sound on tap, one at a time,
     turning from grey to colour while a tick ruler fills (A8, A15)
   Every motion has a reduced-motion path. */
(function () {
  'use strict';
  var doc = document;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ------------------------------------------------------------ line sheet */
  var ls = doc.getElementById('ls');
  var rows = $$('.lb > .ln');
  if (ls && rows.length && typeof ls.showModal === 'function') {
    var body = $('[data-ls-body]', ls);
    var codeEl = $('[data-ls-code]', ls);
    var steps = $$('[data-ls-step]', ls);
    var current = null;
    var mark = function (row) {
      if (history.replaceState) history.replaceState(null, '', '#' + row.id);
      var ev;
      try { ev = new HashChangeEvent('hashchange'); } catch (e) { ev = doc.createEvent('Event'); ev.initEvent('hashchange', false, false); }
      window.dispatchEvent(ev);
    };
    var fill = function (row) {
      var ld = doc.getElementById('ld-' + row.id);
      if (!ld) return false;
      current = row;
      body.innerHTML = ld.innerHTML;
      codeEl.textContent = ld.getAttribute('aria-label');
      body.scrollTop = 0;
      var i = rows.indexOf(row);
      steps.forEach(function (b) {
        var n = rows[i - Number(b.getAttribute('data-ls-step'))];
        b.disabled = !n;
        if (n) b.setAttribute('aria-label', (b.getAttribute('data-ls-step') === '1' ? 'Newer line: ' : 'Older line: ') + n.querySelector('.ln__no').getAttribute('aria-label'));
      });
      return true;
    };
    var openRow = function (row) {
      if (!fill(row)) return;
      if (!ls.open) { ls.showModal(); ls.setAttribute('tabindex', '-1'); ls.focus(); }
      mark(row);
    };
    rows.forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        openRow(row);
      });
    });
    steps.forEach(function (b) {
      b.addEventListener('click', function () {
        var n = rows[rows.indexOf(current) - Number(b.getAttribute('data-ls-step'))];
        if (!n) return;
        fill(n); mark(n);
        n.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
        if (b.disabled) { var o = steps.filter(function (x) { return !x.disabled; })[0]; if (o) o.focus(); }
      });
    });
    ls.addEventListener('close', function () { if (current) current.focus({ preventScroll: true }); });
  }

  /* ------------------------------------------------------------ month ruler: the current month is underlined (A12) */
  var cells = $$('[data-mr] a.mr__c');
  var cellFor = function (id) { return cells.filter(function (c) { return c.getAttribute('href') === '#' + id; })[0]; };
  var curCell = null;
  if (rows.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var row = en.target;
        var g = row.closest('.mg');
        if (!g) return;
        var c = cellFor(g.id);
        if (c !== curCell) { if (curCell) curCell.classList.remove('is-cur'); if (c) c.classList.add('is-cur'); curCell = c; }
      });
    }, { rootMargin: '-80px 0px -78% 0px' });
    rows.forEach(function (r) { spy.observe(r); });
  }
  // arriving at a month from the ruler: its name is underlined for a moment
  var hitMonth = function () {
    if (!/^#m-\d\d$/.test(location.hash)) return;
    var g = doc.getElementById(location.hash.slice(1));
    if (!g) return;
    g.classList.add('is-hit');
    setTimeout(function () { g.classList.remove('is-hit'); }, 1400);
  };
  window.addEventListener('hashchange', hitMonth);
  hitMonth();

  /* ------------------------------------------------------------ mini atlas: capsule <-> cross */
  var sel = function (code, on) {
    $$('.vpl [data-code="' + code + '"]').forEach(function (el) { el.classList.toggle('is-sel', on); });
  };
  $$('.vpl .caps .cap[data-code], .vpl .xs[data-code]').forEach(function (el) {
    var code = el.getAttribute('data-code');
    ['mouseenter', 'focus'].forEach(function (t) { el.addEventListener(t, function () { sel(code, true); }); });
    ['mouseleave', 'blur'].forEach(function (t) { el.addEventListener(t, function () { sel(code, false); }); });
  });

  /* a line and its prints answer each other on hover (>= 1100 they sit side by side) */
  $$('.mg__figs .pf[data-for]').forEach(function (f) {
    var lb = $('.lb[data-for="' + f.getAttribute('data-for') + '"]');
    if (!lb) return;
    var on = function () { lb.classList.add('is-hover'); f.classList.add('is-hover'); };
    var off = function () { lb.classList.remove('is-hover'); f.classList.remove('is-hover'); };
    [f, lb].forEach(function (el) { el.addEventListener('mouseenter', on); el.addEventListener('mouseleave', off); });
  });

  /* ------------------------------------------------------------ figures that move */
  var figs = $$('.vf');
  var clips = [];
  var label = function (fig, playing) {
    var b = $('[data-vbtn]', fig);
    var t = $('.vf__t', b);
    var h = $('[lang="hi"]', b);
    var isClip = fig.hasAttribute('data-clip');
    t.textContent = playing ? 'Pause' : (isClip ? 'Play with sound' : 'Play');
    if (h) h.textContent = playing ? 'रोकें' : (isClip ? 'आवाज़ के साथ चलाएँ' : 'चलाएँ');
    b.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + fig.querySelector('.pf__tab').textContent);
    fig.classList.toggle('is-playing', playing);
  };
  figs.forEach(function (fig) {
    var v = $('video', fig);
    var b = $('[data-vbtn]', fig);
    if (!v || !b) return;
    v.removeAttribute('controls');
    b.hidden = false;
    v.addEventListener('play', function () { label(fig, true); });
    v.addEventListener('pause', function () { label(fig, false); });
    v.addEventListener('ended', function () { label(fig, false); });
    label(fig, false);
    if (fig.hasAttribute('data-clip')) {
      clips.push(v);
      v.muted = false;
      v.addEventListener('timeupdate', function () { if (v.duration) fig.style.setProperty('--p', String(v.currentTime / v.duration)); });
      v.addEventListener('play', function () { clips.forEach(function (o) { if (o !== v && !o.paused) o.pause(); }); });
      var toggle = function () { if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () { label(fig, false); }); } else v.pause(); };
      b.addEventListener('click', toggle);
      v.addEventListener('click', toggle);
      return;
    }
    // silent loops: play at >= 50% in view, pause off screen; "once" plays through and holds its last frame
    var once = fig.hasAttribute('data-once');
    v.muted = true; v.loop = !once;
    var userPaused = reduce;
    var done = false;
    v.addEventListener('ended', function () { done = true; });
    b.addEventListener('click', function () {
      if (v.paused) { userPaused = false; if (done) { v.currentTime = 0; done = false; } var p = v.play(); if (p && p.catch) p.catch(function () { label(fig, false); }); }
      else { userPaused = true; v.pause(); }
    });
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.intersectionRatio >= 0.5) { if (!userPaused && !done && v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () { /* autoplay refused: the button stays */ }); } }
        else if (!v.paused) v.pause();
      });
    }, { threshold: [0, 0.5] }).observe(fig);
  });
  doc.addEventListener('visibilitychange', function () { if (doc.hidden) figs.forEach(function (f) { var v = $('video', f); if (v && !v.paused) v.pause(); }); });
})();
