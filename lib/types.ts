// Tipos compartidos entre todas las capas del sistema

export type RawListing = {
  sourcePortal: string
  externalId: string
  rawTitle: string
  rawPrice: string
  rawYear: string
  rawMileage: string
  rawCity: string
  rawFuelType: string
  rawTransmission: string
  rawBrand: string
  rawModel: string
  rawTrim?: string       // versión detallada del modelo (clinea2 en CarroYa, vacío en otros portales)
  images: string[]
  urlOriginal: string
  scrapedAt: Date
  sourcePage?: number
}

export type NormalizedListing = {
  sourcePortal: string
  externalId: string
  title: string
  brand: string | null
  model: string | null
  trim: string | null    // versión/paquete del modelo
  year: number | null
  priceCop: number | null
  mileage: number | null
  fuelType: string | null
  transmission: string | null
  city: string | null
  department: string | null
  images: string[]
  urlOriginal: string
  scrapedAt: Date
  sourcePage?: number
}

export type NormalizationStats = {
  total: number
  normalized: number
  discarded: number
  reasons: Record<string, number>
}

export type SyncStats = {
  inserted: number
  updated: number
  skipped: number
}

export type GlobalStats = {
  totalActive: number
  byPortal: Record<string, number>
  lastSync: Record<string, Date>
}

export type SearchParams = {
  q?: string
  brand?: string
  model?: string
  yearMin?: number
  yearMax?: number
  priceMin?: number
  priceMax?: number
  city?: string
  fuelType?: string
  transmission?: string
  portal?: string
  sortBy?: 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc' | 'recent'
  page?: number
  limit?: number
}

export type ApiResponse<T> = {
  data: T | null
  error: string | null
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
