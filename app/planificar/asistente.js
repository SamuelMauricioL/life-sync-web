/**
 * LifeSync — Asistente Modal (planificar/)
 * Controla apertura, estados y renderizado del modal de Gemini.
 */

const AsistenteModal = {
  _tareaActual: null,
  _onClose: null,

  abrir(tarea, onClose) {
    this._tareaActual = tarea;
    this._onClose = onClose || (() => {});

    const overlay = document.getElementById('asistente-overlay');
    overlay.style.display = 'flex';

    // Mostrar info de la tarea en el header
    document.getElementById('asistente-subtitle').textContent =
      `${tarea.curso || tarea.materia || ''} · ${tarea.nombre || tarea.titulo}`;

    const body = document.getElementById('asistente-body');

    // Verificar si ya tiene API key
    if (!LifeSyncGemini.hasKey()) {
      this._renderApiKeyForm(body);
      return;
    }

    // Verificar si ya fue analizada
    const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';
    const existente = LifeSyncGemini.getAnalisisPorTareaId(usuario, tarea._id || tarea.id);
    if (existente) {
      this._renderResultado(body, existente.analisis);
      return;
    }

    // Analizar con Gemini
    this._analizar(body);
  },

  cerrar() {
    document.getElementById('asistente-overlay').style.display = 'none';
    this._tareaActual = null;
    if (this._onClose) this._onClose();
  },

  _renderApiKeyForm(body) {
    body.innerHTML = `
      <div class="api-key-section">
        <h4>🔑 Configurar Gemini</h4>
        <p>Para usar el planificador con IA necesitas una API key de Google Gemini. Es gratuita.</p>
        <input type="text" id="gemini-key-input" placeholder="Pega tu API key aquí" />
        <button class="btn" onclick="AsistenteModal._guardarKey()">💜 Guardar</button>
        <div class="api-key-help">
          ¿No tienes una? <a href="https://aistudio.google.com/apikey" target="_blank">Obtén una gratis en Google AI Studio</a><br>
          Sin tarjeta de crédito · 60 requests/minuto gratis
        </div>
      </div>
    `;
  },

  _guardarKey() {
    const key = document.getElementById('gemini-key-input').value.trim();
    if (!key) return;
    LifeSyncGemini.setApiKey(key);
    const body = document.getElementById('asistente-body');
    this._analizar(body);
  },

  async _analizar(body) {
    const tarea = this._tareaActual;
    const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';

    // Mostrar loading con pasos
    body.innerHTML = `
      <div class="loading-state">
        <span class="spinner">🤖</span>
        <p>Analizando tu tarea con Gemini...</p>
        <div class="loading-bar-container">
          <div class="loading-step" id="step-1">◉ Analizando contenido de la tarea</div>
          <div class="loading-step" id="step-2">◉ Identificando tipo de trabajo</div>
          <div class="loading-step" id="step-3">◉ Generando ruta de estudio</div>
          <div class="loading-step" id="step-4">◉ Preparando recomendaciones</div>
        </div>
      </div>
    `;

    // Animar pasos
    this._animarPasos();

    try {
      const analisis = await LifeSyncGemini.analizarTarea(tarea);

      // Guardar análisis
      analisis._tareaNombre = tarea.nombre || tarea.titulo;
      LifeSyncGemini.guardarAnalisis(usuario, tarea._id || tarea.id, analisis);

      this._renderResultado(body, analisis);
    } catch (err) {
      if (err.message === 'API_KEY_MISSING') {
        this._renderApiKeyForm(body);
      } else if (err.message === 'API_KEY_INVALID') {
        body.innerHTML = `
          <div class="error-state">
            <span class="error-icon">❌</span>
            <p>La API key no es válida o ha expirado.<br>Verifícala e intenta de nuevo.</p>
            <button class="btn" onclick="AsistenteModal._renderApiKeyForm(document.getElementById('asistente-body'))">
              🔑 Cambiar API key
            </button>
          </div>
        `;
      } else {
        body.innerHTML = `
          <div class="error-state">
            <span class="error-icon">⚠️</span>
            <p>Hubo un error al conectar con Gemini.<br>Revisa tu conexión e intenta de nuevo.</p>
            <button class="btn" onclick="AsistenteModal._analizar(document.getElementById('asistente-body'))">
              🔄 Reintentar
            </button>
          </div>
        `;
      }
    }
  },

  _renderResultado(body, analisis) {
    const tareaId = this._tareaActual._id || this._tareaActual.id;
    const checks = this._cargarChecks(tareaId, analisis.ruta?.length || 0);
    const completados = checks.filter(c => c).length;
    const total = checks.length;
    const progreso = total > 0 ? Math.round((completados / total) * 100) : 0;

    body.innerHTML = `
      <div class="result-section">
        <span class="section-label">🎯 Qué espera el profesor</span>
        <p>${analisis.queEspera || ''}</p>
      </div>

      <div class="result-section">
        <span class="section-label">📋 Ruta sugerida</span>
        <div class="progreso-bar">
          <div class="progreso-label">${completados}/${total} pasos completados</div>
          <div class="progreso-track">
            <div class="progreso-fill" style="width:${progreso}%"></div>
          </div>
        </div>
        <div class="ruta-checks">
          ${(analisis.ruta || []).map((p, i) => `
            <label class="check-item ${checks[i] ? 'done' : ''}">
              <input type="checkbox" class="check-input" data-index="${i}" ${checks[i] ? 'checked' : ''} onchange="AsistenteModal._toggleCheck(${i})">
              <span class="check-mark"></span>
              <span class="check-text">${p}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="result-section">
        <span class="section-label">💡 Tips de enfoque</span>
        <ul>
          ${(analisis.tips || []).map(t => `<li>${t}</li>`).join('')}
        </ul>
      </div>

      <div class="asistente-actions">
        <button class="btn-primary-ghost" onclick="AsistenteModal._copiarRuta()">📋 Copiar ruta</button>
        <button class="btn-secondary-ghost" onclick="AsistenteModal._regenerar()">🔄 Regenerar</button>
      </div>
    `;
  },

  _cargarChecks(tareaId, total) {
    const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';
    const key = `lifesync_user_${usuario}_checks`;
    const todos = JSON.parse(localStorage.getItem(key) || '{}');
    const saved = todos[tareaId] || [];
    // Asegurar que el array tenga la longitud correcta
    while (saved.length < total) saved.push(false);
    return saved;
  },

  _guardarChecks(tareaId, checks) {
    const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';
    const key = `lifesync_user_${usuario}_checks`;
    const todos = JSON.parse(localStorage.getItem(key) || '{}');
    todos[tareaId] = checks;
    localStorage.setItem(key, JSON.stringify(todos));
  },

  _toggleCheck(index) {
    const tareaId = this._tareaActual._id || this._tareaActual.id;
    const analisis = LifeSyncGemini.getAnalisisPorTareaId(
      LifeSyncDB.getUsuarioActivo() || 'Invitado', tareaId
    );
    if (!analisis) return;

    const total = analisis.analisis.ruta?.length || 0;
    const checks = this._cargarChecks(tareaId, total);
    checks[index] = !checks[index];
    this._guardarChecks(tareaId, checks);

    // Actualizar UI
    const items = document.querySelectorAll('.check-item');
    if (items[index]) {
      items[index].classList.toggle('done', checks[index]);
    }

    // Actualizar barra de progreso
    const completados = checks.filter(c => c).length;
    const progreso = total > 0 ? Math.round((completados / total) * 100) : 0;
    const label = document.querySelector('.progreso-label');
    const fill = document.querySelector('.progreso-fill');
    if (label) label.textContent = `${completados}/${total} pasos completados`;
    if (fill) fill.style.width = `${progreso}%`;
  },

  _copiarRuta() {
    const tarea = this._tareaActual;
    const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';
    const existente = LifeSyncGemini.getAnalisisPorTareaId(usuario, tarea._id || tarea.id);
    if (!existente) return;

    const texto = `📋 Plan de estudio: ${tarea.nombre || tarea.titulo}\n\n🎯 Qué espera el profesor:\n${existente.analisis.queEspera}\n\n📋 Ruta:\n${existente.analisis.ruta.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n💡 Tips:\n${existente.analisis.tips.map(t => `• ${t}`).join('\n')}`;

    navigator.clipboard.writeText(texto).then(() => {
      const btn = event.target;
      btn.textContent = '✅ Copiado';
      setTimeout(() => { btn.textContent = '📋 Copiar ruta'; }, 2000);
    });
  },

  async _regenerar() {
    const body = document.getElementById('asistente-body');
    const usuario = LifeSyncDB.getUsuarioActivo() || 'Invitado';
    const tareaId = this._tareaActual._id || this._tareaActual.id;

    // Eliminar análisis anterior
    const key = `lifesync_user_${usuario}_asistentes`;
    const existentes = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(existentes.filter(a => a.tareaId !== tareaId)));

    this._analizar(body);
  },

  _animarPasos() {
    const steps = ['step-1', 'step-2', 'step-3', 'step-4'];
    steps.forEach((id, i) => {
      setTimeout(() => {
        const el = document.getElementById(id);
        if (!el) return;
        // Marcar paso anterior como done
        if (i > 0) {
          const prev = document.getElementById(steps[i - 1]);
          if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
        }
        el.classList.add('active');
      }, (i + 1) * 800);
    });
  }
};

// Cerrar con Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') AsistenteModal.cerrar();
});
