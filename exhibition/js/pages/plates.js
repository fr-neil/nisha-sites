/* 02.04 List of plates · the lightbox (M7). Tap a plate: a bottom sheet on phone (a centred panel at 768+) with the
   plate large, its full caption, its entry and source; ← → step through the plates; Esc, the scrim or Close shuts it
   and focus returns to the plate. Without this file every caption, link and image is already on the page. */
(function () {
  'use strict';
  var d = document;
  var items = Array.prototype.slice.call(d.querySelectorAll('.pli'));
  if (!items.length || typeof HTMLDialogElement === 'undefined') return;
  var reduce = (window.NS && window.NS.reduce) || !d.documentElement.classList.contains('motion');
  var n = items.length;
  var pad = function (v) { return (v < 10 ? '0' : '') + v; };

  var dlg = d.createElement('dialog');
  dlg.className = 'lb';
  dlg.setAttribute('aria-labelledby', 'lb-t');
  dlg.innerHTML = '<div class="lb__panel"><div class="lb__top"><p class="lb__pos" id="lb-t" aria-live="polite"></p>'
    + '<div class="lb__nav"><button class="lb__btn" type="button" data-lb="-1" aria-label="Previous plate"><span aria-hidden="true">←</span></button>'
    + '<button class="lb__btn" type="button" data-lb="1" aria-label="Next plate"><span aria-hidden="true">→</span></button>'
    + '<button class="lb__close" type="button" data-lb-close><span>Close</span><span lang="hi">बंद करें</span></button></div></div>'
    + '<div class="lb__body"><figure class="lb__fig"></figure><div class="lb__txt"></div></div></div>';
  d.body.appendChild(dlg);
  var fig = dlg.querySelector('.lb__fig');
  var txt = dlg.querySelector('.lb__txt');
  var pos = dlg.querySelector('.lb__pos');
  var prev = dlg.querySelector('[data-lb="-1"]');
  var next = dlg.querySelector('[data-lb="1"]');
  var cur = -1, opener = null, closing = 0;

  function show(i) {
    cur = Math.max(0, Math.min(n - 1, i));
    var li = items[cur];
    var pic = li.querySelector('picture');
    fig.innerHTML = '';
    if (pic) {
      var c = pic.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('source,img'), function (el) { if (el.hasAttribute('sizes')) el.setAttribute('sizes', '(min-width: 768px) 60vw, 100vw'); });
      var img = c.querySelector('img');
      if (img) { img.loading = 'eager'; img.removeAttribute('fetchpriority'); }
      fig.appendChild(c);
    }
    txt.innerHTML = '';
    ['.pli__no', '.pli__cap', '.pli__meta'].forEach(function (s) { var el = li.querySelector(s); if (el) txt.appendChild(el.cloneNode(true)); });
    var code = li.querySelector('.pli__no .code');
    pos.textContent = (code ? code.textContent : '') + ' · ' + pad(cur + 1) + ' / ' + pad(n);
    prev.disabled = cur === 0;
    next.disabled = cur === n - 1;
  }
  function open(i, from) {
    window.clearTimeout(closing);
    dlg.classList.remove('is-closing');
    opener = from || null;
    show(i);
    if (!dlg.open) dlg.showModal();
    dlg.querySelector('[data-lb-close]').focus();
  }
  function close() {
    if (!dlg.open) return;
    var done = function () { dlg.classList.remove('is-closing'); dlg.close(); if (opener) opener.focus({ preventScroll: true }); };
    if (reduce) { done(); return; }
    dlg.classList.add('is-closing');
    closing = window.setTimeout(done, 220);
  }

  items.forEach(function (li, i) {
    var frame = li.querySelector('.pli__plate');
    var code = li.querySelector('.pli__no .code');
    if (!frame) return;
    var b = d.createElement('button');
    b.type = 'button';
    b.className = 'pli__open';
    b.setAttribute('aria-label', (code ? code.textContent : 'Plate') + ', larger');
    b.setAttribute('aria-haspopup', 'dialog');
    b.addEventListener('click', function () { open(i, b); });
    frame.insertBefore(b, frame.firstChild);
  });
  prev.addEventListener('click', function () { show(cur - 1); });
  next.addEventListener('click', function () { show(cur + 1); });
  dlg.querySelector('[data-lb-close]').addEventListener('click', close);
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
  });
  /* swipe sideways on the plate to step */
  var sx = 0, sy = 0;
  fig.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  fig.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) show(cur + (dx < 0 ? 1 : -1));
  });
})();
