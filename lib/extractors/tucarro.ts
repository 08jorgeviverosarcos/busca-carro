// CAPA 1: Extractor de TuCarro.com.co via Firecrawl

import FirecrawlApp from '@mendable/firecrawl-js'
import { RawListing } from '@/lib/types'
import { sleep } from '@/lib/utils'

const BASE_URL = 'https://www.tucarro.com.co/carros_usados/'

type TuCarroItem = {
  title?: string
  price?: string
  year?: string
  mileage?: string
  city?: string
  imageUrl?: string
  listingUrl?: string
  brand?: string
  model?: string
  fuelType?: string
  transmission?: string
}

type ExtractResult = {
  listings?: TuCarroItem[]
}

export async function extractTuCarro(maxPages = 5): Promise<RawListing[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    console.error('❌ TuCarro: FIRECRAWL_API_KEY no configurada')
    return []
  }

  console.log('🔄 Extrayendo TuCarro...')
  const app = new FirecrawlApp({ apiKey })
  const allListings: RawListing[] = []

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = page === 1 ? BASE_URL : `${BASE_URL}_Desde_${(page - 1) * 48 + 1}`
      console.log(`  🔄 TuCarro página ${page}: ${url}`)

      const result = await app.scrapeUrl(url, {
        formats: ['extract'],
        extract: {
          prompt: 'Extrae todos los anuncios de carros de esta página como un JSON con campo "listings" (array). Para cada anuncio incluye: title, price, year, mileage, city, imageUrl, listingUrl, brand, model, fuelType, transmission.',
        },
      })

      if (!result.success || !result.extract) {
        console.error(`❌ TuCarro página ${page}: scrape sin datos`)
        continue
      }

      const extracted = result.extract as ExtractResult
      const items: TuCarroItem[] = extracted.listings ?? []

      for (const item of items) {
        if (!item.title && !item.listingUrl) continue

        allListings.push({
          sourcePortal: 'tucarro',
          externalId: item.listingUrl ?? `tucarro-${Date.now()}-${Math.random()}`,
          rawTitle: item.title ?? '',
          rawPrice: item.price ?? '',
          rawYear: item.year ?? '',
          rawMileage: item.mileage ?? '',
          rawCity: item.city ?? '',
          rawFuelType: item.fuelType ?? '',
          rawTransmission: item.transmission ?? '',
          rawBrand: item.brand ?? '',
          rawModel: item.model ?? '',
          images: item.imageUrl ? [item.imageUrl] : [],
          urlOriginal: item.listingUrl ?? '',
          scrapedAt: new Date(),
        })
      }

      await sleep(1100)
    } catch (err) {
      console.error(`❌ TuCarro página ${page} excepción:`, err)
    }
  }

  console.log(`✅ TuCarro: ${allListings.length} anuncios extraídos`)
  return allListings
}
