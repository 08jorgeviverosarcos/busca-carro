import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

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

  const listings = await prisma.listing.findMany({
    where: { isActive: true },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })

  const listingRoutes: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${baseUrl}/carro/${listing.id}`,
    lastModified: listing.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...listingRoutes]
}
