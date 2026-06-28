/**
 * LifeSync — Historial Emocional (emociones/historial/)
 * Muestra timeline semanal, resumen e insights.
 */

const EMOJIS = {
  feliz: '😊', triste: '😢', enojado: '😠', ansioso: '😰',
  calmado: '😌', emocionado: '🤩', cansado: '😴', agradecido: '🙏',
  estresado: '😫', motivado: '😎'
};

const LABELS = {
  feliz: 'Feliz', triste: 'Triste', enojado: 'Enojado/a', ansioso: 'Ansioso/a',
  calmado: 'Calmado/a', emocionado: 'Emocionado/a', cansado: 'Cansado/a', agradecido: 'Agradecido/a',
  estresado: 'Estresado/a', motivado: 'Motivado/a'
};

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

document.addEventListener('DOMContentLoaded', function() {
  renderTimeline();
  renderSummary();
  renderInsight();
});

function renderTimeline() {
  const timeline = document.getElementById('timeline');
  const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';
  const emociones = LifeSyncDB.getUserData(usuario, 'emociones', []);

  const hoy = new Date();
  let html = '';

  for (let i = 6; i >= 0; i--) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - i);
    const fechaStr = fecha.toISOString().split('T')[0];
    const esHoy = i === 0;

    const entry = emociones.find(e => e.fecha === fechaStr);
    const emoji = entry ? (EMOJIS[entry.emocion] || '💜') : null;
    const label = entry ? (LABELS[entry.emocion] || entry.emocion) : null;

    html += `<div class="timeline-day ${esHoy ? 'today' : ''}">
      <div class="day-name">${DIAS_CORTOS[fecha.getDay()]}</div>
      <div class="day-date">${fecha.getDate()}/${fecha.getMonth() + 1}</div>
      ${emoji ? `<span class="day-emoji">${emoji}</span><div class="day-label">${label}</div>`
              : `<span class="day-empty">—</span><div class="day-empty-label">Sin registro</div>`}
    </div>`;
  }

  timeline.innerHTML = html;
}

function renderSummary() {
  const container = document.getElementById('mood-summary');
  const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';
  const emociones = LifeSyncDB.getUserData(usuario, 'emociones', []);

  const hoy = new Date();
  const hace7 = new Date(hoy);
  hace7.setDate(hoy.getDate() - 7);

  const recientes = emociones.filter(e => new Date(e.fecha) >= hace7);
  const totalDias = recientes.length;
  const estaSemana = emociones.filter(e => {
    const d = new Date(e.fecha);
    return d >= hace7 && d <= hoy;
  }).length;

  const emocionFrecuente = getMostFrequent(recientes.map(e => e.emocion));

  container.innerHTML = `
    <div class="summary-stat">
      <span class="stat-number">${estaSemana}</span>
      <span class="stat-label">Emociones esta semana</span>
    </div>
    <div class="summary-stat">
      <span class="stat-number">${totalDias}</span>
      <span class="stat-label">Días registrados (7)</span>
    </div>
    <div class="summary-stat">
      <span class="stat-number">${emocionFrecuente ? (EMOJIS[emocionFrecuente] || '💜') : '—'}</span>
      <span class="stat-label">Emoción más frecuente</span>
    </div>
  `;
}

function renderInsight() {
  const container = document.getElementById('mood-insight');
  const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';
  const emociones = LifeSyncDB.getUserData(usuario, 'emociones', []);

  if (emociones.length === 0) {
    container.innerHTML = `
      <h3>🌱 Comienza tu registro emocional</h3>
      <p>Registra cómo te sientes cada día para empezar a ver tu historial y recibir recomendaciones.</p>
    `;
    return;
  }

  const ultima = emociones[emociones.length - 1];
  const emoji = EMOJIS[ultima.emocion] || '💜';
  const label = LABELS[ultima.emocion] || ultima.emocion;

  let consejo = 'Sigue así, cada día es una oportunidad para mejorar. 💪';
  if (['triste', 'enojado', 'ansioso', 'estresado'].includes(ultima.emocion)) {
    consejo = 'Respira profundo, tómate un descanso. Hablar con alguien de confianza puede ayudarte. 💜';
  }
  if (['feliz', 'emocionado', 'agradecido', 'calmado', 'motivado'].includes(ultima.emocion)) {
    consejo = '¡Qué bien! Aprovecha esta energía positiva para lograr tus metas. ✨';
  }

  container.innerHTML = `
    <h3>${emoji} Tu última emoción: ${label}</h3>
    <p>${consejo}</p>
  `;
}

function getMostFrequent(arr) {
  if (!arr.length) return null;
  const freq = {};
  arr.forEach(v => freq[v] = (freq[v] || 0) + 1);
  return Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b);
}
