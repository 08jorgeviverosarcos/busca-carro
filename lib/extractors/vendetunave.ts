// CAPA 1: Extractor de VendeTuNave.co via HTML directo (__NEXT_DATA__)
// El sitio expone datos estructurados en el tag <script id="__NEXT_DATA__">
// Paginación: ?marca=BRAND (el ?pagina=N no funciona server-side)

import { RawListing } from '@/lib/types'
import { sleep } from '@/lib/utils'

const BASE_URL = 'https://www.vendetunave.co'
const IMG_BASE = `${BASE_URL}/images/vehiculos/medium`

// Marcas colombianas con inventario en VendeTuNave
const MARCAS = [
  'chevrolet', 'renault', 'mazda', 'toyota', 'kia',
  'hyundai', 'ford', 'nissan', 'volkswagen', 'suzuki',
  'audi', 'bmw', 'mercedes-benz', 'jeep', 'honda',
  'dodge', 'mitsubishi', 'volvo', 'seat', 'chery',
  'great-wall', 'jac', 'dfsk', 'changan', 'byd',
]

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

async function fetchMarca(marca: string): Promise<VTNVehicle[]> {
  const url = `${BASE_URL}/vehiculos/?marca=${marca}`
  try {
    const res = await fetch(url, { headers: HEADERS })
    if (!res.ok) {
      console.error(`❌ VendeTuNave ${marca}: HTTP ${res.status}`)
      return []
    }
    const html = await res.text()
    const match = html.match(/<script id="__NEXT_DATA__[^>]*>([\s\S]+?)<\/script>/)
    if (!match) {
      console.error(`❌ VendeTuNave ${marca}: sin __NEXT_DATA__`)
      return []
    }
    const json = JSON.parse(match[1])
    return json.props?.pageProps?.data?.vehicles ?? []
  } catch (err) {
    console.error(`❌ VendeTuNave ${marca} excepción:`, err)
    return []
  }
}

function vehicleToRawListing(v: VTNVehicle): RawListing | null {
  // Excluir motos
  if (v.tipo_moto === 1) return null
  if (v.tipoLabel && !v.tipoLabel.toLowerCase().includes('carro') && !v.tipoLabel.toLowerCase().includes('camionet')) return null

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
    urlOriginal: `${BASE_URL}/vehiculos/${v.id}`,
    scrapedAt: new Date(),
  }
}

export async function extractVendeTuNave(marcasCount = MARCAS.length, startIdx = 0): Promise<RawListing[]> {
  const marcasToProcess = MARCAS.slice(startIdx, startIdx + marcasCount)
  console.log(`🔄 Extrayendo VendeTuNave (marcas: ${marcasToProcess.join(', ')})...`)
  const allListings: RawListing[] = []
  const seen = new Set<string>()

  // Primero la página base (todos los vehículos)
  if (startIdx === 0) {
    try {
      console.log('  🔄 VendeTuNave (todos)...')
      const res = await fetch(`${BASE_URL}/vehiculos/`, { headers: HEADERS })
      const html = await res.text()
      const match = html.match(/<script id="__NEXT_DATA__[^>]*>([\s\S]+?)<\/script>/)
      if (match) {
        const json = JSON.parse(match[1])
        const vehicles: VTNVehicle[] = json.props?.pageProps?.data?.vehicles ?? []
        for (const v of vehicles) {
          const listing = vehicleToRawListing(v)
          if (!listing || seen.has(listing.externalId)) continue
          seen.add(listing.externalId)
          allListings.push(listing)
        }
        console.log(`  📊 Todos: ${vehicles.length} vehículos`)
      }
      await sleep(600)
    } catch (err) {
      console.error('❌ VendeTuNave base excepción:', err)
    }
  }

  // Luego por marca
  for (const marca of marcasToProcess) {
    try {
      console.log(`  🔄 VendeTuNave (${marca})...`)
      const vehicles = await fetchMarca(marca)
      console.log(`  📊 ${marca}: ${vehicles.length} vehículos`)

      for (const v of vehicles) {
        const listing = vehicleToRawListing(v)
        if (!listing || seen.has(listing.externalId)) continue
        seen.add(listing.externalId)
        allListings.push(listing)
      }

      await sleep(600)
    } catch (err) {
      console.error(`❌ VendeTuNave ${marca} excepción:`, err)
    }
  }

  console.log(`✅ VendeTuNave: ${allListings.length} anuncios extraídos`)
  return allListings
}
