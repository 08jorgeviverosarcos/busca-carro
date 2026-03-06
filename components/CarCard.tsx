'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useSearchStore } from '@/store/searchStore'
import { formatPrice, formatMileage, PORTAL_COLORS, PORTAL_LABELS, cn } from '@/lib/utils'

type CarCardProps = {
  id: string
  sourcePortal: string
  title: string
  brand: string | null
  model: string | null
  year: number | null
  priceCop: number | null
  mileage: number | null
  fuelType: string | null
  transmission: string | null
  city: string | null
  images: string[]
  urlOriginal: string
  avgPrice?: number | null
}

export function CarCard({
  id,
  sourcePortal,
  title,
  year,
  priceCop,
  mileage,
  fuelType,
  transmission,
  city,
  images,
  urlOriginal,
  avgPrice,
}: CarCardProps) {
  const { toggleFavorite, isFavorite } = useSearchStore()
  const favorite = isFavorite(id)

  // Indicador vs mercado
  let priceIndicator: { label: string; color: string } | null = null
  if (priceCop && avgPrice) {
    const diff = (priceCop - avgPrice) / avgPrice
    if (diff <= -0.1) {
      priceIndicator = { label: '✓ Buen precio', color: 'text-green-400' }
    } else if (diff >= 0.1) {
      priceIndicator = { label: '↑ Sobre precio', color: 'text-red-400' }
    }
  }

  const portalColor = PORTAL_COLORS[sourcePortal] ?? 'bg-gray-500 text-white'
  const portalLabel = PORTAL_LABELS[sourcePortal] ?? sourcePortal

  return (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors overflow-hidden">
      {/* Imagen */}
      <div className="relative aspect-video bg-zinc-800 overflow-hidden">
        <a href={urlOriginal} target="_blank" rel="noopener noreferrer">
          {images[0] ? (
            <Image
              src={images[0]}
              alt={title}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </a>

        {/* Badge portal */}
        <Badge className={cn('absolute top-2 left-2 text-xs font-semibold', portalColor)}>
          {portalLabel}
        </Badge>

        {/* Botón favorito */}
        <button
          onClick={() => toggleFavorite(id)}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          aria-label={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Heart
            className={cn('w-4 h-4', favorite ? 'fill-red-500 text-red-500' : 'text-white')}
          />
        </button>
      </div>

      {/* Contenido */}
      <CardContent className="p-3">
        <Link href={`/carro/${id}`} className="block hover:text-zinc-300 transition-colors">
          <h3 className="text-white font-semibold text-sm line-clamp-2 mb-2">{title}</h3>
        </Link>

        {/* Specs secundarios */}
        <div className="flex flex-wrap gap-1 text-xs text-zinc-400 mb-2">
          {year && <span>{year}</span>}
          {year && mileage !== null && <span>·</span>}
          {mileage !== null && mileage !== undefined && <span>{formatMileage(mileage)}</span>}
          {city && (mileage !== null || year) && <span>·</span>}
          {city && <span>{city}</span>}
        </div>

        <div className="flex flex-wrap gap-1 text-xs text-zinc-500 mb-3">
          {fuelType && <span>{fuelType}</span>}
          {fuelType && transmission && <span>·</span>}
          {transmission && <span>{transmission}</span>}
        </div>

        {/* Precio e indicador */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white font-bold text-base">
              {priceCop ? formatPrice(priceCop) : 'Consultar'}
            </p>
            {priceIndicator && (
              <p className={cn('text-xs font-medium', priceIndicator.color)}>
                {priceIndicator.label}
              </p>
            )}
          </div>

          <a
            href={urlOriginal}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Ver →
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
