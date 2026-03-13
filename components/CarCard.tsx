'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CircleGauge, Heart, MapPin } from 'lucide-react'
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
  let priceIndicator: { label: string; color: string; tone: string } | null = null
  if (priceCop && avgPrice) {
    const diff = (priceCop - avgPrice) / avgPrice
    if (diff <= -0.1) {
      priceIndicator = {
        label: 'Buen precio',
        color: 'text-emerald-300',
        tone: 'bg-emerald-500/10 border-emerald-500/30',
      }
    } else if (diff >= 0.1) {
      priceIndicator = {
        label: 'Sobre precio',
        color: 'text-rose-300',
        tone: 'bg-rose-500/10 border-rose-500/30',
      }
    }
  }

  const portalColor = PORTAL_COLORS[sourcePortal] ?? 'bg-gray-500 text-white'
  const portalLabel = PORTAL_LABELS[sourcePortal] ?? sourcePortal
  const subtitle = [year, mileage !== null && mileage !== undefined ? formatMileage(mileage) : null, city]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="group relative overflow-hidden rounded-2xl glass-panel transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5">
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Badge portal */}
        <span
          className={cn(
            'absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full',
            portalColor
          )}
        >
          {portalLabel}
        </span>

        {/* Botón favorito */}
        <button
          onClick={() => toggleFavorite(id)}
          className="absolute top-3 right-3 p-1.5 rounded-full glass-panel hover:bg-white/10 transition-colors"
          aria-label={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Heart
            className={cn('w-4 h-4', favorite ? 'fill-red-500 text-red-500' : 'text-white')}
          />
        </button>
      </div>

      {/* Contenido */}
      <div className="p-4">
        <div className="flex justify-between items-start gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <Link href={`/carro/${id}`} className="block hover:text-slate-300 transition-colors">
              <h3 className="text-base font-bold text-white line-clamp-2 leading-snug">{title}</h3>
            </Link>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Precio</p>
            <span className="text-[#3c83f6] font-bold text-sm">
              {priceCop ? formatPrice(priceCop) : 'Consultar'}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-3 line-clamp-1">{subtitle || 'Sin datos de kilometraje o ubicación'}</p>

        <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3">
          {city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span className="line-clamp-1">{city}</span>
            </span>
          )}
          {mileage !== null && mileage !== undefined && (
            <span className="inline-flex items-center gap-1">
              <CircleGauge className="w-3.5 h-3.5 text-slate-500" />
              {formatMileage(mileage)}
            </span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2">
          {fuelType && (
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full bg-white/5 text-slate-400 border border-white/10">
              {fuelType}
            </span>
          )}
          {transmission && (
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full bg-white/5 text-slate-400 border border-white/10">
              {transmission}
            </span>
          )}
          {priceIndicator && (
            <span
              className={cn(
                'text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full border',
                priceIndicator.color,
                priceIndicator.tone
              )}
            >
              {priceIndicator.label}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
