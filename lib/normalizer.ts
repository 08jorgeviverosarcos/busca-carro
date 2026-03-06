// CAPA 2: Normalizador universal — convierte RawListing[] en NormalizedListing[]

import { RawListing, NormalizedListing, NormalizationStats } from '@/lib/types'
import { titleCase } from '@/lib/utils'

const CURRENT_YEAR = new Date().getFullYear()

// Tabla de normalización de ciudades
const CITY_MAP: Record<string, string> = {
  'bogota': 'Bogotá',
  'bogotá': 'Bogotá',
  'bogotá d.c.': 'Bogotá',
  'bogotá dc': 'Bogotá',
  'bogota d.c.': 'Bogotá',
  'bogota dc': 'Bogotá',
  'santa fe de bogota': 'Bogotá',
  'medellin': 'Medellín',
  'medellín': 'Medellín',
  'cali': 'Cali',
  'barranquilla': 'Barranquilla',
  'bucaramanga': 'Bucaramanga',
  'cartagena': 'Cartagena',
  'cucuta': 'Cúcuta',
  'cúcuta': 'Cúcuta',
  'pereira': 'Pereira',
  'manizales': 'Manizales',
  'ibague': 'Ibagué',
  'ibagué': 'Ibagué',
  'villavicencio': 'Villavicencio',
  'pto de hierro': 'Puerto de Hierro',
  'puerto de hierro': 'Puerto de Hierro',
  'armenia': 'Armenia',
  'neiva': 'Neiva',
  'pasto': 'Pasto',
  'santa marta': 'Santa Marta',
  'monteria': 'Montería',
  'montería': 'Montería',
  'valledupar': 'Valledupar',
  'sincelejo': 'Sincelejo',
  'popayan': 'Popayán',
  'popayán': 'Popayán',
  'tunja': 'Tunja',
  'florencia': 'Florencia',
  'riohacha': 'Riohacha',
  'quibdo': 'Quibdó',
  'quibdó': 'Quibdó',
  'yopal': 'Yopal',
  'mocoa': 'Mocoa',
  'mitu': 'Mitú',
  'mitú': 'Mitú',
  'puerto carreno': 'Puerto Carreño',
  'puerto carreño': 'Puerto Carreño',
  'inirida': 'Inírida',
  'inírida': 'Inírida',
  'san jose del guaviare': 'San José del Guaviare',
}

// Tabla de normalización de marcas
const BRAND_MAP: Record<string, string> = {
  'toyota': 'Toyota',
  'chevrolet': 'Chevrolet',
  'chevy': 'Chevrolet',
  'gm': 'Chevrolet',
  'renault': 'Renault',
  'mazda': 'Mazda',
  'kia': 'Kia',
  'hyundai': 'Hyundai',
  'ford': 'Ford',
  'nissan': 'Nissan',
  'volkswagen': 'Volkswagen',
  'vw': 'Volkswagen',
  'suzuki': 'Suzuki',
  'honda': 'Honda',
  'mitsubishi': 'Mitsubishi',
  'jeep': 'Jeep',
  'dodge': 'Dodge',
  'bmw': 'BMW',
  'mercedes': 'Mercedes-Benz',
  'mercedes-benz': 'Mercedes-Benz',
  'audi': 'Audi',
  'volvo': 'Volvo',
  'peugeot': 'Peugeot',
  'fiat': 'Fiat',
  'subaru': 'Subaru',
  'land rover': 'Land Rover',
  'landrover': 'Land Rover',
  'isuzu': 'Isuzu',
  'chery': 'Chery',
  'jac': 'JAC',
  'great wall': 'Great Wall',
  'haval': 'Haval',
  'dfsk': 'DFSK',
  'geely': 'Geely',
  'byd': 'BYD',
  'mg': 'MG',
  'ssangyong': 'SsangYong',
  'infiniti': 'Infiniti',
  'acura': 'Acura',
  'lexus': 'Lexus',
  'porsche': 'Porsche',
  'alfa romeo': 'Alfa Romeo',
  'chrysler': 'Chrysler',
}

// Tabla de normalización de combustible
const FUEL_MAP: Record<string, string> = {
  'gasolina': 'Gasolina',
  'gas': 'Gasolina',
  'nafta': 'Gasolina',
  'gasoline': 'Gasolina',
  'gas natural vehicular': 'Gasolina',
  'diesel': 'Diésel',
  'diésel': 'Diésel',
  'diesel/gas': 'Diésel',
  'electrico': 'Eléctrico',
  'eléctrico': 'Eléctrico',
  'electric': 'Eléctrico',
  'hibrido': 'Híbrido',
  'híbrido': 'Híbrido',
  'hybrid': 'Híbrido',
  'gas natural': 'Gas Natural',
  'gnv': 'Gas Natural',
  'gasolina/gas': 'Gasolina',
}

// Tabla de normalización de transmisión
const TRANSMISSION_MAP: Record<string, string> = {
  'automatica': 'Automática',
  'automática': 'Automática',
  'automatico': 'Automática',
  'automático': 'Automática',
  'at': 'Automática',
  'auto': 'Automática',
  'automatic': 'Automática',
  'manual': 'Manual',
  'mt': 'Manual',
  'mecanica': 'Manual',
  'mecánica': 'Manual',
  'standar': 'Manual',
  'estándar': 'Manual',
  'estandar': 'Manual',
}

// Tabla de departamentos por ciudad
const DEPARTMENT_MAP: Record<string, string> = {
  'Bogotá': 'Cundinamarca',
  'Medellín': 'Antioquia',
  'Cali': 'Valle del Cauca',
  'Barranquilla': 'Atlántico',
  'Bucaramanga': 'Santander',
  'Cartagena': 'Bolívar',
  'Cúcuta': 'Norte de Santander',
  'Pereira': 'Risaralda',
  'Manizales': 'Caldas',
  'Ibagué': 'Tolima',
  'Villavicencio': 'Meta',
  'Armenia': 'Quindío',
  'Neiva': 'Huila',
  'Pasto': 'Nariño',
  'Santa Marta': 'Magdalena',
  'Montería': 'Córdoba',
  'Valledupar': 'Cesar',
  'Sincelejo': 'Sucre',
  'Popayán': 'Cauca',
  'Tunja': 'Boyacá',
}

// Normaliza precio desde string a número en COP
function normalizePrice(raw: string): number | null {
  if (!raw) return null

  // Eliminar símbolos y texto
  const cleaned = raw.replace(/\$|COP|cop|\s/g, '').replace(/\./g, '').replace(/,/g, '')
  const num = parseInt(cleaned, 10)

  if (isNaN(num) || num <= 0) return null

  // Si está en millones (< 1.000.000) multiplicar
  if (num < 1_000_000 && num > 0) return num * 1_000_000

  // Si parece estar en USD (< 10.000)
  if (num < 10_000 && num > 0) return num * 4_200

  return num
}

// Normaliza año desde string a número
function normalizeYear(raw: string): number | null {
  if (!raw) return null
  const match = raw.match(/\d{4}/)
  if (!match) return null
  const year = parseInt(match[0], 10)
  if (year < 1990 || year > CURRENT_YEAR + 1) return null
  return year
}

// Normaliza kilometraje desde string a número
function normalizeMileage(raw: string, year: number | null): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/km|KM|\s|\./g, '').replace(/,/g, '')
  const num = parseInt(cleaned, 10)
  if (isNaN(num) || num < 0) return null
  if (num > 1_000_000) return null // Error de datos
  // Sospechoso: 0 km en carro antiguo
  if (num === 0 && year !== null && year < CURRENT_YEAR - 1) return null
  return num
}

// Normaliza ciudad
function normalizeCity(raw: string): string | null {
  if (!raw) return null
  const key = raw.toLowerCase().trim()
  if (CITY_MAP[key]) return CITY_MAP[key]
  // Intentar coincidencia parcial
  for (const [mapKey, value] of Object.entries(CITY_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) return value
  }
  return titleCase(key)
}

// Normaliza marca
function normalizeBrand(raw: string, title: string): string | null {
  const source = raw || title
  if (!source) return null
  const key = source.toLowerCase().trim()

  // Buscar en BRAND_MAP
  for (const [mapKey, value] of Object.entries(BRAND_MAP)) {
    if (key.includes(mapKey) || key === mapKey) return value
  }

  // Buscar en el título
  if (!raw) {
    const titleLower = title.toLowerCase()
    for (const [mapKey, value] of Object.entries(BRAND_MAP)) {
      if (titleLower.startsWith(mapKey) || titleLower.includes(` ${mapKey} `)) return value
    }
  }

  return raw ? titleCase(raw) : null
}

// Normaliza modelo
function normalizeModel(raw: string, title: string, brand: string | null): string | null {
  if (raw) return titleCase(raw.trim())
  if (!title || !brand) return null

  // Intentar extraer modelo del título (quitar marca, año, etc.)
  const titleClean = title
    .replace(new RegExp(brand, 'gi'), '')
    .replace(/\b\d{4}\b/g, '')
    .replace(/\d+[\s.]*km/gi, '')
    .trim()

  return titleClean.length > 1 ? titleCase(titleClean) : null
}

// Normaliza combustible
function normalizeFuelType(raw: string): string | null {
  if (!raw) return null
  const key = raw.toLowerCase().trim()
  return FUEL_MAP[key] ?? null
}

// Normaliza transmisión
function normalizeTransmission(raw: string): string | null {
  if (!raw) return null
  const key = raw.toLowerCase().trim()
  return TRANSMISSION_MAP[key] ?? null
}

export function normalizeListings(rawListings: RawListing[]): {
  normalized: NormalizedListing[]
  stats: NormalizationStats
} {
  const normalized: NormalizedListing[] = []
  const reasons: Record<string, number> = {}
  let discarded = 0

  for (const raw of rawListings) {
    // El título es obligatorio
    if (!raw.rawTitle) {
      reasons['sin_titulo'] = (reasons['sin_titulo'] ?? 0) + 1
      discarded++
      continue
    }

    const year = normalizeYear(raw.rawYear)
    const mileage = normalizeMileage(raw.rawMileage, year)
    const city = normalizeCity(raw.rawCity)
    const brand = normalizeBrand(raw.rawBrand, raw.rawTitle)
    const model = normalizeModel(raw.rawModel, raw.rawTitle, brand)

    normalized.push({
      sourcePortal: raw.sourcePortal,
      externalId: raw.externalId,
      title: raw.rawTitle,
      brand,
      model,
      year,
      priceCop: normalizePrice(raw.rawPrice),
      mileage,
      fuelType: normalizeFuelType(raw.rawFuelType),
      transmission: normalizeTransmission(raw.rawTransmission),
      city,
      department: city ? (DEPARTMENT_MAP[city] ?? null) : null,
      images: raw.images,
      urlOriginal: raw.urlOriginal,
      scrapedAt: raw.scrapedAt,
    })
  }

  const stats: NormalizationStats = {
    total: rawListings.length,
    normalized: normalized.length,
    discarded,
    reasons,
  }

  console.log(`📊 Normalización: ${normalized.length}/${rawListings.length} exitosos, ${discarded} descartados`)

  return { normalized, stats }
}
