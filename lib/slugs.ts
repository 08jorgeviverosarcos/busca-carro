// Utilidades de slug para URLs SEO de categorias
// toSlug: "CX-5" → "cx-5", "Gran Vitara" → "gran-vitara", "Mercedes-Benz" → "mercedes-benz"
// Mapas inversos para lookup O(1): slug → nombre canónico

import { VALID_BRANDS, VALID_CITIES, VALID_MODELS } from '@/lib/normalizer'

export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
}

// Mapas inversos: slug → canonical name
// Se construyen una sola vez al importar el módulo

export const SLUG_TO_BRAND: Record<string, string> = {}
for (const brand of VALID_BRANDS) {
  SLUG_TO_BRAND[toSlug(brand)] = brand
}

export const SLUG_TO_MODEL: Record<string, string> = {}
for (const model of VALID_MODELS) {
  SLUG_TO_MODEL[toSlug(model)] = model
}

export const SLUG_TO_CITY: Record<string, string> = {}
for (const city of VALID_CITIES) {
  SLUG_TO_CITY[toSlug(city)] = city
}

// Helpers para lookup con fallback null
export function brandFromSlug(slug: string): string | null {
  return SLUG_TO_BRAND[slug] ?? null
}

export function modelFromSlug(slug: string): string | null {
  return SLUG_TO_MODEL[slug] ?? null
}

export function cityFromSlug(slug: string): string | null {
  return SLUG_TO_CITY[slug] ?? null
}
