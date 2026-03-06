// POST /api/alerts — Crear alerta de búsqueda por email

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, filtersJson } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ data: null, error: 'Email requerido' }, { status: 400 })
    }

    // Validar formato email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ data: null, error: 'Email inválido' }, { status: 400 })
    }

    const alert = await prisma.alert.create({
      data: {
        email,
        filtersJson: filtersJson ?? {},
        isActive: true,
      },
    })

    return NextResponse.json({ data: { id: alert.id }, error: null })
  } catch (error) {
    console.error('❌ Error creando alerta:', error)
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
