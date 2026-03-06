/**
 * Script para obtener el refresh_token de MercadoLibre (ejecutar UNA sola vez)
 *
 * Pasos:
 *   1. Asegúrate de que ML_CLIENT_ID, ML_CLIENT_SECRET y ML_REDIRECT_URI estén en .env
 *   2. En el portal ML (developers.mercadolibre.com.co), registra ML_REDIRECT_URI en tu app
 *   3. Ejecuta: node scripts/ml-auth.mjs
 *   4. Abre la URL que imprime en el navegador y autoriza la app
 *   5. Copia el parámetro "code" de la URL de redirección y pégalo aquí
 *   6. El script imprime el refresh_token — agrégalo a .env como ML_REFRESH_TOKEN
 */

import { readFileSync } from 'fs'
import * as readline from 'readline'

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
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET
const REDIRECT_URI = process.env.ML_REDIRECT_URI

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error('❌ Faltan ML_CLIENT_ID, ML_CLIENT_SECRET o ML_REDIRECT_URI en .env')
  process.exit(1)
}

// Paso 1: Mostrar URL de autorización
const authUrl = `https://auth.mercadolibre.com.co/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
console.log('\n🔗 Abre esta URL en tu navegador y autoriza la app:\n')
console.log(authUrl)
console.log('\nDespués de autorizar, serás redirigido a algo como:')
console.log(`${REDIRECT_URI}?code=TG-XXXXXXXX...`)
console.log('\nCopia el valor del parámetro "code" de la URL.\n')

// Paso 2: Pedir el code al usuario
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
rl.question('Pega el "code" aquí: ', async (code) => {
  rl.close()
  code = code.trim()

  if (!code) {
    console.error('❌ No ingresaste ningún code')
    process.exit(1)
  }

  // Paso 3: Intercambiar code por tokens
  console.log('\n🔄 Intercambiando code por tokens...')
  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('❌ Error al obtener tokens:', JSON.stringify(data))
    process.exit(1)
  }

  console.log('\n✅ Tokens obtenidos:')
  console.log(`  access_token  : ${data.access_token?.substring(0, 30)}... (expira en ${data.expires_in}s)`)
  console.log(`  refresh_token : ${data.refresh_token}`)
  console.log('\n📋 Agrega esto a tu .env:')
  console.log(`ML_REFRESH_TOKEN="${data.refresh_token}"`)
})
