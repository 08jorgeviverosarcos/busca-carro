import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { toSlug } from '@/lib/slugs'
import { formatPrice } from '@/lib/utils'
import { SearchBar } from '@/components/SearchBar'
import { NavHeader } from '@/components/NavHeader'
import { GradientButton } from '@/components/ui/gradient-button'
import { TrackedLink } from '@/components/TrackedLink'
import { JsonLd } from '@/components/JsonLd'
import { CarCard } from '@/components/CarCard'
import Link from 'next/link'

export const revalidate = 300 // 5 minutos

export const metadata: Metadata = {
  title: 'Carli — Todos los carros de Colombia en un solo lugar',
  description: 'Meta-buscador de carros usados en Colombia. Busca y compara carros usados de Autocosmos, VendeTuNave y más portales en un solo lugar.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Carli — Todos los carros de Colombia en un solo lugar',
    description: 'Meta-buscador de carros usados en Colombia. Busca y compara carros usados de Autocosmos, VendeTuNave y más portales.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carli — Todos los carros de Colombia en un solo lugar',
    description: 'Meta-buscador de carros usados en Colombia.',
  },
}

const FILTROS_RAPIDOS = [
  { label: 'Toyota', href: '/carros/toyota' },
  { label: 'Chevrolet', href: '/carros/chevrolet' },
  { label: 'Renault', href: '/carros/renault' },
  { label: 'Mazda', href: '/carros/mazda' },
  { label: 'Kia', href: '/carros/kia' },
  { label: 'Hyundai', href: '/carros/hyundai' },
  { label: 'Bogotá', href: '/carros/ciudad/bogota' },
  { label: 'Medellín', href: '/carros/ciudad/medellin' },
  { label: 'Cali', href: '/carros/ciudad/cali' },
]

export default async function HomePage() {
  const t = await getTranslations('home')
  const tc = await getTranslations('common')

  const [totalActive, avgPriceAgg, topBrands, citiesCount, recentListings] = await Promise.all([
    prisma.listing.count({ where: { isActive: true } }),
    prisma.listing.aggregate({
      where: { isActive: true, priceCop: { not: null } },
      _avg: { priceCop: true },
    }),
    prisma.listing.groupBy({
      by: ['brand'],
      where: { isActive: true, brand: { not: null } },
      _count: { brand: true },
      orderBy: { _count: { brand: 'desc' } },
      take: 10,
    }),
    prisma.listing.groupBy({
      by: ['city'],
      where: { isActive: true, city: { not: null } },
    }).then((rows) => rows.length),
    prisma.listing.findMany({
      where: { isActive: true },
      orderBy: { scrapedAt: 'desc' },
      take: 12,
    }),
  ])

  const avgPrice = avgPriceAgg._avg.priceCop ? Number(avgPriceAgg._avg.priceCop) : null

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
            <span className="text-xs font-bold text-[#3c83f6] uppercase tracking-widest">{t('badge')}</span>
          </div>

          {/* H1 con gradient */}
          <h1
            className="text-5xl md:text-7xl font-black tracking-tighter mb-6 max-w-4xl mx-auto bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 30%, #a855f7 100%)' }}
          >
            {t('title')}
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 font-light mx-auto">
            {t('subtitle')}
          </p>

          {/* Buscador principal con glow */}
          <div className="w-full flex justify-center mb-10">
            <SearchBar large placeholder={t('searchPlaceholder')} />
          </div>

          {/* Filtros rápidos */}
          <div className="flex flex-wrap justify-center gap-3">
            {FILTROS_RAPIDOS.map((f) => (
              <TrackedLink
                key={f.label}
                href={f.href}
                eventName="Quick Filter Clicked"
                eventProperties={{ label: f.label, href: f.href }}
                className="glass-panel px-4 py-2 rounded-full text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
              >
                {f.label}
              </TrackedLink>
            ))}
          </div>
        </div>
      </section>

      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Carli',
        url: process.env.NEXT_PUBLIC_APP_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL}/buscar?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      }} />

      {/* Stats del mercado */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel rounded-2xl p-6 text-center">
            <p className="text-3xl font-black text-white">{totalActive.toLocaleString('es-CO')}</p>
            <p className="text-xs uppercase tracking-widest text-slate-500 mt-2">{t('stats.totalListings', { count: '' }).trim()}</p>
          </div>
          <div className="glass-panel rounded-2xl p-6 text-center">
            <p className="text-3xl font-black text-white">{citiesCount}</p>
            <p className="text-xs uppercase tracking-widest text-slate-500 mt-2">{t('stats.cities', { count: '' }).trim()}</p>
          </div>
          {avgPrice && (
            <div className="glass-panel rounded-2xl p-6 text-center">
              <p className="text-3xl font-black text-[#3c83f6]">{formatPrice(Math.round(avgPrice))}</p>
              <p className="text-xs uppercase tracking-widest text-slate-500 mt-2">{t('stats.avgPrice')}</p>
            </div>
          )}
          <div className="glass-panel rounded-2xl p-6 text-center">
            <p className="text-3xl font-black text-white">24/7</p>
            <p className="text-xs uppercase tracking-widest text-slate-500 mt-2">{t('stats.updated')}</p>
          </div>
        </div>
      </section>

      {/* Listings recientes */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white mb-1">{t('recentListings.title')}</h2>
        <p className="text-slate-400 text-sm mb-8">{t('recentListings.subtitle')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {recentListings.map((l) => (
            <CarCard
              key={l.id}
              id={l.id}
              sourcePortal={l.sourcePortal}
              title={l.title}
              brand={l.brand}
              model={l.model}
              year={l.year}
              priceCop={l.priceCop ? Number(l.priceCop) : null}
              mileage={l.mileage}
              fuelType={l.fuelType}
              transmission={l.transmission}
              city={l.city}
              images={l.images}
              urlOriginal={l.urlOriginal}
            />
          ))}
        </div>
      </section>

      {/* Explorar por marca */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white mb-1">{t('exploreByBrand.title')}</h2>
        <p className="text-slate-400 text-sm mb-8">{t('exploreByBrand.subtitle')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {topBrands.map((b) => (
            <Link
              key={b.brand}
              href={`/carros/${toSlug(b.brand!)}`}
              className="glass-panel rounded-2xl p-5 text-center hover:bg-white/5 transition-colors group"
            >
              <p className="text-white font-bold group-hover:text-[#3c83f6] transition-colors">{b.brand}</p>
              <p className="text-slate-500 text-xs mt-1">{(b._count.brand ?? 0).toLocaleString('es-CO')} {tc('search').toLowerCase()}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="relative rounded-3xl p-[1px]" style={{ background: 'linear-gradient(135deg, #3c83f6, #a855f7)' }}>
          <div className="bg-[#0B0B0F] rounded-[22px] p-12 text-center">
            <h2 className="text-4xl font-bold tracking-tight mb-4">{t('cta.title')}</h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <GradientButton asChild size="lg">
                <TrackedLink href="/buscar" eventName="CTA Clicked" eventProperties={{ cta: 'Buscar carros' }}>
                  {t('cta.searchCars')}
                </TrackedLink>
              </GradientButton>
              <TrackedLink
                href="/buscar"
                eventName="CTA Clicked"
                eventProperties={{ cta: 'Ver todo el inventario' }}
                className="glass-panel text-white font-bold h-12 px-8 rounded-xl inline-flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                {t('cta.viewInventory')}
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
