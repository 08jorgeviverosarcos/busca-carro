import { Skeleton } from '@/components/ui/skeleton'
import { NavHeader } from '@/components/NavHeader'
import { Loader2 } from 'lucide-react'

type CarDetailLoaderProps = {
  message?: string
}

export function CarDetailLoader({ message = 'Consultando datos del portal...' }: CarDetailLoaderProps) {
  return (
    <main className="min-h-screen bg-[#0B0B0F]">
      <NavHeader
        breadcrumbs={[
          { label: 'Buscar', href: '/buscar' },
          { label: '...' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Mensaje de carga */}
        <div className="glass-panel rounded-2xl p-5 mb-8 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 text-[#3c83f6] animate-spin" />
          <p className="text-sm text-slate-300 font-medium">{message}</p>
        </div>

        {/* Galería skeleton */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <Skeleton className="w-full aspect-[16/9] md:aspect-[2.4/1] bg-white/5" />
          <div className="flex gap-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-20 h-14 rounded-lg bg-white/5" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:items-start gap-8 mt-8">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Título + precio */}
            <section className="pb-8 border-b border-white/5">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-3">
                  <Skeleton className="h-9 w-80 bg-white/5" />
                  <div className="flex gap-3">
                    <Skeleton className="h-4 w-32 bg-white/5" />
                    <Skeleton className="h-4 w-24 bg-white/5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16 bg-white/5" />
                  <Skeleton className="h-9 w-44 bg-white/5" />
                </div>
              </div>
            </section>

            {/* AI Price Intelligence skeleton */}
            <section className="glass-panel rounded-2xl p-6 border border-[#3c83f6]/30 bg-[#3c83f6]/5">
              <Skeleton className="h-4 w-48 bg-white/5 mb-3" />
              <Skeleton className="h-4 w-full bg-white/5" />
              <Skeleton className="h-4 w-3/4 bg-white/5 mt-2" />
            </section>

            {/* Specs skeleton */}
            <section>
              <Skeleton className="h-6 w-56 bg-white/5 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-panel rounded-2xl p-4 space-y-3">
                    <Skeleton className="w-4 h-4 rounded bg-white/5" />
                    <Skeleton className="h-3 w-16 bg-white/5" />
                    <Skeleton className="h-4 w-20 bg-white/5" />
                  </div>
                ))}
              </div>
            </section>

            {/* Descripción skeleton */}
            <section className="glass-panel rounded-2xl p-6 space-y-3">
              <Skeleton className="h-6 w-32 bg-white/5" />
              <Skeleton className="h-4 w-full bg-white/5" />
              <Skeleton className="h-4 w-full bg-white/5" />
              <Skeleton className="h-4 w-2/3 bg-white/5" />
            </section>
          </div>

          {/* Sidebar skeleton */}
          <aside className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 space-y-5">
              <Skeleton className="h-6 w-48 bg-white/5" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-full bg-white/5" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 bg-white/5" />
                  <Skeleton className="h-3 w-32 bg-white/5" />
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-lg bg-white/5" />
                <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <Skeleton className="h-4 w-32 bg-white/5" />
              <Skeleton className="h-4 w-full bg-white/5" />
              <Skeleton className="h-4 w-full bg-white/5" />
              <Skeleton className="h-4 w-3/4 bg-white/5" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
