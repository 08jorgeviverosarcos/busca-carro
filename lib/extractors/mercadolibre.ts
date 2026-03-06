// CAPA 1: Extractor de MercadoLibre Colombia
// Usa la API oficial sin autenticación para carros usados (categoría MCO1744)

import { RawListing } from '@/lib/types'
import { sleep } from '@/lib/utils'

const ML_API_BASE = 'https://api.mercadolibre.com'
const CATEGORY_AUTOS = 'MCO1744'
const MARCAS_POPULARES = [
  'Chevrolet', 'Renault', 'Mazda', 'Toyota', 'Kia',
  'Hyundai', 'Ford', 'Nissan', 'Volkswagen', 'Suzuki',
]

type MLAttribute = {
  id: string
  value_name: string | null
}

type MLItem = {
  id: string
  title: string
  price: number
  currency_id: string
  thumbnail: string
  permalink: string
  attributes: MLAttribute[]
  pictures?: { url: string }[]
}

type MLSearchResponse = {
  results: MLItem[]
  paging: {
    total: number
    offset: number
    limit: number
  }
}

// Obtiene el valor de un atributo por ID
function getAttr(attrs: MLAttribute[], id: string): string {
  return attrs.find((a) => a.id === id)?.value_name ?? ''
}

// Extrae todos los anuncios de una marca con paginación
async function fetchByBrand(brand: string): Promise<RawListing[]> {
  const listings: RawListing[] = []
  let offset = 0
  const limit = 50

  while (true) {
    try {
      const url = `${ML_API_BASE}/sites/MCO/search?category=${CATEGORY_AUTOS}&q=${encodeURIComponent(brand)}&limit=${limit}&offset=${offset}`
      const res = await fetch(url)

      if (!res.ok) {
        console.error(`❌ ML error ${res.status} para marca ${brand} offset ${offset}`)
        break
      }

      const data: MLSearchResponse = await res.json()

      if (!data.results?.length) break

      for (const item of data.results) {
        listings.push({
          sourcePortal: 'mercadolibre',
          externalId: item.id,
          rawTitle: item.title,
          rawPrice: String(item.price),
          rawYear: getAttr(item.attributes, 'VEHICLE_YEAR'),
          rawMileage: getAttr(item.attributes, 'KILOMETERS'),
          rawCity: getAttr(item.attributes, 'SELLER_ADDRESS'),
          rawFuelType: getAttr(item.attributes, 'FUEL_TYPE'),
          rawTransmission: getAttr(item.attributes, 'TRANSMISSION'),
          rawBrand: getAttr(item.attributes, 'BRAND'),
          rawModel: getAttr(item.attributes, 'MODEL'),
          images: item.thumbnail ? [item.thumbnail.replace('I.jpg', 'O.jpg')] : [],
          urlOriginal: item.permalink,
          scrapedAt: new Date(),
        })
      }

      // Si ya no hay más resultados, terminar
      if (offset + limit >= data.paging.total || offset + limit >= 250) break

      offset += limit
      // Rate limiting: máximo 1 req/s
      await sleep(1100)
    } catch (err) {
      console.error(`❌ ML excepción para marca ${brand}:`, err)
      break
    }
  }

  return listings
}

export async function extractMercadoLibre(): Promise<RawListing[]> {
  console.log('🔄 Extrayendo MercadoLibre...')
  const allListings: RawListing[] = []
  const seen = new Set<string>()

  for (const brand of MARCAS_POPULARES) {
    console.log(`  🔄 Buscando marca: ${brand}`)
    const brandListings = await fetchByBrand(brand)

    // Deduplicar por externalId
    for (const listing of brandListings) {
      if (!seen.has(listing.externalId)) {
        seen.add(listing.externalId)
        allListings.push(listing)
      }
    }

    await sleep(1100)
  }

  console.log(`✅ MercadoLibre: ${allListings.length} anuncios extraídos`)
  return allListings
}
