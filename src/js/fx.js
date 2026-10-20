/* Galaxa Tech effects: split headings, pointer parallax, magnetic buttons, scenes, globe, 3D hero loader. */
(function () {
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = matchMedia('(pointer:fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;

  /* Split headings into animated words */
  $$('.rvw').forEach(function (el) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w'; w.style.setProperty('--wi', n++);
            var i = document.createElement('span'); i.textContent = part; w.appendChild(i); frag.appendChild(w);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    })(el);
  });
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.2 }) : null;
  $$('.rvw').forEach(function (el) { if (io && !RM) io.observe(el); else el.classList.add('in'); });
  /* hero headings animate right away */
  setTimeout(function () { $$('.hero2 .rvw').forEach(function (el) { el.classList.add('in'); }); }, 350);

  /* Measure SVG paths so line-draw animations are exact */
  $$('path[data-len]').forEach(function (p) { try { p.style.setProperty('--len', Math.ceil(p.getTotalLength()) + 2); } catch (e) {} });

  /* Pause scene animations when off-screen */
  var scenes = $$('[data-scene],[data-scanner]');
  var sio = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.classList.toggle('on', e.isIntersecting); });
  }, { threshold: 0.15 }) : null;
  scenes.forEach(function (s) { if (sio) sio.observe(s); else s.classList.add('on'); });

  /* Pointer: parallax variables, cursor glow, card spotlight, magnetic buttons */
  if (FINE && !RM) {
    document.body.classList.add('fine');
    var glow = document.createElement('div'); glow.className = 'cglow'; document.body.appendChild(glow);
    var raf = 0, px = 0, py = 0;
    addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (!raf) raf = requestAnimationFrame(function () {
        raf = 0;
        glow.style.transform = 'translate(' + px + 'px,' + py + 'px)';
        root.style.setProperty('--hx', ((px / innerWidth - 0.5) * 2).toFixed(3));
        root.style.setProperty('--hy', ((py / innerHeight - 0.5) * 2).toFixed(3));
      });
    }, { passive: true });
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.card');
      if (c) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); }
    }, { passive: true });
    $$('.mag').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.16) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.28) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* Hero mini audit: send the typed address to the audit page */
  var am = $('#amini');
  if (am) am.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = ($('input', am).value || '').trim();
    location.href = '/free-audit' + (v ? '?site=' + encodeURIComponent(v) : '') + '#form';
  });

  /* Automation: manual / automated toggle + autoplay */
  $$('[data-auto]').forEach(function (box) {
    var btns = $$('button', box), touched = false, timer;
    function set(mode) {
      box.classList.toggle('manual', mode === 'manual');
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { touched = true; clearInterval(timer); set(b.dataset.mode); }); });
    if (!RM) {
      var phase = 0;
      timer = setInterval(function () {
        if (touched || !box.classList.contains('on')) return;
        phase = (phase + 1) % 2; set(phase ? 'auto' : 'manual');
      }, 4800);
      setTimeout(function () { if (!touched && box.classList.contains('on')) set('auto'); }, 1800);
    } else set('auto');
  });

  /* Finance: rotating globe with arcs between our six markets */
  var gc = $('#globe');
  if (gc && gc.getContext) {
    var ctx = gc.getContext('2d'), W = 0, H = 0, dpr = 1, rot = 0.6, drag = false, lastX = 0, vis = false, t0 = performance.now();
    var CITIES = [['USA', 39, -98], ['UK', 54, -2], ['Saudi Arabia', 24, 45], ['Pakistan', 30, 70], ['India', 22, 79], ['Bangladesh', 24, 90]];
    var ARCS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 4], [1, 4]];
    function vec(lat, lon) { var a = lat * Math.PI / 180, b = lon * Math.PI / 180; return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)]; }
    var pts = [], N = 1300, phi = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) { var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = phi * i; pts.push([Math.cos(th) * r, y, Math.sin(th) * r]); }
    var cv = CITIES.map(function (c) { return vec(c[1], c[2]); });
    var TILT = 0.38;
    function rotv(v, ry) {
      var x = v[0] * Math.cos(ry) + v[2] * Math.sin(ry), z = -v[0] * Math.sin(ry) + v[2] * Math.cos(ry), y = v[1];
      var y2 = y * Math.cos(TILT) - z * Math.sin(TILT), z2 = y * Math.sin(TILT) + z * Math.cos(TILT);
      return [x, y2, z2];
    }
    function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = gc.clientWidth; H = gc.clientHeight; gc.width = W * dpr; gc.height = H * dpr; }
    function proj(p, R, cx, cy) { return [cx + p[0] * R, cy - p[1] * R]; }
    function frame(now) {
      var tt = (now - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      var R = Math.min(W, H) * 0.44, cx = W / 2, cy = H * 0.47;
      var g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R * 1.05);
      g.addColorStop(0, 'rgba(255,77,6,.16)'); g.addColorStop(1, 'rgba(255,77,6,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(242,236,230,.16)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
      for (var i = 0; i < pts.length; i++) {
        var p = rotv(pts[i], rot); if (p[2] < -0.05) continue;
        var s = proj(p, R, cx, cy), a = 0.28 + 0.72 * Math.max(0, p[2]);
        ctx.fillStyle = 'rgba(242,236,230,' + a.toFixed(2) + ')'; ctx.fillRect(s[0], s[1], 2, 2);
      }
      ARCS.forEach(function (pr, k) {
        var A = cv[pr[0]], B = cv[pr[1]], om = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]))), so = Math.sin(om) || 1;
        var prog = RM ? 1 : ((tt * 0.22 + k * 0.17) % 1.6), head = Math.min(1, prog), tail = Math.max(0, prog - 0.55);
        ctx.beginPath(); var started = false;
        for (var j = 0; j <= 48; j++) {
          var u = j / 48; if (u < tail || u > head) continue;
          var l = 1 + 0.2 * Math.sin(Math.PI * u) * (om / Math.PI + 0.25);
          var v = [(Math.sin((1 - u) * om) * A[0] + Math.sin(u * om) * B[0]) / so * l, (Math.sin((1 - u) * om) * A[1] + Math.sin(u * om) * B[1]) / so * l, (Math.sin((1 - u) * om) * A[2] + Math.sin(u * om) * B[2]) / so * l];
          var q = rotv(v, rot); if (q[2] < -0.02) { started = false; continue; }
          var sp = proj(q, R, cx, cy); if (!started) { ctx.moveTo(sp[0], sp[1]); started = true; } else ctx.lineTo(sp[0], sp[1]);
        }
        ctx.strokeStyle = 'rgba(255,120,60,.95)'; ctx.lineWidth = 2; ctx.shadowColor = 'rgba(255,77,6,.9)'; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
      });
      ctx.font = '600 ' + Math.max(11, W * 0.016) + 'px "JetBrains Mono",monospace';
      CITIES.forEach(function (c, i) {
        var p = rotv(cv[i], rot); if (p[2] < 0.04) return;
        var s = proj(p, R, cx, cy), pulse = RM ? 0 : (Math.sin(tt * 3 + i) + 1) * 3;
        ctx.fillStyle = 'rgba(255,77,6,.25)'; ctx.beginPath(); ctx.arc(s[0], s[1], 7 + pulse, 0, 7); ctx.fill();
        ctx.fillStyle = '#FF4D06'; ctx.beginPath(); ctx.arc(s[0], s[1], 4.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#F2ECE6'; ctx.fillText(c[0], s[0] + 12, s[1] + 4);
      });
      if (!drag && !RM) rot += 0.0032;
    }
    function loop(now) { if (vis) frame(now); requestAnimationFrame(loop); }
    size(); addEventListener('resize', size);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { threshold: 0.05 }).observe(gc); else vis = true;
    gc.addEventListener('pointerdown', function (e) { drag = true; lastX = e.clientX; gc.setPointerCapture(e.pointerId); });
    gc.addEventListener('pointermove', function (e) { if (drag) { rot += (e.clientX - lastX) * 0.008; lastX = e.clientX; if (RM) frame(performance.now()); } });
    gc.addEventListener('pointerup', function () { drag = false; });
    gc.style.touchAction = 'pan-y'; gc.style.cursor = 'grab';
    if (RM) frame(performance.now()); else requestAnimationFrame(loop);
  }

  /* 3D hero (desktop, motion allowed, WebGL available) */
  var h3 = $('#h3d'), hero = $('.hero2');
  var wide = matchMedia('(min-width:1000px)').matches, save = navigator.connection && navigator.connection.saveData;
  if (h3 && hero && wide && !RM && !save) {
    var go = function () {
      import('/js/hero3d.js').then(function (m) { return m.start(h3, hero); })
        .then(function (ok) { if (ok) hero.classList.add('has3d'); })
        .catch(function () {});
    };
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1800 }); else setTimeout(go, 900);
  }
})();
