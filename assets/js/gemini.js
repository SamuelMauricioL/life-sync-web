/**
 * LifeSync — Gemini Client
 * Llama al serverless function de Vercel (la API key está en el servidor).
 */

const LifeSyncGemini = {

  async analizarTarea(tarea) {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tarea })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }

    return res.json();
  },

  // Guardar análisis en localStorage
  guardarAnalisis(usuario, tareaId, analisis) {
    const key = `lifesync_user_${usuario}_asistentes`;
    const existentes = JSON.parse(localStorage.getItem(key) || '[]');
    existentes.push({
      tareaId,
      tareaNombre: analisis._tareaNombre,
      analisis: {
        queEspera: analisis.queEspera,
        ruta: analisis.ruta,
        tips: analisis.tips
      },
      fecha: new Date().toISOString().split('T')[0]
    });
    localStorage.setItem(key, JSON.stringify(existentes));
  },

  // Obtener análisis guardados
  getAnalisis(usuario) {
    const key = `lifesync_user_${usuario}_asistentes`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  // Buscar análisis por ID de tarea
  getAnalisisPorTareaId(usuario, tareaId) {
    const analisis = this.getAnalisis(usuario);
    return analisis.find(a => a.tareaId === tareaId) || null;
  }
};
