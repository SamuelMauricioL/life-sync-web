/**
 * LifeSync — App Module
 * Inicialización global e inyección de componentes compartidos.
 */

const LifeSyncApp = {
  init() {
    this._injectNavbar();
    this._injectFooter();
    this._highlightActiveNav();
  },

  _injectNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    const usuario = LifeSyncDB.getUsuarioActivo();

    placeholder.innerHTML = `
      <nav class="navbar">
        <div class="navbar-brand">
          <a href="/app/inicio/inicio.html">✨ LifeSync</a>
        </div>
        <div class="navbar-links">
          <a href="/app/inicio/inicio.html">Inicio</a>
          <a href="/app/planificar/planificar.html">📋 Planificar</a>
          <a href="/app/bienestar/historial/historial.html">💜 Bienestar</a>
          <a href="/equipo/about/about.html">Equipo</a>
        </div>
        <div class="navbar-user">
          <span>👤 <span id="user-name">${usuario || 'Invitado'}</span></span>
        </div>
      </nav>
    `;
  },

  _injectFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    placeholder.innerHTML = `
      <div class="footer">
        <p>LifeSync &copy; ${new Date().getFullYear()} &mdash; Hecho con 💜 por el equipo</p>
      </div>
    `;
  },

  _highlightActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.navbar-links a').forEach(a => {
      if (path.startsWith(a.getAttribute('href'))) {
        a.style.backgroundColor = 'rgba(255,255,255,0.2)';
        a.style.fontWeight = 'bold';
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => LifeSyncApp.init());
