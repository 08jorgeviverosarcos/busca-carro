// POST /api/sync/deactivate — Desactivar listings desaparecidos tras un full sync

import { NextRequest, NextResponse } from 'next/server'
import { deactivateMissingListings } from '@/lib/storage'

const PORTALES_VALIDOS = ['autocosmos', 'vendetunave', 'carroya'] as const
type Portal = (typeof PORTALES_VALIDOS)[number]

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret')
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  let body: { portal?: string; seenExternalIds?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ data: null, error: 'Body JSON inválido' }, { status: 400 })
  }

  const { portal, seenExternalIds } = body

  if (!portal || !PORTALES_VALIDOS.includes(portal as Portal)) {
    return NextResponse.json(
      { data: null, error: `Portal inválido. Válidos: ${PORTALES_VALIDOS.join(', ')}` },
      { status: 400 }
    )
  }
  if (!seenExternalIds || seenExternalIds.length === 0) {
    return NextResponse.json({ data: null, error: 'seenExternalIds requerido y no puede ser vacío' }, { status: 400 })
  }

  const deactivated = await deactivateMissingListings(portal, seenExternalIds)

  console.log(`✅ Deactivate ${portal}: ${deactivated} listings desactivados (${seenExternalIds.length} IDs vistos)`)

  return NextResponse.json({ data: { portal, deactivated }, error: null })
}
