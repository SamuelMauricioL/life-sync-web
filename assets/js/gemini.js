/**
 * LifeSync — Gemini Client
 * Llama a Gemini API y parsea la respuesta como JSON.
 */

const GEMINI_STORAGE_KEY = 'lifesync_gemini_key';
const GEMINI_MODEL = 'gemini-3-flash-preview';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const LifeSyncGemini = {

  getApiKey() {
    const stored = localStorage.getItem(GEMINI_STORAGE_KEY);
    if (stored) return stored;
    // Key por defecto para el proyecto
    return 'AIzaSyAAjHTbWpd9YTEsayhSFlnGaGIkGgJG0ao';
  },

  setApiKey(key) {
    localStorage.setItem(GEMINI_STORAGE_KEY, key);
  },

  hasKey() {
    return !!this.getApiKey();
  },

  async analizarTarea(tarea) {
    const key = this.getApiKey();
    if (!key) throw new Error('API_KEY_MISSING');

    const prompt = `
Eres un asistente de estudio académico. Tu objetivo es guiar al estudiante, NO resolver la tarea.

## Tarea del estudiante
- Título: "${tarea.nombre || tarea.titulo}"
- Materia: "${tarea.curso || tarea.materia || 'No especificada'}"
- Categoría: "${tarea.categoria || 'general'}"
- Descripción: "${tarea.descripcion || 'Sin descripción adicional'}"

## Instrucciones
Genera un plan de estudio en 3 secciones. Usa lenguaje claro y motivador.

### Sección 1: 🎯 Qué espera el profesor
Explica qué demostración de conocimiento busca evaluar el profesor. Máximo 4 líneas. Sé específico.

### Sección 2: 📋 Ruta sugerida
Lista de 3 a 5 pasos numerados para abordar la tarea. Cada paso debe ser una acción concreta.

### Sección 3: 💡 Tips de enfoque
Máximo 3 consejos específicos sobre cómo destacar en esta tarea.

## Reglas estrictas
- NO escribas contenido de la tarea
- NO resuelvas ejercicios
- NO redactes párrafos del ensayo
- NO des la respuesta
- Solo guía, no hagas el trabajo

## Formato de respuesta (SOLO JSON, sin markdown)
{
  "queEspera": "texto aquí",
  "ruta": ["paso 1", "paso 2", "paso 3"],
  "tips": ["tip 1", "tip 2"]
}
`;

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      if (res.status === 403 || res.status === 400) {
        throw new Error('API_KEY_INVALID');
      }
      throw new Error('NETWORK_ERROR');
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('EMPTY_RESPONSE');

    // Extraer JSON de la respuesta (por si Gemini devuelve markdown)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('PARSE_ERROR');

    return JSON.parse(jsonMatch[0]);
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
  },

  // Fallback simulado cuando la API no está disponible -- ELIMINADO, ahora usamos Gemini real
};
