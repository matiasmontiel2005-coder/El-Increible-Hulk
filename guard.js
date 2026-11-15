// Anti-clickjacking: si la página se carga dentro de un iframe ajeno, se oculta y se intenta salir de él.
(function () {
  if (window.top !== window.self) {
    document.documentElement.style.display = 'none';
    try { window.top.location.href = window.self.location.href; } catch (e) { /* bloqueado: la página queda oculta */ }
  }
})();
