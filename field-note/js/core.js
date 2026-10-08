/* Field Note · core behaviour. No dependencies. Every motion has a reduced-motion path:
   with prefers-reduced-motion the final state is shown at once and nothing travels.
   - sheets (Index, year picker): open, drag to dismiss or expand, focus return (A9)
   - year ruler: tap opens the year picker on phones, press-and-drag scrubs with a loupe (A1),
     the ruler draws once per session (A2), the acid bar marks the current volume, a playhead follows the lines
   - reveals: rule draws (A4), rows count in (A3), figures (A8), counters (A11), arrival marks (A5), swipe rows (A16) */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = mqReduce.matches;
  var mqRail = window.matchMedia('(min-width: 1100px)');
  var mqPhone = window.matchMedia('(max-width: 699px)');
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* storage blocked: motion simply replays */ } }
  };

  /* ------------------------------------------------------------------ sheets */
  var openers = {};
  function closeSheet(d) {
    if (!d || !d.open || d.classList.contains('is-closing')) return;
    var done = function () {
      d.classList.remove('is-closing', 'is-full');
      d.style.transform = '';
      d.close();
    };
    if (reduce) { done(); return; }
    d.classList.add('is-closing');
    var t = setTimeout(done, 260);
    d.addEventListener('animationend', function h(e) { if (e.target === d) { clearTimeout(t); d.removeEventListener('animationend', h); done(); } });
  }
  function openSheet(id, opener) {
    var d = doc.getElementById(id);
    if (!d || typeof d.showModal !== 'function') return false;
    openers[id] = opener || doc.activeElement;
    d.showModal();
    if (opener) opener.setAttribute('aria-expanded', 'true');
    var first = d.querySelector('[aria-current], [data-find-input]');
    if (first && !mqPhone.matches) first.focus();
    else { d.setAttribute('tabindex', '-1'); d.focus(); }
    return true;
  }
  $$('dialog.sheet').forEach(function (d) {
    d.addEventListener('cancel', function (e) { e.preventDefault(); closeSheet(d); });
    d.addEventListener('close', function () {
      var o = openers[d.id];
      if (o) { o.setAttribute && o.setAttribute('aria-expanded', 'false'); if (o.focus) o.focus({ preventScroll: true }); }
    });
    d.addEventListener('click', function (e) {
      if (e.target === d) { closeSheet(d); return; } // the backdrop
      if (e.target.closest('[data-close]')) { closeSheet(d); return; }
      var a = e.target.closest('a[href]');
      if (a && a.hash && a.pathname === location.pathname) closeSheet(d);
    });
    // drag the grab handle: down past 30% dismisses, up expands to 92%
    var grab = d.querySelector('[data-grab]');
    if (!grab) return;
    var y0 = 0; var dy = 0; var dragging = false;
    grab.addEventListener('pointerdown', function (e) { dragging = true; y0 = e.clientY; dy = 0; grab.setPointerCapture(e.pointerId); d.style.transition = 'none'; });
    grab.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      dy = e.clientY - y0;
      d.style.transform = dy > 0 ? 'translateY(' + dy + 'px)' : '';
    });
    var end = function () {
      if (!dragging) return;
      dragging = false; d.style.transition = '';
      if (dy > d.offsetHeight * 0.3) { closeSheet(d); return; }
      d.style.transform = '';
      if (dy < -40) d.classList.add('is-full');
      else if (dy > 40) d.classList.remove('is-full');
    };
    grab.addEventListener('pointerup', end);
    grab.addEventListener('pointercancel', end);
  });
  $$('[data-open]').forEach(function (b) {
    b.addEventListener('click', function () {
      var d = doc.getElementById(b.getAttribute('data-open'));
      if (d && d.open) closeSheet(d); else openSheet(b.getAttribute('data-open'), b);
    });
  });

  /* Index: tabs and the place finder */
  var ix = doc.getElementById('ix');
  if (ix) {
    var tabs = $$('[data-tabbtn]', ix);
    var select = function (name) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-tabbtn') === name;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $('[data-tab="' + t.getAttribute('data-tabbtn') + '"]', ix).hidden = !on;
      });
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t.getAttribute('data-tabbtn')); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        select(n.getAttribute('data-tabbtn')); n.focus();
      });
    });
    var input = $('[data-find-input]', ix);
    var empty = $('[data-find-empty]', ix);
    if (input) input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var any = false;
      $$('[data-grp]', ix).forEach(function (g) {
        var shown = 0;
        $$('.prow', g).forEach(function (r) { var ok = !q || r.getAttribute('data-find').indexOf(q) > -1; r.hidden = !ok; if (ok) shown++; });
        g.hidden = shown === 0; if (shown) any = true;
      });
      empty.hidden = any;
    });
  }

  /* ------------------------------------------------------------------ year ruler */
  var yr = $('[data-yr]');
  var segs = yr ? $$('.yr__seg', yr) : [];
  var bar = yr ? $('.yr__bar', yr) : null;
  var cur = yr ? $('.yr__seg[aria-current]', yr) : null;
  var SLOTS = 13.2;

  function placeBar(animate) {
    if (!bar || !cur) return;
    bar.classList.toggle('is-moving', Boolean(animate) && !reduce);
    if (mqRail.matches) {
      bar.style.width = ''; bar.style.height = cur.offsetHeight + 'px';
      bar.style.transform = 'translateY(' + cur.offsetTop + 'px)';
    } else {
      bar.style.height = ''; bar.style.width = cur.offsetWidth + 'px';
      bar.style.transform = 'translateX(' + cur.offsetLeft + 'px)';
    }
  }
  if (yr) {
    // A2: the ruler is counted in once per session, then the acid bar slides to the current volume
    var first = !reduce && !store.get('fn-ruler');
    if (first) {
      yr.classList.add('is-drawing');
      if (bar && cur) { bar.style.width = mqRail.matches ? '' : cur.offsetWidth + 'px'; bar.style.height = mqRail.matches ? cur.offsetHeight + 'px' : ''; bar.style.transform = 'translate(0, 0)'; }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          yr.classList.add('is-drawn'); yr.classList.remove('is-drawing');
          setTimeout(function () { placeBar(true); }, 360);
        });
      });
      store.set('fn-ruler', '1');
    } else placeBar(false);
    window.addEventListener('resize', function () { placeBar(false); });

    var data = function (seg) {
      var raw = seg.getAttribute('data-l');
      if (!raw) return [];
      return raw.split(';').map(function (s) { var p = s.split('|'); return { m: +p[0], no: p[1], mon: p[2], pl: p[3] }; });
    };
    var hitAt = function (x) {
      for (var i = 0; i < segs.length; i++) {
        var r = segs[i].getBoundingClientRect();
        if (x >= r.left && x <= r.right) {
          var lines = data(segs[i]);
          if (!lines.length) return { seg: segs[i], line: null };
          var slot = Math.max(0, Math.min(12, Math.floor(((x - r.left) / r.width) * SLOTS)));
          var best = lines[0];
          lines.forEach(function (l) { if (Math.abs(l.m - 1 - slot) < Math.abs(best.m - 1 - slot)) best = l; });
          return { seg: segs[i], line: best };
        }
      }
      return null;
    };

    // A1: scrub with a loupe (dock only: phones and 768)
    var loupe = $('[data-loupe]');
    var strip = loupe ? $('.loupe__strip', loupe) : null;
    var read = loupe ? $('.loupe__read', loupe) : null;
    var sx = 0; var scrubbing = false; var pid = null; var target = null; var suppressClick = false;
    var buildStrip = function () {
      if (!strip || strip.childElementCount) return;
      var inner = $('.yr__in', yr);
      segs.forEach(function (s) { var c = s.cloneNode(true); c.removeAttribute('href'); c.removeAttribute('aria-label'); c.style.width = (s.offsetWidth * 3) + 'px'; strip.appendChild(c); });
      strip.style.width = (inner.offsetWidth * 3) + 'px';
    };
    var moveLoupe = function (x) {
      var hit = hitAt(x);
      var inner = $('.yr__in', yr).getBoundingClientRect();
      var lw = loupe.offsetWidth;
      var left = Math.max(8, Math.min(window.innerWidth - lw - 8, x - lw / 2));
      loupe.style.transform = '';
      loupe.style.left = left + 'px';
      strip.style.transform = 'translateX(' + (lw / 2 - (x - inner.left) * 3) + 'px)';
      target = null;
      if (hit && hit.line) {
        var y = hit.seg.getAttribute('data-y');
        read.textContent = 'Vol. ' + y + ' · No. ' + hit.line.no + ' · ' + hit.line.mon + ' · ' + hit.line.pl;
        target = hit.seg.href + '#no-' + hit.line.no;
      } else if (hit) {
        read.textContent = hit.seg.getAttribute('data-y') === 'pro' ? 'Before full time · 2013–2016' : '';
        target = hit.seg.href;
      }
    };
    yr.addEventListener('pointerdown', function (e) {
      if (mqRail.matches || e.button > 0) return;
      sx = e.clientX; pid = e.pointerId; scrubbing = false; target = null;
    });
    yr.addEventListener('pointermove', function (e) {
      if (pid !== e.pointerId || mqRail.matches || !loupe) return;
      if (!scrubbing && Math.abs(e.clientX - sx) > 6) {
        scrubbing = true; suppressClick = true;
        try { yr.setPointerCapture(pid); } catch (err) { /* capture is optional */ }
        buildStrip(); loupe.classList.add('is-on');
      }
      if (scrubbing) moveLoupe(e.clientX);
    });
    var release = function (e) {
      if (pid !== e.pointerId) return;
      pid = null;
      if (!scrubbing) return;
      scrubbing = false; loupe.classList.remove('is-on');
      setTimeout(function () { suppressClick = false; }, 80);
      var off = e.type === 'pointercancel' || e.clientY < yr.getBoundingClientRect().top - 80;
      if (!off && target) location.href = target;
    };
    yr.addEventListener('pointerup', release);
    yr.addEventListener('pointercancel', release);
    segs.forEach(function (s, i) {
      s.addEventListener('click', function (e) {
        if (suppressClick) { e.preventDefault(); suppressClick = false; return; }
        if (mqPhone.matches && doc.getElementById('yp')) { e.preventDefault(); openSheet('yp', s); }
      });
      s.addEventListener('keydown', function (e) {
        var back = mqRail.matches ? 'ArrowDown' : 'ArrowLeft';
        var fwd = mqRail.matches ? 'ArrowUp' : 'ArrowRight';
        if (e.key !== back && e.key !== fwd) return;
        e.preventDefault();
        var n = segs[i + (e.key === fwd ? 1 : -1)];
        if (n) n.focus();
      });
    });

    // playhead: follows the line at the top of the viewport (volume pages)
    var rows = cur ? $$('main .ln[data-ref]').filter(function (r) { return r.getAttribute('data-ref').indexOf(cur.getAttribute('data-y') + '-') === 0; }) : [];
    var play = $('.yr__play', yr);
    if (rows.length > 3 && play && 'IntersectionObserver' in window) {
      var monthOf = {};
      data(cur).forEach(function (l) { monthOf[l.no] = l.m; });
      var setPlay = function (row) {
        var no = row.getAttribute('data-ref').split('-')[1];
        var m = monthOf[no] || 13;
        yr.classList.add('has-play');
        if (mqRail.matches) {
          play.style.transform = 'translateY(' + (cur.offsetTop + cur.offsetHeight - 10) + 'px)';
          play.style.left = (((m - 0.5) / SLOTS) * cur.offsetWidth) + 'px'; play.style.width = '1px'; play.style.height = '14px';
        } else {
          play.style.transform = 'translateX(' + (cur.offsetLeft + ((m - 0.5) / SLOTS) * cur.offsetWidth) + 'px)';
        }
      };
      var vis = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) setPlay(en.target); });
      }, { rootMargin: '-56px 0px -70% 0px' });
      rows.forEach(function (r) { vis.observe(r); });
    }
  }

  /* ------------------------------------------------------------------ reveals */
  // A3: wrap row numbers into rolling digits
  $$('.ln[data-roll] .ln__no').forEach(function (el) {
    var t = el.textContent; var k = 0;
    el.innerHTML = t.replace(/\d/g, function (d) { return '<span class="dg" style="--k:' + (k++) + '"><span>' + d + '</span></span>'; });
    el.setAttribute('aria-label', t);
  });
  $$('.cal').forEach(function (c) { $$('.cal__l', c).forEach(function (a, i) { a.style.setProperty('--r', String(i)); }); });
  $$('.sps .sp').forEach(function (a, i) { a.style.setProperty('--row', String(i)); });

  var counted = function (el) {
    var end = +el.getAttribute('data-count');
    if (reduce || !end) return;
    var t0 = null;
    var step = function (t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 600);
      el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  };
  var items = $$('.rv, .fade');
  var counters = $$('[data-count]');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var d = el.getAttribute('data-rv');
        if (d) el.style.setProperty('--d0', d + 'ms');
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.intersectionRatio >= 0.5) { counted(en.target); co.unobserve(en.target); } });
    }, { threshold: [0.5] });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* A5: arrival mark. One row is marked at a time. */
  var marked = null;
  function arrive(el) {
    if (!el) return;
    if (marked && marked !== el) marked.classList.remove('is-marked', 'is-arriving');
    marked = el;
    if (reduce) { el.classList.add('is-marked'); return; }
    el.classList.remove('is-arriving'); void el.offsetWidth;
    el.classList.add('is-arriving');
    setTimeout(function () { el.classList.add('is-marked'); }, 720);
  }
  var fromHash = function () {
    if (!location.hash) return false;
    var el; try { el = doc.querySelector(location.hash); } catch (e) { return false; }
    if (el && el.matches('.ln, .cal__l')) { arrive(el); return true; }
    return false;
  };
  window.addEventListener('hashchange', fromHash);
  if (!fromHash()) {
    // Contents: the newest line is marked once the load sequence settles
    var newest = $$('[data-newest]').filter(function (n) { return n.offsetParent !== null; })[0];
    if (newest) setTimeout(function () { arrive(newest); }, reduce ? 0 : 1100);
  }

  /* A16: swipe rows count their position */
  $$('[data-swipe]').forEach(function (track) {
    var sec = track.closest('section');
    var out = sec ? $('[data-swipe-n]', sec) : null;
    if (!out) return;
    var n = track.children.length;
    var pad2 = function (x) { return (x < 10 ? '0' : '') + x; };
    track.addEventListener('scroll', function () {
      var w = track.children[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
      out.textContent = pad2(Math.min(n, Math.round(track.scrollLeft / w) + 1)) + ' / ' + pad2(n);
    }, { passive: true });
  });

  /* ↑ Top: back to the page head and its first focusable heading */
  $$('[data-totop]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var m = doc.getElementById('main');
      if (m) { m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); }
    });
  });

  mqReduce.addEventListener && mqReduce.addEventListener('change', function (e) { reduce = e.matches; });
  root.classList.add('is-ready');
})();
