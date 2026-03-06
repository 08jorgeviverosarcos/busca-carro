// POST /api/sync/mercadolibre — Sincronización de anuncios de MercadoLibre

import { NextRequest, NextResponse } from 'next/server'
import { extractMercadoLibre } from '@/lib/extractors/mercadolibre'
import { normalizeListings } from '@/lib/normalizer'
import { upsertListings, deactivateStaleListings } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  // Verificar autenticación
  const secret = req.headers.get('x-sync-secret')
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  const startedAt = new Date()
  let scrapeLogId: string | null = null

  try {
    // Crear registro de inicio
    const log = await prisma.scrapeLog.create({
      data: { portal: 'mercadolibre', startedAt },
    })
    scrapeLogId = log.id

    // CAPA 1: Extracción
    const rawListings = await extractMercadoLibre()

    // CAPA 2: Normalización
    const { normalized, stats: normStats } = normalizeListings(rawListings)

    // CAPA 3: Almacenamiento
    const syncStats = await upsertListings(normalized)
    const deactivated = await deactivateStaleListings('mercadolibre')

    const finishedAt = new Date()

    // Actualizar log con resultados
    await prisma.scrapeLog.update({
      where: { id: scrapeLogId },
      data: {
        finishedAt,
        countNew: syncStats.inserted,
        countUpdated: syncStats.updated,
        countDiscarded: normStats.discarded + syncStats.skipped,
      },
    })

    console.log(`✅ Sync ML completo: ${syncStats.inserted} nuevos, ${syncStats.updated} actualizados, ${normStats.discarded} descartados, ${deactivated} desactivados`)

    return NextResponse.json({
      data: {
        portal: 'mercadolibre',
        extracted: rawListings.length,
        normalized: normalized.length,
        ...syncStats,
        deactivated,
      },
      error: null,
    })
  } catch (error) {
    console.error('❌ Error en sync MercadoLibre:', error)

    if (scrapeLogId) {
      await prisma.scrapeLog.update({
        where: { id: scrapeLogId },
        data: {
          finishedAt: new Date(),
          errors: error instanceof Error ? error.message : String(error),
        },
      }).catch(() => {})
    }

    return NextResponse.json(
      { data: null, error: 'Error en sincronización' },
      { status: 500 }
    )
  }
}
