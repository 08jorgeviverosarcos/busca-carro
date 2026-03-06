// CAPA 1: Extractor de MercadoLibre Colombia
// Usa OAuth client_credentials para obtener access_token y consumir la API oficial

import { RawListing } from '@/lib/types'
import { sleep } from '@/lib/utils'

const ML_API_BASE = 'https://api.mercadolibre.com'
const CATEGORY_AUTOS = 'MCO1744'
const MARCAS_POPULARES = [
  'Chevrolet', 'Renault', 'Mazda', 'Toyota', 'Kia',
  'Hyundai', 'Ford', 'Nissan', 'Volkswagen', 'Suzuki',
]

type MLTokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

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
}

type MLSearchResponse = {
  results: MLItem[]
  paging: {
    total: number
    offset: number
    limit: number
  }
}

// Obtiene access_token usando el refresh_token almacenado en .env
async function getAccessToken(): Promise<string> {
  const clientId = process.env.ML_CLIENT_ID
  const clientSecret = process.env.ML_CLIENT_SECRET
  const refreshToken = process.env.ML_REFRESH_TOKEN

  if (!clientId || !clientSecret) {
    throw new Error('ML_CLIENT_ID o ML_CLIENT_SECRET no configurados en .env')
  }
  if (!refreshToken) {
    throw new Error('ML_REFRESH_TOKEN no configurado — ejecuta: node scripts/ml-auth.mjs')
  }

  const res = await fetch(`${ML_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`ML OAuth error ${res.status}: ${body}`)
  }

  const data: MLTokenResponse = await res.json()
  return data.access_token
}

// Obtiene el valor de un atributo por ID
function getAttr(attrs: MLAttribute[], id: string): string {
  return attrs.find((a) => a.id === id)?.value_name ?? ''
}

// Extrae anuncios de una marca con paginación (máx 250 resultados por marca)
async function fetchByBrand(brand: string, token: string): Promise<RawListing[]> {
  const listings: RawListing[] = []
  let offset = 0
  const limit = 50

  while (true) {
    try {
      const url = `${ML_API_BASE}/sites/MCO/search?category=${CATEGORY_AUTOS}&q=${encodeURIComponent(brand)}&limit=${limit}&offset=${offset}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        console.error(`❌ ML error ${res.status} para ${brand} offset ${offset}`)
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

      if (offset + limit >= data.paging.total || offset + limit >= 250) break

      offset += limit
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

  let token: string
  try {
    token = await getAccessToken()
    console.log('✅ ML token obtenido')
  } catch (err) {
    console.error('❌ ML no pudo obtener token:', err)
    return []
  }

  const allListings: RawListing[] = []
  const seen = new Set<string>()

  for (const brand of MARCAS_POPULARES) {
    console.log(`  🔄 Buscando marca: ${brand}`)
    const brandListings = await fetchByBrand(brand, token)

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
