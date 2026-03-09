// POST /api/search/parse — Parsea texto libre y retorna SearchParams estructurado

import { NextRequest, NextResponse } from 'next/server'
import { parseNaturalLanguageSearch } from '@/lib/nlp-search'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ filters: {} })
    }

    const filters = await parseNaturalLanguageSearch(text.trim())
    return NextResponse.json({ filters })
  } catch {
    return NextResponse.json({ filters: {} })
  }
}
