/**
 * LifeSync — Vercel Serverless Function
 * Proxy para Gemini API. La API key nunca sale del servidor.
 */
export default async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tarea } = req.body;
  if (!tarea) {
    return res.status(400).json({ error: 'Falta tarea' });
  }

  const apiKey = process.env.GEMINI_STORAGE_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_STORAGE_KEY no configurada' });
  }

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

  try {
    const resGemini = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      }
    );

    if (!resGemini.ok) {
      const errText = await resGemini.text();
      console.error('Gemini API error:', resGemini.status, errText);
      return res.status(502).json({ error: `Gemini error: ${resGemini.status}` });
    }

    const data = await resGemini.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(502).json({ error: 'Respuesta vacía de Gemini' });
    }

    // Extraer JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'No se pudo parsear respuesta de Gemini' });
    }

    const analisis = JSON.parse(jsonMatch[0]);
    return res.status(200).json(analisis);

  } catch (err) {
    console.error('Error en serverless function:', err);
    return res.status(500).json({ error: err.message });
  }
}
