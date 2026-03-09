/**
 * Genera la URL de autorización de MercadoLibre.
 * El callback en /api/auth/ml/callback se encarga de intercambiar el code por tokens.
 *
 * Pasos:
 *   1. Asegúrate de que ML_CLIENT_ID, ML_CLIENT_SECRET y ML_REDIRECT_URI estén en .env
 *   2. En el portal ML (developers.mercadolibre.com.co), registra ML_REDIRECT_URI en tu app
 *   3. Ejecuta: node scripts/ml-auth.mjs
 *   4. Abre la URL que imprime en el navegador y autoriza la app
 *   5. El navegador te redirige a localhost y muestra el refresh_token automáticamente
 *   6. Copia el ML_REFRESH_TOKEN que aparece en pantalla y agrégalo al .env
 */

import { readFileSync } from 'fs'

// Cargar .env
const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
env.split('\n').forEach(line => {
  const eq = line.indexOf('=')
  if (eq === -1 || line.startsWith('#')) return
  const key = line.slice(0, eq).trim()
  const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  process.env[key] = val
})

const CLIENT_ID = process.env.ML_CLIENT_ID
const REDIRECT_URI = process.env.ML_REDIRECT_URI

if (!CLIENT_ID) {
  console.error('❌ Falta ML_CLIENT_ID en .env')
  process.exit(1)
}
if (!REDIRECT_URI) {
  console.error('❌ Falta ML_REDIRECT_URI en .env')
  console.error('   Agrega: ML_REDIRECT_URI=http://localhost:3000/api/auth/ml/callback')
  process.exit(1)
}

const authUrl = `https://auth.mercadolibre.com.co/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`

console.log('\n🔗 Abre esta URL en tu navegador:\n')
console.log(authUrl)
console.log('\n✅ El navegador te redirigirá a localhost automáticamente.')
console.log('   Copia el ML_REDIRECT_TOKEN que aparece en pantalla y agrégalo al .env\n')
