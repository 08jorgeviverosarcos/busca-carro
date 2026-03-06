import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatea un precio en COP con puntos de miles
// Ejemplo: 45000000 → "$45.000.000"
export function formatPrice(price: number | bigint | null | undefined): string {
  if (price === null || price === undefined) return 'Precio no disponible'
  const num = typeof price === 'bigint' ? Number(price) : price
  return `$${num.toLocaleString('es-CO')}`
}

// Formatea kilometraje con separador de miles y sufijo km
// Ejemplo: 52000 → "52.000 km"
export function formatMileage(mileage: number | null | undefined): string {
  if (mileage === null || mileage === undefined) return 'Km no disponible'
  return `${mileage.toLocaleString('es-CO')} km`
}

// Capitaliza la primera letra de cada palabra
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Pausa de N milisegundos (para rate limiting)
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Genera hash SHA256 de un string para claves de caché
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Convierte BigInt a número para serialización JSON
export function serializeListing<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      typeof value === 'bigint' ? Number(value) : value,
    ])
  )
}

// Colores de badge por portal
export const PORTAL_COLORS: Record<string, string> = {
  mercadolibre: 'bg-yellow-400 text-yellow-900',
  tucarro: 'bg-blue-500 text-white',
  vendetunave: 'bg-green-500 text-white',
  olx: 'bg-orange-500 text-white',
  autocosmos: 'bg-purple-500 text-white',
}

export const PORTAL_LABELS: Record<string, string> = {
  mercadolibre: 'MercadoLibre',
  tucarro: 'TuCarro',
  vendetunave: 'VendeTuNave',
  olx: 'OLX',
  autocosmos: 'Autocosmos',
}
