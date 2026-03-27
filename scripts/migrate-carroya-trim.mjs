// Script: mover model → trim para listings de CarroYa donde model contiene un trim
// Identificador: model tiene más de 2 palabras O empieza con número (ej: "2.0", "1.6")
// El model correcto llegará en el próximo sync:carroya

import { readFileSync } from 'fs'
import { resolve } from 'path'
import pg from 'pg'

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

async function migrateTrim() {
  const client = await pool.connect()
  try {
    // Encontrar listings de CarroYa donde model parece un trim
    const { rows } = await client.query(`
      SELECT id, model FROM "Listing"
      WHERE "sourcePortal" = 'carroya'
        AND model IS NOT NULL
        AND trim IS NULL
        AND (
          array_length(string_to_array(btrim(model), ' '), 1) > 2
          OR model ~ '^[0-9]'
        )
    `)

    console.log(`🔍 ${rows.length} listings de CarroYa con trim en columna model`)

    let moved = 0
    for (const row of rows) {
      await client.query(
        `UPDATE "Listing" SET trim = $1, model = NULL WHERE id = $2`,
        [row.model, row.id]
      )
      moved++
    }

    console.log(`✅ ${moved} listings migrados: model → trim, model = NULL`)
    console.log(`   El model correcto se poblará en el próximo sync:carroya`)
  } finally {
    client.release()
    await pool.end()
  }
}

migrateTrim().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
