// Script de sincronización — carga .env y llama a la API de sync
import { readFileSync } from 'fs'
import { resolve } from 'path'

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

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const SECRET = process.env.SYNC_SECRET ?? ''

const command = process.argv[2] // 'ml', 'tucarro', 'vendetunave', 'olx', 'autocosmos'

// Configuración por portal
const PORTAL_CONFIG = {
  autocosmos: { total: 10, batchSize: 5, unit: 'páginas' }, // ~40 listings/página × 10 páginas ≈ 408 vehículos
  vendetunave: { total: 604, batchSize: 20, unit: 'páginas' }, // 20 vehículos/página × 604 páginas ≈ 12,000 vehículos
  carroya: { total: 1489, batchSize: 20, unit: 'páginas' }, // 20 listings/página × 1489 páginas ≈ 29,777 vehículos
}

async function syncBatch(portal, startIdx, batchSize) {
  const isMl = portal === 'ml'
  const url = isMl
    ? `${BASE_URL}/api/sync/mercadolibre`
    : `${BASE_URL}/api/sync/firecrawl`

  const body = isMl ? undefined : JSON.stringify({ portal, pages: batchSize, startIdx })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-sync-secret': SECRET,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
  })

  const text = await res.text()
  try {
    return { status: res.status, data: JSON.parse(text) }
  } catch {
    return { status: res.status, data: null, raw: text.slice(0, 500) }
  }
}

async function sync(portal) {
  let totalInserted = 0
  let totalUpdated = 0

  if (portal === 'ml') {
    console.log(`🔄 Sincronizando ${portal}...`)
    const result = await syncBatch(portal, 0, 0)
    if (result.data?.data) {
      const { inserted, updated } = result.data.data
      console.log(`✅ ML: ${inserted} nuevos, ${updated} actualizados`)
    } else {
      console.error('❌ Error:', result.data?.error ?? result.raw)
    }
    return
  }

  const config = PORTAL_CONFIG[portal]
  if (!config) {
    console.error(`❌ Portal desconocido: ${portal}`)
    process.exit(1)
  }

  const { total, batchSize, unit } = config
  const totalBatches = Math.ceil(total / batchSize)
  console.log(`🔄 Sincronizando ${portal} (${total} ${unit}, ${totalBatches} lotes de ${batchSize})...`)

  for (let batch = 0; batch < totalBatches; batch++) {
    const startIdx = batch * batchSize + 1 // páginas son 1-based
    console.log(`  🔄 Lote ${batch + 1}/${totalBatches} (${unit} ${startIdx}–${startIdx + batchSize - 1})...`)
    const result = await syncBatch(portal, startIdx, batchSize)

    if (!result.data) {
      console.error(`  ❌ Lote ${batch + 1} error (HTTP ${result.status}):`, result.raw)
      break
    }
    if (!result.data.data) {
      console.error(`  ❌ Lote ${batch + 1} error:`, result.data.error)
      break
    }

    const { extracted, inserted, updated } = result.data.data
    totalInserted += inserted ?? 0
    totalUpdated += updated ?? 0
    console.log(`  ✅ Lote ${batch + 1}: ${extracted} extraídos, ${inserted} nuevos, ${updated} actualizados`)
  }

  console.log(`\n📊 Total: ${totalInserted} nuevos, ${totalUpdated} actualizados`)
}

if (!command) {
  console.error('Uso: node scripts/sync.mjs [ml|tucarro|vendetunave|olx|autocosmos]')
  process.exit(1)
}

sync(command).catch((err) => {
  console.error('❌ Error fatal:', err.message)
  process.exit(1)
})
