import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { toSlug, brandFromSlug } from '@/lib/slugs'
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
  params: Promise<{ marca: string }>
}

export async function generateStaticParams() {
  const brands = await prisma.listing.groupBy({
    by: ['brand'],
    where: { isActive: true, brand: { not: null } },
    _count: { _all: true },
  })

  return brands
    .filter((b) => b._count._all >= MIN_LISTINGS && b.brand !== null)
    .map((b) => ({ marca: toSlug(b.brand!) }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marca } = await params
  const brandName = brandFromSlug(marca)
  if (!brandName) return { title: 'Marca no encontrada' }

  const t = await getTranslations('categories')

  const [count, agg] = await Promise.all([
    prisma.listing.count({ where: { brand: brandName, isActive: true } }),
    prisma.listing.aggregate({
      where: { brand: brandName, isActive: true, priceCop: { not: null } },
      _min: { priceCop: true },
    }),
  ])

  const minPrice = agg._min.priceCop ? formatPrice(Number(agg._min.priceCop)) : ''
  const title = t('brand.metaTitle', { brand: brandName, count })
  const description = t('brand.metaDescription', { brand: brandName, count, minPrice })

  return {
    title,
    description,
    alternates: { canonical: `/carros/${marca}` },
    openGraph: {
      title,
      description,
      url: `/carros/${marca}`,
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function BrandPage({ params }: PageProps) {
  const { marca } = await params
  const brandName = brandFromSlug(marca)
  if (!brandName) notFound()

  const t = await getTranslations('categories')
  const tc = await getTranslations('common')

  const [count, agg, listings, models] = await Promise.all([
    prisma.listing.count({ where: { brand: brandName, isActive: true } }),
    prisma.listing.aggregate({
      where: { brand: brandName, isActive: true, priceCop: { not: null } },
      _avg: { priceCop: true },
      _min: { priceCop: true },
      _max: { priceCop: true },
    }),
    prisma.listing.findMany({
      where: { brand: brandName, isActive: true },
      orderBy: { scrapedAt: 'desc' },
      take: 20,
    }),
    prisma.listing.groupBy({
      by: ['model'],
      where: { brand: brandName, isActive: true, model: { not: null } },
      _count: { model: true },
      orderBy: { _count: { model: 'desc' } },
    }),
  ])

  if (count < MIN_LISTINGS) notFound()

  const avgPrice = agg._avg.priceCop ? Number(agg._avg.priceCop) : null
  const minPrice = agg._min.priceCop ? Number(agg._min.priceCop) : null
  const maxPrice = agg._max.priceCop ? Number(agg._max.priceCop) : null
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const modelsWithEnough = models.filter((m) => m.model && (m._count.model ?? 0) >= MIN_LISTINGS)

  return (
    <main className="min-h-screen bg-[#0B0B0F]">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${brandName} usados en Colombia`,
        numberOfItems: count,
        itemListElement: listings.slice(0, 10).map((l, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${baseUrl}/carro/${l.id}`,
          name: l.title,
        })),
      }} />

      <NavHeader
        breadcrumbs={[
          { label: tc('breadcrumbSearch'), href: '/buscar' },
          { label: brandName },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
          {t('brand.title', { brand: brandName })}
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          {t('brand.statsCount', { count })}
        </p>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="glass-panel rounded-2xl p-5 text-center">
            <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">
              Anuncios
            </p>
            <p className="text-2xl font-black text-white">{count.toLocaleString('es-CO')}</p>
          </div>
          {avgPrice && (
            <div className="glass-panel rounded-2xl p-5 text-center">
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">
                {t('brand.statsAvgPrice')}
              </p>
              <p className="text-2xl font-black text-[#3c83f6]">{formatPrice(avgPrice)}</p>
            </div>
          )}
          {minPrice && (
            <div className="glass-panel rounded-2xl p-5 text-center">
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">
                {t('brand.statsMinPrice')}
              </p>
              <p className="text-2xl font-black text-white">{formatPrice(minPrice)}</p>
            </div>
          )}
          {maxPrice && (
            <div className="glass-panel rounded-2xl p-5 text-center">
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">
                {t('brand.statsMaxPrice')}
              </p>
              <p className="text-2xl font-black text-white">{formatPrice(maxPrice)}</p>
            </div>
          )}
        </div>

        {/* Modelos disponibles — links a subcategorías */}
        {modelsWithEnough.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">{t('brand.modelsTitle')}</h2>
            <div className="flex flex-wrap gap-3">
              {modelsWithEnough.map((m) => (
                <Link
                  key={m.model}
                  href={`/carros/${marca}/${toSlug(m.model!)}`}
                  className="glass-panel px-4 py-2 rounded-full text-sm text-slate-300 hover:bg-white/10 transition-colors"
                >
                  {m.model}{' '}
                  <span className="text-slate-500">({m._count.model ?? 0})</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Grid de listings */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6">
            {t('brand.listingsTitle', { brand: brandName })}
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
              <Link href={`/buscar?brand=${encodeURIComponent(brandName)}`}>
                {t('brand.viewAll', { count, brand: brandName })}
              </Link>
            </GradientButton>
          </div>
        )}
      </div>
    </main>
  )
}
