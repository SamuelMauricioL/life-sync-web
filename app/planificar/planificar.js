/**
 * LifeSync — Planificar
 * Vista semanal + tareas recientes + Classroom + Dialog de creación.
 */

const CAT_EMOJIS = { estudio: '📚', habito: '💧', meta: '🎯', salud: '🏥', social: '👥' };
const PRIO_LABELS = { alta: '🔴 Alta', media: '🟡 Media', baja: '🟢 Baja' };
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

let _classroomConectado = false;

document.addEventListener('DOMContentLoaded', function() {
  // Fecha por defecto en el dialog
  document.getElementById('tarea-fecha').value = new Date().toISOString().split('T')[0];

  // Renderizar
  renderSemana();
  renderClassroomTareas();

  // Submit del formulario en dialog
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

    cerrarDialogTarea();
    this.reset();
    document.getElementById('tarea-fecha').value = new Date().toISOString().split('T')[0];

    renderSemana();
  });
});

// =============================================
// DIALOG: Nueva tarea
// =============================================
function abrirDialogTarea() {
  document.getElementById('dialog-tarea-overlay').style.display = 'flex';
}

function cerrarDialogTarea() {
  document.getElementById('dialog-tarea-overlay').style.display = 'none';
}

// Cerrar con Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    cerrarDialogTarea();
  }
});

function abrirAsistente(tarea) {
  AsistenteModal.abrir(tarea);
}

// =============================================
// GOOGLE CLASSROOM (conexión real vía OAuth)
// =============================================

async function conectarClassroom() {
  const btn = document.getElementById('btn-conectar-classroom');
  btn.textContent = '⏳ Conectando...';
  btn.disabled = true;

  const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';

  try {
    const token = await ClassroomAPI.iniciarOAuth();
    if (!token) throw new Error('No token');

    btn.textContent = '📥 Importando tareas...';
    const tareas = await ClassroomAPI.importarTareas();

    if (tareas.length === 0) {
      alert('No se encontraron tareas con fecha de entrega en tus cursos.');
      btn.textContent = '🔗 Conectar Classroom';
      btn.disabled = false;
      return;
    }

    const existentes = LifeSyncDB.getUserData(usuario, 'tareas', []);
    let nuevas = 0;
    tareas.forEach(t => {
      const duplicado = existentes.some(e =>
        e.id === t.id ||
        (e.nombre === t.nombre && e.fecha === t.fecha && e.curso === t.curso)
      );
      if (!duplicado) {
        existentes.push(t);
        nuevas++;
      }
    });
    LifeSyncDB.setUserData(usuario, 'tareas', existentes);
    console.log(`📥 Classroom: ${nuevas} nuevas, ${tareas.length - nuevas} duplicadas omitidas`);

    btn.textContent = '✅ Conectado';
    btn.style.background = '#16a34a';
    btn.style.borderColor = '#16a34a';
    btn.style.color = '#fff';

    renderClassroomTareas();
    renderSemana();
  } catch (err) {
    console.error('Error al conectar con Classroom:', err);
    btn.textContent = '🔗 Conectar Classroom';
    btn.disabled = false;
    alert('Error al conectar: ' + err.message);
  }
}

function renderClassroomTareas() {
  const container = document.getElementById('classroom-tareas');
  const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';
  const tareas = LifeSyncDB.getUserData(usuario, 'tareas', []);
  const classroom = tareas.filter(t => t.origen === 'google_classroom');

  if (classroom.length === 0) {
    container.innerHTML = '<p class="classroom-empty">Aún no hay tareas importadas. Conecta Google Classroom para sincronizar tus tareas automáticamente.</p>';
    return;
  }

  container.innerHTML = classroom.map(t => {
    const tieneAnalisis = LifeSyncGemini.getAnalisisPorTareaId(usuario, t.id);
    const diff = Math.ceil((new Date(t.fecha) - Date.now()) / 86400000);
    const diasRestantes = diff <= 0 ? 'Hoy' : diff === 1 ? 'Mañana' : `${diff} días`;

    return `
      <div class="classroom-task">
        <div class="ct-header">
          <span class="ct-curso">📚 ${t.curso}</span>
          <span class="ct-badge ${t.prioridad}">${PRIO_LABELS[t.prioridad]}</span>
          <span class="ct-dias">📅 ${diasRestantes}</span>
        </div>
        <strong class="ct-title">${t.nombre}</strong>
        <p class="ct-desc">${t.descripcion}</p>
        <div class="ct-footer">
          <button class="btn-asistente ${tieneAnalisis ? 'analizado' : ''}" onclick='abrirAsistente(${JSON.stringify({...t, _id: t.id}).replace(/'/g, "\\'")})'>
            ${tieneAnalisis ? '🤖 ✅ Ver plan' : '🤖 Planificar con IA'}
          </button>
          ${tieneAnalisis ? '<span class="ct-analizado">✨ Analizado</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

// =============================================
// HORARIO SEMANAL
// =============================================
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
        const badge = t.origen === 'google_classroom' ? '📚' : '';
        html += `<div class="tarea-block prio-${t.prioridad || 'media'}">
          <span class="tarea-hora">${badge} ${t.hora || '—'}</span>
          <span class="tarea-nombre">${t.nombre}</span>
        </div>`;
      });
    }
    html += '</div>';
  }
  grid.innerHTML = html;
}
