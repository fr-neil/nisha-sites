/* 06 Request · enter → check → send (PHASE-50 §3.10; motion M11, M12; validation as Final-1 enquire.js).
   Nothing is stored and nothing is sent by this site: the visitor copies the prepared message and sends it on
   Instagram. The route switch (site.config.json → request.route) changes only the 06.03 action:
     instagram  copy + ig.me link (launch)        email  a mailto link to request.endpoint        form  POST to request.endpoint
   Visitor input is only ever written with textContent. Without this file the page shows "What to include". */
(function () {
  'use strict';
  var d = document;
  var form = d.getElementById('rq');
  if (!form) return;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = (window.NS && window.NS.reduce) || !d.documentElement.classList.contains('motion');
  var cfg = $('[data-rq-cfg]', form) || { getAttribute: function () { return ''; } };
  var route = cfg.getAttribute('data-route') || 'instagram';
  var endpoint = (cfg.getAttribute('data-endpoint') || '').trim();
  var STEPS = ['enter', 'check', 'send'];
  var step = 'enter';

  /* ---------- labels: one set, one order (06.01 = 06.02 = the message) ---------- */
  var FIELDS = [
    { name: 'as', label: 'Enquiring as', msg: 'Enquiring as' },
    { name: 'format', label: 'Format', msg: 'Format' },
    { name: 'date', label: 'Date or month', msg: 'Date' },
    { name: 'city', label: 'City and country', msg: 'City and country' },
    { name: 'setting', label: 'In person or virtual', msg: 'In person or virtual' },
    { name: 'language', label: 'Hosting language', msg: 'Language' },
    { name: 'audience', label: 'Audience size', msg: 'Audience size' },
    { name: 'org', label: 'Organisation', msg: 'Organisation' },
    { name: 'name', label: 'Your name', msg: 'Name' },
    { name: 'contact', label: 'Reply to', msg: 'Reply to' },
    { name: 'notes', label: 'Anything else', msg: 'Notes' }
  ];
  var HI = { as: 'आप कौन हैं', format: 'प्रारूप', date: 'तारीख़ या महीना', city: 'शहर और देश', setting: 'प्रत्यक्ष (ऑफ़लाइन) या वर्चुअल', language: 'होस्टिंग की भाषा', audience: 'दर्शकों की संख्या', org: 'संस्था', name: 'आपका नाम', contact: 'जवाब कहाँ दें', notes: 'और कुछ', ref: 'संदर्भ' };
  var AS_TEXT = { host: 'The company hosting the event', agency: 'An event agency', other: 'Other' };

  function raw(name) {
    var el = form.elements[name];
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked ? el.value : '';
    return String(el.value || '').trim();
  }
  function shown(name) {
    var v = raw(name);
    if (!v) return '';
    if (name === 'as') return AS_TEXT[v] || v;
    if (name === 'format') { var o = form.elements.format.selectedOptions; return o && o[0] ? o[0].textContent : v; }
    if (name === 'date' && raw('flexible')) return v + ' (flexible)';
    return v;
  }

  /* ---------- validation (errors only after the first attempt) ---------- */
  function checkContact(v) {
    if (!v) return 'Add a phone or WhatsApp number, or an email address, for the reply.';
    var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    var digits = v.replace(/[^\d]/g, '');
    var isPhone = /^[+\d\s().-]+$/.test(v) && digits.length >= 8 && digits.length <= 15;
    return isEmail || isPhone ? '' : 'This does not look like a phone number or an email address.';
  }
  var RULES = [
    { name: 'as', target: 'f-as', check: function (v) { return v ? '' : 'Choose who is enquiring.'; } },
    { name: 'format', target: 'f-format', check: function (v) { return v ? '' : 'Choose a format, or Not sure yet.'; } },
    { name: 'date', target: 'f-date', check: function (v) { return v ? '' : 'Add a date or a month. If it can move, tick Dates are flexible.'; } },
    { name: 'city', target: 'f-city', check: function (v) { return v ? '' : 'Add the city, and the country if it is outside India.'; } },
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
    errTitle.textContent = failed.length === 1 ? 'One thing to check' : 'A few things to check';
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
    if (!RULES.some(function (r) { return r.check(raw(r.name)); })) errBox.hidden = true;
  }
  form.addEventListener('input', revalidate);
  form.addEventListener('change', revalidate);

  /* ---------- live count for Anything else ---------- */
  var notes = form.elements.notes;
  var count = $('[data-count-notes]', form);
  if (notes && count) {
    var setCount = function () { count.textContent = notes.value.length + ' / 500'; };
    notes.addEventListener('input', setCount);
    setCount();
  }

  /* ---------- the native date picker, with the text field as the fallback ---------- */
  var pick = $('[data-pick]', form);
  var nat = $('[data-native]', form);
  if (pick && nat && typeof nat.showPicker === 'function') {
    pick.hidden = false;
    pick.addEventListener('click', function () { try { nat.showPicker(); } catch (e) { form.elements.date.focus(); } });
    nat.addEventListener('change', function () {
      if (!nat.value) return;
      var p = nat.value.split('-');
      var dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      form.elements.date.value = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      form.elements.date.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  /* ---------- reference and pre-fill from the address (?ref=NS-104&format=conference&as=agency) ---------- */
  var refs = {};
  try { refs = JSON.parse(($('#rq-refs') || {}).textContent || '{}'); } catch (e) { refs = {}; }
  var refCode = '';
  var params = null;
  try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
  if (params) {
    var r = (params.get('ref') || '').toUpperCase();
    if (refs[r]) {
      refCode = r;
      $('[data-ref-v]', form).textContent = refs[r].t;
      $('[data-ref]', form).hidden = false;
    }
    var f = params.get('format') || (refs[r] && refs[r].f) || '';
    var sel = form.elements.format;
    if (f && sel && $('option[value="' + f.replace(/[^a-z-]/g, '') + '"]', sel)) sel.value = f;
    var as = params.get('as');
    if (as && AS_TEXT[as]) { var radio = $('input[name="as"][value="' + as + '"]', form); if (radio) radio.checked = true; }
  }

  /* ---------- 06.02 check table and 06.03 message ---------- */
  var table = $('[data-check]', form);
  function renderCheck() {
    while (table.firstChild) table.removeChild(table.firstChild);
    var rows = FIELDS.map(function (f) { return [f.label, HI[f.name], shown(f.name)]; });
    if (refCode) rows.push(['Reference', HI.ref, refs[refCode].t]);
    rows.forEach(function (row, i) {
      var dt = d.createElement('dt');
      dt.textContent = row[0];
      var h = d.createElement('span'); h.lang = 'hi'; h.textContent = row[1]; dt.appendChild(h);
      var dd = d.createElement('dd');
      dd.textContent = row[2] || '—';
      if (!row[2]) dd.className = 'is-empty';
      dt.style.setProperty('--i', String(i)); dd.style.setProperty('--i', String(i));
      table.appendChild(dt); table.appendChild(dd);
    });
    if (!reduce) { table.classList.remove('is-revealing'); void table.offsetWidth; table.classList.add('is-revealing'); }
  }
  function message() {
    var lines = ['Request availability — Nisha Shetty', ''];
    FIELDS.forEach(function (f) { var v = shown(f.name); if (v) lines.push(f.msg + ': ' + v); });
    if (refCode) lines.push('Reference: ' + refCode);
    return lines.join('\n');
  }

  /* ---------- steps (M11): panes slide 24 px, the circle travels, focus moves to the heading ---------- */
  var panes = {}; STEPS.forEach(function (s) { panes[s] = d.getElementById(s); });
  var tabs = $$('[data-tab]');
  var disc = $('[data-prog-disc]');
  var acts = {}; $$('[data-act]', form).forEach(function (b) { acts[b.getAttribute('data-act')] = b; });
  var ACTS = { enter: ['check'], check: ['edit', 'prepare'], send: ['copy', 'ig'] };

  function moveDisc() {
    if (!disc) return;
    var tab = tabs[STEPS.indexOf(step)];
    var nav = disc.parentElement;
    if (!tab || !nav) return;
    var x = tab.getBoundingClientRect().left - nav.getBoundingClientRect().left + 5 - 1;
    disc.style.setProperty('--x', x + 'px');
  }
  function show(next, opts) {
    opts = opts || {};
    var from = STEPS.indexOf(step), to = STEPS.indexOf(next);
    var prev = step;
    step = next;
    form.setAttribute('data-step', next);
    STEPS.forEach(function (s) { panes[s].hidden = s !== next; });
    tabs.forEach(function (t, i) {
      var cur = i === to;
      if (cur) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current');
      t.classList.toggle('is-done', i < to);
      if (i <= to) t.removeAttribute('aria-disabled'); else t.setAttribute('aria-disabled', 'true');
    });
    Object.keys(acts).forEach(function (k) { acts[k].hidden = ACTS[next].indexOf(k) < 0; });
    moveDisc();
    if (!reduce && prev !== next && panes[next].animate) {
      var dir = to > from ? 1 : -1;
      panes[next].animate([{ opacity: 0, transform: 'translateX(' + (24 * dir) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.22,.61,.36,1)' });
    }
    if (opts.push && window.history && history.pushState) history.pushState({ step: next }, '', '#' + next);
    if (opts.focus !== false) {
      var h = panes[next].querySelector('.rq-h');
      var prog = $('[data-prog]').getBoundingClientRect();
      var ht = h ? h.getBoundingClientRect().top : 0;
      if (h && (ht < prog.bottom || ht > window.innerHeight * 0.45)) {
        var anchor = $('[data-ref]', form).hidden ? h : $('[data-ref]', form);
        window.scrollTo({ top: Math.max(0, anchor.getBoundingClientRect().top + window.scrollY - prog.height - ($('[data-bar]') || prog).getBoundingClientRect().height - 16), behavior: reduce ? 'auto' : 'smooth' });
      }
      if (h) window.setTimeout(function () { h.focus({ preventScroll: true }); }, reduce ? 0 : 60);
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
  tabs.forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      var s = t.getAttribute('data-tab');
      if (t.getAttribute('aria-disabled') === 'true' || s === step) return;
      if (s === 'enter') show('enter', { push: true }); else if (s === 'check') toCheck(true);
    });
  });
  window.addEventListener('popstate', function () {
    var h = window.location.hash.slice(1);
    if (h === 'send' && !attempted) h = 'enter';
    if (h === 'check') { attempted = true; if (!validate().length) { renderCheck(); show('check', {}); } else show('enter', {}); }
    else if (h === 'send') { if (!validate().length) toSend(false); else show('enter', {}); }
    else show('enter', {});
  });

  /* ---------- 06.03 actions: copy (tick, 2.4 s), the route, start again ---------- */
  var copyBtns = $$('[data-copy], [data-act="copy"]');
  var copied = $('[data-copied]', form);
  var resetTimer = 0;
  function copyDone(ok) {
    copyBtns.forEach(function (b) {
      var t = b.querySelector('[data-copy-t]'); var h = b.querySelector('[data-copy-hi]');
      if (ok) { b.classList.add('is-copied'); t.textContent = 'Copied'; h.textContent = 'कॉपी हो गया'; }
    });
    if (copied) copied.textContent = ok ? 'Copied. Now paste it into the message.' : 'Select the message above and copy it.';
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(function () {
      copyBtns.forEach(function (b) { b.classList.remove('is-copied'); b.querySelector('[data-copy-t]').textContent = 'Copy the details'; b.querySelector('[data-copy-hi]').textContent = 'विवरण कॉपी करें'; });
    }, 2400);
  }
  function selectMessage() {
    var box = $('[data-msg]', form);
    try { var rg = d.createRange(); rg.selectNodeContents(box); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg); } catch (e) { /* selection unsupported */ }
  }
  copyBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var text = message();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { copyDone(true); }, function () { selectMessage(); copyDone(false); });
      } else { selectMessage(); copyDone(false); }
    });
  });

  function setRoute() {
    var igs = $$('[data-ig]');
    if (route === 'email' && endpoint) {
      var href = 'mailto:' + endpoint + '?subject=' + encodeURIComponent('Request availability — Nisha Shetty') + '&body=' + encodeURIComponent(message());
      igs.forEach(function (a) { a.href = href; a.removeAttribute('target'); a.querySelector('[data-ig-t]').textContent = 'Open your email app'; a.querySelector('[data-ig-hi]').hidden = true; });
      $('[data-instr]', form).textContent = 'Your email app opens with the message filled in. Check it, then press send.';
    } else if (route === 'form' && endpoint) {
      igs.forEach(function (a) { a.querySelector('[data-ig-t]').textContent = 'Send the request'; a.querySelector('[data-ig-hi]').hidden = true; a.removeAttribute('target'); });
      $('[data-instr]', form).textContent = 'The request is sent only when you press Send the request.';
    }
  }
  if (route === 'form' && endpoint) {
    $$('[data-ig]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var st = $('[data-status-t]', form);
        st.textContent = 'Sending your request.';
        window.fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then(function (res) { if (!res.ok) throw new Error(String(res.status)); st.textContent = 'Your request has been sent. The reply comes to the contact you gave.'; })
          .catch(function () { st.textContent = 'It could not be sent from here. Copy the details and send them on Instagram instead.'; });
      });
    });
  }

  $('[data-again]', form).addEventListener('click', function () {
    form.reset();
    attempted = false;
    RULES.forEach(function (r) { showFieldError(r, ''); });
    errBox.hidden = true;
    if (count) count.textContent = '0 / 500';
    if (copied) copied.textContent = '';
    show('enter', { push: true });
  });

  /* ---------- the action bar rises above the on-screen keyboard ---------- */
  var bar = $('[data-actions]', form);
  var vv = window.visualViewport;
  if (bar && vv) {
    var lift = function () {
      var kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      bar.style.setProperty('--kb', (kb > 80 ? -kb : 0) + 'px');
    };
    vv.addEventListener('resize', lift);
    vv.addEventListener('scroll', lift);
  }

  /* ---------- start ---------- */
  if (window.location.hash === '#check' || window.location.hash === '#send') {
    if (window.history && history.replaceState) history.replaceState(null, '', window.location.pathname + window.location.search + '#enter');
  }
  show('enter', { focus: false });
  window.addEventListener('resize', moveDisc);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(moveDisc);
})();
