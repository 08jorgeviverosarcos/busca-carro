import { prisma } from '@/lib/prisma'
import { BUSCACARRO_TO_FASECOLDA } from './brand-map'

export interface FasecoldaResult {
  valueCop: bigint
  referencia: string
  codigo: string
  clase: string
}

// Lookup directo desde servidor (para páginas de detalle)
// Retorna el primer resultado que coincida por marca+año, opcionalmente filtrado por modelo
export async function getFasecoldaValue(
  brand: string,
  year: number,
  model?: string
): Promise<FasecoldaResult | null> {
  // Mapear marca canónica BuscaCarro → marca FASECOLDA
  const fasecoldaBrand = BUSCACARRO_TO_FASECOLDA[brand] ?? brand.toUpperCase()

  // Obtener el período más reciente disponible
  const latestPeriod = await prisma.fasecoldaValue.findFirst({
    select: { period: true },
    orderBy: { period: 'desc' },
  })
  if (!latestPeriod) return null

  const whereCode = {
    marca: fasecoldaBrand,
    // Solo códigos que tienen valor para el año+período solicitado
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

  const result = await prisma.fasecoldaCode.findFirst({
    where: whereCode,
    include: {
      values: {
        where: { year, period: latestPeriod.period },
        take: 1,
      },
    },
  })

  if (!result || result.values.length === 0) return null

  const value = result.values[0]
  const referencia = [result.referencia1, result.referencia2, result.referencia3]
    .filter(Boolean)
    .join(' ')

  return {
    valueCop: value.valueCop,
    referencia,
    codigo: result.codigo,
    clase: result.clase,
  }
}
