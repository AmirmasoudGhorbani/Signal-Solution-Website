/* ============================================================
   Recent Work — horizontal carousel controls
   Native scroll-snap track + arrow buttons, dots, and
   drag-to-scroll. Degrades gracefully (native scroll) if JS
   is unavailable.
   ============================================================ */
(function () {
  const track = document.getElementById('work-track');
  const prev = document.getElementById('work-prev');
  const next = document.getElementById('work-next');
  const dotsWrap = document.getElementById('work-dots');
  if (!track) return;

  const slides = Array.from(track.querySelectorAll('.work-slide'));
  if (!slides.length) return;

  function step() {
    // distance from one slide to the next (width + gap)
    if (slides.length < 2) return slides[0].offsetWidth;
    return slides[1].offsetLeft - slides[0].offsetLeft;
  }
  function index() {
    return Math.round(track.scrollLeft / step());
  }

  // build dots
  const dots = slides.map((_, i) => {
    const d = document.createElement('i');
    d.addEventListener('click', () => {
      track.scrollTo({ left: step() * i, behavior: 'smooth' });
    });
    dotsWrap.appendChild(d);
    return d;
  });

  function update() {
    const i = index();
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
    const maxScroll = track.scrollWidth - track.clientWidth - 2;
    if (prev) prev.toggleAttribute('disabled', track.scrollLeft <= 2);
    if (next) next.toggleAttribute('disabled', track.scrollLeft >= maxScroll);
  }

  if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  if (next) next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });

  // drag / swipe to scroll (MOUSE ONLY — touch devices use native scroll-snap,
  // which avoids fighting the JS scroll and the resulting jitter on mobile)
  let down = false, startX = 0, startScroll = 0, moved = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = false;
    startX = e.clientX; startScroll = track.scrollLeft;
    track.style.scrollSnapType = 'none';
  });
  window.addEventListener('pointermove', (e) => {
    if (!down || e.pointerType !== 'mouse') return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    track.scrollLeft = startScroll - dx;
  });
  window.addEventListener('pointerup', (e) => {
    if (!down) return;
    down = false;
    track.style.scrollSnapType = 'x mandatory';
    // snap to nearest
    track.scrollTo({ left: step() * index(), behavior: 'smooth' });
  });
  // prevent click-through after a drag
  track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);

  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(update, 150); });
  update();
})();