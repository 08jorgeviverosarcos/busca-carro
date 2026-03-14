'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

type StatsData = {
  totalActive: number
  byPortal: Record<string, number>
  lastSync: Record<string, string>
}

export function StatsBar() {
  const { data, isLoading } = useQuery<{ data: StatsData | null; error: string | null }>({
    queryKey: ['stats'],
    queryFn: () => fetch('/api/stats').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  const stats = data?.data
  const t = useTranslations('stats')

  return (
    <section className="border-t border-b border-white/5 bg-[#0B0B0F]/50 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {isLoading ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-7 bg-white/5 rounded animate-pulse mx-auto w-20" />
                  <div className="h-3 bg-white/5 rounded animate-pulse mx-auto w-24" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div>
                <p className="text-2xl font-black text-white">
                  {stats?.totalActive?.toLocaleString('es-CO') ?? '—'}
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">{t('activeListings')}</p>
              </div>
              {['mercadolibre', 'tucarro', 'vendetunave'].map((portal) => (
                <div key={portal}>
                  <p className="text-2xl font-black text-white">
                    {stats?.byPortal?.[portal]?.toLocaleString('es-CO') ?? '0'}
                  </p>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    {portal === 'mercadolibre' ? 'MercadoLibre' : portal === 'tucarro' ? 'TuCarro' : 'VendeTuNave'}
                  </p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
