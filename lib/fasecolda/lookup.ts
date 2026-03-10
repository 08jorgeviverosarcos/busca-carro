import { prisma } from '@/lib/prisma'
import { BUSCACARRO_TO_FASECOLDA } from './brand-map'
import { parseRef3 } from './abbreviations'

export interface FasecoldaCandidate {
  codigo: string
  referencia: string       // referencia1 + referencia2 + referencia3 joined
  referencia1: string | null
  referencia2: string | null
  referencia3: string | null
  valueCop: bigint
  clase: string
  score: number
}

// Retorna todos los candidatos Fasecolda que coinciden por marca+modelo+año,
// ordenados por score desc (transmisión/combustible) y luego valueCop asc.
// score > 0 significa que hubo señales de transmisión/combustible para discriminar.
export async function getFasecoldaCandidates(
  brand: string,
  year: number,
  model?: string,
  transmission?: string | null,
  fuelType?: string | null
): Promise<FasecoldaCandidate[]> {
  const fasecoldaBrand = BUSCACARRO_TO_FASECOLDA[brand] ?? brand.toUpperCase()

  const latestPeriod = await prisma.fasecoldaValue.findFirst({
    select: { period: true },
    orderBy: { period: 'desc' },
  })
  if (!latestPeriod) return []

  const whereCode = {
    marca: fasecoldaBrand,
    values: { some: { year, period: latestPeriod.period } },
    ...(model
      ? {
          OR: [
            { referencia1: { contains: model, mode: 'insensitive' as const } },
            { referencia2: { contains: model, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const rows = await prisma.fasecoldaCode.findMany({
    where: whereCode,
    include: {
      values: {
        where: { year, period: latestPeriod.period },
        take: 1,
      },
    },
    take: 100,
  })

  const valid = rows.filter((c) => c.values.length > 0)
  if (valid.length === 0) return []

  const scored: FasecoldaCandidate[] = valid.map((c) => {
    const parsed = parseRef3(c.referencia3)
    let score = 0

    if (transmission && parsed.transmission === transmission) score += 2
    if (fuelType) {
      if (fuelType === 'Diésel' && parsed.fuel === 'Diésel') score += 2
      else if (fuelType === 'Gasolina' && parsed.fuel === null && c.referencia3 !== null) score += 2
    }

    return {
      codigo: c.codigo,
      referencia: [c.referencia1, c.referencia2, c.referencia3].filter(Boolean).join(' '),
      referencia1: c.referencia1,
      referencia2: c.referencia2,
      referencia3: c.referencia3,
      valueCop: c.values[0].valueCop,
      clase: c.clase,
      score,
    }
  })

  // Ordenar: mayor score primero, luego valueCop ascendente (versión más barata arriba)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.valueCop < b.valueCop ? -1 : a.valueCop > b.valueCop ? 1 : 0
  })

  return scored
}
