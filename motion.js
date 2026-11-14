/* Capa de movimiento. Todo el movimiento vive acá (+ la sección "Movimiento" de styles.css),
   así se puede cambiar sin tocar la lógica de la app. Respeta prefers-reduced-motion. */
window.Motion = (() => {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  let io = null;

  // Entrada de una vista: aparición escalonada + reveal al hacer scroll + contadores.
  function enter(view, animate) {
    view.classList.toggle('anim', !!animate && !reduce);
    if (!animate || reduce) return;
    const kids = [...view.children];
    kids.forEach((el, i) => { el.classList.add('rv'); el.style.setProperty('--d', Math.min(i, 9) * 70 + 'ms'); });
    view.querySelectorAll('.day.done').forEach((el, k) => el.style.setProperty('--k', k));
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) { kids.forEach(k => k.classList.add('in')); }
    else {
      io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }), { threshold: .06, rootMargin: '0px 0px -5% 0px' });
      kids.forEach(k => io.observe(k));
    }
    setTimeout(() => kids.forEach(k => k.classList.add('in')), 2500); // red de seguridad
    countUps(view);
  }

  // Números que suben desde 0.
  function countUps(root) {
    root.querySelectorAll('.stat b').forEach(el => {
      const m = el.textContent.trim().match(/^(\d+)(?:,(\d+))?$/);
      if (!m) return;
      const dec = (m[2] || '').length, to = parseFloat(m[1] + (m[2] ? '.' + m[2] : ''));
      if (!to) return;
      const fmt = v => v.toFixed(dec).replace('.', ',');
      const t0 = performance.now(), dur = 1000;
      el.textContent = fmt(0);
      (function f(t) {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(f); else el.textContent = fmt(to);
      })(t0);
    });
  }

  // Barra inferior: se construye una vez y el indicador se desliza.
  function buildNav(tabs) {
    const nav = $('#tabs');
    nav.style.setProperty('--n', tabs.length);
    nav.innerHTML = '<i class="ind"></i>' + tabs.map(([k, n]) => `<a href="#/${k}" data-tab="${k}">${n}</a>`).join('');
  }
  function setNav(key, tabs) {
    const nav = $('#tabs');
    nav.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.tab === key));
    nav.style.setProperty('--idx', Math.max(0, tabs.findIndex(t => t[0] === key)));
  }

  function sweep() {
    if (reduce) return;
    const top = $('.top'); if (!top) return;
    top.classList.remove('sweep'); void top.offsetWidth; top.classList.add('sweep');
  }
  function pop(el) { if (!el || reduce) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }

  // Scroll: el header se esconde al bajar y vuelve al subir; el numeral del héroe se desplaza suave.
  let last = 0, tick = false;
  window.addEventListener('scroll', () => {
    if (tick) return; tick = true;
    requestAnimationFrame(() => {
      const y = Math.max(0, window.scrollY), top = $('.top');
      document.documentElement.style.setProperty('--sy', y);
      if (top && !reduce) top.classList.toggle('away', y > last && y > 90);
      last = y; tick = false;
    });
  }, { passive: true });

  return { enter, buildNav, setNav, sweep, pop };
})();
