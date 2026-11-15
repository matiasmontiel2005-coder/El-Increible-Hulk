/* Capa de movimiento. Todo el movimiento vive acá (+ la sección "Movimiento" de styles.css),
   así se puede cambiar sin tocar la lógica de la app. Respeta prefers-reduced-motion.
   Inspirado en: pantallas que se deslizan con desenfoque, hoja inferior con rebote que aleja
   la pantalla de atrás, contenido que pasa de borroso a nítido y ondas suaves al tocar. */
window.Motion = (() => {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  let io = null;

  // Instantánea de la pantalla actual para que se deslice hacia afuera mientras entra la nueva.
  function ghost(view) {
    if (reduce || !view.firstElementChild) return null;
    const r = view.getBoundingClientRect();
    const g = document.createElement('div'); g.className = 'ghost';
    g.style.left = r.left + 'px'; g.style.width = r.width + 'px';
    const w = document.createElement('div');
    w.style.cssText = `transform:translateY(${r.top}px);padding:24px 20px 0`;
    w.innerHTML = view.innerHTML;
    w.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    w.querySelectorAll('.rv').forEach(e => { e.classList.add('in'); e.style.transition = 'none'; });
    const src = view.querySelectorAll('canvas'), dst = w.querySelectorAll('canvas');
    src.forEach((c, i) => { try { dst[i].width = c.width; dst[i].height = c.height; dst[i].getContext('2d').drawImage(c, 0, 0); } catch { /* sin gráfico */ } });
    g.appendChild(w); document.body.appendChild(g);
    return g;
  }
  function leave(g, dir) {
    if (!g) return;
    g.style.setProperty('--gdir', dir);
    setTimeout(() => g.remove(), 800);
  }

  // Entrada de una vista: capas con distinta velocidad + reveal al hacer scroll + contadores.
  function enter(view, animate, o = {}) {
    view.classList.toggle('anim', !!animate && !reduce);
    if (!animate || reduce) return;
    const dir = o.dir || 1, vh = window.innerHeight;
    const kids = [...view.children];
    kids.forEach((el, i) => {
      const below = el.getBoundingClientRect().top > vh * .92;
      el.classList.add('rv', o.slide && !below ? 'rv-x' : 'rv-y');
      el.style.setProperty('--dx', dir * (34 + Math.min(i, 8) * 18) + 'px');
      el.style.setProperty('--d', Math.min(i, 9) * 60 + 'ms');
    });
    view.querySelectorAll('.day.done').forEach((el, k) => el.style.setProperty('--k', k));
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) { kids.forEach(k => k.classList.add('in')); }
    else {
      io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }), { threshold: .06, rootMargin: '0px 0px -5% 0px' });
      requestAnimationFrame(() => kids.forEach(k => io.observe(k))); // un frame después: así parten desde su pose inicial
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
    nav.innerHTML = '<i class="ind"></i>' + tabs.map(([k, n, ic]) => `<a href="#/${k}" data-tab="${k}" aria-label="${n}" title="${n}">${ic || n}</a>`).join('');
  }
  function setNav(key, tabs) {
    const nav = $('#tabs');
    nav.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.tab === key));
    nav.style.setProperty('--idx', Math.max(0, tabs.findIndex(t => t[0] === key)));
  }

  function sweep() {
    const top = $('.top'); if (!top) return;
    top.classList.remove('away');
    if (reduce) return;
    top.classList.remove('sweep'); void top.offsetWidth; top.classList.add('sweep');
  }
  function pop(el) { if (!el || reduce) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }

  // Onda suave al tocar botones, chips y pestañas.
  document.addEventListener('pointerdown', ev => {
    if (reduce) return;
    const el = ev.target.closest && ev.target.closest('button, .btn, .chip, .tabs a');
    if (!el || el.disabled) return;
    const r = el.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2;
    const d = document.createElement('span'); d.className = 'ripple';
    d.style.cssText = `width:${size}px;height:${size}px;left:${ev.clientX - r.left - size / 2}px;top:${ev.clientY - r.top - size / 2}px`;
    el.appendChild(d); setTimeout(() => d.remove(), 750);
  }, { passive: true });

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

  return { enter, ghost, leave, buildNav, setNav, sweep, pop };
})();
