/* Galaxa Tech site script: nav, reveals, forms (Firebase), work filters. */
(function () {
  'use strict';

  var CONFIG = {
    firebase: {
      apiKey: 'AIzaSyAPaGS8pkvSH_0Kj9e5Ad33OAHDV3kXQJ0',
      authDomain: 'galaxatechweb.firebaseapp.com',
      projectId: 'galaxatechweb',
      storageBucket: 'galaxatechweb.firebasestorage.app',
      messagingSenderId: '81061530018',
      appId: '1:81061530018:web:819d48485e1f08b3454afb'
    },
    whatsapp: '8801824888701',
    // Email alert: paste the deployed Google Apps Script web-app URL here (see tools/email-alert.gs). Empty = no email alert.
    alertUrl: ''
  };

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Nav, progress bar */
  var nav = $('#navbar'), prog = $('#prog');
  function onScroll() {
    var h = document.documentElement;
    nav.classList.toggle('scrolled', window.scrollY > 40);
    var max = h.scrollHeight - h.clientHeight;
    prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* Mobile menu */
  var sheet = $('#sheet'), burger = $('#burger');
  function setSheet(o) {
    sheet.classList.toggle('open', o);
    document.body.classList.toggle('lock', o);
    burger.setAttribute('aria-expanded', String(o));
  }
  burger.addEventListener('click', function () { setSheet(!sheet.classList.contains('open')); });
  $('#sheetX').addEventListener('click', function () { setSheet(false); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') setSheet(false); });
  $$('a', sheet).forEach(function (a) { a.addEventListener('click', function () { setSheet(false); }); });

  /* Reveal on scroll */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window && !RM) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else { rv.forEach(function (el) { el.classList.add('in'); }); }

  /* Toast */
  var toastEl = $('#toast'), tt;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove('show'); }, 2600); }

  /* Work filters */
  $$('.filters').forEach(function (f) {
    f.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('button', f).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var t = b.dataset.filter;
      $$('.work').forEach(function (w) { w.hidden = !(t === 'all' || w.dataset.type === t); });
    });
  });

  /* Forms -> Firestore */
  var FB_VER = '10.14.1', fbPromise;
  function loadFirebase() {
    if (!fbPromise) {
      fbPromise = Promise.all([
        import('https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-firestore.js')
      ]).then(function (m) {
        var app = m[0].initializeApp(CONFIG.firebase);
        return { db: m[1].getFirestore(app), fs: m[1] };
      });
    }
    return fbPromise;
  }
  var COLLECTIONS = { audit: 'audit_requests', automation: 'automation_requests', contact: 'contact_requests' };
  var LABELS = { audit: 'FREE WEBSITE AUDIT REQUEST', automation: 'AI AUTOMATION ENQUIRY', contact: 'QUOTE / CONTACT REQUEST' };

  function waLink(kind, d) {
    var lines = ['Hi Galaxa Tech, ' + { audit: 'I just requested a free website audit.', automation: 'I just sent an AI automation enquiry.', contact: 'I just sent a message from your website.' }[kind]];
    if (d.name) lines.push('Name: ' + d.name);
    if (d.business) lines.push('Business: ' + d.business);
    if (d.website) lines.push('Website: ' + d.website);
    if (d.service) lines.push('Service: ' + d.service);
    return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  $$('form[data-form]').forEach(function (form) {
    var kind = form.dataset.form, btn = $('button[type=submit]', form), err = $('.err', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if ($('.hp input', form) && $('.hp input', form).value) return; // honeypot
      err.textContent = '';
      var fd = new FormData(form), d = {};
      ['name', 'email', 'business', 'website', 'whatsapp', 'service', 'message'].forEach(function (k) {
        var v = (fd.get(k) || '').toString().trim();
        if (v) d[k] = v.slice(0, k === 'message' ? 2000 : 300);
      });
      if (!d.name || !d.email) { err.textContent = 'Please add your name and email.'; return; }
      if (kind === 'audit' && !d.website) { err.textContent = 'Please add your website address.'; return; }
      btn.disabled = true; var old = btn.textContent; btn.textContent = 'Sending…';
      loadFirebase().then(function (f) {
        var payload = Object.assign({}, d, { source: kind, page: location.pathname, createdAt: f.fs.serverTimestamp() });
        return f.fs.addDoc(f.fs.collection(f.db, COLLECTIONS[kind]), payload);
      }).then(function () {
        if (CONFIG.alertUrl) {
          try { fetch(CONFIG.alertUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(Object.assign({ type: LABELS[kind] }, d)) }); } catch (x) {}
        }
        var wa = $('.ok-box a.wa', form); if (wa) wa.href = waLink(kind, d);
        form.classList.add('sent');
        form.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' });
      }).catch(function () {
        btn.disabled = false; btn.textContent = old;
        err.textContent = 'Sorry, that did not send. Please message us on ';
        var a = document.createElement('a');
        a.href = waLink(kind, d); a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'WhatsApp';
        a.style.textDecoration = 'underline';
        err.appendChild(a); err.appendChild(document.createTextNode(' instead.'));
      });
    });
  });

  /* Prefill the audit form from ?site=... (hero mini form) */
  try {
    var qs = new URLSearchParams(location.search).get('site');
    var wf = document.querySelector('form[data-form=audit] input[name=website]');
    if (qs && wf) { wf.value = /^https?:\/\//i.test(qs) ? qs : 'https://' + qs; }
  } catch (e) {}

  window.GT = { toast: toast };
})();
