'use client'

import { useTranslations } from 'next-intl'
import { CarCard } from '@/components/CarCard'

type Listing = {
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

type CarGridProps = {
  listings: Listing[]
  isLoading?: boolean
}

export function CarGrid({ listings, isLoading = false }: CarGridProps) {
  const t = useTranslations('search')

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-panel rounded-2xl overflow-hidden">
            <div className="aspect-[16/10] bg-white/5 animate-pulse" />
            <div className="p-6 space-y-3">
              <div className="h-5 bg-white/5 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-white/5 rounded w-1/2 animate-pulse" />
              <div className="h-4 bg-white/5 rounded w-1/3 animate-pulse mt-3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-slate-400 text-lg mb-2">{t('empty.title')}</p>
        <p className="text-slate-600 text-sm">{t('empty.subtitle')}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {listings.map((listing) => (
        <CarCard key={listing.id} {...listing} />
      ))}
    </div>
  )
}
