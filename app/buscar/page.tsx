import { Suspense } from 'react'
import { SearchResults } from '@/components/SearchResults'

export const metadata = {
  title: 'Buscar carros',
  description: 'Busca y filtra carros usados en Colombia de todos los portales.',
}

export default function BuscarPage() {
  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <a href="/" className="text-white font-black text-xl tracking-tight">BuscaCarro</a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Suspense fallback={<div className="text-zinc-400">Cargando...</div>}>
          <SearchResults />
        </Suspense>
      </div>
    </main>
  )
}
