/**
 * LifeSync — Horario Semanal (planificacion/horario/)
 * Renderiza un grid semanal con tareas desde localStorage.
 */

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

document.addEventListener('DOMContentLoaded', function() {
  renderHorario();
});

function renderHorario() {
  const grid = document.getElementById('horario-grid');
  const semanaInfo = document.getElementById('semana-info');

  // Calcular lunes de esta semana
  const hoy = new Date();
  const diaSem = hoy.getDay(); // 0=domingo
  const diff = diaSem === 0 ? -6 : 1 - diaSem; // ajustar a lunes
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);

  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  semanaInfo.textContent = `Semana del ${lunes.toLocaleDateString('es-MX')} al ${domingo.toLocaleDateString('es-MX')}`;

  // Obtener tareas del usuario
  const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';
  const tareas = LifeSyncDB.getUserData(usuario, 'tareas', []);

  const catEmojis = { estudio: '📚', habito: '💧', meta: '🎯', salud: '🏥', social: '👥' };

  let html = '';

  for (let i = 0; i < 7; i++) {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + i);
    const fechaStr = fecha.toISOString().split('T')[0];

    const esHoy = fechaStr === hoy.toISOString().split('T')[0];

    // Filtrar tareas de este día
    const tareasDia = tareas.filter(t => t.fecha === fechaStr);

    html += `<div class="dia-col ${esHoy ? 'today' : ''}">
      <div class="dia-header">
        ${DIAS_CORTOS[i]}
        <small>${fecha.getDate()}/${fecha.getMonth() + 1}</small>
      </div>`;

    if (tareasDia.length === 0) {
      html += `<div class="dia-vacio">—</div>`;
    } else {
      tareasDia.forEach(t => {
        html += `<div class="tarea-block prio-${t.prioridad || 'media'}">
          <span class="tarea-hora">${t.hora || '—'}</span>
          <span class="tarea-nombre">${t.nombre}</span>
          <span class="tarea-cat">${catEmojis[t.categoria] || '📌'} ${t.categoria || ''}</span>
        </div>`;
      });
    }

    html += `</div>`;
  }

  grid.innerHTML = html;
}
