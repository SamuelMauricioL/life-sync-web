/**
 * LifeSync — Storage Module
 * Wrapper para localStorage con persistencia estructurada.
 */

const LifeSyncDB = {
  _prefix: 'lifesync_',

  _key(key) {
    return this._prefix + key;
  },

  get(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(this._key(key));
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    localStorage.setItem(this._key(key), JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(this._key(key));
  },

  // Usuarios registrados
  getUsuarios() {
    return this.get('usuarios', []);
  },

  setUsuarios(usuarios) {
    this.set('usuarios', usuarios);
  },

  addUsuario(nombre) {
    const usuarios = this.getUsuarios();
    if (!usuarios.includes(nombre)) {
      usuarios.push(nombre);
      this.setUsuarios(usuarios);
    }
    return usuarios;
  },

  // Usuario activo
  getUsuarioActivo() {
    return this.get('usuario_activo', null);
  },

  setUsuarioActivo(nombre) {
    this.set('usuario_activo', nombre);
  },

  // Datos por usuario
  _userKey(usuario, modulo) {
    return `user_${usuario}_${modulo}`;
  },

  getUserData(usuario, modulo, defaultValue = []) {
    return this.get(this._userKey(usuario, modulo), defaultValue);
  },

  setUserData(usuario, modulo, data) {
    this.set(this._userKey(usuario, modulo), data);
  },

  addUserEntry(usuario, modulo, entry) {
    const data = this.getUserData(usuario, modulo, []);
    entry.id = Date.now();
    entry.fecha = entry.fecha || new Date().toISOString().split('T')[0];
    data.push(entry);
    this.setUserData(usuario, modulo, data);
    return data;
  },

  // Limpiar todo
  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this._prefix))
      .forEach(k => localStorage.removeItem(k));
  }
};
