import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedis, redisKey } from '@/lib/redis'
import { BUSCACARRO_TO_FASECOLDA } from '@/lib/fasecolda/brand-map'

// GET /api/fasecolda/lookup?brand=Toyota&year=2024&q=Corolla&transmission=Automático&fuelType=Gasolina
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const brand = searchParams.get('brand')
  const yearStr = searchParams.get('year')
  const q = searchParams.get('q') ?? undefined

  if (!brand || !yearStr) {
    return NextResponse.json({ error: 'Parámetros requeridos: brand, year' }, { status: 400 })
  }

  const year = parseInt(yearStr)
  if (isNaN(year) || year < 1970 || year > 2035) {
    return NextResponse.json({ error: 'year inválido' }, { status: 400 })
  }

  // Caché Redis TTL 1 hora
  const cacheKey = redisKey(`fasecolda:lookup:${brand}:${year}:${q ?? ''}`)
  const redis = getRedis()
  if (redis) {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }
  }

  // Mapear marca canónica → marca FASECOLDA
  const fasecoldaBrand = BUSCACARRO_TO_FASECOLDA[brand] ?? brand.toUpperCase()

  // Obtener período más reciente
  const latestPeriod = await prisma.fasecoldaValue.findFirst({
    select: { period: true },
    orderBy: { period: 'desc' },
  })

  if (!latestPeriod) {
    return NextResponse.json({ results: [] })
  }

  const whereCode = {
    marca: fasecoldaBrand,
    values: { some: { year, period: latestPeriod.period } },
    ...(q
      ? {
          OR: [
            { referencia1: { contains: q, mode: 'insensitive' as const } },
            { referencia2: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const codes = await prisma.fasecoldaCode.findMany({
    where: whereCode,
    include: {
      values: {
        where: { year, period: latestPeriod.period },
        take: 1,
      },
    },
    take: 20,
  })

  const results = codes
    .filter((c) => c.values.length > 0)
    .map((c) => ({
      codigo: c.codigo,
      marca: c.marca,
      clase: c.clase,
      referencia1: c.referencia1,
      referencia2: c.referencia2,
      referencia3: c.referencia3,
      referencia: [c.referencia1, c.referencia2, c.referencia3].filter(Boolean).join(' '),
      valueCop: c.values[0].valueCop.toString(),
      year,
      period: latestPeriod.period,
    }))

  const response = { results, period: latestPeriod.period }

  if (redis) {
    await redis.setex(cacheKey, 3600, response)
  }

  return NextResponse.json(response)
}
