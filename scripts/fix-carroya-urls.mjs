// Script para reconstruir las URLs de detalle de CarroYa en la DB
// El campo v.detail de la API de CarroYa es incorrecto para IDs numéricos:
//   /vehiculo/usado/{brand}/{model}/{trim}/{year}/{city}  ← sin ID, ruta incorrecta
// URL correcta:
//   numérico: /detalle/usado/{brand}/{model}/{year}/{city}/{id}
//   UUID:     /detalle/usado/{brand}/{model}/{year}/{city}/{uuid}.do
// Todos los campos necesarios (brand, model, year, city, externalId) ya están en la DB.

import { readFileSync } from 'fs'
import { resolve } from 'path'
import pg from 'pg'

// Cargar .env manualmente
try {
  const env = readFileSync(resolve(process.cwd(), '.env'), 'utf-8')
  for (const line of env.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    process.env[key] = val
  }
} catch {
  console.error('No se pudo cargar .env')
}

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function buildDetailUrl(externalId, brand, model, year, city) {
  const b = removeAccents(brand.toLowerCase()).replace(/\s+/g, '-')
  const m = removeAccents(model.toLowerCase()).replace(/\s+/g, '-')
  const c = removeAccents(city.toLowerCase())
  return `https://www.carroya.com/detalle/usado/${b}/${m}/${year}/${c}/${externalId}`
}

async function fixUrls() {
  const client = await pool.connect()
  try {
    // Traer todos los listings de CarroYa con los campos necesarios
    const { rows } = await client.query(`
      SELECT id, "externalId", brand, model, year, city, "urlOriginal"
      FROM "Listing"
      WHERE "sourcePortal" = 'carroya'
        AND brand IS NOT NULL
        AND model IS NOT NULL
        AND year IS NOT NULL
        AND city IS NOT NULL
    `)

    console.log(`🔍 ${rows.length} listings de CarroYa encontrados`)

    let updated = 0
    let skipped = 0

    for (const row of rows) {
      const correctUrl = buildDetailUrl(row.externalId, row.brand, row.model, row.year, row.city)

      if (row.urlOriginal === correctUrl) {
        skipped++
        continue
      }

      await client.query(
        `UPDATE "Listing" SET "urlOriginal" = $1 WHERE id = $2`,
        [correctUrl, row.id]
      )
      updated++
    }

    console.log(`✅ ${updated} listings actualizados, ${skipped} ya correctos`)
  } finally {
    client.release()
    await pool.end()
  }
}

fixUrls().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
