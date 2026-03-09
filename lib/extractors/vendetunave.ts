// CAPA 1: Extractor de VendeTuNave.co via HTML directo (__NEXT_DATA__)
// El sitio expone datos estructurados en el tag <script id="__NEXT_DATA__">
// URL: /vehiculos/carrosycamionetas?page=N — devuelve 20 vehículos por página (~12,000 totales)

import { RawListing } from '@/lib/types'
import { sleep } from '@/lib/utils'

const BASE_URL = 'https://www.vendetunave.co'
const IMG_BASE = 'https://d3bmp4azzreq60.cloudfront.net/fit-in/300x200/vendetunave/images/vehiculos'
const LIST_URL = `${BASE_URL}/vehiculos/carrosycamionetas`

type VTNVehicle = {
  id: number
  title: string
  precio: number
  condicion?: string
  ano?: number
  kilometraje?: number
  labelCiudad?: string
  labelDep?: string
  nameImage?: string
  extension?: string
  modelo?: string
  marca?: string
  combustible?: string
  transmision?: string
  tipoLabel?: string
  tipo_moto?: number
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-CO,es;q=0.9',
}

async function fetchPage(page: number): Promise<VTNVehicle[]> {
  const url = page === 1 ? LIST_URL : `${LIST_URL}?page=${page}`
  try {
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) {
      console.error(`❌ VendeTuNave página ${page}: HTTP ${res.status}`)
      return []
    }
    const html = await res.text()
    const match = html.match(/<script id="__NEXT_DATA__[^>]*>([\s\S]+?)<\/script>/)
    if (!match) {
      console.error(`❌ VendeTuNave página ${page}: sin __NEXT_DATA__`)
      return []
    }
    const json = JSON.parse(match[1])
    return json.props?.pageProps?.data?.vehicles ?? []
  } catch (err) {
    console.error(`❌ VendeTuNave página ${page} excepción:`, err)
    return []
  }
}

function vehicleToRawListing(v: VTNVehicle): RawListing | null {
  const imageUrl = v.nameImage && v.extension
    ? `${IMG_BASE}/${v.nameImage}.${v.extension}`
    : undefined

  return {
    sourcePortal: 'vendetunave',
    externalId: String(v.id),
    rawTitle: v.title?.trim() ?? '',
    rawPrice: v.precio ? String(v.precio) : '',
    rawYear: v.ano ? String(v.ano) : '',
    rawMileage: v.kilometraje ? String(v.kilometraje) : '',
    rawCity: v.labelCiudad ?? '',
    rawFuelType: v.combustible ?? '',
    rawTransmission: v.transmision ?? '',
    rawBrand: v.marca ?? '',
    rawModel: v.modelo ?? '',
    images: imageUrl ? [imageUrl] : [],
    urlOriginal: `${BASE_URL}/vehiculo/${v.id}`,
    scrapedAt: new Date(),
  }
}

// pages: cuántas páginas traer (20 vehículos c/u)
// startIdx: página inicial (1-based; 0 se trata como 1)
export async function extractVendeTuNave(pages = 10, startIdx = 0): Promise<RawListing[]> {
  const startPage = startIdx > 0 ? startIdx : 1
  const endPage = startPage + pages - 1
  console.log(`🔄 Extrayendo VendeTuNave (páginas ${startPage}–${endPage})...`)

  const allListings: RawListing[] = []
  const seen = new Set<string>()

  for (let page = startPage; page <= endPage; page++) {
    try {
      console.log(`  🔄 VendeTuNave página ${page}...`)
      const vehicles = await fetchPage(page)

      if (vehicles.length === 0) {
        console.log(`  ⚠️ Página ${page} vacía, deteniendo`)
        break
      }

      console.log(`  📊 Página ${page}: ${vehicles.length} vehículos`)

      for (const v of vehicles) {
        const listing = vehicleToRawListing(v)
        if (!listing || seen.has(listing.externalId)) continue
        seen.add(listing.externalId)
        allListings.push(listing)
      }

      if (page < endPage) await sleep(600)
    } catch (err) {
      console.error(`❌ VendeTuNave página ${page} excepción:`, err)
    }
  }

  console.log(`✅ VendeTuNave: ${allListings.length} anuncios extraídos`)
  return allListings
}
