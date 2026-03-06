import { SearchBar } from '@/components/SearchBar'
import { StatsBar } from '@/components/StatsBar'
import Link from 'next/link'

const MARCAS_RAPIDAS = ['Toyota', 'Chevrolet', 'Renault', 'Mazda', 'Kia', 'Hyundai', 'Ford', 'Volkswagen']
const CIUDADES_RAPIDAS = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga']

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-[70vh] px-4 pt-16 pb-12 text-center overflow-hidden">
        {/* Fondo con gradiente */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl w-full mx-auto">
          <div className="inline-block bg-zinc-800 text-zinc-400 text-xs px-3 py-1 rounded-full mb-6 tracking-wide uppercase">
            Colombia · 4 portales · Actualización diaria
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight mb-4">
            Todos los carros de Colombia.
            <br />
            <span className="text-zinc-400">Un solo lugar.</span>
          </h1>

          <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
            Buscamos en MercadoLibre, TuCarro, VendeTuNave y OLX para que encuentres el mejor precio sin ir portal por portal.
          </p>

          {/* Buscador principal */}
          <div className="w-full max-w-2xl mx-auto mb-8">
            <SearchBar large placeholder="Buscar marca, modelo, año..." />
          </div>

          {/* Filtros rápidos — Marcas */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {MARCAS_RAPIDAS.map((marca) => (
              <Link
                key={marca}
                href={`/buscar?brand=${marca}`}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm rounded-lg transition-colors"
              >
                {marca}
              </Link>
            ))}
          </div>

          {/* Filtros rápidos — Ciudades */}
          <div className="flex flex-wrap justify-center gap-2">
            {CIUDADES_RAPIDAS.map((ciudad) => (
              <Link
                key={ciudad}
                href={`/buscar?city=${ciudad}`}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 text-sm rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                📍 {ciudad}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats en vivo */}
      <StatsBar />

      {/* Portales */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Portales incluidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'MercadoLibre', color: 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400' },
            { name: 'TuCarro', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
            { name: 'VendeTuNave', color: 'bg-green-500/10 border-green-500/20 text-green-400' },
            { name: 'OLX', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
          ].map((portal) => (
            <div
              key={portal.name}
              className={`rounded-xl border p-4 text-center font-semibold text-sm ${portal.color}`}
            >
              {portal.name}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
