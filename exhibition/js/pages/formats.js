/* C · Exhibition — 03 Formats (PHASE-50 §3.7).
   · Entry lists over 8 rows show 8 plus "Show all N", which opens and closes with M10 (height, then a 20 ms row stagger).
     The clamp is CSS under html.js (no layout shift); without JS every row is visible. At 1200 px and wider the
     full list is always shown, in two columns, and the button is hidden by CSS.
   · The Request buttons (dock and bar) carry the format of the block in view (?format=awards).
   · The format index scrolls to its block (smooth unless reduced motion) and moves focus to the block's title. */
(function () {
  'use strict';
  var d = document;
  var NS = window.NS || {};
  var reduce = !!NS.reduce || !d.documentElement.classList.contains('motion');
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); };
  var wide = window.matchMedia ? window.matchMedia('(min-width: 1200px)') : { matches: false };

  /* ---------- M10 list disclosure ---------- */
  $$('[data-fl]').forEach(function (list) {
    var btn = list.parentNode.querySelector('[data-fl-more]');
    if (!btn) return;
    var clamp = parseInt(list.getAttribute('data-clamp'), 10) || 8;
    var rows = $$(':scope > li', list);
    var extra = rows.slice(clamp);
    var anim = null;
    function setOpen(open) {
      list.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    function sync() { if (wide.matches && anim) anim.cancel(); }
    setOpen(false);
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      if (reduce || !list.animate) {
        setOpen(open);
        if (!open) list.scrollIntoView({ block: 'nearest' });
        return;
      }
      if (anim) anim.cancel();
      var h0 = list.offsetHeight;
      setOpen(open);
      var h1 = list.offsetHeight;
      list.style.overflow = 'hidden';
      anim = list.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)' });
      anim.onfinish = anim.oncancel = function () { list.style.overflow = ''; anim = null; };
      if (open) {
        extra.forEach(function (r, i) {
          r.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
            { duration: 200, delay: Math.min(i, 18) * 20, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
        });
      } else {
        var top = btn.getBoundingClientRect().top;
        if (top < 0) list.scrollIntoView({ block: 'nearest' });
      }
    });
    if (wide.addEventListener) wide.addEventListener('change', sync);
    sync();
  });

  /* ---------- Request buttons carry the format of the block in view ---------- */
  var reqs = $$('.dock__req, .bar__req');
  var base = reqs.length ? reqs[0].getAttribute('href').split('?')[0] : null;
  var blocks = $$('[data-format]');
  if (base && blocks.length && 'IntersectionObserver' in window) {
    var current = '';
    var setFormat = function (slug) {
      if (slug === current) return;
      current = slug;
      reqs.forEach(function (a) { a.setAttribute('href', base + (slug ? '?format=' + slug : '')); });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) setFormat(en.target.getAttribute('data-format'));
        else if (en.target.getAttribute('data-format') === current && en.boundingClientRect.top > 0) {
          var i = blocks.indexOf(en.target);
          setFormat(i > 0 ? blocks[i - 1].getAttribute('data-format') : '');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    blocks.forEach(function (b) { io.observe(b); });
  }

  /* ---------- Format index: scroll to the block, focus its title ---------- */
  $$('.fx__a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = (a.getAttribute('href') || '').slice(1);
      var t = id && d.getElementById(id);
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (window.history && window.history.replaceState) window.history.replaceState(null, '', '#' + id);
      var h = t.querySelector('h2');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    });
  });
})();
