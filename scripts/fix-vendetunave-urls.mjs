// Script para corregir URLs de VendeTuNave en la DB y limpiar caché Redis
// Cambia /vehiculos/{id} → /vehiculo/{id} (sin la 's')
import { readFileSync } from 'fs'
import { resolve } from 'path'
import pg from 'pg'
import { Redis } from '@upstash/redis'

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

async function fixUrls() {
  // 1. Actualizar DB
  const client = await pool.connect()
  try {
    const result = await client.query(`
      UPDATE "Listing"
      SET "urlOriginal" = REPLACE("urlOriginal", 'vendetunave.co/vehiculos/', 'vendetunave.co/vehiculo/')
      WHERE "sourcePortal" = 'vendetunave'
        AND "urlOriginal" LIKE '%vendetunave.co/vehiculos/%'
    `)
    console.log(`✅ DB: ${result.rowCount} listings de VendeTuNave actualizados`)
  } finally {
    client.release()
    await pool.end()
  }

  // 2. Limpiar caché Redis
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('⚠️  Redis: sin credenciales, caché no limpiado')
    return
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  await redis.flushdb()
  console.log('✅ Redis: caché limpiado (flushdb)')
}

fixUrls().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
