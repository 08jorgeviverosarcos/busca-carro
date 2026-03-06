// GET /api/stats — Estadísticas globales para homepage, con caché Redis 5 min

import { NextResponse } from 'next/server'
import { getGlobalStats } from '@/lib/storage'
import { getRedis, CACHE_TTL } from '@/lib/redis'

export async function GET() {
  try {
    const redis = getRedis()
    const cacheKey = 'stats:global'

    if (redis) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json({ data: cached, error: null }, {
          headers: { 'X-Cache': 'HIT' },
        })
      }
    }

    const stats = await getGlobalStats()

    // Serializar fechas para JSON
    const serialized = {
      ...stats,
      lastSync: Object.fromEntries(
        Object.entries(stats.lastSync).map(([k, v]) => [k, v.toISOString()])
      ),
    }

    if (redis) {
      await redis.set(cacheKey, serialized, { ex: CACHE_TTL.STATS })
    }

    return NextResponse.json({ data: serialized, error: null }, {
      headers: { 'X-Cache': 'MISS' },
    })
  } catch (error) {
    console.error('❌ Error en /api/stats:', error)
    return NextResponse.json({ data: null, error: 'Error obteniendo estadísticas' }, { status: 500 })
  }
}
