import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { toSlug, cityFromSlug } from '@/lib/slugs'
import { formatPrice } from '@/lib/utils'
import { CarCard } from '@/components/CarCard'
import { NavHeader } from '@/components/NavHeader'
import { JsonLd } from '@/components/JsonLd'
import { GradientButton } from '@/components/ui/gradient-button'
import Link from 'next/link'
import type { Metadata } from 'next'

export const revalidate = 21600 // 6 horas

const MIN_LISTINGS = 5

type PageProps = {
  params: Promise<{ ciudad: string }>
}

export async function generateStaticParams() {
  const cities = await prisma.listing.groupBy({
    by: ['city'],
    where: { isActive: true, city: { not: null } },
    _count: { city: true },
  })

  return cities
    .filter((c) => c.city !== null && (c._count.city ?? 0) >= MIN_LISTINGS)
    .map((c) => ({ ciudad: toSlug(c.city!) }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ciudad } = await params
  const cityName = cityFromSlug(ciudad)
  if (!cityName) return { title: 'Ciudad no encontrada' }

  const t = await getTranslations('categories')

  const [count, agg] = await Promise.all([
    prisma.listing.count({ where: { city: cityName, isActive: true } }),
    prisma.listing.aggregate({
      where: { city: cityName, isActive: true, priceCop: { not: null } },
      _min: { priceCop: true },
    }),
  ])

  const minPrice = agg._min.priceCop ? formatPrice(Number(agg._min.priceCop)) : ''
  const title = t('city.metaTitle', { city: cityName, count })
  const description = t('city.metaDescription', { city: cityName, count, minPrice })

  return {
    title,
    description,
    alternates: { canonical: `/carros/ciudad/${ciudad}` },
    openGraph: { title, description, url: `/carros/ciudad/${ciudad}`, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function CityPage({ params }: PageProps) {
  const { ciudad } = await params
  const cityName = cityFromSlug(ciudad)
  if (!cityName) notFound()

  const t = await getTranslations('categories')
  const tc = await getTranslations('common')

  const [count, agg, listings, topBrands] = await Promise.all([
    prisma.listing.count({ where: { city: cityName, isActive: true } }),
    prisma.listing.aggregate({
      where: { city: cityName, isActive: true, priceCop: { not: null } },
      _avg: { priceCop: true },
      _min: { priceCop: true },
    }),
    prisma.listing.findMany({
      where: { city: cityName, isActive: true },
      orderBy: { scrapedAt: 'desc' },
      take: 20,
    }),
    prisma.listing.groupBy({
      by: ['brand'],
      where: { city: cityName, isActive: true, brand: { not: null } },
      _count: { brand: true },
      orderBy: { _count: { brand: 'desc' } },
      take: 5,
    }),
  ])

  if (count < MIN_LISTINGS) notFound()

  const avgPrice = agg._avg.priceCop ? Number(agg._avg.priceCop) : null
  const minPrice = agg._min.priceCop ? Number(agg._min.priceCop) : null
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <main className="min-h-screen bg-[#0B0B0F]">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `Carros usados en ${cityName}`,
        numberOfItems: count,
        itemListElement: listings.slice(0, 20).map((l, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${baseUrl}/carro/${l.id}`,
          name: l.title,
        })),
      }} />

      <NavHeader
        breadcrumbs={[
          { label: tc('breadcrumbSearch'), href: '/buscar' },
          { label: cityName },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
          {t('city.title', { city: cityName })}
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          {t('city.statsCount', { count, city: cityName })}
        </p>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <div className="glass-panel rounded-2xl p-5 text-center">
            <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">
              Anuncios
            </p>
            <p className="text-2xl font-black text-white">{count.toLocaleString('es-CO')}</p>
          </div>
          {avgPrice && (
            <div className="glass-panel rounded-2xl p-5 text-center">
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">
                {t('city.statsAvgPrice')}
              </p>
              <p className="text-2xl font-black text-[#3c83f6]">{formatPrice(avgPrice)}</p>
            </div>
          )}
          {minPrice && (
            <div className="glass-panel rounded-2xl p-5 text-center">
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">
                {t('city.statsMinPrice')}
              </p>
              <p className="text-2xl font-black text-white">{formatPrice(minPrice)}</p>
            </div>
          )}
        </div>

        {/* Top marcas en la ciudad */}
        {topBrands.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">
              {t('city.topBrandsTitle', { city: cityName })}
            </h2>
            <div className="flex flex-wrap gap-3">
              {topBrands.map((b) => (
                <Link
                  key={b.brand}
                  href={`/carros/${toSlug(b.brand!)}`}
                  className="glass-panel px-4 py-2 rounded-full text-sm text-slate-300 hover:bg-white/10 transition-colors"
                >
                  {b.brand}{' '}
                  <span className="text-slate-500">({b._count.brand ?? 0})</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Grid de listings */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6">
            {t('city.listingsTitle', { city: cityName })}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {listings.map((l) => (
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

        {/* Botón ver todos */}
        {count > 20 && (
          <div className="mt-10 text-center">
            <GradientButton asChild size="lg">
              <Link href={`/buscar?city=${encodeURIComponent(cityName)}`}>
                {t('city.viewAll', { count, city: cityName })}
              </Link>
            </GradientButton>
          </div>
        )}
      </div>
    </main>
  )
}
