// POST /api/sync/firecrawl — Sincronización via Firecrawl

import { NextRequest, NextResponse } from 'next/server'
import { extractTuCarro } from '@/lib/extractors/tucarro'
import { extractVendeTuNave } from '@/lib/extractors/vendetunave'
import { extractOLX } from '@/lib/extractors/olx'
import { extractAutocosmos } from '@/lib/extractors/autocosmos'
import { extractCarroya, type CarroyaExtraFields } from '@/lib/extractors/carroya'
import { normalizeListings } from '@/lib/normalizer'
import { upsertListings, deactivateStaleListings, updateListingDetail } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

const PORTALES_VALIDOS = ['tucarro', 'vendetunave', 'olx', 'autocosmos', 'carroya'] as const
type Portal = (typeof PORTALES_VALIDOS)[number]

export async function POST(req: NextRequest) {
  // Verificar autenticación
  const secret = req.headers.get('x-sync-secret')
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  let body: { portal?: string; pages?: number; startPage?: number; startIdx?: number; mode?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ data: null, error: 'Body JSON inválido' }, { status: 400 })
  }

  const portal = body.portal as Portal
  const pages = body.pages ?? 1
  const startIdx = body.startIdx ?? 0
  const mode = (body.mode === 'full' ? 'full' : 'incremental') as 'full' | 'incremental'

  if (!PORTALES_VALIDOS.includes(portal)) {
    return NextResponse.json(
      { data: null, error: `Portal inválido. Válidos: ${PORTALES_VALIDOS.join(', ')}` },
      { status: 400 }
    )
  }

  const startedAt = new Date()
  let scrapeLogId: string | null = null

  try {
    const log = await prisma.scrapeLog.create({
      data: { portal, startedAt },
    })
    scrapeLogId = log.id

    // CAPA 1: Extracción según portal
    let rawListings = []
    let reachedEnd = false
    let hadError = false
    let carroyaExtraFields: CarroyaExtraFields[] = []
    if (portal === 'tucarro') {
      rawListings = await extractTuCarro(pages)
    } else if (portal === 'vendetunave') {
      const result = await extractVendeTuNave(pages, startIdx)
      rawListings = result.listings
      reachedEnd = result.reachedEnd
      hadError = result.hadError
    } else if (portal === 'olx') {
      rawListings = await extractOLX(pages)
    } else if (portal === 'carroya') {
      const result = await extractCarroya(pages, startIdx)
      rawListings = result.listings
      reachedEnd = result.reachedEnd
      hadError = result.hadError
      carroyaExtraFields = result.extraFields
    } else {
      const result = await extractAutocosmos(pages, startIdx)
      rawListings = result.listings
      reachedEnd = result.reachedEnd
      hadError = result.hadError
    }

    // CAPA 2: Normalización
    const { normalized, stats: normStats } = normalizeListings(rawListings)

    // CAPA 3: Almacenamiento
    const syncStats = await upsertListings(normalized, { fullSync: mode === 'full' })

    // PASO EXTRA CarroYa: inyectar campos extra del bulk (color, engineSize, condition)
    // que no caben en RawListing/NormalizedListing — solo para listings nuevos (sin detailScrapedAt)
    if (portal === 'carroya' && carroyaExtraFields.length > 0) {
      for (const extra of carroyaExtraFields) {
        const existing = await prisma.listing.findUnique({
          where: { sourcePortal_externalId: { sourcePortal: 'carroya', externalId: extra.externalId } },
          select: { id: true, detailScrapedAt: true },
        })
        if (!existing || existing.detailScrapedAt) continue
        await updateListingDetail(existing.id, {
          color: extra.color,
          engineSize: extra.engineSize,
          condition: extra.condition,
        })
      }
    }

    // Desactivar listings no actualizados en los últimos 7 días.
    // Solo en full sync: el incremental para temprano a propósito (cuando no hay nuevos inserts)
    // y deactivar por staleness destruiría listings válidos que no fueron visitados en ese lote.
    // En full sync, el script acumula todos los IDs y llama /api/sync/deactivate al final,
    // pero deactivateStaleListings aquí sirve como safety net adicional.
    const deactivated = mode === 'full' ? await deactivateStaleListings(portal) : 0

    const finishedAt = new Date()

    await prisma.scrapeLog.update({
      where: { id: scrapeLogId },
      data: {
        finishedAt,
        countNew: syncStats.inserted,
        countUpdated: syncStats.updated,
        countDiscarded: normStats.discarded + syncStats.skipped,
      },
    })

    console.log(`✅ Sync ${portal} completo: ${syncStats.inserted} nuevos, ${syncStats.updated} actualizados, ${normStats.discarded} descartados`)

    const seenExternalIds = normalized.map((l) => l.externalId)

    return NextResponse.json({
      data: {
        portal,
        extracted: rawListings.length,
        normalized: normalized.length,
        reachedEnd,
        hadError,
        seenExternalIds,
        ...syncStats,
        deactivated,
      },
      error: null,
    })
  } catch (error) {
    console.error(`❌ Error en sync ${portal}:`, error)

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
