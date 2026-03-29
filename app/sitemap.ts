import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { toSlug } from '@/lib/slugs'

const MIN_LISTINGS = 5

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/buscar`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
  ]

  const [listings, brands, brandModels, cities] = await Promise.all([
    // Listings individuales
    prisma.listing.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    // Categorías por marca
    prisma.listing.groupBy({
      by: ['brand'],
      where: { isActive: true, brand: { not: null } },
      _count: { brand: true },
    }),
    // Categorías por marca+modelo
    prisma.listing.groupBy({
      by: ['brand', 'model'],
      where: { isActive: true, brand: { not: null }, model: { not: null } },
      _count: { model: true },
    }),
    // Categorías por ciudad
    prisma.listing.groupBy({
      by: ['city'],
      where: { isActive: true, city: { not: null } },
      _count: { city: true },
    }),
  ])

  const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${baseUrl}/carro/${l.id}`,
    lastModified: l.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const brandRoutes: MetadataRoute.Sitemap = brands
    .filter((b) => b.brand && (b._count.brand ?? 0) >= MIN_LISTINGS)
    .map((b) => ({
      url: `${baseUrl}/carros/${toSlug(b.brand!)}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    }))

  const brandModelRoutes: MetadataRoute.Sitemap = brandModels
    .filter((bm) => bm.brand && bm.model && (bm._count.model ?? 0) >= MIN_LISTINGS)
    .map((bm) => ({
      url: `${baseUrl}/carros/${toSlug(bm.brand!)}/${toSlug(bm.model!)}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.75,
    }))

  const cityRoutes: MetadataRoute.Sitemap = cities
    .filter((c) => c.city && (c._count.city ?? 0) >= MIN_LISTINGS)
    .map((c) => ({
      url: `${baseUrl}/carros/ciudad/${toSlug(c.city!)}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    }))

  // Rutas de precios (/precios/marca/modelo)
  const priceRoutes: MetadataRoute.Sitemap = brandModels
    .filter((bm) => bm.brand && bm.model && (bm._count.model ?? 0) >= 3)
    .map((bm) => ({
      url: `${baseUrl}/precios/${toSlug(bm.brand!)}/${toSlug(bm.model!)}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.85,
    }))

  // Rutas de precios por año (/precios/marca/modelo/year)
  const yearCombos = await prisma.$queryRaw<{ brand: string; model: string; year: number; count: string }[]>`
    SELECT brand, model, year, COUNT(*)::text AS count
    FROM "Listing"
    WHERE "isActive" = true AND brand IS NOT NULL AND model IS NOT NULL AND year IS NOT NULL AND "priceCop" IS NOT NULL
    GROUP BY brand, model, year
    HAVING COUNT(*) >= 2
  `

  const priceYearRoutes: MetadataRoute.Sitemap = yearCombos.map((c) => ({
    url: `${baseUrl}/precios/${toSlug(c.brand)}/${toSlug(c.model)}/${c.year}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Orden: estáticas primero, luego precios (mayor prioridad SEO), luego categorías, luego listings
  return [...staticRoutes, ...priceRoutes, ...priceYearRoutes, ...brandRoutes, ...cityRoutes, ...brandModelRoutes, ...listingRoutes]
}
