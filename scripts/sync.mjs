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

const command = process.argv[2] // portal, 'all', o 'ml'
const mode = process.argv.includes('--mode=full') ? 'full' : 'incremental'

// --startBatch=N permite reanudar desde un lote específico (1-based) sin re-procesar los anteriores
const startBatchArg = process.argv.find((a) => a.startsWith('--startBatch='))
const startBatch = startBatchArg ? Math.max(1, parseInt(startBatchArg.split('=')[1], 10)) : 1

const ALL_PORTALS = ['autocosmos', 'vendetunave', 'carroya']

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

  const body = isMl ? undefined : JSON.stringify({ portal, pages: batchSize, startIdx, mode })

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

async function deactivateMissing(portal, seenExternalIds) {
  console.log(`  🗑 Desactivando listings desaparecidos de ${portal} (${seenExternalIds.length} IDs vistos)...`)
  const res = await fetch(`${BASE_URL}/api/sync/deactivate`, {
    method: 'POST',
    headers: { 'x-sync-secret': SECRET, 'Content-Type': 'application/json' },
    body: JSON.stringify({ portal, seenExternalIds }),
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    console.error(`  ❌ Error desactivando (HTTP ${res.status}):`, text.slice(0, 200))
    return
  }
  if (data.data) {
    console.log(`  ✅ ${data.data.deactivated} listings desactivados`)
  } else {
    console.error(`  ❌ Error desactivando:`, data.error)
  }
}

async function sync(portal) {
  // Si es 'all', correr cada portal secuencialmente
  if (portal === 'all') {
    for (const p of ALL_PORTALS) {
      await sync(p)
    }
    return
  }

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
  const firstBatch = startBatch - 1 // convertir a 0-based para el loop
  if (firstBatch > 0) {
    console.log(`🔄 Sincronizando ${portal} [${mode}] desde lote ${startBatch}/${totalBatches} (${total} ${unit}, lotes de ${batchSize})...`)
  } else {
    console.log(`🔄 Sincronizando ${portal} [${mode}] (${total} ${unit}, ${totalBatches} lotes de ${batchSize})...`)
  }

  const allSeenIds = []
  let totalInserted = 0
  let totalUpdated = 0
  let anyBatchHadError = false

  for (let batch = firstBatch; batch < totalBatches; batch++) {
    const startIdx = batch * batchSize + 1 // páginas son 1-based
    console.log(`  🔄 Lote ${batch + 1}/${totalBatches} (${unit} ${startIdx}–${startIdx + batchSize - 1})...`)
    const result = await syncBatch(portal, startIdx, batchSize)

    if (!result.data) {
      console.error(`  ❌ Lote ${batch + 1} error (HTTP ${result.status}):`, result.raw)
      anyBatchHadError = true
      break
    }
    if (!result.data.data) {
      console.error(`  ❌ Lote ${batch + 1} error:`, result.data.error)
      anyBatchHadError = true
      break
    }

    const { extracted, inserted, updated, reachedEnd, hadError, seenExternalIds } = result.data.data
    totalInserted += inserted ?? 0
    totalUpdated += updated ?? 0

    if (hadError) anyBatchHadError = true

    if (mode === 'full' && seenExternalIds) {
      allSeenIds.push(...seenExternalIds)
    }

    console.log(`  ✅ Lote ${batch + 1}: ${extracted} extraídos, ${inserted} nuevos, ${updated} actualizados${hadError ? ' ⚠️ (error en extractor)' : ''}`)

    if (hadError) {
      console.log(`  ⚠️ Error en extractor, deteniendo sync de ${portal}`)
      break
    }

    if (reachedEnd) {
      console.log(`  ⏹ reachedEnd detectado, deteniendo`)
      break
    }

    // Incremental: parar cuando no hubo nuevos inserts en este lote
    if (mode === 'incremental' && inserted === 0) {
      console.log(`  ⏹ Sin nuevos inserts, deteniendo sync incremental`)
      break
    }
  }

  // Full sync: desactivar listings que no aparecieron en ningún lote
  // Solo si el sync completó sin errores — un error parcial dejaría IDs faltantes
  if (mode === 'full' && allSeenIds.length > 0 && !anyBatchHadError) {
    await deactivateMissing(portal, allSeenIds)
  } else if (mode === 'full' && anyBatchHadError) {
    console.log(`  ⚠️ Sync de ${portal} tuvo errores — omitiendo desactivación de listings para evitar falsos positivos`)
  }

  console.log(`\n📊 ${portal}: ${totalInserted} nuevos, ${totalUpdated} actualizados`)
}

if (!command) {
  console.error('Uso: node scripts/sync.mjs [ml|autocosmos|vendetunave|carroya|all] [--mode=full|incremental] [--startBatch=N]')
  process.exit(1)
}

sync(command).catch((err) => {
  console.error('❌ Error fatal:', err.message)
  process.exit(1)
})
