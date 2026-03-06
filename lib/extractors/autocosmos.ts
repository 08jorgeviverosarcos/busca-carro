// CAPA 1: Extractor de Autocosmos.com.co via Firecrawl (markdown parsing)
// Usa URLs por marca para evitar caché de Firecrawl con paginación por querystring

import FirecrawlApp from '@mendable/firecrawl-js'
import { RawListing } from '@/lib/types'
import { sleep } from '@/lib/utils'

const BASE_URL = 'https://www.autocosmos.com.co/auto/usado'

// Marcas colombianas con más inventario en Autocosmos
const MARCAS = [
  'chevrolet', 'renault', 'mazda', 'toyota', 'kia',
  'hyundai', 'ford', 'nissan', 'volkswagen', 'suzuki',
  'audi', 'bmw', 'mercedes', 'jeep', 'honda',
  'dodge', 'mitsubishi', 'volvo', 'seat', 'skoda',
]

// Extrae el modelo del título del listado
// Título: "BRAND MODEL TRIM usado (YEAR) color COLOR precio $PRICE"
function extractModelFromTitle(title: string, brand: string): string {
  // Quitar todo desde "usado" en adelante
  const beforeUsado = title.split(/\s+usado\b/i)[0] ?? title
  // Quitar la marca al inicio
  const withoutBrand = beforeUsado.replace(new RegExp(`^${brand}\\s+`, 'i'), '').trim()
  return withoutBrand
}

// Regex para extraer listings del markdown de Autocosmos
// Formato: [![TITLE](IMG_URL)\\\n\\\nBRAND\\\n\\\nMODEL\\\n\\\nYEAR \| KM km\\\n\\\nCITY \| DEPT\\\n\\\n$PRICE](URL "TITLE")
const LISTING_REGEX = /\[!\[([^\]]+)\]\(([^)]+)\)(\\+\n\\+\n)([\s\S]+?)\]\(([^"]+) "([^"]+)"\)/g

type ParsedListing = {
  title: string
  imageUrl: string
  listingUrl: string
  brand: string
  model: string
  year: string
  mileage: string
  city: string
  department: string
  price: string
}

function parseListingsFromMarkdown(md: string): ParsedListing[] {
  const listings: ParsedListing[] = []
  const regex = new RegExp(LISTING_REGEX.source, 'g')
  let match: RegExpExecArray | null

  while ((match = regex.exec(md)) !== null) {
    const title = match[1]
    const imageUrl = match[2]
    const innerText = match[4]
    const listingUrl = match[5]

    // Separador es \\↵\\↵ (doble backslash + newline, markdown line break)
    const parts = innerText.split(/\\\\\n\\\\\n|\\\\\n/)
    if (parts.length < 5) continue

    const brand = parts[0].trim()
    const model = parts[1].trim()
    const yearKm = parts[2].trim()
    const cityDept = parts[3].trim()
    const priceRaw = parts[4].trim()

    // Parsear year y km — separador puede ser \| o |
    const yearKmMatch = yearKm.match(/^(\d{4})\s*(?:\\\||\|)\s*([\d.,]+)\s*km$/)
    const year = yearKmMatch?.[1] ?? ''
    const mileage = yearKmMatch?.[2]?.replace(/\./g, '') ?? ''

    // Parsear city y department
    const cityParts = cityDept.split(/\s*(?:\\\||\|)\s*/)
    const city = cityParts[0]?.trim() ?? ''
    const department = cityParts[1]?.trim() ?? ''

    // Parsear precio
    const price = priceRaw.replace(/^\$/, '').replace(/\./g, '').trim()

    // Mejorar el modelo extrayendo del título (más limpio que el texto markdown)
    // Título: "BRAND MODEL TRIM usado (YEAR) color COLOR precio $PRICE"
    const titleModel = extractModelFromTitle(title, brand)
    const cleanModel = titleModel || model

    listings.push({ title, imageUrl, listingUrl, brand, model: cleanModel, year, mileage, city, department, price })
  }

  return listings
}

// Extrae una URL específica (por marca o página base)
export async function extractAutocosmosUrl(app: FirecrawlApp, url: string): Promise<ParsedListing[]> {
  const result = await app.scrapeUrl(url, { formats: ['markdown'] })
  if (!result.success || !result.markdown) return []
  return parseListingsFromMarkdown(result.markdown)
}

export async function extractAutocosmos(marcasCount = MARCAS.length, startIdx = 0): Promise<RawListing[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    console.error('❌ Autocosmos: FIRECRAWL_API_KEY no configurada')
    return []
  }

  const marcasToProcess = MARCAS.slice(startIdx, startIdx + marcasCount)
  console.log(`🔄 Extrayendo Autocosmos (marcas: ${marcasToProcess.join(', ')})...`)
  const app = new FirecrawlApp({ apiKey })
  const allListings: RawListing[] = []
  const seen = new Set<string>()

  // Primero la página base (todos)
  if (startIdx === 0) {
    try {
      console.log(`  🔄 Autocosmos (todos): ${BASE_URL}`)
      const items = await extractAutocosmosUrl(app, BASE_URL)
      console.log(`  📊 Todos: ${items.length} anuncios`)
      for (const item of items) {
        if (!item.listingUrl || seen.has(item.listingUrl)) continue
        seen.add(item.listingUrl)
        allListings.push(toRawListing(item))
      }
      await sleep(1100)
    } catch (err) {
      console.error('❌ Autocosmos base excepción:', err)
    }
  }

  // Luego por marca
  for (const marca of marcasToProcess) {
    try {
      const url = `${BASE_URL}/${marca}`
      console.log(`  🔄 Autocosmos (${marca}): ${url}`)
      const items = await extractAutocosmosUrl(app, url)
      console.log(`  📊 ${marca}: ${items.length} anuncios`)

      for (const item of items) {
        if (!item.listingUrl || seen.has(item.listingUrl)) continue
        seen.add(item.listingUrl)
        allListings.push(toRawListing(item))
      }

      await sleep(1100)
    } catch (err) {
      console.error(`❌ Autocosmos ${marca} excepción:`, err)
    }
  }

  console.log(`✅ Autocosmos: ${allListings.length} anuncios extraídos`)
  return allListings
}

function toRawListing(item: ParsedListing): RawListing {
  return {
    sourcePortal: 'autocosmos',
    externalId: item.listingUrl,
    rawTitle: item.title,
    rawPrice: item.price,
    rawYear: item.year,
    rawMileage: item.mileage,
    rawCity: item.city,
    rawFuelType: '',
    rawTransmission: '',
    rawBrand: item.brand,
    rawModel: item.model,
    images: item.imageUrl ? [item.imageUrl] : [],
    urlOriginal: item.listingUrl,
    scrapedAt: new Date(),
  }
}
