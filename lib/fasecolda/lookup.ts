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
  fuelType?: string | null,
  engineSize?: number | null
): Promise<FasecoldaCandidate[]> {
  const fasecoldaBrand = BUSCACARRO_TO_FASECOLDA[brand] ?? brand.toUpperCase()

  // Algunos portales incluyen la marca en el modelo (ej. "Mazda 2" → "2").
  // Fasecolda almacena solo el nombre corto del modelo, así que la eliminamos.
  const modelForSearch = model
    ? model.replace(new RegExp(`^${brand}\\s*`, 'i'), '').trim() || model
    : undefined

  const latestPeriod = await prisma.fasecoldaValue.findFirst({
    select: { period: true },
    orderBy: { period: 'desc' },
  })
  if (!latestPeriod) return []

  const whereCode = {
    marca: fasecoldaBrand,
    values: { some: { year, period: latestPeriod.period } },
    // referencia1 siempre contiene el modelo en Fasecolda ("2 [2] [FL]", "COROLLA", etc.)
    // Usamos startsWith para evitar falsos positivos: "2" no debe traer "BT50 [2]"
    ...(modelForSearch
      ? { referencia1: { startsWith: modelForSearch, mode: 'insensitive' as const } }
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

  // Helper: normaliza transmisión del listing a boolean (auto vs manual)
  // Cubre "Automática", "automática 8 velocidades", etc.
  const listingIsAuto = transmission
    ? transmission.toLowerCase().includes('automátic')
    : null

  // Helper: engineSize saneado — valores < 200cc son datos corruptos (ej. VTN devuelve 15 en vez de 1500)
  const safeEngineSize = engineSize && engineSize >= 200 ? engineSize : null

  const scored: FasecoldaCandidate[] = valid.map((c) => {
    const parsed = parseRef3(c.referencia3)
    let score = 0

    if (listingIsAuto !== null && parsed.transmission != null) {
      const candidateIsAuto = parsed.transmission === 'Automático' || parsed.transmission === 'Triptónico'
      if (listingIsAuto === candidateIsAuto) score += 2
    }
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

  // --- HARD FILTERING ---
  // Extraer número de displacement string "1800CC" → 1800
  function parseDisplacement(ref3: string | null): number | null {
    if (!ref3) return null
    const match = ref3.match(/(\d{3,4})CC/i)
    return match ? parseInt(match[1]) : null
  }

  const DISPLACEMENT_TOLERANCE = 100 // ±100cc

  function candidateMatchesListing(c: FasecoldaCandidate): boolean {
    const parsed = parseRef3(c.referencia3)

    // Filtro transmisión
    if (listingIsAuto !== null && parsed.transmission !== null) {
      const candidateIsAuto = parsed.transmission === 'Automático' || parsed.transmission === 'Triptónico'
      if (listingIsAuto !== candidateIsAuto) return false
    }

    // Filtro combustible
    if (fuelType === 'Diésel' && parsed.fuel !== 'Diésel') return false
    if (fuelType === 'Gasolina' && parsed.fuel === 'Diésel') return false

    // Filtro cilindraje (solo con datos confiables ≥ 200cc)
    if (safeEngineSize) {
      const candDisp = parseDisplacement(c.referencia3)
      if (candDisp !== null) {
        if (Math.abs(candDisp - safeEngineSize) > DISPLACEMENT_TOLERANCE) return false
      }
    }

    return true
  }

  const filtered = scored.filter(candidateMatchesListing)

  // Fallback: si el filtrado elimina todos, retornar lista completa (ya ordenada por score)
  return filtered.length > 0 ? filtered : scored
}
