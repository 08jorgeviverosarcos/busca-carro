import { Suspense } from 'react'
import { SearchResults } from '@/components/SearchResults'
import { NavHeader } from '@/components/NavHeader'

export const metadata = {
  title: 'Buscar carros',
  description: 'Busca y filtra carros usados en Colombia de todos los portales.',
}

export default function BuscarPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0F]">
      <NavHeader />

      <div className="max-w-7xl mx-auto px-6 py-6">
        <Suspense fallback={<div className="text-slate-400">Cargando...</div>}>
          <SearchResults />
        </Suspense>
      </div>
    </main>
  )
}
