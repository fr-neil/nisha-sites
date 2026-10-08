/* Field Note · Request availability: 01 Enter → 02 Check → 03 Send (PHASE-51 §9.9, motion A13).
   Nothing is stored and nothing is sent by this site: the visitor copies the prepared message and sends it on
   Instagram. The route (form[data-route], from site.config.json) changes only step 03's action:
     instagram  copy + ig.me link (launch)   email  a mailto link to the endpoint   form  POST to the endpoint
   Visitor input is only ever written with textContent. Without this file the page shows "What to include". */
(function () {
  'use strict';
  var d = document;
  var form = d.getElementById('rq');
  if (!form) return;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var json = function (id, dflt) { try { return JSON.parse(($('#' + id) || {}).textContent || ''); } catch (e) { return dflt; } };
  var REFS = json('rq-refs', {});
  var PLACES = json('rq-places', []);
  var RULER = json('rq-ruler', { years: [2025, 2026, 2027], mon: [] });
  var MON = RULER.mon.length ? RULER.mon : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var route = form.getAttribute('data-route') || 'instagram';
  var endpoint = (form.getAttribute('data-endpoint') || '').trim();
  var STEPS = ['enter', 'check', 'send'];
  var step = 'enter';
  var TITLE = 'Request availability — Nisha Shetty';

  /* ---------- one set of labels, one order: Enter = Check = the message ---------- */
  var FIELDS = [
    { name: 'when', label: 'When', hi: 'कब', msg: 'When' },
    { name: 'where', label: 'Where', hi: 'कहाँ', msg: 'Where' },
    { name: 'format', label: 'Format', hi: 'प्रारूप', msg: 'Format' },
    { name: 'setting', label: 'In person or virtual', hi: 'प्रत्यक्ष या वर्चुअल', msg: 'In person or virtual' },
    { name: 'language', label: 'Hosting language', hi: 'होस्टिंग की भाषा', msg: 'Language' },
    { name: 'audience', label: 'Audience size', hi: 'दर्शकों की संख्या', msg: 'Audience size' },
    { name: 'as', label: 'Enquiring as', hi: 'आप किसकी ओर से पूछ रहे हैं', msg: 'Enquiring as' },
    { name: 'org', label: 'Organisation', hi: 'संस्था', msg: 'Organisation' },
    { name: 'name', label: 'Your name', hi: 'आपका नाम', msg: 'Name' },
    { name: 'contact', label: 'Reply to', hi: 'जवाब कहाँ दें', msg: 'Reply to' },
    { name: 'ref', label: 'Reference', hi: 'संदर्भ', msg: 'Reference' },
    { name: 'notes', label: 'Anything else', hi: 'और कुछ', msg: 'Notes' }
  ];

  function raw(name) {
    if (name === 'ref') return refText;
    var el = form.elements[name];
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked ? el.value : '';
    return String(el.value || '').trim();
  }
  function shown(name) {
    var v = raw(name);
    if (!v) return '';
    if (name === 'when' && raw('flexible')) return v + ' (dates are flexible)';
    return v;
  }

  /* ---------- reading a month out of what was typed: "Nov 2026", "14 November 2026", "2026-11", "14/11/2026" ---------- */
  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function readMonth(s) {
    s = String(s || '').toLowerCase();
    var y = s.match(/\b(20\d\d)\b/);
    if (!y) return null;
    var year = +y[1];
    var m = null;
    var name = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/);
    if (name) m = MONTHS.indexOf(name[1].slice(0, 3)) + 1;
    if (!m) { var iso = s.match(/\b20\d\d-(\d{1,2})\b/); if (iso) m = +iso[1]; }
    if (!m) { var dmy = s.match(/\b\d{1,2}[\/.](\d{1,2})[\/.]20\d\d\b/); if (dmy) m = +dmy[1]; }
    if (!m) { var my = s.match(/\b(\d{1,2})[\/.]20\d\d\b/); if (my) m = +my[1]; }
    if (!m || m < 1 || m > 12) return { y: year, m: null };
    return { y: year, m: m };
  }

  /* ---------- validation: messages only after the first attempt ---------- */
  function checkContact(v) {
    if (!v) return 'Add a phone or WhatsApp number, or an email address, for the reply.';
    var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    var digits = v.replace(/[^\d]/g, '');
    var isPhone = /^[+\d\s().-]+$/.test(v) && digits.length >= 8 && digits.length <= 15;
    return isEmail || isPhone ? '' : 'This does not look like a phone number or an email address.';
  }
  function checkWhen(v) {
    if (!v) return 'Add a month or a date. If it can move, tick Dates are flexible.';
    var r = readMonth(v);
    var now = new Date();
    if (r && r.m && (r.y < now.getFullYear() || (r.y === now.getFullYear() && r.m < now.getMonth() + 1))) return 'That month has already passed. Check the year.';
    if (r && !r.m && r.y < now.getFullYear()) return 'That year has already passed. Check the year.';
    return '';
  }
  var RULES = [
    { name: 'when', target: 'f-when', check: checkWhen },
    { name: 'where', target: 'f-where', check: function (v) { return v ? '' : 'Add the city, and the country if it is outside India.'; } },
    { name: 'format', target: 'f-format', check: function (v) { return v ? '' : 'Choose a format, or Not sure yet.'; } },
    { name: 'as', target: 'f-as', check: function (v) { return v ? '' : 'Choose who is enquiring.'; } },
    { name: 'name', target: 'f-name', check: function (v) { return v ? '' : 'Add your name.'; } },
    { name: 'contact', target: 'f-contact', check: checkContact }
  ];
  var errBox = $('[data-errors]', form);
  var errTitle = $('[data-errors-title]', form);
  var errList = $('[data-errors-list]', form);
  var attempted = false;

  function showFieldError(rule, msg) {
    var el = $('[data-err-for="' + rule.name + '"]', form);
    var t = d.getElementById(rule.target);
    if (el) { el.textContent = msg; el.hidden = !msg; }
    if (!t) return;
    if (t.tagName === 'FIELDSET') { if (msg) t.setAttribute('data-invalid', ''); else t.removeAttribute('data-invalid'); }
    else t.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function renderSummary(failed) {
    while (errList.firstChild) errList.removeChild(errList.firstChild);
    if (!failed.length) { errBox.hidden = true; return; }
    errTitle.textContent = failed.length === 1 ? 'One thing to check' : failed.length + ' things to check';
    failed.forEach(function (f) {
      var li = d.createElement('li');
      var a = d.createElement('a');
      a.href = '#' + f.rule.target;
      a.textContent = f.msg;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var t = d.getElementById(f.rule.target);
        var fo = t && t.tagName === 'FIELDSET' ? (t.querySelector('input:checked') || t.querySelector('input')) : t;
        if (fo) { fo.focus({ preventScroll: true }); t.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); }
      });
      li.appendChild(a);
      errList.appendChild(li);
    });
    var wasHidden = errBox.hidden;
    errBox.hidden = false;
    if (wasHidden && !reduce) { errBox.classList.remove('is-new'); void errBox.offsetWidth; errBox.classList.add('is-new'); }
  }
  function validate() {
    var failed = [];
    RULES.forEach(function (r) { var m = r.check(raw(r.name)); showFieldError(r, m); if (m) failed.push({ rule: r, msg: m }); });
    renderSummary(failed);
    return failed;
  }
  function revalidate(e) {
    if (!attempted || !e.target.name) return;
    RULES.forEach(function (r) { if (r.name === e.target.name) showFieldError(r, r.check(raw(r.name))); });
    var left = RULES.filter(function (r) { return r.check(raw(r.name)); });
    if (!left.length) errBox.hidden = true;
  }
  form.addEventListener('input', revalidate);
  form.addEventListener('change', revalidate);

  /* ---------- Anything else: live count ---------- */
  var notes = form.elements.notes;
  var count = $('[data-count-notes]', form);
  var setCount = function () { if (count) count.textContent = notes.value.length + ' / 500'; };
  if (notes) { notes.addEventListener('input', setCount); setCount(); }

  /* ---------- When: the native month picker writes "Nov 2026" ---------- */
  var pick = $('[data-pick]', form);
  var nat = $('[data-native]', form);
  if (pick && nat && typeof nat.showPicker === 'function') {
    pick.hidden = false;
    pick.addEventListener('click', function () { try { nat.showPicker(); } catch (e) { form.elements.when.focus(); } });
    nat.addEventListener('change', function () {
      if (!nat.value) return;
      var p = nat.value.split('-');
      form.elements.when.value = MON[+p[1] - 1] + ' ' + p[0];
      form.elements.when.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  /* ---------- Where: a quiet line when the city is in the ledger ("IN·GOA · 5 events in the ledger") ---------- */
  var where = form.elements.where;
  var match = $('[data-match]', form);
  var lastCode = '';
  // every place in the ledger named in the text ("Auckland and Queenstown" gives NZ·AUC and NZ·QUE)
  function findPlaces(v) {
    var s = ' ' + String(v || '').toLowerCase().replace(/[^a-zÀ-ɏ]+/g, ' ') + ' ';
    var found = [];
    PLACES.forEach(function (p) {
      var hit = p[0].some(function (name) { return s.indexOf(' ' + name.replace(/[^a-zÀ-ɏ]+/g, ' ').trim() + ' ') > -1; });
      if (hit) found.push(p);
    });
    return found.slice(0, 3);
  }
  function countUp(el, end) {
    if (reduce) { el.textContent = String(end); return; }
    var t0 = null;
    var stepFn = function (t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 600); el.textContent = String(Math.round(end * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(stepFn); };
    el.textContent = '0';
    requestAnimationFrame(stepFn);
  }
  function showMatch() {
    var ps = findPlaces(where.value);
    var key = ps.map(function (p) { return p[1]; }).join(' ');
    if (!ps.length) { match.hidden = true; lastCode = ''; return; }
    if (key === lastCode) return;
    lastCode = key;
    while (match.firstChild) match.removeChild(match.firstChild);
    ps.forEach(function (p) {
      var row = d.createElement('span');
      var code = d.createElement('span'); code.className = 'code'; code.textContent = p[1];
      var n = d.createElement('span'); n.textContent = String(p[3]);
      row.appendChild(code); row.appendChild(d.createTextNode(' '));
      row.appendChild(n);
      row.appendChild(d.createTextNode(' event' + (p[3] === 1 ? '' : 's') + ' in the ledger · ' + p[4]));
      match.appendChild(row);
      countUp(n, p[3]);
    });
    match.hidden = false;
  }
  if (where && match) where.addEventListener('input', showMatch);

  /* ---------- reference and pre-fill from the address (?ref=2026-03&city=Mumbai) ---------- */
  var refText = '';
  var params = null;
  try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
  if (params) {
    var r = (params.get('ref') || '').replace(/[^0-9-]/g, '');
    if (REFS[r]) {
      refText = REFS[r];
      $('[data-ref-v]', form).textContent = refText;
      $('[data-ref]', form).hidden = false;
    }
    var city = (params.get('city') || '').slice(0, 80);
    // from a ledger line the city is context, not a guess at the new event's place; from a place on the Atlas it fills Where
    if (city && refText) $('[data-ref-v]', form).textContent = refText + ', ' + city;
    else if (city && where && !where.value) { where.value = city; showMatch(); }
  }

  /* ---------- 02 Check: your line, the visitor's tick on the ruler, every detail read back ---------- */
  var list = $('[data-check]', form);
  var you = $('[data-you]', form);
  function placeTick() {
    var r = readMonth(raw('when'));
    var years = RULER.years;
    you.hidden = true;
    you.classList.remove('is-dropping');
    if (!r || !r.m) return;
    var idx = years.indexOf(r.y);
    if (idx < 0) idx = r.y > years[years.length - 1] ? years.length - 1 : 0;
    var slot = years.indexOf(r.y) < 0 ? (r.y > years[years.length - 1] ? 11.5 : 0) : r.m - 0.5;
    var x = ((idx + slot / 12) / years.length) * 100;
    you.style.setProperty('--x', x.toFixed(3));
    you.setAttribute('data-side', x > 62 ? 'l' : 'r');
    you.hidden = false;
    if (!reduce) { void you.offsetWidth; you.classList.add('is-dropping'); }
  }
  function renderCheck() {
    var r = readMonth(raw('when'));
    $('[data-yl-mo]', form).textContent = r && r.m ? MON[r.m - 1] + ' ' + r.y : raw('when');
    $('[data-yl-pl]', form).textContent = findPlaces(raw('where')).map(function (p) { return p[1]; }).join(' ');
    $('[data-yl-nm]', form).textContent = raw('where') + (raw('format') && raw('format') !== 'Not sure yet' ? ' · ' + raw('format') : '');
    placeTick();
    while (list.firstChild) list.removeChild(list.firstChild);
    var i = 0;
    FIELDS.forEach(function (f) {
      var v = shown(f.name);
      if (!v) return; // empty optional fields are left out, never dashed
      var row = d.createElement('div');
      row.style.setProperty('--i', String(i++));
      var dt = d.createElement('dt'); dt.textContent = f.label;
      var h = d.createElement('span'); h.lang = 'hi'; h.textContent = f.hi; dt.appendChild(h);
      var dd = d.createElement('dd'); dd.textContent = v;
      row.appendChild(dt); row.appendChild(dd);
      list.appendChild(row);
    });
    if (!reduce) { list.classList.remove('is-revealing'); void list.offsetWidth; list.classList.add('is-revealing'); }
  }
  function message() {
    var lines = [TITLE, ''];
    FIELDS.forEach(function (f) { var v = shown(f.name); if (v) lines.push(f.msg + ': ' + v); });
    return lines.join('\n');
  }

  /* ---------- steps: panes slide 24 px, ticks draw on completed steps, focus moves to the heading ---------- */
  var panes = {}; STEPS.forEach(function (s) { panes[s] = $('[data-pane="' + s + '"]', form); });
  var marks = $$('.rst__i', form);
  var acts = {}; $$('[data-act]', form).forEach(function (b) { acts[b.getAttribute('data-act')] = b; });
  var ACTS = { enter: ['check'], check: ['edit', 'prepare'], send: ['copy', 'ig'] };

  function show(next, opts) {
    opts = opts || {};
    var from = STEPS.indexOf(step);
    var to = STEPS.indexOf(next);
    var prev = step;
    step = next;
    form.setAttribute('data-step', next);
    STEPS.forEach(function (s) { panes[s].hidden = s !== next; });
    marks.forEach(function (m, i) {
      if (i === to) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current');
      m.classList.toggle('is-done', i < to);
    });
    Object.keys(acts).forEach(function (k) { acts[k].hidden = ACTS[next].indexOf(k) < 0; });
    if (!reduce && prev !== next && panes[next].animate) {
      var dir = to > from ? 1 : -1;
      panes[next].animate([{ opacity: 0, transform: 'translateX(' + (24 * dir) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.7,.1,1)' });
    }
    if (opts.push && window.history && history.pushState) history.pushState({ step: next }, '', '#' + next);
    if (opts.focus !== false) {
      var h = panes[next].querySelector('.rq__h');
      var top = $('.rst', form).getBoundingClientRect().top + window.scrollY - 64;
      if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
      if (h) window.setTimeout(function () { h.focus({ preventScroll: true }); }, reduce ? 0 : 80);
    }
  }
  function toCheck(push) {
    attempted = true;
    var failed = validate();
    if (failed.length) {
      if (step !== 'enter') show('enter', { push: push, focus: false });
      errBox.focus({ preventScroll: true });
      errBox.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    renderCheck();
    show('check', { push: push });
  }
  function toSend(push) {
    $('[data-msg]', form).textContent = message();
    setRoute();
    show('send', { push: push });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); if (step === 'enter') toCheck(true); });
  acts.edit.addEventListener('click', function () { show('enter', { push: true }); });
  acts.prepare.addEventListener('click', function () { toSend(true); });
  window.addEventListener('popstate', function () {
    var h = window.location.hash.slice(1);
    if (h === 'check' || h === 'send') {
      attempted = true;
      if (validate().length) { show('enter', {}); return; }
      if (h === 'check') { renderCheck(); show('check', {}); } else toSend(false);
    } else show('enter', {});
  });

  /* ---------- 03 Send: copy (a tick, back after 2.4 s), the route, start again ---------- */
  var copyBtns = $$('[data-copy], [data-act="copy"]', form);
  var copied = $('[data-copied]', form);
  var resetTimer = 0;
  function copyDone(ok) {
    copyBtns.forEach(function (b) {
      var t = b.querySelector('[data-copy-t]'); var h = b.querySelector('[data-copy-hi]');
      if (ok) { b.classList.add('is-copied'); t.textContent = 'Copied'; h.textContent = 'कॉपी हो गया'; }
    });
    if (copied) copied.textContent = ok ? 'Copied. Now paste it into the message.' : 'Select the message and copy it.';
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(function () {
      copyBtns.forEach(function (b) { b.classList.remove('is-copied'); b.querySelector('[data-copy-t]').textContent = 'Copy the details'; b.querySelector('[data-copy-hi]').textContent = 'विवरण कॉपी करें'; });
    }, 2400);
  }
  function selectMessage() {
    var box = $('[data-msg]', form);
    try { var rg = d.createRange(); rg.selectNodeContents(box); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg); } catch (e) { /* selection unsupported: the text stays visible to copy by hand */ }
  }
  copyBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var text = message();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { copyDone(true); }, function () { selectMessage(); copyDone(false); });
      } else { selectMessage(); copyDone(false); }
    });
  });

  var status = $('[data-status]', form);
  function setRoute() {
    var igs = $$('[data-ig]', form);
    if (route === 'email' && endpoint) {
      var href = 'mailto:' + endpoint + '?subject=' + encodeURIComponent(TITLE) + '&body=' + encodeURIComponent(message());
      igs.forEach(function (a) { a.href = href; a.removeAttribute('target'); a.querySelector('[data-ig-t]').textContent = 'Open your email app'; a.querySelector('[data-ig-hi]').hidden = true; });
      $('[data-instr]', form).textContent = 'Your email app opens with the message filled in. Check it, then press send.';
    } else if (route === 'form' && endpoint) {
      igs.forEach(function (a) { a.querySelector('[data-ig-t]').textContent = 'Send the request'; a.querySelector('[data-ig-hi]').hidden = true; a.removeAttribute('target'); });
      $('[data-instr]', form).textContent = 'The request is sent only when you press Send the request.';
    }
  }
  if (route === 'form' && endpoint) {
    $$('[data-ig]', form).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        status.textContent = 'Sending your request.';
        var body = new FormData(form);
        body.append('reference', refText);
        window.fetch(endpoint, { method: 'POST', body: body, headers: { Accept: 'application/json' } })
          .then(function (res) { if (!res.ok) throw new Error(String(res.status)); status.textContent = 'Your request has been sent. The reply comes to the contact you gave.'; })
          .catch(function () { status.textContent = 'It could not be sent from here. Copy the details and send them on Instagram instead.'; });
      });
    });
  }

  $('[data-again]', form).addEventListener('click', function () {
    form.reset();
    attempted = false;
    RULES.forEach(function (r) { showFieldError(r, ''); });
    errBox.hidden = true;
    setCount();
    if (match) { match.hidden = true; lastCode = ''; }
    if (copied) copied.textContent = '';
    if (status) status.textContent = '';
    show('enter', { push: true });
  });

  /* ---------- phones: the action bar rises above the keyboard; the top bar slides away meanwhile ---------- */
  var bar = $('[data-bar]', form);
  var vv = window.visualViewport;
  if (bar && vv) {
    // only a field being edited at normal zoom counts as an open keyboard (a pinch-zoom also shrinks the visual viewport)
    var editing = function () { var t = d.activeElement && d.activeElement.tagName; return /^(INPUT|TEXTAREA|SELECT)$/.test(t || ''); };
    var lift = function () {
      var kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      var open = editing() && vv.scale < 1.05 && kb > 80;
      bar.style.setProperty('--kb', (open ? -kb : 0) + 'px');
      d.body.classList.toggle('kb-open', open);
    };
    vv.addEventListener('resize', lift);
    vv.addEventListener('scroll', lift);
    form.addEventListener('focusout', function () { setTimeout(lift, 50); });
  }

  /* ---------- start on Enter ---------- */
  if (window.location.hash === '#check' || window.location.hash === '#send') {
    if (window.history && history.replaceState) history.replaceState(null, '', window.location.pathname + window.location.search + '#enter');
  }
  show('enter', { focus: false });
})();
