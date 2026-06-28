/**
 * LifeSync — Auth Module
 * Maneja la selección y persistencia del usuario activo.
 */

const LifeSyncAuth = {
  init() {
    const usuario = LifeSyncDB.getUsuarioActivo();
    if (usuario) {
      this._actualizarUI(usuario);
    }
  },

  login(nombre) {
    LifeSyncDB.addUsuario(nombre);
    LifeSyncDB.setUsuarioActivo(nombre);
    this._actualizarUI(nombre);
  },

  logout() {
    LifeSyncDB.setUsuarioActivo(null);
    window.location.href = '/equipo/about/about.html';
  },

  getUsuario() {
    return LifeSyncDB.getUsuarioActivo();
  },

  _actualizarUI(nombre) {
    const el = document.getElementById('user-name');
    if (el) el.textContent = nombre;

    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) loginBtn.textContent = 'Cambiar usuario';
  }
};

// Inicializar cuando el DOM cargue
document.addEventListener('DOMContentLoaded', () => LifeSyncAuth.init());
