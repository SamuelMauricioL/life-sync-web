/**
 * LifeSync — Planificar (tabs: Crear + Semana)
 * Unifica tareas.js + horario.js en una sola página.
 */

const CAT_EMOJIS = { estudio: '📚', habito: '💧', meta: '🎯', salud: '🏥', social: '👥' };
const PRIO_LABELS = { alta: '🔴 Alta', media: '🟡 Media', baja: '🟢 Baja' };
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

document.addEventListener('DOMContentLoaded', function() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('tab-' + this.dataset.tab).classList.add('active');

      if (this.dataset.tab === 'semana') renderSemana();
    });
  });

  // Fecha por defecto: hoy
  document.getElementById('tarea-fecha').value = new Date().toISOString().split('T')[0];

  // Cargar recientes
  renderRecientes();

  // Submit form
  document.getElementById('form-tarea').addEventListener('submit', function(e) {
    e.preventDefault();
    const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';

    LifeSyncDB.addUserEntry(usuario, 'tareas', {
      nombre: document.getElementById('tarea-nombre').value,
      categoria: document.getElementById('tarea-categoria').value,
      fecha: document.getElementById('tarea-fecha').value,
      hora: document.getElementById('tarea-hora').value,
      prioridad: document.getElementById('tarea-prioridad').value,
      descripcion: document.getElementById('tarea-desc').value,
      completada: false
    });

    alert('✅ Tarea guardada');
    this.reset();
    document.getElementById('tarea-fecha').value = new Date().toISOString().split('T')[0];
    renderRecientes();
  });
});

function renderRecientes() {
  const container = document.getElementById('recent-tareas');
  const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';
  const tareas = LifeSyncDB.getUserData(usuario, 'tareas', []);
  const recientes = tareas.slice(-5).reverse();

  if (recientes.length === 0) {
    container.innerHTML = '<p class="empty-msg">Aún no has creado ninguna tarea 📋</p>';
    return;
  }

  container.innerHTML = recientes.map(t => `
    <div class="task-item">
      <span>${CAT_EMOJIS[t.categoria] || '📌'}</span>
      <div class="task-info">
        <strong>${t.nombre}</strong>
        <small>${t.fecha} · ${t.hora || '—'} · ${t.categoria}</small>
      </div>
      <span class="task-prio-badge prio-badge-${t.prioridad}">${PRIO_LABELS[t.prioridad] || '🟡 Media'}</span>
    </div>
  `).join('');
}

function renderSemana() {
  const grid = document.getElementById('horario-grid');
  const info = document.getElementById('semana-info');

  const hoy = new Date();
  const diaSem = hoy.getDay();
  const diff = diaSem === 0 ? -6 : 1 - diaSem;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  info.textContent = `Semana del ${lunes.toLocaleDateString('es-MX')} al ${domingo.toLocaleDateString('es-MX')}`;

  const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';
  const tareas = LifeSyncDB.getUserData(usuario, 'tareas', []);
  const hoyStr = hoy.toISOString().split('T')[0];

  let html = '';
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + i);
    const fechaStr = fecha.toISOString().split('T')[0];
    const esHoy = fechaStr === hoyStr;
    const tareasDia = tareas.filter(t => t.fecha === fechaStr);

    html += `<div class="dia-col ${esHoy ? 'today' : ''}">
      <div class="dia-header">${DIAS_CORTOS[i]}<small>${fecha.getDate()}/${fecha.getMonth() + 1}</small></div>`;

    if (tareasDia.length === 0) {
      html += '<div class="dia-vacio">—</div>';
    } else {
      tareasDia.forEach(t => {
        html += `<div class="tarea-block prio-${t.prioridad || 'media'}">
          <span class="tarea-hora">${t.hora || '—'}</span>
          <span class="tarea-nombre">${t.nombre}</span>
        </div>`;
      });
    }
    html += '</div>';
  }
  grid.innerHTML = html;
}
