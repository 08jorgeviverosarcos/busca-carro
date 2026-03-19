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

// Tabla de normalización de modelos — variantes → forma canónica
const MODEL_CANONICAL_MAP: Record<string, string> = {
  // Mazda
  'cx5': 'CX-5', 'cx-5': 'CX-5', 'cx 5': 'CX-5',
  'cx3': 'CX-3', 'cx-3': 'CX-3', 'cx 3': 'CX-3',
  'cx30': 'CX-30', 'cx-30': 'CX-30', 'cx 30': 'CX-30',
  'cx9': 'CX-9', 'cx-9': 'CX-9', 'cx 9': 'CX-9',
  'cx50': 'CX-50', 'cx-50': 'CX-50', 'cx 50': 'CX-50',
  // Toyota
  'rav4': 'RAV4', 'rav-4': 'RAV4', 'rav 4': 'RAV4',
  'chr': 'C-HR', 'c-hr': 'C-HR', 'c hr': 'C-HR',
  'fj cruiser': 'FJ Cruiser', 'fjcruiser': 'FJ Cruiser',
  '4runner': '4Runner', '4 runner': '4Runner',
  'land cruiser': 'Land Cruiser', 'landcruiser': 'Land Cruiser',
  // Honda
  'crv': 'CR-V', 'cr-v': 'CR-V', 'cr v': 'CR-V',
  'hrv': 'HR-V', 'hr-v': 'HR-V', 'hr v': 'HR-V',
  'brv': 'BR-V', 'br-v': 'BR-V', 'br v': 'BR-V',
  // Hyundai
  'ioniq5': 'Ioniq 5', 'ioniq-5': 'Ioniq 5', 'ioniq 5': 'Ioniq 5',
  'ioniq6': 'Ioniq 6', 'ioniq-6': 'Ioniq 6', 'ioniq 6': 'Ioniq 6',
  'i10': 'i10', 'i20': 'i20', 'i30': 'i30', 'i40': 'i40',
  // Kia
  'ev6': 'EV6', 'ev 6': 'EV6',
  'k5': 'K5', 'k 5': 'K5',
  // Nissan
  'xtrail': 'X-Trail', 'x-trail': 'X-Trail', 'x trail': 'X-Trail',
  'xgear': 'X-Gear', 'x-gear': 'X-Gear', 'x gear': 'X-Gear',
  // Volkswagen
  't-cross': 'T-Cross', 'tcross': 'T-Cross', 't cross': 'T-Cross',
  't-roc': 'T-Roc', 'troc': 'T-Roc', 't roc': 'T-Roc',
  // Suzuki
  's-cross': 'S-Cross', 'scross': 'S-Cross', 's cross': 'S-Cross',
  's-presso': 'S-Presso', 'spresso': 'S-Presso', 's presso': 'S-Presso',
  // Mercedes-Benz
  'glc300': 'GLC 300', 'glc 300': 'GLC 300',
  'glc200': 'GLC 200', 'glc 200': 'GLC 200',
  'gle300': 'GLE 300', 'gle 300': 'GLE 300',
  'gle350': 'GLE 350', 'gle 350': 'GLE 350',
  'gla200': 'GLA 200', 'gla 200': 'GLA 200',
  'glb200': 'GLB 200', 'glb 200': 'GLB 200',
  'c200': 'C 200', 'c 200': 'C 200',
  'c300': 'C 300', 'c 300': 'C 300',
  'e200': 'E 200', 'e 200': 'E 200',
  'e300': 'E 300', 'e 300': 'E 300',
  // BMW
  'x1': 'X1', 'x2': 'X2', 'x3': 'X3', 'x4': 'X4',
  'x5': 'X5', 'x6': 'X6', 'x7': 'X7',
  'm3': 'M3', 'm4': 'M4', 'm5': 'M5',
  // Chery
  'tiggo 3': 'Tiggo 3', 'tiggo3': 'Tiggo 3',
  'tiggo 5': 'Tiggo 5', 'tiggo5': 'Tiggo 5',
  'tiggo 7': 'Tiggo 7', 'tiggo7': 'Tiggo 7',
  'tiggo 8': 'Tiggo 8', 'tiggo8': 'Tiggo 8',
  // Haval
  'h6': 'H6', 'h 6': 'H6',
  'h2': 'H2', 'h 2': 'H2',
  // MG
  'mg zs': 'ZS', 'zs': 'ZS',
  'mg hs': 'HS', 'hs': 'HS',
  // Jeep
  'grand cherokee': 'Grand Cherokee', 'grandcherokee': 'Grand Cherokee',
  // Ford
  'f-150': 'F-150', 'f150': 'F-150', 'f 150': 'F-150',
  'bronco sport': 'Bronco Sport', 'broncosport': 'Bronco Sport',
  // Land Rover
  'range rover': 'Range Rover', 'rangerover': 'Range Rover',
  'range rover sport': 'Range Rover Sport',
  'range rover evoque': 'Range Rover Evoque',
  'discovery sport': 'Discovery Sport', 'discoverysport': 'Discovery Sport',
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
  if (raw) {
    const key = raw.toLowerCase().trim()
    // Buscar coincidencia exacta en el mapa canónico
    if (MODEL_CANONICAL_MAP[key]) return MODEL_CANONICAL_MAP[key]
    // Buscar por prefijo (ej. "cx-5 grand touring" → "CX-5 Grand Touring")
    for (const [mapKey, canonical] of Object.entries(MODEL_CANONICAL_MAP)) {
      if (key.startsWith(mapKey + ' ') || key.startsWith(mapKey + '-')) {
        return canonical + ' ' + titleCase(raw.slice(mapKey.length).trim())
      }
    }
    return titleCase(raw.trim())
  }

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

export const VALID_BRANDS = [...new Set(Object.values(BRAND_MAP))]
export const VALID_CITIES = [...new Set(Object.values(CITY_MAP))]
export const VALID_MODELS = [...new Set(Object.values(MODEL_CANONICAL_MAP))].sort()
export const VALID_FUEL_TYPES = [...new Set(Object.values(FUEL_MAP))]
export const VALID_TRANSMISSIONS = [...new Set(Object.values(TRANSMISSION_MAP))]

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
      trim: raw.rawTrim ? titleCase(raw.rawTrim.trim()) : null,
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
      sourcePage: raw.sourcePage,
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
