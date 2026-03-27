// Cliente Upstash Redis singleton para caché de búsquedas
import { Redis } from '@upstash/redis'

let redisClient: Redis | null = null

// Prefijo de entorno para separar keys dev/prod en la misma instancia de Upstash
const ENV_PREFIX = process.env.NODE_ENV === 'production' ? 'prod:' : 'dev:'

/** Prefija cualquier key Redis con el entorno actual (dev: / prod:) */
export function redisKey(key: string): string {
  return `${ENV_PREFIX}${key}`
}

export function getRedis(): Redis | null {
  // Si no hay credenciales configuradas, retornar null (caché desactivado)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }

  return redisClient
}

// TTL en segundos
export const CACHE_TTL = {
  SEARCH: 1800,  // 30 minutos
  STATS: 300,    // 5 minutos
}
