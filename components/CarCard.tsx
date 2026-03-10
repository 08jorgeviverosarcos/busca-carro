'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'
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
  avgPrice,
}: CarCardProps) {
  const { toggleFavorite, isFavorite } = useSearchStore()
  const favorite = isFavorite(id)

  // Indicador vs mercado
  let priceIndicator: { label: string; color: string } | null = null
  if (priceCop && avgPrice) {
    const diff = (priceCop - avgPrice) / avgPrice
    if (diff <= -0.1) {
      priceIndicator = { label: 'Buen precio', color: 'text-green-400' }
    } else if (diff >= 0.1) {
      priceIndicator = { label: 'Sobre precio', color: 'text-red-400' }
    }
  }

  const portalColor = PORTAL_COLORS[sourcePortal] ?? 'bg-gray-500 text-white'
  const portalLabel = PORTAL_LABELS[sourcePortal] ?? sourcePortal

  return (
    <div className="group relative overflow-hidden rounded-2xl glass-panel transition-all hover:border-white/20">
      {/* Imagen */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Link href={`/carro/${id}`}>
          {images[0] ? (
            <Image
              src={images[0]}
              alt={title}
              fill
              className="object-cover grayscale-[0.2] group-hover:scale-110 group-hover:grayscale-0 transition-all duration-700"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </Link>

        {/* Badge portal */}
        <span className={cn('absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full', portalColor)}>
          {portalLabel}
        </span>

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
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 flex-1 mr-3">
            <Link href={`/carro/${id}`} className="block hover:text-slate-300 transition-colors">
              <h3 className="text-xl font-bold text-white line-clamp-2">{title}</h3>
            </Link>
            <p className="text-slate-500 text-sm mt-1">
              {[year, mileage !== null && mileage !== undefined ? formatMileage(mileage) : null, city].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[#3c83f6] font-bold">
              {priceCop ? formatPrice(priceCop) : 'Consultar'}
            </span>
            {priceIndicator && (
              <p className={cn('text-xs font-medium mt-0.5', priceIndicator.color)}>
                {priceIndicator.label}
              </p>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {fuelType && (
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded bg-white/5 text-slate-400">
              {fuelType}
            </span>
          )}
          {transmission && (
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded bg-white/5 text-slate-400">
              {transmission}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
