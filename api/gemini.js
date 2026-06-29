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
Eres un tutor virtual de estudiantes de secundaria. Tu vibra es amable, directa y sin rodeos. Hablas como un compa que ya pasó por eso y da consejos útiles.

## Tarea del estudiante
- Título: "${tarea.nombre || tarea.titulo}"
- Materia: "${tarea.curso || tarea.materia || 'No especificada'}"
- Categoría: "${tarea.categoria || 'general'}"
- Descripción: "${tarea.descripcion || 'Sin descripción adicional'}"

## Lo que tienes que generar (3 secciones, bien claras):

### 1. 🎯 Qué espera el profe
Explica en 2-3 líneas QUÉ va a evaluar el profesor. No el tema, sino el tipo de esfuerzo: "Quiere ver que entiendas el proceso, no solo el resultado" o "Busca que compares ideas, no que las describas una por una". Lenguaje directo.

### 2. 📋 Paso a paso
Máximo 5 pasos. Cada paso empieza con un verbo de acción: Revisa, Investiga, Compara, Arma, Pule. Nada de "deberías considerar". Son órdenes amables.

### 3. 💡 Tips para brillar
2 o 3 consejos cortos que realmente ayuden a sacar mejor nota. Cosas como "Los profes aman los ejemplos", "Si entregas ordenado ya tienes medio punto ganado", etc.

## Reglas importantes
- NO escribas contenido de la tarea ni la resuelvas
- NO uses palabras como "implementar", "utilizar", "mediante", "además"
- NO seas genérico. Cada consejo debe sonar a que leíste la tarea
- Sé específico, corto, y con ejemplos concretos cuando puedas
- Usa emojis con moderación (máximo 3 en total)
- Que suene a un compa mayor aconsejando, no a un profesor dando cátedra

## Formato de respuesta (SOLO JSON, nada más)
{
  "queEspera": "texto directo aquí",
  "ruta": ["Paso 1: acción concreta", "Paso 2: acción concreta"],
  "tips": ["Consejo 1", "Consejo 2"]
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
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
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

    // Extraer JSON - manejar markdown ```json ... ``` y texto suelto
    let jsonStr = rawText.trim();
    
    // Quitar bloques de código markdown
    jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*$/gm, '').trim();
    
    // Buscar el primer { y último }
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    if (start === -1 || end === -1) {
      console.error('Gemini raw response:', rawText.substring(0, 500));
      return res.status(502).json({ error: 'Gemini no devolvió JSON válido' });
    }
    
    jsonStr = jsonStr.substring(start, end + 1);
    const analisis = JSON.parse(jsonStr);
    return res.status(200).json(analisis);

  } catch (err) {
    console.error('Error en serverless function:', err);
    return res.status(500).json({ error: err.message });
  }
}
