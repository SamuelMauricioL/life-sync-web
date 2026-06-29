/**
 * Build script para LifeSync
 * Inyecta variables de entorno de Vercel en el frontend.
 */
const fs = require('fs');

const geminiKey = process.env.GEMINI_STORAGE_KEY || '';

let config;
if (geminiKey) {
  config = `window.__CONFIG__ = {\n  GEMINI_API_KEY: '${geminiKey}'\n};\n`;
  console.log('✅ config.js generado con API key de Vercel');
} else {
  // Si no hay env var, no sobrescribir (usa el default vacío del repo)
  console.log('ℹ️  Sin GEMINI_STORAGE_KEY en Vercel, usando config.js default');
  process.exit(0);
}

fs.writeFileSync('assets/js/config.js', config);
