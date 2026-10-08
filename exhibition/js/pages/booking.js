/* 05 Booking · steps draw-in (M1, M2) and FAQ answers that open and close with height (M10).
   Without this file the steps are static and the FAQ is a plain set of <details>. */
(function () {
  'use strict';
  var d = document;
  var reduce = (window.NS && window.NS.reduce) || !d.documentElement.classList.contains('motion');

  var steps = d.querySelector('[data-steps]');
  if (steps) {
    Array.prototype.forEach.call(steps.children, function (li, i) { li.style.setProperty('--i', String(i)); });
    if (reduce || !window.NS) steps.classList.add('is-in');
    else window.NS.onIn(steps, function (el) { el.classList.add('is-in'); }, 0.15);
  }

  Array.prototype.forEach.call(d.querySelectorAll('.faq__q'), function (det) {
    var sum = det.querySelector('summary');
    var body = det.querySelector('.disclose__body');
    if (!sum || !body || reduce || !body.animate) return;
    var anim = null;
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      if (anim) anim.cancel();
      if (!det.open) {
        det.open = true;
        var h = body.offsetHeight;
        anim = body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 280, easing: 'cubic-bezier(.22,.61,.36,1)' });
        anim.onfinish = function () { anim = null; };
      } else {
        var h2 = body.offsetHeight;
        anim = body.animate([{ height: h2 + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 220, easing: 'cubic-bezier(.22,.61,.36,1)' });
        anim.onfinish = function () { det.open = false; anim = null; };
      }
    });
  });

  /* a link to #faq-N opens that answer */
  var open = function () {
    var t = window.location.hash && d.getElementById(window.location.hash.slice(1));
    if (t && t.tagName === 'DETAILS') t.open = true;
  };
  window.addEventListener('hashchange', open);
  open();
})();
