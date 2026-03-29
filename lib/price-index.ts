// Funciones de agregación de precios para landing pages programáticas /precios/
// Usa raw SQL para percentile_cont de PostgreSQL

import { prisma } from '@/lib/prisma'
import { Prisma } from '@/lib/generated/prisma'

export type PriceStats = {
  count: number
  avgPrice: number | null
  p25: number | null
  p75: number | null
  minPrice: number | null
  maxPrice: number | null
}

export type PriceByYear = {
  year: number
  count: number
  avgPrice: number
  minPrice: number
  maxPrice: number
}

export type PriceByCity = {
  city: string
  count: number
  avgPrice: number
}

/**
 * Estadísticas generales de precio para una marca+modelo (opcionalmente filtrado por año)
 */
export async function getPriceStats(
  brand: string,
  model: string,
  year?: number,
): Promise<PriceStats> {
  const yearCondition = year != null ? Prisma.sql`AND year = ${year}` : Prisma.empty

  const [countResult, percentiles] = await Promise.all([
    prisma.listing.count({
      where: {
        brand,
        model,
        isActive: true,
        priceCop: { not: null },
        ...(year != null ? { year } : {}),
      },
    }),
    prisma.$queryRaw<
      { avg: string | null; p25: string | null; p75: string | null; min: string | null; max: string | null }[]
    >(
      Prisma.sql`
        SELECT
          AVG("priceCop")::bigint::text AS avg,
          (percentile_cont(0.25) WITHIN GROUP (ORDER BY "priceCop"))::bigint::text AS p25,
          (percentile_cont(0.75) WITHIN GROUP (ORDER BY "priceCop"))::bigint::text AS p75,
          MIN("priceCop")::text AS min,
          MAX("priceCop")::text AS max
        FROM "Listing"
        WHERE "isActive" = true
          AND "priceCop" IS NOT NULL
          AND brand = ${brand}
          AND model = ${model}
          ${yearCondition}
      `,
    ),
  ])

  const row = percentiles[0]
  return {
    count: countResult,
    avgPrice: row?.avg ? Number(row.avg) : null,
    p25: row?.p25 ? Number(row.p25) : null,
    p75: row?.p75 ? Number(row.p75) : null,
    minPrice: row?.min ? Number(row.min) : null,
    maxPrice: row?.max ? Number(row.max) : null,
  }
}

/**
 * Tabla de precios desglosada por año del modelo
 */
export async function getPricesByYear(brand: string, model: string): Promise<PriceByYear[]> {
  const rows = await prisma.$queryRaw<
    { year: number; count: string; avg: string; min: string; max: string }[]
  >(
    Prisma.sql`
      SELECT
        year,
        COUNT(*)::int AS count,
        AVG("priceCop")::bigint::text AS avg,
        MIN("priceCop")::text AS min,
        MAX("priceCop")::text AS max
      FROM "Listing"
      WHERE "isActive" = true
        AND "priceCop" IS NOT NULL
        AND year IS NOT NULL
        AND brand = ${brand}
        AND model = ${model}
      GROUP BY year
      HAVING COUNT(*) >= 2
      ORDER BY year DESC
    `,
  )

  return rows.map((r) => ({
    year: Number(r.year),
    count: Number(r.count),
    avgPrice: Number(r.avg),
    minPrice: Number(r.min),
    maxPrice: Number(r.max),
  }))
}

/**
 * Tabla de precios desglosada por ciudad
 */
export async function getPricesByCity(
  brand: string,
  model: string,
  year?: number,
): Promise<PriceByCity[]> {
  const yearCondition = year != null ? Prisma.sql`AND year = ${year}` : Prisma.empty

  const rows = await prisma.$queryRaw<{ city: string; count: string; avg: string }[]>(
    Prisma.sql`
      SELECT
        city,
        COUNT(*)::int AS count,
        AVG("priceCop")::bigint::text AS avg
      FROM "Listing"
      WHERE "isActive" = true
        AND "priceCop" IS NOT NULL
        AND city IS NOT NULL
        AND brand = ${brand}
        AND model = ${model}
        ${yearCondition}
      GROUP BY city
      HAVING COUNT(*) >= 1
      ORDER BY COUNT(*) DESC
    `,
  )

  return rows.map((r) => ({
    city: r.city,
    count: Number(r.count),
    avgPrice: Number(r.avg),
  }))
}

/**
 * Años disponibles para una marca+modelo (para generateStaticParams de la página /[year])
 */
export async function getAvailableYears(brand: string, model: string): Promise<number[]> {
  const rows = await prisma.listing.groupBy({
    by: ['year'],
    where: { brand, model, isActive: true, year: { not: null }, priceCop: { not: null } },
    _count: { year: true },
  })

  return rows
    .filter((r) => r.year != null && (r._count.year ?? 0) >= 2)
    .map((r) => r.year!)
    .sort((a, b) => b - a)
}
