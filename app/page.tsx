import { SearchBar } from '@/components/SearchBar'
import { NavHeader } from '@/components/NavHeader'
import { GradientButton } from '@/components/ui/gradient-button'
import Link from 'next/link'

const FILTROS_RAPIDOS = [
  { label: 'Toyota', href: '/buscar?brand=Toyota' },
  { label: 'Chevrolet', href: '/buscar?brand=Chevrolet' },
  { label: 'Renault', href: '/buscar?brand=Renault' },
  { label: 'Mazda', href: '/buscar?brand=Mazda' },
  { label: 'Kia', href: '/buscar?brand=Kia' },
  { label: 'Hyundai', href: '/buscar?brand=Hyundai' },
  { label: 'Bogotá', href: '/buscar?city=Bogota' },
  { label: 'Medellín', href: '/buscar?city=Medellin' },
  { label: 'Cali', href: '/buscar?city=Cali' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0B0B0F]">
      <NavHeader />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-[80vh] px-6 pt-16 pb-16 text-center overflow-hidden">
        {/* Glow azul/púrpura superior — igual al Stitch */}
        <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(60,131,246,0.15) 0%, rgba(168,85,247,0.08) 50%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-4xl w-full mx-auto">
          {/* Badge pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3c83f6]/10 border border-[#3c83f6]/30 mb-8">
            <svg className="w-3.5 h-3.5 text-[#3c83f6]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs font-bold text-[#3c83f6] uppercase tracking-widest">Búsqueda inteligente con IA</span>
          </div>

          {/* H1 con gradient igual al Stitch — usando Tailwind utilities directo */}
          <h1
            className="text-5xl md:text-7xl font-black tracking-tighter mb-6 max-w-4xl mx-auto bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 30%, #a855f7 100%)' }}
          >
            La forma más inteligente de encontrar tu próximo carro.
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 font-light mx-auto">
            Dile a BuscaCarro qué buscas. Sin filtros, sin ir portal por portal. Solo lenguaje natural.
          </p>

          {/* Buscador principal con glow */}
          <div className="w-full flex justify-center mb-10">
            <SearchBar large placeholder="Busca con IA: SUV bajo 80 millones en Bogotá..." />
          </div>

          {/* Filtros rápidos — fila única */}
          <div className="flex flex-wrap justify-center gap-3">
            {FILTROS_RAPIDOS.map((f) => (
              <Link
                key={f.label}
                href={f.href}
                className="glass-panel px-4 py-2 rounded-full text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section — igual al Stitch */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="relative rounded-3xl p-[1px]" style={{ background: 'linear-gradient(135deg, #3c83f6, #a855f7)' }}>
          <div className="bg-[#0B0B0F] rounded-[22px] p-12 text-center">
            <h2 className="text-4xl font-bold tracking-tight mb-4">¿Listo para encontrar tu carro?</h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Miles de anuncios de todos los portales, actualizados diariamente. Empieza a buscar ahora.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <GradientButton asChild size="lg">
                <Link href="/buscar">Buscar carros</Link>
              </GradientButton>
              <Link
                href="/buscar"
                className="glass-panel text-white font-bold h-12 px-8 rounded-xl inline-flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                Ver todo el inventario
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
