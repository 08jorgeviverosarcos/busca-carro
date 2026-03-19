// POST /api/carro/[id]/enrich
// Scraping on-demand del detalle de un listing
// Auth: header x-sync-secret (igual que /api/sync/*)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateListingDetail } from '@/lib/storage'
import { scrapeVendeTuNaveDetail, type VTNDetailData } from '@/lib/extractors/vendetunave-detail'
import { scrapeAutocosmosDetail, type AutocosmosDetailData } from '@/lib/extractors/autocosmos-detail'
import { scrapeCarroyaDetail, type CarroyaDetailData } from '@/lib/extractors/carroya-detail'

const DETAIL_STALE_DAYS = 7
const SCRAPE_TIMEOUT_MS = 10_000

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: RouteContext) {
  // Verificar autenticación
  const secret = req.headers.get('x-sync-secret')
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Obtener listing
  const listing = await prisma.listing.findUnique({ where: { id } })
  if (!listing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Verificar si el detalle ya está fresco (< 7 días)
  if (listing.detailScrapedAt) {
    const ageMs = Date.now() - listing.detailScrapedAt.getTime()
    if (ageMs < DETAIL_STALE_DAYS * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ enriched: false, reason: 'fresh' })
    }
  }

  // Seleccionar extractor según portal
  let scrapePromise: Promise<VTNDetailData | AutocosmosDetailData | CarroyaDetailData | null>

  if (listing.sourcePortal === 'vendetunave') {
    scrapePromise = scrapeVendeTuNaveDetail(listing.externalId)
  } else if (listing.sourcePortal === 'autocosmos') {
    scrapePromise = scrapeAutocosmosDetail(listing.urlOriginal)
  } else if (listing.sourcePortal === 'carroya') {
    scrapePromise = scrapeCarroyaDetail(listing.urlOriginal)
  } else {
    return NextResponse.json({ enriched: false, reason: 'unsupported' })
  }

  // Ejecutar con timeout
  let detailData: VTNDetailData | AutocosmosDetailData | null
  try {
    detailData = await Promise.race([
      scrapePromise,
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), SCRAPE_TIMEOUT_MS)
      ),
    ])
  } catch (err) {
    const reason = err instanceof Error && err.message === 'timeout' ? 'timeout' : 'error'
    console.error(`❌ Enrich ${id} (${listing.sourcePortal}): ${reason}`)
    return NextResponse.json({ enriched: false, reason })
  }

  if (!detailData) {
    return NextResponse.json({ enriched: false, reason: 'scrape_failed' })
  }

  // Anuncio confirmado como eliminado en el portal → marcar inactivo
  if (detailData.notFound) {
    await prisma.listing.update({
      where: { id },
      data: { isActive: false, detailScrapedAt: new Date() },
    })
    console.log(`⚠️ Enrich ${id} (${listing.sourcePortal}): anuncio no encontrado — marcado inactivo`)
    return NextResponse.json({ enriched: false, reason: 'not_found' })
  }

  // Guardar datos de detalle en DB (extraer notFound antes de pasar a updateListingDetail)
  const { notFound: _, ...detailFields } = detailData
  await updateListingDetail(id, detailFields)
  console.log(`✅ Enrich ${id} (${listing.sourcePortal}): OK`)

  return NextResponse.json({ enriched: true })
}
