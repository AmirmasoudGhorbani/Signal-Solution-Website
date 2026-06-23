/* ============================================================
   Site interactions: nav, mobile menu, scroll reveals,
   stat counters, suburb cycler, form submit, starfield.
   ============================================================ */
(function () {
  /* nav scroll state */
  const nav = document.getElementById('nav');
  const onScroll = () => { if (nav) nav.classList.toggle('scrolled', window.scrollY > 30); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile menu */
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    const setIcon = (open) => { toggle.innerHTML = open
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>'; };
    const close = () => { menu.classList.remove('open'); setIcon(false); };
    toggle.addEventListener('click', (e) => { e.stopPropagation(); setIcon(menu.classList.toggle('open')); });
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        close();
        setTimeout(() => {
          const target = document.querySelector(href);
          if (target) {
            const top = target.getBoundingClientRect().top + window.scrollY - 82;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }, 260);
      } else {
        close();
      }
    }));
    // close on outside click / scroll / escape
    document.addEventListener('click', (e) => { if (menu.classList.contains('open') && !menu.contains(e.target) && e.target !== toggle) close(); });
    window.addEventListener('scroll', () => { if (menu.classList.contains('open')) close(); }, { passive: true });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* scroll reveals */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* stat counters */
  const counted = new WeakSet();
  const statIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting || counted.has(e.target)) return;
      counted.add(e.target);
      const node = e.target;
      const target = parseFloat(node.dataset.count);
      const suffix = node.dataset.suffix || '';
      const dec = (node.dataset.count.indexOf('.') > -1) ? 1 : 0;
      const dur = 1500; const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        node.textContent = (target * eased).toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(tick); else node.textContent = target.toFixed(dec) + suffix;
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(el => statIO.observe(el));

  /* suburb sequential highlight */
  const subs = Array.from(document.querySelectorAll('.suburb'));
  if (subs.length) {
    let i = 0;
    setInterval(() => {
      subs.forEach(s => s.classList.remove('on'));
      subs[i % subs.length].classList.add('on');
      i++;
    }, 1400);
  }

  /* contact form */
  const form = document.getElementById('quote-form');
  if (form) {
    const successBox = document.getElementById('form-success');
    const submitBtn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = {
        Name: fd.get('name') || '',
        Phone: fd.get('phone') || '',
        Email: fd.get('email') || '',
        Service: fd.get('service') || '',
        Message: fd.get('message') || '',
        Source: 'Website quote form',
      };
      const origLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
      let res = { ok: true, method: 'mailto' };
      if (typeof window.submitLead === 'function') {
        res = await window.submitLead(data, 'New quote request — TV Signal Solutions');
      }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origLabel; }
      // tailor the success note to how it was delivered
      const note = document.getElementById('form-success-note');
      if (note) {
        note.innerHTML = res.method === 'mailto'
          ? 'Your email app should have opened with your enquiry ready to send — just hit send. Prefer to call? <a href="tel:0220746441" style="color:var(--accent-2)">022 074 6441</a>.'
          : 'We\'ve received your request and will be in touch shortly. Need it sorted now? Call <a href="tel:0220746441" style="color:var(--accent-2)">022 074 6441</a>.';
      }
      successBox.classList.add('show');
    });
    const resetBtn = document.getElementById('form-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      successBox.classList.remove('show');
      form.reset();
    });
  }

  /* year */
  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* year handled above; animated background lives in background.js */
})();