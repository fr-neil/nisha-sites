/* Questions and answers: the 1 px rule beside each Q. number draws once the question is in view (300 ms).
   Without this file, or with reduced motion, the rules are simply drawn. */
(function () {
  'use strict';
  var d = document;
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var items = Array.prototype.slice.call(d.querySelectorAll('.qa'));
  if (!items.length) return;
  var vh = window.innerHeight;
  // questions already on screen at load are drawn at once (no motion on the first screen's reading)
  items.forEach(function (q) { if (q.getBoundingClientRect().top < vh) q.classList.add('is-in'); });
  d.body.classList.add('qa-anim');
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } });
  }, { rootMargin: '0px 0px -15% 0px' });
  items.forEach(function (q) { if (!q.classList.contains('is-in')) io.observe(q); });
})();
