/* Field Note · Atlas behaviour (PHASE-51 §9.4). Runs after js/core.js; no dependencies.
   - place sheets: a cross, a list row, a margin box or a figure opens its place (A7 + A9); phone and 768 use a modal
     bottom/side sheet, >= 1100 a 420 px panel that keeps the map in view; close pairs open a chooser
   - the ruler link: an open place re-inks its own ticks on the year ruler and dims the rest
   - the time filter: ?to=YYYY (the scale under Sheet II, the ruler, the year picker or a scrub) and ?vol=YYYY
   - pan chips for Sheet II on phones, A-Z / most-events ordering, loops in place figures (A15)
   Every motion has a reduced-motion path. */
(function () {
  'use strict';
  var doc = document;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqWide = window.matchMedia('(min-width: 1100px)');
  var mqPhone = window.matchMedia('(max-width: 699px)');
  var ps = doc.getElementById('ps');
  var pc = doc.getElementById('pc');
  if (!ps || typeof ps.showModal !== 'function') return; // no <dialog>: the sections stay inline, links scroll to them
  var title = $('#ps-t');
  var body = $('[data-ps-body]', ps);
  var lead = $('[data-pslead]');
  var yr = $('[data-yr]');
  var opener = null;
  var current = null;
  // setup that no first tap needs runs when the main thread is idle (keeps the load responsive on slow phones)
  var idle = window.requestIdleCallback ? function (fn) { window.requestIdleCallback(fn, { timeout: 1200 }); } : function (fn) { setTimeout(fn, 200); };

  /* ------------------------------------------------------------------ loops (A15) */
  function wireLoop(fig) {
    var v = $('video', fig); var ctl = $('[data-loopctl]', fig);
    if (!v || !ctl || v.getAttribute('data-wired')) return;
    v.setAttribute('data-wired', '1');
    var start = function () {
      if (!v.src) v.src = v.getAttribute('data-src');
      var p = v.play(); if (p && p.catch) p.catch(function () { ctl.classList.add('is-paused'); });
    };
    v.addEventListener('playing', function () { fig.classList.add('is-playing'); ctl.classList.remove('is-paused'); ctl.setAttribute('aria-label', 'Pause the loop'); $('.pf__ctl-t', ctl).textContent = 'Pause'; });
    v.addEventListener('pause', function () { ctl.classList.add('is-paused'); ctl.setAttribute('aria-label', 'Play the loop'); $('.pf__ctl-t', ctl).textContent = 'Play'; });
    ctl.hidden = false;
    ctl.addEventListener('click', function () { if (v.paused) { fig.userPaused = false; start(); } else { fig.userPaused = true; v.pause(); } });
    if (reduce) { ctl.classList.add('is-paused'); $('.pf__ctl-t', ctl).textContent = 'Play'; ctl.setAttribute('aria-label', 'Play the loop'); return; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.intersectionRatio >= 0.5 && !fig.userPaused && !doc.hidden) start(); else if (!v.paused) v.pause(); });
      }, { threshold: [0, 0.5] }).observe(fig);
    } else start();
  }
  doc.addEventListener('visibilitychange', function () { if (doc.hidden) $$('video', ps).forEach(function (v) { v.pause(); }); });

  /* ------------------------------------------------------------------ the ruler link */
  function inkRuler(ym) {
    if (!yr) return;
    $$('.tk.is-on', yr).forEach(function (t) { t.classList.remove('is-on'); });
    if (!ym) { yr.classList.remove('is-dim'); return; }
    ym.split(' ').forEach(function (k) {
      var p = k.split('-'); var seg = $('.yr__seg[data-y="' + p[0] + '"]', yr);
      if (!seg) return;
      var t = p[1] === '0' ? $('.tk--nm', seg) : $('.tk[data-m="' + p[1] + '"]', seg);
      if (t) t.classList.add('is-on');
    });
    yr.classList.add('is-dim');
  }

  /* ------------------------------------------------------------------ the leader (A7) */
  var leadRaf = 0;
  function placeLead() {
    leadRaf = 0;
    if (!lead) return;
    var sel = $$('.pm.is-sel').filter(function (m) { var r = m.getBoundingClientRect(); return r.bottom > 56 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; })[0];
    if (!sel || !ps.open) { lead.className = 'pslead'; return; }
    var r = sel.getBoundingClientRect(); var cx = r.left + r.width / 2; var cy = r.top + r.height / 2;
    var s = ps.getBoundingClientRect();
    var wasOn = lead.classList.contains('is-on');
    if (mqPhone.matches) {
      if (cy + 12 >= s.top) { lead.className = 'pslead'; return; }
      lead.style.cssText = 'left:' + cx + 'px;top:' + (cy + 12) + 'px;width:1px;height:' + (s.top - cy - 12) + 'px';
      lead.className = 'pslead is-v is-on';
    } else {
      if (cx + 12 >= s.left) { lead.className = 'pslead'; return; }
      lead.style.cssText = 'left:' + (cx + 12) + 'px;top:' + cy + 'px;height:1px;width:' + (s.left - cx - 12) + 'px';
      lead.className = 'pslead is-h is-on';
    }
    if (wasOn) lead.style.animation = 'none';
  }
  var queueLead = function () { if (!leadRaf) leadRaf = requestAnimationFrame(placeLead); };
  window.addEventListener('scroll', queueLead, { passive: true });
  window.addEventListener('resize', queueLead);
  $$('[data-pan]').forEach(function (vp) { vp.addEventListener('scroll', queueLead, { passive: true }); });

  /* ------------------------------------------------------------------ open / close a place */
  function sectionFor(id) { var s = doc.getElementById(id); return s && s.classList.contains('place') ? s : null; }
  function setHash(id) {
    try { history.replaceState(null, '', location.pathname + location.search + (id ? '#' + id : '')); } catch (e) { /* file:// or sandboxed: the address simply stays */ }
  }
  function openPlace(id, from) {
    var sec = sectionFor(id);
    if (!sec) return false;
    var src = $('.place__body', sec);
    $$('.pm.is-sel, .place.is-sel').forEach(function (m) { m.classList.remove('is-sel'); });
    $$('.pm[data-p="' + id + '"]').forEach(function (m) { m.classList.add('is-sel'); });
    sec.classList.add('is-sel');
    var t = sec.getAttribute('data-title').split(' · ');
    title.innerHTML = '<span class="code"></span><span class="ps__c"></span>';
    title.firstChild.textContent = t[0]; title.lastChild.textContent = t.slice(1).join(' · ');
    $$('video', body).forEach(function (v) { v.pause(); v.removeAttribute('src'); v.load(); });
    body.innerHTML = src.innerHTML;
    $$('[id]', body).forEach(function (el) { el.removeAttribute('id'); });
    $$('.rv', body).forEach(function (el) { el.classList.add('is-in'); });
    body.scrollTop = 0;
    $$('.pf[data-media="loop"]', body).forEach(wireLoop);
    inkRuler(sec.getAttribute('data-ym'));
    current = id;
    setHash(id);
    if (!ps.open) {
      opener = from || doc.activeElement;
      // on phones, bring a tapped cross into the top of the screen so it stays visible above the sheet
      if (mqPhone.matches && from && from.classList.contains('pm')) {
        var r = from.getBoundingClientRect(); var want = innerHeight * 0.26;
        if (r.top > innerHeight * 0.36 || r.top < 60) window.scrollBy(0, r.top - want);
      }
      if (mqWide.matches) { ps.show(); doc.body.classList.add('ps-open'); } else ps.showModal();
    }
    title.focus({ preventScroll: true });
    lead.className = 'pslead';
    setTimeout(queueLead, reduce ? 0 : 290);
    return true;
  }
  ps.addEventListener('close', function () {
    $$('.pm.is-sel, .place.is-sel').forEach(function (m) { m.classList.remove('is-sel'); });
    $$('video', body).forEach(function (v) { v.pause(); });
    doc.body.classList.remove('ps-open');
    inkRuler(null);
    lead.className = 'pslead';
    current = null;
    setHash('');
    if (opener && opener.focus && doc.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  });
  // the non-modal panel (>= 1100): Esc closes it as a modal would
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ps.open && !pc.open && mqWide.matches && !$('dialog[open]:not(#ps)')) $('[data-close]', ps).click();
  });

  /* close pairs: a tap that lands on two crosses opens a chooser */
  // only crosses whose centres lie within 14 px of the tap itself (keyboard activation never asks)
  function neighbours(m, e) {
    if (!e.detail && !e.clientX) return [m];
    return $$('.pm[data-place]', m.parentNode).filter(function (o) {
      if (o.classList.contains('is-out')) return false;
      var q = o.getBoundingClientRect();
      return Math.hypot(q.left + q.width / 2 - e.clientX, q.top + q.height / 2 - e.clientY) < 14;
    });
  }
  function choose(list, from) {
    var b = $('[data-pc-body]', pc);
    b.innerHTML = '';
    list.forEach(function (m) {
      var id = m.getAttribute('data-p'); var sec = sectionFor(id);
      var row = $('.place__row', sec).cloneNode(true);
      row.addEventListener('click', function (e) {
        e.preventDefault();
        $('[data-close]', pc).click();
        setTimeout(function () { openPlace(id, from); }, reduce ? 0 : 230);
      });
      b.appendChild(row);
    });
    pc.showModal();
  }

  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-p]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    if (pc.open && pc.contains(a)) return;
    var id = a.getAttribute('data-p');
    if (a.classList.contains('pm') && a.hasAttribute('data-place')) {
      var near = neighbours(a, e);
      if (near.length > 1) { e.preventDefault(); choose(near, a); return; }
    }
    if (a.classList.contains('pm--reg')) return; // an inset label scrolls to its inset
    if (sectionFor(id)) { e.preventDefault(); openPlace(id, a); }
  });
  window.addEventListener('hashchange', function () {
    var id = location.hash.slice(1);
    if (id && id !== current && sectionFor(id)) openPlace(id, null);
  });

  /* ------------------------------------------------------------------ the time filter */
  var ts = $('[data-ts]');
  var input = ts ? $('[data-ts-in]', ts) : null;
  var MIN = input ? +input.min : 2016; var MAX = input ? +input.max : 2026;
  var marks = $$('.pm[data-ys]');
  var tracks = $$('.amap__sea');
  var mode = 'to'; var year = MAX;
  function countPlaces() {
    var seen = {};
    $$('.pm[data-place]').forEach(function (m) { if (!m.classList.contains('is-out')) seen[m.getAttribute('data-p')] = 1; });
    return Object.keys(seen).length;
  }
  function apply(m, y, push) {
    mode = m; year = Math.max(MIN, Math.min(MAX, y));
    var all = mode === 'to' && year === MAX;
    marks.forEach(function (k) {
      var ys = k.getAttribute('data-ys').split(' ').map(Number);
      var out = mode === 'to' ? +k.getAttribute('data-first') > year : ys.indexOf(year) < 0;
      k.classList.toggle('is-out', out);
      if (out && k.classList.contains('is-sel') && ps.open) { /* a selected place stays selected in its sheet */ }
    });
    tracks.forEach(function (t) {
      var mk = $('.pm[data-p="' + t.getAttribute('data-sea').toLowerCase().replace('·', '-') + '"]');
      t.classList.toggle('is-out', Boolean(mk && mk.classList.contains('is-out')));
    });
    var n = countPlaces();
    if (ts) {
      $('[data-ts-label]', ts).textContent = mode === 'to' ? 'Places to ' + year : 'Places in Vol. ' + year;
      $('[data-ts-n]', ts).textContent = String(n);
      $('[data-ts-all]', ts).hidden = all;
      if (input) { input.value = String(year); input.setAttribute('aria-valuetext', (mode === 'to' ? 'To ' : 'In Vol. ') + year + ': ' + n + ' places'); }
      $$('.ts__c', ts).forEach(function (c) {
        var cy = +c.getAttribute('data-y');
        c.classList.toggle('is-after', mode === 'to' ? cy > year : cy !== year);
        c.classList.toggle('is-cur', cy === year);
      });
    }
    if (push !== false) {
      var q = all ? '' : '?' + mode + '=' + year;
      try { history.replaceState(null, '', location.pathname + q + location.hash); } catch (err) { /* address stays */ }
    }
  }
  if (input) {
    input.addEventListener('input', function () { apply('to', +input.value); });
  }
  if (ts) $('[data-ts-all]', ts).addEventListener('click', function (e) { e.preventDefault(); apply('to', MAX); });
  (function fromUrl() {
    var q = new URLSearchParams(location.search);
    var to = parseInt(q.get('to'), 10); var vol = parseInt(q.get('vol'), 10);
    if (vol >= MIN && vol <= MAX) apply('vol', vol, false);
    else if (to >= MIN && to < MAX) apply('to', to, false);
  }());
  var sheetII = $('[data-sheet="ii"]');
  function showSheet() {
    if (!sheetII) return;
    var r = sheetII.getBoundingClientRect();
    if (r.bottom < 120 || r.top > innerHeight * 0.5) sheetII.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  // On this page the ruler is a filter: a tap (>= 700) or a year-picker cell sets ?to=YYYY instead of opening the volume.
  var scrubEnd = 0;
  if (yr) {
    yr.addEventListener('click', function (e) {
      var s = e.target.closest('.yr__seg');
      if (!s || s.getAttribute('data-y') === 'pro') return;
      if (mqPhone.matches && Date.now() - scrubEnd > 400) return; // phones: the tap opens the year picker (core)
      e.preventDefault(); e.stopImmediatePropagation();
      if (Date.now() - scrubEnd < 400) return;
      apply('to', +s.getAttribute('data-y')); showSheet();
    }, true);
    // A1 on the Atlas: while the loupe is up, crosses appear and retire with the year under the finger;
    // the release keeps the filter instead of opening the volume.
    var loupe = $('[data-loupe]');
    var yearAt = function (x) {
      var segs = $$('.yr__seg', yr);
      for (var i = 0; i < segs.length; i++) { var r = segs[i].getBoundingClientRect(); if (x >= r.left && x <= r.right) return segs[i].getAttribute('data-y'); }
      return null;
    };
    yr.addEventListener('pointermove', function (e) {
      if (!loupe || !loupe.classList.contains('is-on')) return;
      var y = yearAt(e.clientX); if (y && y !== 'pro') apply('to', +y, false);
    });
    yr.addEventListener('pointerup', function (e) {
      if (!loupe || !loupe.classList.contains('is-on')) return;
      e.stopImmediatePropagation();
      loupe.classList.remove('is-on');
      scrubEnd = Date.now();
      var y = yearAt(e.clientX);
      if (y && y !== 'pro') apply('to', +y); else apply(mode, year);
      showSheet();
    }, true);
  }
  var yp = doc.getElementById('yp');
  if (yp) idle(function () {
    var cap = doc.createElement('p');
    cap.className = 'lab ypick__note';
    cap.textContent = 'On the atlas, a year shows the places up to that year.';
    var grid = $('.ypick', yp); if (grid) grid.parentNode.insertBefore(cap, grid);
    yp.addEventListener('click', function (e) {
      var a = e.target.closest('.ypick a');
      if (!a || a.classList.contains('pro')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var y = parseInt($('b', a).textContent, 10);
      $('[data-close]', yp).click();
      apply('to', y); setTimeout(showSheet, reduce ? 0 : 240);
    }, true);
  });

  /* ------------------------------------------------------------------ pan chips (Sheet II on phones) */
  var bar = $('[data-panbar]');
  var vp = $('.amap--ii [data-pan]');
  if (bar && vp) {
    var snaps = $$('.amap__snap', vp);
    var btns = $$('button', bar);
    var targetX = function (i) { return snaps[i].offsetLeft; };
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { vp.scrollTo({ left: targetX(i), behavior: reduce ? 'auto' : 'smooth' }); });
    });
    vp.addEventListener('scroll', function () {
      var x = vp.scrollLeft; var k = 0;
      snaps.forEach(function (s, i) { if (x + 40 >= targetX(i)) k = i; });
      if (vp.scrollLeft + vp.clientWidth >= vp.scrollWidth - 4) k = snaps.length - 1;
      btns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === k)); });
    }, { passive: true });
    // open on the region of the newest place, or of the newest place of ?vol=YYYY
    var pv = {}; try { pv = JSON.parse(bar.getAttribute('data-pan-vol') || '{}'); } catch (err) { pv = {}; }
    var def = pv[new URLSearchParams(location.search).get('vol')];
    if (def == null) def = +bar.getAttribute('data-pan-default') || 0;
    if (mqPhone.matches && def && snaps[def]) requestAnimationFrame(function () { vp.scrollLeft = targetX(def); });
  }

  /* ------------------------------------------------------------------ order of the list */
  var sorters = $$('[data-sort]');
  var sortLab = $('[data-sortlab]');
  idle(function () { sorters.forEach(function (b) {
    b.addEventListener('click', function () {
      var by = b.getAttribute('data-sort');
      sorters.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      if (sortLab) sortLab.textContent = by === 'n' ? 'Most events first' : 'A–Z';
      $$('.agrp__l').forEach(function (l) {
        var items = $$(':scope > .place', l);
        items.sort(function (p, q) {
          if (by === 'n') { var d = +q.getAttribute('data-events') - +p.getAttribute('data-events'); if (d) return d; }
          return $('.c', p).firstChild.textContent.localeCompare($('.c', q).firstChild.textContent);
        });
        items.forEach(function (p) { l.appendChild(p); });
      });
    });
  }); });

  /* ------------------------------------------------------------------ arrival by address */
  var start = location.hash.slice(1);
  if (start && sectionFor(start)) setTimeout(function () { openPlace(start, null); }, reduce ? 0 : 450);
}());
