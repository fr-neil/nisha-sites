/* Overprint · the back page's reply card: 01 Enter → 02 Check → 03 Send (PHASE-52 §9.13, motion B11).
   Nothing is stored and nothing is sent by this site: the visitor copies the prepared message and sends it on
   Instagram. The route (form[data-route], from site.config.json) changes only step 03:
     instagram  copy + ig.me link (launch)   email  a mailto link to the endpoint   form  POST to the endpoint
   Visitor input is only ever written with textContent. Without this file the card shows "What to include". */
(function () {
  'use strict';
  var d = document;
  var form = d.getElementById('rq');
  var card = d.querySelector('[data-rc]');
  var bar = d.querySelector('[data-bar]');
  if (!form || !card || !bar) return;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var REFS = {};
  try { REFS = JSON.parse($('#rq-refs').textContent); } catch (e) { REFS = {}; }
  var route = form.getAttribute('data-route') || 'instagram';
  var endpoint = (form.getAttribute('data-endpoint') || '').trim();
  var STEPS = ['enter', 'check', 'send'];
  var step = 'enter';
  var TITLE = 'Request availability — Nisha Shetty';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------- one set of labels, one order: Enter = Check = the message ---------- */
  var FIELDS = [
    ['when', 'When', 'कब', 'When'], ['where', 'Where', 'कहाँ', 'Where'], ['format', 'Format', 'प्रारूप', 'Format'],
    ['setting', 'In person or virtual', 'प्रत्यक्ष या वर्चुअल', 'In person or virtual'], ['language', 'Hosting language', 'होस्टिंग की भाषा', 'Language'],
    ['audience', 'Audience size', 'दर्शकों की संख्या', 'Audience size'], ['as', 'Enquiring as', 'आप किसकी ओर से पूछ रहे हैं', 'Enquiring as'],
    ['org', 'Organisation', 'संस्था', 'Organisation'], ['name', 'Your name', 'आपका नाम', 'Name'], ['contact', 'Reply to', 'जवाब कहाँ दें', 'Reply to'],
    ['ref', 'Seen in this issue', 'इस अंक में देखा', 'Seen in Issue 01'], ['notes', 'Anything else', 'और कुछ', 'Notes']
  ];
  var ref = null; // ['p. 8', 'The room answers']
  function raw(name) {
    if (name === 'ref') return ref ? ref[0] + ' · ' + ref[1] : '';
    var el = form.elements[name];
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked ? el.value : '';
    return String(el.value || '').trim();
  }
  function shown(name, forMessage) {
    if (name === 'ref') return ref ? (forMessage ? ref[0] + ', ' + ref[1] : ref[0] + ' · ' + ref[1]) : '';
    var v = raw(name);
    if (v && name === 'when' && raw('flexible')) v += ' (dates are flexible)';
    return v;
  }

  /* ---------- reading a month out of what was typed: "Nov 2026", "14 November 2026", "2026-11", "14/11/2026" ---------- */
  function readMonth(s) {
    s = String(s || '').toLowerCase();
    var y = s.match(/\b(20\d\d)\b/);
    if (!y) return null;
    var m = null;
    var name = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/);
    if (name) m = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(name[1]) + 1;
    if (!m) { var iso = s.match(/\b20\d\d-(\d{1,2})\b/); if (iso) m = +iso[1]; }
    if (!m) { var dmy = s.match(/\b\d{1,2}[\/.](\d{1,2})[\/.]20\d\d\b/); if (dmy) m = +dmy[1]; }
    if (!m) { var my = s.match(/\b(\d{1,2})[\/.]20\d\d\b/); if (my) m = +my[1]; }
    return { y: +y[1], m: m && m >= 1 && m <= 12 ? m : null };
  }

  /* ---------- validation: messages only after the first attempt ---------- */
  function checkWhen(v) {
    if (!v) return 'Add a month or a date. If it can move, tick Dates are flexible.';
    var r = readMonth(v), now = new Date();
    if (r && r.m && (r.y < now.getFullYear() || (r.y === now.getFullYear() && r.m < now.getMonth() + 1))) return 'That month has already passed. Check the year.';
    if (r && !r.m && r.y < now.getFullYear()) return 'That year has already passed. Check the year.';
    return '';
  }
  function checkContact(v) {
    if (!v) return 'Add a phone or WhatsApp number, or an email address, for the reply.';
    var digits = v.replace(/[^\d]/g, '');
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || (/^[+\d\s().-]+$/.test(v) && digits.length >= 8 && digits.length <= 15);
    return ok ? '' : 'This does not look like a phone number or an email address.';
  }
  var need = function (msg) { return function (v) { return v ? '' : msg; }; };
  var RULES = [
    { name: 'when', target: 'f-when', check: checkWhen },
    { name: 'where', target: 'f-where', check: need('Add the city, and the country if it is outside India.') },
    { name: 'format', target: 'f-format', check: need('Choose a format, or Not sure yet.') },
    { name: 'as', target: 'f-as', check: need('Choose who is enquiring.') },
    { name: 'name', target: 'f-name', check: need('Add your name.') },
    { name: 'contact', target: 'f-contact', check: checkContact }
  ];
  var errBox = $('[data-errors]', form), errTitle = $('[data-errors-title]', form), errList = $('[data-errors-list]', form);
  var attempted = false;
  function fieldError(rule, msg) {
    var el = $('[data-err-for="' + rule.name + '"]', form), t = d.getElementById(rule.target);
    if (el) { el.textContent = msg; el.hidden = !msg; }
    if (!t) return;
    if (t.tagName === 'FIELDSET') { if (msg) t.setAttribute('data-invalid', ''); else t.removeAttribute('data-invalid'); }
    else t.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function focusField(id) {
    var t = d.getElementById(id);
    if (!t) return;
    var f = t.tagName === 'FIELDSET' ? (t.querySelector('input:checked') || t.querySelector('input')) : t;
    t.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    if (f) f.focus({ preventScroll: true });
  }
  function summary(failed) {
    while (errList.firstChild) errList.removeChild(errList.firstChild);
    if (!failed.length) { errBox.hidden = true; return; }
    errTitle.textContent = failed.length === 1 ? 'One thing to check' : failed.length + ' things to check';
    failed.forEach(function (f) {
      var li = d.createElement('li'), a = d.createElement('a');
      a.href = '#' + f.rule.target;
      a.textContent = f.msg;
      a.addEventListener('click', function (e) { e.preventDefault(); focusField(f.rule.target); });
      li.appendChild(a); errList.appendChild(li);
    });
    var was = errBox.hidden;
    errBox.hidden = false;
    if (was && !reduce) { errBox.classList.remove('is-new'); void errBox.offsetWidth; errBox.classList.add('is-new'); }
  }
  function validate() {
    var failed = [];
    RULES.forEach(function (r) { var m = r.check(raw(r.name)); fieldError(r, m); if (m) failed.push({ rule: r, msg: m }); });
    summary(failed);
    return failed;
  }
  function revalidate(e) {
    if (!attempted || !e.target.name) return;
    RULES.forEach(function (r) { if (r.name === e.target.name) fieldError(r, r.check(raw(r.name))); });
    if (!RULES.some(function (r) { return r.check(raw(r.name)); })) errBox.hidden = true;
  }
  form.addEventListener('input', revalidate);
  form.addEventListener('change', revalidate);

  /* ---------- Anything else: live count ---------- */
  var notes = form.elements.notes, count = $('[data-count-notes]', form);
  var setCount = function () { if (count && notes) count.textContent = notes.value.length + ' / 500'; };
  if (notes) notes.addEventListener('input', setCount);
  setCount();

  /* ---------- When: the native month picker writes "Nov 2026" ---------- */
  var pick = $('[data-pick]', form), nat = $('[data-native]', form);
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

  /* ---------- from the address: ?ref=p8 (the page the visitor came from) and ?city=Goa ---------- */
  try {
    var q = new URLSearchParams(window.location.search);
    var r = (q.get('ref') || '').replace(/[^p0-9]/g, '');
    if (REFS[r]) { ref = REFS[r]; $('[data-ref-v]', form).textContent = ref[0] + ' · ' + ref[1]; $('[data-ref]', form).hidden = false; }
    var city = (q.get('city') || '').slice(0, 80);
    if (city && !form.elements.where.value) form.elements.where.value = city;
  } catch (e) { ref = null; }

  /* ---------- 02 Check: read back in the same labels, empty optional fields left out ---------- */
  var list = $('[data-check]', form), stamp = $('[data-stamp]', form);
  function renderCheck() {
    while (list.firstChild) list.removeChild(list.firstChild);
    var i = 0;
    FIELDS.forEach(function (f) {
      var v = shown(f[0]);
      if (!v) return;
      var row = d.createElement('div'); row.style.setProperty('--i', String(i++));
      var dt = d.createElement('dt'); dt.textContent = f[1];
      var h = d.createElement('span'); h.lang = 'hi'; h.textContent = f[2]; dt.appendChild(h);
      var dd = d.createElement('dd'); dd.textContent = v;
      row.appendChild(dt); row.appendChild(dd); list.appendChild(row);
    });
    if (!reduce) { list.classList.remove('is-revealing'); void list.offsetWidth; list.classList.add('is-revealing'); }
  }
  function message() {
    var lines = [TITLE];
    FIELDS.forEach(function (f) { var v = shown(f[0], true); if (v) lines.push(f[3] + ': ' + v); });
    return lines.join('\n');
  }

  /* ---------- steps ---------- */
  var panes = {}; STEPS.forEach(function (s) { panes[s] = $('[data-pane="' + s + '"]', form); });
  var marks = $$('.rc__st', card);
  var acts = {}; $$('[data-act]', bar).forEach(function (b) { acts[b.getAttribute('data-act')] = b; });
  var ACTS = { enter: ['check'], check: ['edit', 'prepare'], send: ['copy', 'ig'] };
  var cardEl = $('[data-card]', card);
  function tear(on) {
    if (!on) { card.classList.remove('is-torn'); return; }
    if (card.classList.contains('is-torn')) return;
    card.classList.add('is-torn');
  }
  function show(next, opts) {
    opts = opts || {};
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
    stamp.classList.toggle('is-on', next === 'send');
    tear(next === 'send');
    if (!reduce && prev !== next && next !== 'send' && panes[next].animate) {
      panes[next].animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    if (opts.push && window.history && history.pushState) history.pushState({ step: next }, '', '#' + next);
    if (opts.focus !== false) {
      var top = cardEl.getBoundingClientRect().top + window.scrollY - 64;
      if (Math.abs(window.scrollY - top) > 40 && window.scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
      var h = panes[next].querySelector('.rq__h');
      if (h) window.setTimeout(function () { h.focus({ preventScroll: true }); }, reduce ? 0 : 80);
    }
  }
  function toCheck(push) {
    attempted = true;
    if (validate().length) {
      if (step !== 'enter') show('enter', { push: push, focus: false });
      errBox.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      errBox.focus({ preventScroll: true });
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

  /* ---------- 03 Send: copy (Copied · कॉपी हो गया, back after 2.4 s), the route, start again ---------- */
  var copyBtn = acts.copy, copied = $('[data-copied]', form), timer = 0;
  function copyDone(ok) {
    if (ok) { copyBtn.classList.add('is-copied'); $('[data-copy-t]', copyBtn).textContent = 'Copied'; $('[data-copy-hi]', copyBtn).textContent = 'कॉपी हो गया'; }
    copied.textContent = ok ? 'Copied. Now paste it into the message.' : 'Select the message and copy it.';
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      copyBtn.classList.remove('is-copied');
      $('[data-copy-t]', copyBtn).textContent = 'Copy the details';
      $('[data-copy-hi]', copyBtn).textContent = 'विवरण कॉपी करें';
    }, 2400);
  }
  function selectMessage() {
    try { var rg = d.createRange(); rg.selectNodeContents($('[data-msg]', form)); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg); } catch (e) { /* the text stays visible to copy by hand */ }
  }
  copyBtn.addEventListener('click', function () {
    var text = message();
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { copyDone(true); }, function () { selectMessage(); copyDone(false); });
    else { selectMessage(); copyDone(false); }
  });
  var status = $('[data-status]', form);
  var ig = acts.ig;
  function setRoute() {
    if (route === 'email' && endpoint) {
      ig.href = 'mailto:' + endpoint + '?subject=' + encodeURIComponent(TITLE) + '&body=' + encodeURIComponent(message());
      ig.removeAttribute('target');
      $('[data-ig-t]', ig).textContent = 'Open your email app'; $('[data-ig-hi]', ig).hidden = true;
      $('[data-instr]', form).textContent = 'Your email app opens with the message filled in. Check it, then press send.';
    } else if (route === 'form' && endpoint) {
      ig.removeAttribute('target');
      $('[data-ig-t]', ig).textContent = 'Send the request'; $('[data-ig-hi]', ig).hidden = true;
      $('[data-instr]', form).textContent = 'The request is sent only when you press Send the request.';
    }
  }
  // Instagram: the primary button copies inside the tap, then the link opens (no preventDefault)
  ig.addEventListener('click', function () {
    if (route !== 'instagram' || !navigator.clipboard || !navigator.clipboard.writeText) return;
    navigator.clipboard.writeText(message()).then(function () { copyDone(true); copied.textContent = 'The details are copied. Paste them into the message.'; }, function () { /* Copy the details stays available */ });
  });
  if (route === 'form' && endpoint) {
    ig.addEventListener('click', function (e) {
      e.preventDefault();
      status.textContent = 'Sending your request.';
      var body = new FormData(form);
      body.append('seen', shown('ref', true));
      window.fetch(endpoint, { method: 'POST', body: body, headers: { Accept: 'application/json' } })
        .then(function (res) { if (!res.ok) throw new Error(String(res.status)); status.textContent = 'Your request has been sent. The reply comes to the contact you gave.'; })
        .catch(function () { status.textContent = 'It could not be sent from here. Copy the details and send them on Instagram instead.'; });
    });
  }
  $('[data-again]', form).addEventListener('click', function () {
    form.reset();
    attempted = false;
    RULES.forEach(function (r) { fieldError(r, ''); });
    errBox.hidden = true;
    copied.textContent = ''; status.textContent = '';
    setCount();
    show('enter', { push: true });
  });

  /* ---------- phones: the card bar rises above the keyboard; the top bar slides away while typing ---------- */
  var vv = window.visualViewport;
  if (vv) {
    var editing = function () { var t = d.activeElement && d.activeElement.tagName; return /^(INPUT|TEXTAREA|SELECT)$/.test(t || ''); };
    var lift = function () {
      var kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      var open = editing() && vv.scale < 1.05 && kb > 80;
      bar.style.setProperty('--kb', (open ? -kb : 0) + 'px');
      d.body.classList.toggle('kb-open', open);
    };
    vv.addEventListener('resize', lift);
    vv.addEventListener('scroll', lift);
    form.addEventListener('focusout', function () { window.setTimeout(lift, 50); });
  }

  /* ---------- start on Enter ---------- */
  if (/^#(check|send)$/.test(window.location.hash) && window.history && history.replaceState) history.replaceState(null, '', window.location.pathname + window.location.search + '#card');
  show('enter', { focus: false });
})();
