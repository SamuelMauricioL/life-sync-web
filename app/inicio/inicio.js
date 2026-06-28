/**
 * LifeSync — Dashboard (app/inicio/)
 */

document.addEventListener('DOMContentLoaded', function() {
  const hoy = new Date();
  const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('dash-fecha').textContent =
    hoy.toLocaleDateString('es-MX', opciones);

  // Selector de usuario
  const selectUsr = document.getElementById('dash-selector-usuario');
  let usuarios = LifeSyncDB.getUsuarios();
  const integrantes = [
    'Naomi Miranda Rafael',
    'Paola Pompa Rojas',
    'Kathe Cruz Caranza',
    'Angeles Ponce Ramirez'
  ];

  // Si solo está "Demo" de pruebas anteriores, reemplazar
  if (usuarios.length === 1 && usuarios[0] === 'Demo') {
    LifeSyncDB.remove('lifesync_usuarios');
    LifeSyncDB.remove('lifesync_usuario_activo');
    LifeSyncDB.remove('lifesync_user_Demo_tareas');
    LifeSyncDB.remove('lifesync_user_Demo_emociones');
    integrantes.forEach(n => LifeSyncDB.addUsuario(n));
    usuarios = LifeSyncDB.getUsuarios();
  }

  // Si no hay usuarios, crear los 4 integrantes
  if (usuarios.length === 0) {
    integrantes.forEach(n => LifeSyncDB.addUsuario(n));
    usuarios = LifeSyncDB.getUsuarios();
  }

  // Si no hay usuario activo, activar el primero
  let activo = LifeSyncDB.getUsuarioActivo();
  if (!activo && usuarios.length > 0) {
    LifeSyncDB.setUsuarioActivo(usuarios[0]);
    activo = usuarios[0];
  }

  usuarios.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u;
    opt.textContent = u;
    if (u === activo) opt.selected = true;
    selectUsr.appendChild(opt);
  });

  if (activo) {
    document.getElementById('dash-usuario').textContent = activo;
  }

  // Estado del ánimo
  let moodSeleccionado = null;
  const fechaStr = hoy.toISOString().split('T')[0];
  const MOOD_LABELS = {
    feliz: 'Feliz 😊', motivado: 'Motivado/a 🔥', calmado: 'Calmado/a 😌',
    ansioso: 'Ansioso/a 😰', cansado: 'Cansado/a 😴', triste: 'Triste 😢'
  };

  // Si ya registró ánimo hoy, marcarlo y mostrar racha
  if (activo) {
    const emociones = LifeSyncDB.getUserData(activo, 'emociones', []);
    const hoyEntry = emociones.find(e => e.fecha === fechaStr && e.momento === 'manana');
    if (hoyEntry) {
      const btn = document.querySelector(`.mood-btn[data-mood="${hoyEntry.emocion}"]`);
      if (btn) {
        btn.classList.add('selected');
        moodSeleccionado = hoyEntry.emocion;
        document.getElementById('mood-row').style.display = 'none';
        document.getElementById('mood-feedback').textContent =
          `🌟 Hoy registraste: ${MOOD_LABELS[hoyEntry.emocion] || hoyEntry.emocion}`;
        document.getElementById('mood-feedback').style.fontSize = '16px';
        document.getElementById('mood-feedback').style.fontWeight = '600';
        document.getElementById('mood-feedback').style.color = '#7c3aed';
      }
      mostrarRacha(activo);
    }
  }

  // Click en mood
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if (!activo) {
        alert('Primero selecciona un usuario.');
        return;
      }

      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
      moodSeleccionado = this.dataset.mood;

      const emociones = LifeSyncDB.getUserData(activo, 'emociones', []);

      const idx = emociones.findIndex(e => e.fecha === fechaStr && e.momento === 'manana');
      if (idx >= 0) {
        emociones[idx].emocion = moodSeleccionado;
        LifeSyncDB.setUserData(activo, 'emociones', emociones);
      } else {
        LifeSyncDB.addUserEntry(activo, 'emociones', {
          emocion: moodSeleccionado,
          momento: 'manana',
          fecha: fechaStr,
          diario: ''
        });
      }

      // Ocultar botones, mostrar solo feedback
      document.getElementById('mood-row').style.display = 'none';
      document.getElementById('mood-feedback').textContent =
        `🌟 Hoy registraste: ${MOOD_LABELS[moodSeleccionado]}`;
      document.getElementById('mood-feedback').style.fontSize = '16px';
      document.getElementById('mood-feedback').style.fontWeight = '600';
      document.getElementById('mood-feedback').style.color = '#7c3aed';

      mostrarRacha(activo);
    });
  });

  function mostrarRacha(usuario) {
    const streak = document.getElementById('dash-streak');
    streak.style.display = 'flex';

    const emociones = LifeSyncDB.getUserData(usuario, 'emociones', []);
    let racha = 0;
    for (let i = 0; i < 30; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fStr = fecha.toISOString().split('T')[0];
      if (emociones.some(e => e.fecha === fStr)) {
        racha++;
      } else {
        break;
      }
    }

    document.getElementById('streak-count').textContent = racha;
    document.getElementById('streak-emoji').textContent =
      racha >= 3 ? '🔥' : racha >= 1 ? '👍' : '🌱';
  }

  // Mostrar próximas tareas
  renderProximasTareas();
});

function renderProximasTareas() {
  const container = document.getElementById('reminders-list');
  const emptyMsg = document.querySelector('.empty-state');
  const usuario = LifeSyncDB.getUsuarioActivo() || 'Demo';
  const tareas = LifeSyncDB.getUserData(usuario, 'tareas', []);

  const hoy = new Date().toISOString().split('T')[0];

  // Filtrar: no completadas, fecha >= hoy
  const pendientes = tareas
    .filter(t => !t.completada && t.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora?.localeCompare(b.hora));

  if (pendientes.length === 0) {
    emptyMsg.style.display = 'block';
    container.innerHTML = '';
    return;
  }

  emptyMsg.style.display = 'none';

  const catEmojis = { estudio: '📚', habito: '💧', meta: '🎯', salud: '🏥', social: '👥' };
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  container.innerHTML = pendientes.slice(0, 5).map(t => {
    const fecha = new Date(t.fecha + 'T12:00:00');
    const diaSem = diasSemana[fecha.getDay()];
    const fechaLabel = t.fecha === hoy
      ? 'Hoy'
      : `${diaSem} ${fecha.getDate()}/${fecha.getMonth() + 1}`;

    return `
      <div class="task-item">
        <span class="task-item-icon">${catEmojis[t.categoria] || '📌'}</span>
        <div class="task-item-info">
          <strong>${t.nombre}</strong>
          <small>${fechaLabel} · ${t.hora || '—'}</small>
        </div>
        <span class="task-item-prio ${t.prioridad || 'media'}">
          ${t.prioridad === 'alta' ? '🔴' : t.prioridad === 'baja' ? '🟢' : '🟡'}
        </span>
      </div>
    `;
  }).join('');
}

function cambiarUsuario(nombre) {
  if (nombre) {
    LifeSyncDB.setUsuarioActivo(nombre);
    location.reload();
  }
}
