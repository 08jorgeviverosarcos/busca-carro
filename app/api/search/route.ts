// GET /api/search — Búsqueda con filtros, paginación y caché Redis

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedis, CACHE_TTL, redisKey } from '@/lib/redis'
import { sha256, serializeListing } from '@/lib/utils'
import { ApiResponse } from '@/lib/types'
import { Prisma } from '@/lib/generated/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const q = searchParams.get('q') ?? undefined
    const brand = searchParams.get('brand') ?? undefined
    const model = searchParams.get('model') ?? undefined
    const yearMin = searchParams.get('yearMin') ? parseInt(searchParams.get('yearMin')!) : undefined
    const yearMax = searchParams.get('yearMax') ? parseInt(searchParams.get('yearMax')!) : undefined
    const priceMin = searchParams.get('priceMin') ? parseInt(searchParams.get('priceMin')!) : undefined
    const priceMax = searchParams.get('priceMax') ? parseInt(searchParams.get('priceMax')!) : undefined
    const city = searchParams.get('city') ?? undefined
    const fuelType = searchParams.get('fuelType') ?? undefined
    const transmission = searchParams.get('transmission') ?? undefined
    const portal = searchParams.get('portal') ?? undefined
    const sortBy = (searchParams.get('sortBy') ?? 'recent') as string
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const offset = (page - 1) * limit

    // Construir clave de caché
    const cacheParams = JSON.stringify({ q, brand, model, yearMin, yearMax, priceMin, priceMax, city, fuelType, transmission, portal, sortBy, page, limit })
    const cacheKey = redisKey(`search:${await sha256(cacheParams)}`)

    // Intentar caché Redis
    const redis = getRedis()
    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json(cached, {
          headers: { 'X-Cache': 'HIT' },
        })
      }
    }

    // Construir filtros Prisma
    const where: Prisma.ListingWhereInput = { isActive: true }

    if (q) {
      where.title = { contains: q, mode: 'insensitive' }
    }
    if (brand) {
      where.brand = { equals: brand, mode: 'insensitive' }
    }
    if (model) {
      const modelStripped = model.replace(/[-\s]/g, '')
      if (modelStripped !== model) {
        where.OR = [
          { model: { contains: model, mode: 'insensitive' } },
          { model: { contains: modelStripped, mode: 'insensitive' } },
        ]
      } else {
        where.model = { contains: model, mode: 'insensitive' }
      }
    }
    if (yearMin || yearMax) {
      where.year = {}
      if (yearMin) where.year.gte = yearMin
      if (yearMax) where.year.lte = yearMax
    }
    if (priceMin || priceMax) {
      where.priceCop = {}
      if (priceMin) where.priceCop.gte = BigInt(priceMin)
      if (priceMax) where.priceCop.lte = BigInt(priceMax)
    }
    if (city) {
      where.city = { contains: city, mode: 'insensitive' }
    }
    if (fuelType) {
      where.fuelType = { equals: fuelType, mode: 'insensitive' }
    }
    if (transmission) {
      where.transmission = { equals: transmission, mode: 'insensitive' }
    }
    if (portal) {
      where.sourcePortal = portal
    }

    // Ordenamiento
    // Por defecto: primero los de las páginas iniciales del portal, luego los más recientes dentro de la misma página
    let orderBy: Prisma.ListingOrderByWithRelationInput | Prisma.ListingOrderByWithRelationInput[] = [
      { sourcePage: { sort: 'asc', nulls: 'last' } },
      { scrapedAt: 'desc' },
    ]
    switch (sortBy) {
      case 'price_asc':
        orderBy = { priceCop: 'asc' }
        break
      case 'price_desc':
        orderBy = { priceCop: 'desc' }
        break
      case 'year_desc':
        orderBy = { year: 'desc' }
        break
      case 'mileage_asc':
        orderBy = { mileage: 'asc' }
        break
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({ where, orderBy, skip: offset, take: limit }),
      prisma.listing.count({ where }),
    ])

    // Calcular precio promedio de mercado por brand+model+year
    const avgPriceMap = new Map<string, number>()
    const brands = [...new Set(listings.filter((l) => l.brand).map((l) => l.brand!))]
    const models = [...new Set(listings.filter((l) => l.model).map((l) => l.model!))]
    const years = [...new Set(listings.filter((l) => l.year).map((l) => l.year!))]

    if (brands.length > 0 && models.length > 0 && years.length > 0) {
      try {
        type AvgRow = { brand: string; model: string; year: number; avg_price: string }
        const avgRows = await prisma.$queryRaw<AvgRow[]>(
          Prisma.sql`
            SELECT brand, model, year,
                   (AVG("priceCop"::float8))::bigint::text AS avg_price
            FROM "Listing"
            WHERE "isActive" = true
              AND "priceCop" IS NOT NULL
              AND brand IN (${Prisma.join(brands)})
              AND model IN (${Prisma.join(models)})
              AND year IN (${Prisma.join(years)})
            GROUP BY brand, model, year
          `
        )
        for (const row of avgRows) {
          if (row.brand && row.model && row.year && row.avg_price) {
            avgPriceMap.set(`${row.brand}|${row.model}|${row.year}`, Number(row.avg_price))
          }
        }
      } catch (avgErr) {
        console.warn('⚠️ No se pudo calcular avgPrice:', avgErr)
      }
    }

    const response: ApiResponse<Record<string, unknown>[]> = {
      data: listings.map((l) => ({
        ...serializeListing(l as unknown as Record<string, unknown>),
        avgPrice: l.brand && l.model && l.year
          ? (avgPriceMap.get(`${l.brand}|${l.model}|${l.year}`) ?? null)
          : null,
      })),
      error: null,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }

    // Guardar en caché
    if (redis) {
      await redis.set(cacheKey, response, { ex: CACHE_TTL.SEARCH })
    }

    return NextResponse.json(response, {
      headers: { 'X-Cache': 'MISS' },
    })
  } catch (error) {
    console.error('❌ Error en /api/search:', error)
    return NextResponse.json({ data: null, error: 'Error interno del servidor', meta: undefined }, { status: 500 })
  }
}
