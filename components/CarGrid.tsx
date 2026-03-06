'use client'

import { CarCard } from '@/components/CarCard'
import { Skeleton } from '@/components/ui/skeleton'

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
}

type CarGridProps = {
  listings: Listing[]
  isLoading?: boolean
}

export function CarGrid({ listings, isLoading = false }: CarGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <Skeleton className="aspect-video bg-zinc-800" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 bg-zinc-800 rounded w-3/4" />
              <Skeleton className="h-3 bg-zinc-800 rounded w-1/2" />
              <Skeleton className="h-5 bg-zinc-800 rounded w-1/3 mt-3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-zinc-400 text-lg mb-2">No se encontraron anuncios</p>
        <p className="text-zinc-600 text-sm">Intenta cambiar los filtros o buscar otra marca</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {listings.map((listing) => (
        <CarCard key={listing.id} {...listing} />
      ))}
    </div>
  )
}
