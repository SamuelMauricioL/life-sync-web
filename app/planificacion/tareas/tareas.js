/**
 * LifeSync — Tareas (planificacion/tareas/)
 * Maneja creación y listado de tareas persistentes.
 */

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('form-tarea');
  const tasksList = document.getElementById('tasks-list');

  // Fecha por defecto: hoy
  document.getElementById('tarea-fecha').value = new Date().toISOString().split('T')[0];

  // Cargar tareas recientes
  renderRecentTasks();

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';

    LifeSyncDB.addUserEntry(usuario, 'tareas', {
      nombre: document.getElementById('tarea-nombre').value,
      categoria: document.getElementById('tarea-categoria').value,
      fecha: document.getElementById('tarea-fecha').value,
      hora: document.getElementById('tarea-hora').value,
      prioridad: document.getElementById('tarea-prioridad').value,
      recordatorio: document.getElementById('tarea-recordatorio').value,
      descripcion: document.getElementById('tarea-desc').value,
      completada: false
    });

    alert('✅ Tarea guardada exitosamente');
    form.reset();
    document.getElementById('tarea-fecha').value = new Date().toISOString().split('T')[0];
    renderRecentTasks();
  });

  function renderRecentTasks() {
    const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';
    const tareas = LifeSyncDB.getUserData(usuario, 'tareas', []);
    const recientes = tareas.slice(-5).reverse();

    const empty = document.querySelector('.empty-tasks');
    if (empty) empty.remove();

    if (recientes.length === 0) {
      tasksList.innerHTML = '<p class="empty-tasks">Aún no has creado ninguna tarea 📋</p>';
      return;
    }

    const catEmojis = { estudio: '📚', habito: '💧', meta: '🎯', salud: '🏥', social: '👥' };
    const priorLabels = { alta: '🔴 Alta', media: '🟡 Media', baja: '🟢 Baja' };

    tasksList.innerHTML = recientes.map(t => `
      <div class="task-item">
        <div class="task-cat">${catEmojis[t.categoria] || '📌'}</div>
        <div class="task-info">
          <strong>${t.nombre}</strong>
          <small>${t.fecha} · ${t.hora} · ${catEmojis[t.categoria]} ${t.categoria}</small>
        </div>
        <span class="task-priority priority-${t.prioridad}">${priorLabels[t.prioridad] || '🟡 Media'}</span>
      </div>
    `).join('');
  }
});
