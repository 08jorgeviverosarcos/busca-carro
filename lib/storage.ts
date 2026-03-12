// CAPA 3: Almacenamiento — upsert masivo y gestión de anuncios en PostgreSQL

import { prisma } from '@/lib/prisma'
import { NormalizedListing, SyncStats, GlobalStats } from '@/lib/types'

// Upsert masivo: insertar nuevos, actualizar precio/estado de existentes
export async function upsertListings(listings: NormalizedListing[]): Promise<SyncStats> {
  let inserted = 0
  let updated = 0
  let skipped = 0

  for (const listing of listings) {
    try {
      const existing = await prisma.listing.findUnique({
        where: {
          sourcePortal_externalId: {
            sourcePortal: listing.sourcePortal,
            externalId: listing.externalId,
          },
        },
      })

      if (!existing) {
        const newListing = await prisma.listing.create({
          data: {
            externalId: listing.externalId,
            sourcePortal: listing.sourcePortal,
            title: listing.title,
            brand: listing.brand,
            model: listing.model,
            year: listing.year,
            priceCop: listing.priceCop !== null ? BigInt(listing.priceCop) : null,
            mileage: listing.mileage,
            fuelType: listing.fuelType,
            transmission: listing.transmission,
            city: listing.city,
            department: listing.department,
            images: listing.images,
            urlOriginal: listing.urlOriginal,
            sourcePage: listing.sourcePage ?? null,
            isActive: true,
            firstSeenAt: listing.scrapedAt,
            scrapedAt: listing.scrapedAt,
          },
        })

        // Registrar precio inicial en historial
        if (listing.priceCop !== null) {
          await prisma.priceHistory.create({
            data: {
              listingId: newListing.id,
              priceCop: BigInt(listing.priceCop),
              recordedAt: listing.scrapedAt,
            },
          })
        }

        inserted++
      } else {
        const newPrice = listing.priceCop !== null ? BigInt(listing.priceCop) : null
        const priceChanged = newPrice !== null && existing.priceCop !== newPrice

        // Actualizar precio, imágenes, página de origen y marcar como activo
        await prisma.listing.update({
          where: { id: existing.id },
          data: {
            priceCop: newPrice !== null ? newPrice : existing.priceCop,
            images: listing.images.length > 0 ? listing.images : existing.images,
            sourcePage: listing.sourcePage ?? existing.sourcePage,
            isActive: true,
            scrapedAt: listing.scrapedAt,
          },
        })

        // Registrar en historial solo si el precio cambió
        if (priceChanged) {
          await prisma.priceHistory.create({
            data: {
              listingId: existing.id,
              priceCop: newPrice,
              recordedAt: listing.scrapedAt,
            },
          })
        }

        updated++
      }
    } catch (err) {
      console.error(`❌ Error guardando ${listing.sourcePortal}/${listing.externalId}:`, err)
      skipped++
    }
  }

  return { inserted, updated, skipped }
}

// Marcar inactivos los anuncios del portal que NO estuvieron en el scrape actual
// Usar solo cuando se recorrió toda la paginación (reachedEnd = true)
export async function deactivateMissingListings(portal: string, seenExternalIds: string[]): Promise<number> {
  if (seenExternalIds.length === 0) return 0

  const result = await prisma.listing.updateMany({
    where: {
      sourcePortal: portal,
      isActive: true,
      externalId: { notIn: seenExternalIds },
    },
    data: { isActive: false },
  })

  return result.count
}

// Marcar inactivos anuncios no vistos en los últimos 7 días por portal
export async function deactivateStaleListings(portal: string): Promise<number> {
  const threshold = new Date()
  threshold.setDate(threshold.getDate() - 7)

  const result = await prisma.listing.updateMany({
    where: {
      sourcePortal: portal,
      isActive: true,
      scrapedAt: { lt: threshold },
    },
    data: { isActive: false },
  })

  return result.count
}

// Actualizar campos de detalle de un listing (scraping on-demand)
export type DetailUpdate = {
  description?: string
  color?: string
  engineSize?: number
  condition?: string
  publishedAt?: Date
  viewCount?: number
  permuta?: boolean
  financiacion?: boolean
  blindado?: boolean
  plateDigit?: string
  fuelType?: string
  transmission?: string
  images?: string[]
}

export async function updateListingDetail(id: string, data: DetailUpdate): Promise<void> {
  const { images, ...rest } = data
  await prisma.listing.update({
    where: { id },
    data: {
      ...rest,
      // Solo actualizar imágenes si vinieron datos (no sobrescribir con array vacío)
      ...(images && images.length > 0 ? { images } : {}),
      detailScrapedAt: new Date(),
    },
  })
}

// Stats globales para homepage y dashboard
export async function getGlobalStats(): Promise<GlobalStats> {
  const [totalActive, byPortalRaw, lastSyncRaw] = await Promise.all([
    prisma.listing.count({ where: { isActive: true } }),
    prisma.listing.groupBy({
      by: ['sourcePortal'],
      where: { isActive: true },
      _count: { _all: true },
    }),
    prisma.scrapeLog.findMany({
      orderBy: { finishedAt: 'desc' },
      take: 10,
    }),
  ])

  const byPortal: Record<string, number> = {}
  for (const row of byPortalRaw) {
    byPortal[row.sourcePortal] = row._count._all
  }

  const lastSync: Record<string, Date> = {}
  for (const log of lastSyncRaw) {
    if (log.finishedAt && !lastSync[log.portal]) {
      lastSync[log.portal] = log.finishedAt
    }
  }

  return { totalActive, byPortal, lastSync }
}
