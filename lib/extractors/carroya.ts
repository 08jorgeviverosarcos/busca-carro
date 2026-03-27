// CAPA 1: Extractor de CarroYa.com via API JSON directa
// Descubierta por ingeniería inversa del bundle JS — no requiere Firecrawl
// Endpoint: POST https://carroya-habilitadora-api.avaldigitallabs.com/find-filters
// Body: { seoArray: ["carros-y-camionetas", "usado"], params: { page: "N" } }
// Devuelve 20 listings por página (superHighlights), ~29,000 carros usados totales

import { RawListing } from '@/lib/types'
import { sleep } from '@/lib/utils'

const API_URL = 'https://carroya-habilitadora-api.avaldigitallabs.com/find-filters'

type CarroyaVehicle = {
  id: string
  brand: string
  model: string
  year: number
  price: number
  kilometers: number
  city: string
  ccombustible?: string
  ctipocaja?: string
  clinea2?: string
  title?: string
  detail?: string
  images?: Array<{ image: string }>
  status?: string
  color?: string
  cylindrical?: number  // cilindrada en cc
}

type CarroyaResponse = {
  count: number
  pages: number
  results?: {
    megaHighlights?: CarroyaVehicle[]
    superHighlights?: CarroyaVehicle[]
  }
}

// Campos extra del bulk que no caben en RawListing — se guardan vía updateListingDetail()
export type CarroyaExtraFields = {
  externalId: string
  color?: string
  engineSize?: number
  condition?: string
}

// Elimina tildes/acentos para construir segmentos de URL válidos
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Construye la URL de detalle directamente desde los campos del vehículo.
// El campo v.detail de la API es poco fiable:
// - IDs numéricos: devuelve /vehiculo/usado/{brand}/{model}/{trim}/{year}/{city} (sin ID al final)
// - IDs UUID: devuelve carroya.comalle/ en lugar de carroya.com/detalle/ (bug conocido)
// Formato correcto (verificado en sitio real, sin .do al final, sin tildes):
//   https://www.carroya.com/detalle/usado/{brand}/{model}/{year}/{city}/{id}
function buildDetailUrl(v: CarroyaVehicle): string {
  const brand = removeAccents(v.brand.toLowerCase()).replace(/\s+/g, '-')
  const model = removeAccents(v.model.toLowerCase()).replace(/\s+/g, '-')
  const city = removeAccents(v.city.toLowerCase())
  return `https://www.carroya.com/detalle/usado/${brand}/${model}/${v.year}/${city}/${v.id}`
}

function vehicleToRawListing(v: CarroyaVehicle, page: number): RawListing {
  const imageUrls = v.images?.map((img) => img.image).filter(Boolean) ?? []
  const detailUrl = buildDetailUrl(v)

  return {
    sourcePortal: 'carroya',
    externalId: v.id,
    rawTitle: v.title?.trim() ?? `${v.brand} ${v.model} ${v.year}`,
    rawPrice: v.price ? String(v.price) : '',
    rawYear: v.year ? String(v.year) : '',
    rawMileage: v.kilometers ? String(v.kilometers) : '',
    rawCity: v.city ?? '',
    rawFuelType: v.ccombustible ?? '',
    rawTransmission: v.ctipocaja ?? '',
    rawBrand: v.brand ?? '',
    rawModel: v.model?.trim() || '',
    rawTrim: v.clinea2?.trim() || undefined,
    images: imageUrls,
    urlOriginal: detailUrl,
    scrapedAt: new Date(),
    sourcePage: page,
  }
}

function vehicleToExtraFields(v: CarroyaVehicle): CarroyaExtraFields {
  return {
    externalId: v.id,
    color: v.color?.trim() || undefined,
    engineSize: v.cylindrical && v.cylindrical > 0 ? v.cylindrical : undefined,
    condition: v.status?.trim() || undefined,
  }
}

async function fetchPage(page: number): Promise<{ vehicles: CarroyaVehicle[]; totalPages: number }> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seoArray: ['carros-y-camionetas', 'usado'],
      params: { page: String(page) },
    }),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  const data: CarroyaResponse = await res.json()
  const mega = data.results?.megaHighlights ?? []
  const super_ = data.results?.superHighlights ?? []

  return {
    vehicles: [...mega, ...super_],
    totalPages: data.pages ?? 0,
  }
}

// pages: cuántas páginas traer (20 vehículos c/u en superHighlights + 7 en megaHighlights p.1)
// startIdx: página inicial (1-based; 0 se trata como 1)
export async function extractCarroya(pages = 10, startIdx = 0): Promise<{
  listings: RawListing[]
  reachedEnd: boolean
  hadError: boolean
  extraFields: CarroyaExtraFields[]
}> {
  const startPage = startIdx > 0 ? startIdx : 1
  const endPage = startPage + pages - 1
  console.log(`🔄 Extrayendo CarroYa (páginas ${startPage}–${endPage})...`)

  const allListings: RawListing[] = []
  const allExtraFields: CarroyaExtraFields[] = []
  const seen = new Set<string>()
  let reachedEnd = false
  let hadError = false

  for (let page = startPage; page <= endPage; page++) {
    try {
      console.log(`  🔄 CarroYa página ${page}...`)
      const { vehicles, totalPages } = await fetchPage(page)

      if (vehicles.length === 0) {
        console.log(`  ⚠️ Página ${page} vacía, deteniendo`)
        reachedEnd = true
        break
      }

      let newCount = 0
      for (const v of vehicles) {
        if (!v.id || seen.has(v.id)) continue
        seen.add(v.id)
        allListings.push(vehicleToRawListing(v, page))
        allExtraFields.push(vehicleToExtraFields(v))
        newCount++
      }

      console.log(`  📊 CarroYa página ${page}/${totalPages}: ${newCount} nuevos listings`)

      if (page >= totalPages) {
        reachedEnd = true
        break
      }

      if (page < endPage) await sleep(600)
    } catch (err) {
      console.error(`❌ CarroYa página ${page} excepción:`, err)
      hadError = true
      break
    }
  }

  console.log(`✅ CarroYa: ${allListings.length} anuncios extraídos${reachedEnd ? ' (fin de paginación)' : ''}${hadError ? ' (detenido por error)' : ''}`)
  return { listings: allListings, reachedEnd, hadError, extraFields: allExtraFields }
}
