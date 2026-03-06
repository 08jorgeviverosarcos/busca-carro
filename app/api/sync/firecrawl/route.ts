// POST /api/sync/firecrawl — Sincronización via Firecrawl

import { NextRequest, NextResponse } from 'next/server'
import { extractTuCarro } from '@/lib/extractors/tucarro'
import { extractVendeTuNave } from '@/lib/extractors/vendetunave'
import { extractOLX } from '@/lib/extractors/olx'
import { extractAutocosmos } from '@/lib/extractors/autocosmos'
import { normalizeListings } from '@/lib/normalizer'
import { upsertListings, deactivateStaleListings } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

const PORTALES_VALIDOS = ['tucarro', 'vendetunave', 'olx', 'autocosmos'] as const
type Portal = (typeof PORTALES_VALIDOS)[number]

export async function POST(req: NextRequest) {
  // Verificar autenticación
  const secret = req.headers.get('x-sync-secret')
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  let body: { portal?: string; pages?: number; startPage?: number; startIdx?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ data: null, error: 'Body JSON inválido' }, { status: 400 })
  }

  const portal = body.portal as Portal
  const pages = body.pages ?? 1
  const startIdx = body.startIdx ?? 0

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
    if (portal === 'tucarro') {
      rawListings = await extractTuCarro(pages)
    } else if (portal === 'vendetunave') {
      rawListings = await extractVendeTuNave(pages, startIdx)
    } else if (portal === 'olx') {
      rawListings = await extractOLX(pages)
    } else {
      rawListings = await extractAutocosmos(pages, startIdx)
    }

    // CAPA 2: Normalización
    const { normalized, stats: normStats } = normalizeListings(rawListings)

    // CAPA 3: Almacenamiento
    const syncStats = await upsertListings(normalized)
    const deactivated = await deactivateStaleListings(portal)

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

    return NextResponse.json({
      data: {
        portal,
        extracted: rawListings.length,
        normalized: normalized.length,
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
