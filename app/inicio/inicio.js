/**
 * LifeSync — Dashboard (app/inicio/)
 */

document.addEventListener('DOMContentLoaded', function() {
  // Mostrar fecha actual
  const hoy = new Date();
  const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('dash-fecha').textContent =
    hoy.toLocaleDateString('es-MX', opciones);

  // Cargar selector de usuario
  const selectUsr = document.getElementById('dash-selector-usuario');
  const usuarios = LifeSyncDB.getUsuarios();
  const activo = LifeSyncDB.getUsuarioActivo();

  usuarios.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u;
    opt.textContent = u;
    if (u === activo) opt.selected = true;
    selectUsr.appendChild(opt);
  });

  // Actualizar saludo
  if (activo) {
    document.getElementById('dash-usuario').textContent = activo;
  }

  // Cargar conteos
  if (activo) {
    const rutinas = LifeSyncDB.getUserData(activo, 'rutinas', []);
    const hoyStr = hoy.toISOString().split('T')[0];
    document.getElementById('count-rutinas').textContent =
      rutinas.filter(r => r.fecha === hoyStr).length;

    const emociones = LifeSyncDB.getUserData(activo, 'emociones', []);
    document.getElementById('count-emociones').textContent =
      emociones.filter(e => e.fecha === hoyStr).length;

    const recordatorios = LifeSyncDB.getUserData(activo, 'recordatorios', []);
    document.getElementById('count-recordatorios').textContent = recordatorios.length;
  }
});

function cambiarUsuario(nombre) {
  if (nombre) {
    LifeSyncAuth.login(nombre);
    document.getElementById('dash-usuario').textContent = nombre;
    location.reload();
  }
}
