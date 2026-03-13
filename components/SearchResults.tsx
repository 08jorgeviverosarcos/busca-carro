'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { FilterSidebar } from '@/components/FilterSidebar'
import { CarGrid } from '@/components/CarGrid'
import { SearchBar } from '@/components/SearchBar'
import { AlertModal } from '@/components/AlertModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { track, MP_SORT_CHANGED, MP_PAGE_CHANGED, MP_SEARCH_RESULTS_LOADED } from '@/lib/mixpanel'

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

type ApiMeta = {
  total: number
  page: number
  limit: number
  totalPages: number
}

type ApiResponse = {
  data: Listing[] | null
  error: string | null
  meta?: ApiMeta
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'year_desc', label: 'Más nuevos' },
  { value: 'mileage_asc', label: 'Menor km' },
]

export function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const q = searchParams.get('q') ?? ''
  const brand = searchParams.get('brand') ?? ''
  const city = searchParams.get('city') ?? ''
  const sortBy = searchParams.get('sortBy') ?? 'recent'
  const page = parseInt(searchParams.get('page') ?? '1')

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ['search', searchParams.toString()],
    queryFn: () => fetch(`/api/search?${searchParams.toString()}`).then((r) => r.json()),
  })

  const listings = data?.data ?? []
  const meta = data?.meta

  useEffect(() => {
    if (meta) {
      track(MP_SEARCH_RESULTS_LOADED, {
        total: meta.total,
        page: meta.page,
        totalPages: meta.totalPages,
        query: q,
        brand,
        city,
        sortBy,
      })
    }
  }, [meta, q, brand, city, sortBy])

  const handleSort = (value: string) => {
    track(MP_SORT_CHANGED, { sortBy: value })
    const params = new URLSearchParams(searchParams.toString())
    params.set('sortBy', value)
    params.delete('page')
    router.push(`/buscar?${params.toString()}`)
  }

  const handlePage = (newPage: number) => {
    track(MP_PAGE_CHANGED, { page: newPage, direction: newPage > page ? 'next' : 'previous' })
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`/buscar?${params.toString()}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Título descriptivo
  const searchTitle = q
    ? `Resultados para "${q}"`
    : brand
      ? `${brand} en venta`
      : city
        ? `Carros en ${city}`
        : 'Todos los carros'

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <FilterSidebar />

      <div className="flex-1 min-w-0">
        {/* Barra de búsqueda */}
        <div className="mb-4">
          <SearchBar placeholder="Refinar búsqueda..." />
        </div>

        {/* Header de resultados */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-white font-bold text-lg">{searchTitle}</h1>
            {!isLoading && meta && (
              <p className="text-slate-400 text-sm">
                {meta.total.toLocaleString('es-CO')} resultados
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <AlertModal searchParams={searchParams.toString()} />
            <Select value={sortBy} onValueChange={handleSort}>
              <SelectTrigger className="bg-[#15151A] border-white/10 text-white text-sm w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#15151A] border-white/10">
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-slate-300">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid de resultados */}
        <CarGrid listings={listings} isLoading={isLoading} />

        {/* Paginación */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              onClick={() => handlePage(page - 1)}
              disabled={page <= 1}
              className="border-white/10 text-slate-300 hover:text-white hover:border-white/20"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-slate-400 text-sm px-4">
              Página {page} de {meta.totalPages}
            </span>

            <Button
              variant="outline"
              onClick={() => handlePage(page + 1)}
              disabled={page >= meta.totalPages}
              className="border-white/10 text-slate-300 hover:text-white hover:border-white/20"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
