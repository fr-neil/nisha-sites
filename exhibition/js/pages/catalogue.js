/* C · Exhibition — 02.01 Catalogue (PHASE-50 §3.2, §4.4; motion M3, M4, M6, M7, M8, M10).
   Search as you type, facets with live counts (AND across facets, OR within one; zero values disabled),
   a bottom filter sheet on phone, a side sheet at 768, an always-open column at 1200+, sort, year jump,
   FLIP filter transitions, URL state, permanent addresses (?code=NS-050#ns-050) and "Back to catalogue"
   restore from sessionStorage. Without this file every row is listed and readable. */
(function () {
  'use strict';
  var d = document;
  var root = d.documentElement;
  var list = d.querySelector('[data-cat-list]');
  var form = d.getElementById('flt');
  if (!list || !form) return;
  var NS = window.NS || {};
  var reduce = !!NS.reduce || !root.classList.contains('motion');
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () {} }; };
  var desk = mq('(min-width: 1200px)');
  var FACETS = ['year', 'format', 'place', 'ind'];
  var KEY = { year: 'y', format: 'f', place: 'p', ind: 'i' };
  var STORE = 'ns-catalogue';
  var cat = d.getElementById('catalogue');
  var ctl = d.querySelector('[data-cat-ctl]');
  var q = d.getElementById('cat-q');
  var qx = d.querySelector('[data-qx]');
  var sheet = d.querySelector('[data-fsheet]');
  var panel = sheet && sheet.querySelector('[data-fpanel]');
  var empty = d.querySelector('[data-empty]');
  var shown = d.querySelector('[data-shown]');
  var shownSr = d.querySelector('[data-shown-sr]');
  var ring = d.querySelector('.cat__n');
  var yj = $$('[data-yj]');
  var yjNav = d.querySelector('.cat__yj');

  /* ---------- rows ---------- */
  var rows = $$('.crow', list).map(function (li, k) {
    var ds = li.dataset;
    return { el: li, k: k, y: ds.y, f: ds.f, p: (ds.p || '').split(' '), i: ds.i, d: ds.d === '1', v: ds.v === '1', yo: ds.yo === '1', c: ds.c || '~', q: ds.q || '' };
  });
  var yearGroups = {};
  var yearOrder = $$('.cg', list).map(function (g) { yearGroups[g.dataset.g] = g; return g.dataset.g; });
  var letterGroups = {};

  /* ---------- state ---------- */
  function readForm() {
    var s = { q: (q.value || '').trim().toLowerCase(), sort: 'new', doc: false, voice: false };
    FACETS.forEach(function (f) { s[f] = $$('input[name="' + f + '"]:checked', form).map(function (i) { return i.value; }); });
    var srt = form.querySelector('input[name="sort"]:checked');
    s.sort = srt ? srt.value : 'new';
    s.doc = !!form.querySelector('input[name="doc"]:checked');
    s.voice = !!form.querySelector('input[name="voice"]:checked');
    return s;
  }
  function writeForm(p) {
    FACETS.forEach(function (f) {
      var vals = [];
      p.getAll(f).forEach(function (v) { vals = vals.concat(v.split(',')); });
      $$('input[name="' + f + '"]', form).forEach(function (i) { i.checked = vals.indexOf(i.value) > -1; });
    });
    ['doc', 'voice'].forEach(function (k) { var i = form.querySelector('input[name="' + k + '"]'); if (i) i.checked = p.get(k) === '1'; });
    var srt = form.querySelector('input[name="sort"][value="' + (p.get('sort') || 'new') + '"]');
    if (srt) srt.checked = true;
    q.value = p.get('q') || '';
  }
  function clearForm(keepSort) {
    $$('input[type="checkbox"]', form).forEach(function (i) { i.checked = false; });
    if (!keepSort) { var n = form.querySelector('input[name="sort"][value="new"]'); if (n) n.checked = true; }
    q.value = '';
  }
  function toQuery(s) {
    var p = [];
    FACETS.forEach(function (f) { if (s[f].length) p.push(f + '=' + s[f].map(encodeURIComponent).join(',')); });
    if (s.doc) p.push('doc=1');
    if (s.voice) p.push('voice=1');
    if (s.q) p.push('q=' + encodeURIComponent(s.q));
    if (s.sort !== 'new') p.push('sort=' + s.sort);
    return p.join('&');
  }
  var active = function (s) { return !!(s.q || s.doc || s.voice || FACETS.some(function (f) { return s[f].length; })); };

  function matches(r, s, skip) {
    if (s.q) { var terms = s.q.split(/\s+/); for (var t = 0; t < terms.length; t++) if (r.q.indexOf(terms[t]) < 0) return false; }
    for (var j = 0; j < FACETS.length; j++) {
      var f = FACETS[j];
      if (f === skip || !s[f].length) continue;
      var val = r[KEY[f]];
      var hit = Array.isArray(val) ? s[f].some(function (v) { return val.indexOf(v) > -1; }) : s[f].indexOf(val) > -1;
      if (!hit) return false;
    }
    if (skip !== 'doc' && s.doc && !r.d) return false;
    if (skip !== 'voice' && s.voice && !r.v) return false;
    return true;
  }

  /* ---------- live counts on every value; zero values disabled ---------- */
  function counts(s) {
    FACETS.forEach(function (f) {
      var base = rows.filter(function (r) { return matches(r, s, f); });
      $$('input[name="' + f + '"]', form).forEach(function (i) {
        var v = i.value;
        var n = base.filter(function (r) { var val = r[KEY[f]]; return Array.isArray(val) ? val.indexOf(v) > -1 : val === v; }).length;
        setCount(i, n);
      });
    });
    ['doc', 'voice'].forEach(function (k) {
      var i = form.querySelector('input[name="' + k + '"]');
      if (i) setCount(i, rows.filter(function (r) { return matches(r, s, k) && (k === 'doc' ? r.d : r.v); }).length);
    });
    var n = rows.filter(function (r) { return matches(r, s); }).length;
    $$('[data-fshow-n]', sheet).forEach(function (b) { tick(b, n, 300); });
    return n;
  }
  function setCount(input, n) {
    var lab = input.closest('.fv');
    var ct = lab && lab.querySelector('[data-ct]');
    if (ct) ct.textContent = String(n);
    input.disabled = n === 0 && !input.checked;
    if (lab) lab.classList.toggle('is-off', input.disabled);
  }

  /* ---------- M3 count tick ---------- */
  function tick(el, to, dur) {
    var from = parseInt(el.textContent, 10) || 0;
    if (reduce || from === to) { el.textContent = String(to); return; }
    var t0 = null;
    if (el.__raf) window.cancelAnimationFrame(el.__raf);
    var step = function (t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      el.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) el.__raf = window.requestAnimationFrame(step);
    };
    el.__raf = window.requestAnimationFrame(step);
  }

  /* ---------- grouping and order ---------- */
  function letterOf(r) { return r.c === '~' ? '~' : r.c.charAt(0).toUpperCase(); }
  function letterGroup(key) {
    if (letterGroups[key]) return letterGroups[key];
    var sec = d.createElement('section');
    sec.className = 'cg cg--l';
    sec.setAttribute('data-g', 'l-' + key);
    var h = d.createElement('h3');
    h.className = 'cg__h';
    h.innerHTML = key === '~'
      ? '<span class="cg__y cg__y--u">Client not named or withheld</span><span class="cg__n"><span data-gn></span> entries</span>'
      : '<span class="cg__y">' + key + '</span><span class="cg__n"><span data-gn></span> entries</span>';
    var ol = d.createElement('ol');
    ol.className = 'cg__rows';
    sec.appendChild(h); sec.appendChild(ol);
    letterGroups[key] = sec;
    return sec;
  }
  function plan(sort) {
    var out = [];
    if (sort === 'az') {
      var by = {};
      rows.forEach(function (r) { var k = letterOf(r); (by[k] = by[k] || []).push(r); });
      Object.keys(by).sort(function (a, b) { return a === '~' ? 1 : b === '~' ? -1 : a < b ? -1 : 1; }).forEach(function (k) {
        var rs = by[k].slice().sort(function (a, b) { return a.c === b.c ? a.k - b.k : a.c < b.c ? -1 : 1; });
        out.push([letterGroup(k), rs]);
      });
      return out;
    }
    var ys = yearOrder.slice();
    if (sort === 'old') ys = ys.filter(function (y) { return y !== 'u'; }).reverse().concat(ys.indexOf('u') > -1 ? ['u'] : []);
    ys.forEach(function (y) {
      var rs = rows.filter(function (r) { return r.y === y; });
      if (sort === 'old') rs = rs.filter(function (r) { return !r.yo; }).reverse().concat(rs.filter(function (r) { return r.yo; }));
      out.push([yearGroups[y], rs]);
    });
    return out;
  }
  var lastSort = 'new';
  function place(s, vis) {
    if (s.sort !== lastSort) {
      var p = plan(s.sort);
      var used = p.map(function (x) { return x[0]; });
      p.forEach(function (x) {
        var ol = x[0].querySelector('.cg__rows');
        x[1].forEach(function (r) { ol.appendChild(r.el); });
        list.appendChild(x[0]);
      });
      $$('.cg', list).forEach(function (g) { if (used.indexOf(g) < 0) g.hidden = true; });
      lastSort = s.sort;
    }
    var n = 0;
    rows.forEach(function (r) { var on = vis.has(r); r.el.hidden = !on; if (on) n++; });
    $$('.cg', list).forEach(function (g) {
      var inMode = s.sort === 'az' ? /^l-/.test(g.dataset.g) : !/^l-/.test(g.dataset.g);
      var c = inMode ? $$('.crow:not([hidden])', g).length : 0;
      g.hidden = c === 0;
      var gn = g.querySelector('[data-gn]');
      if (gn) { gn.textContent = String(c); var w = gn.nextSibling; if (w && w.nodeType === 3) w.textContent = c === 1 ? ' entry' : ' entries'; }
    });
    if (yjNav) yjNav.hidden = s.sort === 'az';
    yj.forEach(function (a) {
      var g = yearGroups[a.getAttribute('data-yj')];
      var off = !g || g.hidden;
      a.classList.toggle('is-off', off);
      if (off) a.setAttribute('aria-disabled', 'true'); else a.removeAttribute('aria-disabled');
    });
    if (empty) empty.hidden = n > 0;
    return n;
  }

  /* ---------- M6 FLIP ---------- */
  var pending = 0;
  function flip(vis, change) {
    var vh = window.innerHeight, lo = -vh, hi = 2 * vh;
    var top = cat.getBoundingClientRect().top;
    if (reduce || !list.animate || top < -vh * 0.5) { change(); return; }
    var before = new Map();
    rows.forEach(function (r) {
      if (r.el.hidden) return;
      var b = r.el.getBoundingClientRect();
      if (b.bottom > lo && b.top < hi) before.set(r, b.top);
    });
    var leaving = [];
    before.forEach(function (t, r) { if (!vis.has(r)) leaving.push(r); });
    var go = function () {
      change();
      rows.forEach(function (r) {
        if (r.el.hidden) return;
        var a = r.el.getBoundingClientRect();
        if (a.bottom < lo || a.top > hi) return;
        if (before.has(r)) {
          var dy = before.get(r) - a.top;
          if (Math.abs(dy) > 1) r.el.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
        } else {
          r.el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'backwards' });
        }
      });
    };
    window.clearTimeout(pending);
    if (!leaving.length) { go(); return; }
    var anims = leaving.map(function (r) { return r.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' }); });
    pending = window.setTimeout(function () { anims.forEach(function (a) { a.cancel(); }); go(); }, 160);
  }

  /* ---------- apply ---------- */
  var reqLinks = $$('.dock__req, .bar__req, [data-cta-req]');
  reqLinks.forEach(function (a) { a.__base = a.getAttribute('href').split('?')[0]; });
  function apply(animate, s) {
    s = s || readForm();
    var vis = new Set(rows.filter(function (r) { return matches(r, s); }));
    var n = vis.size;
    var run = function () { place(s, vis); };
    if (animate) flip(vis, run); else run();
    counts(s);
    if (shown) tick(shown, n, 400);
    if (shownSr) shownSr.textContent = String(n);
    if (ring && animate && !reduce) { ring.classList.remove('is-settle'); void ring.offsetWidth; ring.classList.add('is-settle'); }
    $$('[data-fclear]').forEach(function (b) { if (b.closest('.cat__res')) b.hidden = !active(s); });
    chips(s);
    if (qx) qx.hidden = !q.value;
    var qs = toQuery(s);
    try { window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + (/^#ns-/.test(window.location.hash) ? '' : window.location.hash)); } catch (e) { /* file:// or sandboxed: the form still holds the state */ }
    try { window.sessionStorage.setItem(STORE, qs); } catch (e) { /* storage off: the URL is the fallback */ }
    reqLinks.forEach(function (a) { a.setAttribute('href', a.__base + (s.format.length === 1 ? '?format=' + s.format[0] : '')); });
  }

  /* ---------- chips ---------- */
  function labelOf(name, v) {
    var i = form.querySelector('input[name="' + name + '"][value="' + v + '"]');
    var en = i && i.closest('.fv') && i.closest('.fv').querySelector('.fv__en');
    return en ? en.textContent.replace(/^[●▶]\s*/, '') : v;
  }
  function chips(s) {
    FACETS.concat(['sort']).forEach(function (f) {
      var g = d.querySelector('[data-chip="' + f + '"]');
      if (!g) return;
      var vals = f === 'sort' ? (s.sort === 'new' ? [] : [s.sort]) : s[f];
      var v = g.querySelector('[data-cv]');
      var x = g.querySelector('[data-fx]');
      v.textContent = vals.length === 1 ? ': ' + labelOf(f, vals[0]) : vals.length ? ': ' + vals.length : '';
      g.classList.toggle('is-on', vals.length > 0);
      if (x) x.hidden = !vals.length;
      var fv = form.querySelector('[data-fct="' + f + '"] [data-fv]');
      if (fv) fv.textContent = vals.length === 1 ? labelOf(f, vals[0]) : vals.length ? String(vals.length) : '';
    });
    $$('[data-ftog]').forEach(function (b) { b.setAttribute('aria-pressed', s[b.getAttribute('data-ftog')] ? 'true' : 'false'); });
  }

  /* ---------- facet accordions (phone and 768) ---------- */
  function setFacet(sec, open) {
    sec.classList.toggle('is-open', open);
    var b = sec.querySelector('.fct__b');
    if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  $$('.fct', form).forEach(function (sec) {
    setFacet(sec, sec.querySelector('.fct__b').getAttribute('aria-expanded') === 'true');
    sec.querySelector('.fct__b').addEventListener('click', function () { if (!desk.matches) setFacet(sec, !sec.classList.contains('is-open')); });
  });

  /* ---------- M7 filter sheet ---------- */
  var isOpen = false, lastFocus = null, closeTimer = 0;
  function mode() {
    if (!sheet) return;
    if (desk.matches) {
      if (isOpen) { isOpen = false; root.style.overflow = ''; sheet.classList.remove('is-open'); }
      sheet.hidden = false;
      sheet.removeAttribute('role'); sheet.removeAttribute('aria-modal');
      $$('.fct', form).forEach(function (sec) { setFacet(sec, true); });
    } else {
      sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
      if (!isOpen) sheet.hidden = true;
    }
  }
  function openSheet(name, from) {
    if (!sheet || desk.matches) return;
    window.clearTimeout(closeTimer);
    lastFocus = from || d.activeElement;
    $$('.fct', form).forEach(function (sec) { setFacet(sec, sec.getAttribute('data-fct') === name); });
    sheet.classList.remove('is-closing');
    if (panel) panel.style.transform = '';
    sheet.hidden = false;
    void sheet.offsetWidth;
    sheet.classList.add('is-open');
    isOpen = true;
    root.style.overflow = 'hidden';
    if (NS.inertOutside) NS.inertOutside(sheet, true);
    counts(readForm());
    var target = form.querySelector('[data-fct="' + name + '"] .fct__b');
    if (target) target.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (!isOpen) return;
    isOpen = false;
    sheet.classList.add('is-closing');
    sheet.classList.remove('is-open');
    root.style.overflow = '';
    if (NS.inertOutside) NS.inertOutside(sheet, false);
    closeTimer = window.setTimeout(function () { sheet.hidden = true; sheet.classList.remove('is-closing'); if (panel) panel.style.transform = ''; }, reduce ? 0 : 230);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    apply(true);
  }
  $$('[data-fopen]').forEach(function (b) { b.addEventListener('click', function () { openSheet(b.getAttribute('data-fopen'), b); }); });
  if (sheet) {
    $$('[data-fclose], [data-fshow]', sheet).forEach(function (b) { b.addEventListener('click', closeSheet); });
    d.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
      if (e.key !== 'Tab') return;
      var f = $$('button:not([disabled]), input:not([disabled])', panel).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    /* drag the grip or the title row: follows the finger; past 30 % or a fast flick closes */
    var grab = sheet.querySelectorAll('[data-fgrip], .fsh__top');
    var y0 = 0, t0 = 0, dy = 0, drag = false;
    Array.prototype.forEach.call(grab, function (g) {
      g.addEventListener('touchstart', function (e) {
        if (desk.matches || e.touches.length !== 1 || window.innerWidth >= 768) return;
        drag = true; y0 = e.touches[0].clientY; t0 = Date.now(); dy = 0; panel.style.transition = 'none';
      }, { passive: true });
    });
    sheet.addEventListener('touchmove', function (e) {
      if (!drag) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      panel.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    sheet.addEventListener('touchend', function () {
      if (!drag) return;
      drag = false;
      panel.style.transition = '';
      var v = dy / Math.max(1, Date.now() - t0);
      if (dy > panel.offsetHeight * 0.3 || v > 0.8) closeSheet(); else panel.style.transform = '';
    });
  }
  if (desk.addEventListener) desk.addEventListener('change', mode);

  /* ---------- inputs ---------- */
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('change', function () {
    if (desk.matches || !isOpen) apply(true);
    else { var s = readForm(); counts(s); chips(s); }
  });
  $$('[data-fclear]').forEach(function (b) {
    b.addEventListener('click', function () {
      clearForm(true);
      if (isOpen) { var s = readForm(); counts(s); chips(s); } else apply(true);
    });
  });
  $$('[data-fx]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-fx');
      if (f === 'sort') { var n = form.querySelector('input[name="sort"][value="new"]'); if (n) n.checked = true; }
      else $$('input[name="' + f + '"]', form).forEach(function (i) { i.checked = false; });
      apply(true);
      var open = b.parentNode.querySelector('[data-fopen]');
      if (open) open.focus();
    });
  });
  $$('[data-ftog]').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = form.querySelector('input[name="' + b.getAttribute('data-ftog') + '"]');
      if (!i) return;
      i.checked = !i.checked;
      apply(true);
    });
  });
  var qt = 0;
  q.addEventListener('input', function () { window.clearTimeout(qt); qt = window.setTimeout(function () { apply(true); }, 120); });
  q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); q.blur(); } });
  if (qx) qx.addEventListener('click', function () { q.value = ''; apply(true); q.focus(); });

  /* ---------- sticky offsets, year jump and the bar's year (M8) ---------- */
  function measure() {
    var h = ctl && getComputedStyle(ctl).position === 'sticky' ? ctl.offsetHeight : 0;
    cat.style.setProperty('--ctl-h', h + 'px');
  }
  function offsetTop() {
    var bar = d.querySelector('[data-bar]');
    var head = d.querySelector('.cat__head');
    var hh = head && getComputedStyle(head).display !== 'none' ? head.offsetHeight : 0;
    var band = d.querySelector('.cg__h'); // the sticky year band sits over the row too
    var bh = band && getComputedStyle(band).position === 'sticky' ? band.offsetHeight : 0;
    return (bar ? bar.offsetHeight : 48) + (parseFloat(cat.style.getPropertyValue('--ctl-h')) || 0) + hh + bh + 8;
  }
  function scrollToEl(el, smooth) {
    var y = el.getBoundingClientRect().top + window.scrollY - offsetTop();
    window.scrollTo({ top: Math.max(0, y), behavior: smooth && !reduce ? 'smooth' : 'auto' });
  }
  yj.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (a.classList.contains('is-off')) return;
      var g = yearGroups[a.getAttribute('data-yj')];
      if (g) scrollToEl(g, true);
    });
  });
  var cur = null, ticking = false;
  function onScroll() {
    ticking = false;
    var line = offsetTop() + 4;
    var found = null;
    yearOrder.forEach(function (y) { var g = yearGroups[y]; if (!g.hidden && g.getBoundingClientRect().top <= line) found = y; });
    if (found === cur) return;
    cur = found;
    yj.forEach(function (a) {
      var on = a.getAttribute('data-yj') === found;
      a.classList.toggle('is-cur', on);
      if (on) { a.setAttribute('aria-current', 'location'); var ol = a.closest('ol'); if (ol && ol.scrollWidth > ol.clientWidth) ol.scrollTo({ left: a.offsetLeft - 24, behavior: reduce ? 'auto' : 'smooth' }); }
      else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', measure, { passive: true });

  /* ---------- phone: scrolling down the list compacts the sticky stack (chips and dock step aside); scrolling up restores ---------- */
  var phoneMq = window.matchMedia('(max-width: 767.98px)');
  var lastY = window.scrollY, compact = false, cTick = false;
  function setCompact(on) {
    if (on === compact) return;
    compact = on;
    if (ctl) ctl.classList.toggle('is-compact', on);
    if (NS.dock) NS.dock.hide(on);
    measure();
  }
  function onCompact() {
    cTick = false;
    var y = window.scrollY, dy = y - lastY;
    if (Math.abs(dy) < 8) return;
    lastY = y;
    var inList = list.getBoundingClientRect().top < window.innerHeight * 0.3 && list.getBoundingClientRect().bottom > window.innerHeight;
    if (!phoneMq.matches || isOpen || !inList || (ctl && ctl.contains(d.activeElement))) { setCompact(false); return; }
    setCompact(dy > 0);
  }
  window.addEventListener('scroll', function () { if (!cTick) { cTick = true; window.requestAnimationFrame(onCompact); } }, { passive: true });

  /* ---------- M10 table rows reveal in a 20 ms stagger ---------- */
  list.addEventListener('toggle', function (e) {
    var det = e.target;
    if (!det.open || det.__k) return;
    det.__k = true;
    $$('.crow__dl > *', det).forEach(function (el, i) { el.style.setProperty('--k', String(Math.floor(i / 2))); });
  }, true);

  /* ---------- permanent addresses: clear filters, scroll, open ---------- */
  function openRow(id) {
    var li = d.getElementById(id);
    if (!li || !li.classList.contains('crow')) return;
    if (li.hidden) { clearForm(false); apply(false); }
    var det = li.querySelector('details');
    if (det) det.open = true;
    li.classList.add('is-target');
    window.requestAnimationFrame(function () {
      scrollToEl(li, false);
      var s = li.querySelector('.crow__s');
      if (s) s.focus({ preventScroll: true });
    });
  }
  window.addEventListener('hashchange', function () {
    var m = /^#(ns-\d{3})$/i.exec(window.location.hash);
    if (m) openRow(m[1].toLowerCase());
  });

  /* "Search the catalogue" (phone title plate): jump to the list and focus the field */
  $$('[data-goto-search]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); scrollToEl(cat, !reduce); window.setTimeout(function () { q.focus({ preventScroll: true }); }, reduce ? 0 : 350); }); });

  /* ---------- init ---------- */
  var params = new URLSearchParams(window.location.search);
  var codeParam = params.get('code');
  var hashCode = /^#(ns-\d{3})$/i.exec(window.location.hash);
  var target = codeParam ? codeParam.toLowerCase() : hashCode ? hashCode[1].toLowerCase() : null;
  if (target) clearForm(false);
  else if (/(^|&)(year|format|place|ind|doc|voice|q|sort)=/.test(window.location.search.slice(1))) writeForm(params);
  else if (window.location.hash === '#catalogue') {
    try { var st = window.sessionStorage.getItem(STORE); if (st) writeForm(new URLSearchParams(st)); } catch (e) { /* no storage: start clear */ }
  }
  mode();
  measure();
  $$('[data-rows]', list).forEach(function (el) { if (target) el.classList.add('is-in'); });
  apply(false);
  onScroll();
  if (target) openRow(target);
  else if (window.location.hash === '#catalogue' && window.location.search) window.requestAnimationFrame(function () { scrollToEl(cat, false); });
})();
