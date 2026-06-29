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
// GOOGLE CLASSROOM (simulación)
// =============================================
const MOCK_CLASSROOM_TAREAS = [
  {
    id: 'gc_1',
    curso: 'Química II',
    nombre: 'Reporte de laboratorio: Reacciones redox',
    descripcion: 'Después del experimento en clase, redacta un reporte de laboratorio que incluya: objetivo, materiales, procedimiento, observaciones y conclusiones. Explica qué sustancia se oxidó y cuál se redujo, y cómo identificaste el cambio. Incluye dibujos o fotos de tus observaciones.',
    fecha: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    hora: '23:59',
    prioridad: 'alta',
    categoria: 'estudio',
    origen: 'google_classroom',
    completada: false
  },
  {
    id: 'gc_2',
    curso: 'Matemáticas V',
    nombre: 'Ejercicios: Límites al infinito',
    descripcion: 'Resuelve los ejercicios 1 al 10 de la página 142 del libro de Cálculo. Calcula los límites al infinito de cada función racional. Identifica asíntotas horizontales cuando existan. Muestra el desarrollo completo, no solo el resultado.',
    fecha: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    hora: '23:59',
    prioridad: 'media',
    categoria: 'estudio',
    origen: 'google_classroom',
    completada: false
  },
  {
    id: 'gc_3',
    curso: 'Literatura Universal',
    nombre: 'Ensayo: El mito del héroe en La Odisea',
    descripcion: 'Lee los cantos IX al XII de La Odisea de Homero. Escribe un ensayo de 2 cuartillas donde analices el viaje de Odiseo como una metáfora del crecimiento personal. Identifica al menos 3 pruebas que enfrenta y explica qué representan. Relaciona el concepto del "héroe clásico" con algún ejemplo moderno.',
    fecha: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    hora: '23:59',
    prioridad: 'alta',
    categoria: 'estudio',
    origen: 'google_classroom',
    completada: false
  },
  {
    id: 'gc_4',
    curso: 'Física II',
    nombre: 'Problemas: Ley de Coulomb',
    descripcion: 'Resuelve los problemas de la guía (páginas 28-31) sobre fuerza electrostática. Calcula la fuerza entre cargas puntuales usando la Ley de Coulomb. Determina dirección y magnitud de la fuerza resultante en sistemas de 2 y 3 cargas. Dibuja los diagramas de cuerpo libre.',
    fecha: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    hora: '23:59',
    prioridad: 'alta',
    categoria: 'estudio',
    origen: 'google_classroom',
    completada: false
  },
  {
    id: 'gc_5',
    curso: 'Historia Universal',
    nombre: 'Línea del tiempo: Guerras Mundiales',
    descripcion: 'Elabora una línea del tiempo comparativa de la Primera y Segunda Guerra Mundial. Incluye: causas, eventos principales (mínimo 8 por guerra), personajes clave, consecuencias. Puedes hacerlo en formato digital (Canva, PowerPoint) o en cartulina. Se evaluará claridad visual y precisión de fechas.',
    fecha: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    hora: '23:59',
    prioridad: 'media',
    categoria: 'estudio',
    origen: 'google_classroom',
    completada: false
  }
];

async function conectarClassroom() {
  const btn = document.getElementById('btn-conectar-classroom');
  btn.textContent = '⏳ Conectando...';
  btn.disabled = true;

  const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';

  // Intentar OAuth real si hay Client ID configurado
  if (ClassroomAPI.isConfigured()) {
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

      // Guardar tareas
      tareas.forEach(t => {
        const existentes = LifeSyncDB.getUserData(usuario, 'tareas', []);
        if (!existentes.some(e => e.id === t.id)) {
          LifeSyncDB.addUserEntry(usuario, 'tareas', t);
        }
      });

      btn.textContent = '✅ Conectado';
      btn.style.background = '#16a34a';
      btn.style.borderColor = '#16a34a';
      btn.style.color = '#fff';

      renderClassroomTareas();
      renderSemana();
      return;
    } catch (err) {
      console.warn('OAuth falló, usando modo simulado:', err.message);
      ClassroomAPI.clearToken();
      // Fall through to mock
    }
  }

  // Fallback: datos mock de 5to de secundaria
  setTimeout(() => {
    MOCK_CLASSROOM_TAREAS.forEach(t => {
      const existentes = LifeSyncDB.getUserData(usuario, 'tareas', []);
      if (!existentes.some(e => e.id === t.id)) {
        LifeSyncDB.addUserEntry(usuario, 'tareas', t);
      }
    });

    btn.textContent = '✅ Conectado (demo)';
    btn.style.background = '#16a34a';
    btn.style.borderColor = '#16a34a';
    btn.style.color = '#fff';
    btn.disabled = false;

    renderClassroomTareas();
    renderSemana();
  }, 1500);
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
