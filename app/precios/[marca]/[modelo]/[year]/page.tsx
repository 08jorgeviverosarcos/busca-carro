import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { toSlug, brandFromSlug } from '@/lib/slugs'
import { formatPrice } from '@/lib/utils'
import { getPriceStats, getPricesByCity, getAvailableYears } from '@/lib/price-index'
import { CarCard } from '@/components/CarCard'
import { NavHeader } from '@/components/NavHeader'
import { JsonLd } from '@/components/JsonLd'
import { GradientButton } from '@/components/ui/gradient-button'
import Link from 'next/link'
import type { Metadata } from 'next'

export const revalidate = 43200 // 12 horas

const MIN_LISTINGS = 2

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

type PageProps = {
  params: Promise<{ marca: string; modelo: string; year: string }>
}

async function resolveModel(brandName: string, modeloSlug: string): Promise<string | null> {
  const modelsInBrand = await prisma.listing.groupBy({
    by: ['model'],
    where: { brand: brandName, isActive: true, model: { not: null } },
    _count: { model: true },
  })
  const match = modelsInBrand.find((m) => m.model && toSlug(m.model) === modeloSlug)
  return match?.model ?? null
}

export async function generateStaticParams() {
  const combos = await prisma.listing.groupBy({
    by: ['brand', 'model'],
    where: { isActive: true, brand: { not: null }, model: { not: null }, priceCop: { not: null } },
    _count: { model: true },
  })

  const results: { marca: string; modelo: string; year: string }[] = []

  for (const c of combos) {
    if (!c.brand || !c.model || (c._count.model ?? 0) < MIN_LISTINGS) continue
    const marcaSlug = toSlug(c.brand)
    const modeloSlug = toSlug(c.model)
    if (!marcaSlug || !modeloSlug) continue
    const years = await getAvailableYears(c.brand, c.model)
    for (const year of years) {
      results.push({
        marca: marcaSlug,
        modelo: modeloSlug,
        year: String(year),
      })
    }
  }

  return results
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marca, modelo, year: yearStr } = await params
  const brandName = brandFromSlug(marca)
  const modelYear = parseInt(yearStr, 10)
  if (!brandName || isNaN(modelYear)) return { title: 'No encontrado' }

  const modelName = await resolveModel(brandName, modelo)
  if (!modelName) return { title: 'No encontrado' }

  const t = await getTranslations('prices')
  const stats = await getPriceStats(brandName, modelName, modelYear)

  const avgPrice = stats.avgPrice ? formatPrice(stats.avgPrice) : ''

  const title = t('brandModel.yearMetaTitle', {
    brand: brandName,
    model: modelName,
    modelYear,
  })
  const description = t('brandModel.yearMetaDescription', {
    brand: brandName,
    model: modelName,
    modelYear,
    avgPrice,
    count: stats.count,
  })

  return {
    title,
    description,
    alternates: { canonical: `/precios/${marca}/${modelo}/${yearStr}` },
    openGraph: { title, description, url: `/precios/${marca}/${modelo}/${yearStr}`, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PrecioModeloYearPage({ params }: PageProps) {
  const { marca, modelo, year: yearStr } = await params
  const brandName = brandFromSlug(marca)
  const modelYear = parseInt(yearStr, 10)
  if (!brandName || isNaN(modelYear)) notFound()

  const modelName = await resolveModel(brandName, modelo)
  if (!modelName) notFound()

  const t = await getTranslations('prices')
  const tc = await getTranslations('common')
  const now = new Date()
  const monthName = MONTH_NAMES[now.getMonth()]

  const [stats, pricesByCity, listings, otherYears] = await Promise.all([
    getPriceStats(brandName, modelName, modelYear),
    getPricesByCity(brandName, modelName, modelYear),
    prisma.listing.findMany({
      where: { brand: brandName, model: modelName, year: modelYear, isActive: true },
      orderBy: { scrapedAt: 'desc' },
      take: 10,
    }),
    getAvailableYears(brandName, modelName),
  ])

  if (stats.count < MIN_LISTINGS) notFound()

  const statCards = [
    { label: t('brandModel.statsCount', { count: stats.count }), value: String(stats.count), highlight: false },
    stats.avgPrice ? { label: t('brandModel.statsAvgPrice'), value: formatPrice(stats.avgPrice), highlight: true } : null,
    stats.p25 ? { label: t('brandModel.statsP25'), value: formatPrice(stats.p25), highlight: false } : null,
    stats.p75 ? { label: t('brandModel.statsP75'), value: formatPrice(stats.p75), highlight: false } : null,
    stats.minPrice ? { label: t('brandModel.statsMin'), value: formatPrice(stats.minPrice), highlight: false } : null,
    stats.maxPrice ? { label: t('brandModel.statsMax'), value: formatPrice(stats.maxPrice), highlight: false } : null,
  ].filter(Boolean) as { label: string; value: string; highlight: boolean }[]

  return (
    <main className="min-h-screen bg-[#0B0B0F]">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${brandName} ${modelName} ${modelYear}`,
        description: `Precios de ${brandName} ${modelName} ${modelYear} usado en Colombia`,
        brand: { '@type': 'Brand', name: brandName },
        model: modelName,
        productionDate: String(modelYear),
        offers: stats.avgPrice ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'COP',
          lowPrice: stats.minPrice ?? stats.p25,
          highPrice: stats.maxPrice ?? stats.p75,
          offerCount: stats.count,
        } : undefined,
      }} />

      <NavHeader
        breadcrumbs={[
          { label: tc('breadcrumbSearch'), href: '/buscar' },
          { label: brandName, href: `/carros/${marca}` },
          { label: modelName, href: `/precios/${marca}/${modelo}` },
          { label: String(modelYear) },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* H1 SEO-optimized */}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
          {t('brandModel.yearTitle', {
            brand: brandName,
            model: modelName,
            modelYear,
            month: monthName,
            year: now.getFullYear(),
          })}
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          {t('brandModel.statsCount', { count: stats.count })}
        </p>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {statCards.map((card) => (
            <div key={card.label} className="glass-panel rounded-2xl p-5 text-center">
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">
                {card.label}
              </p>
              <p className={`text-xl font-black ${card.highlight ? 'text-[#3c83f6]' : 'text-white'}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* SEO text block */}
        {stats.avgPrice && stats.p25 && stats.p75 && (
          <div className="glass-panel rounded-2xl p-6 mb-10">
            <p className="text-slate-300 text-sm leading-relaxed">
              {t('brandModel.seoTextWithYear', {
                brand: brandName,
                model: modelName,
                modelYear,
                avgPrice: formatPrice(stats.avgPrice),
                p25: formatPrice(stats.p25),
                p75: formatPrice(stats.p75),
                count: stats.count,
              })}
            </p>
          </div>
        )}

        {/* Tabla de precios por ciudad */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">
            {t('brandModel.priceByCityTitle')}
          </h2>
          {pricesByCity.length > 0 ? (
            <div className="glass-panel rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-[11px] uppercase tracking-widest text-slate-500 px-5 py-3">
                      {t('brandModel.tableCity')}
                    </th>
                    <th className="text-right text-[11px] uppercase tracking-widest text-slate-500 px-5 py-3">
                      {t('brandModel.tableCount')}
                    </th>
                    <th className="text-right text-[11px] uppercase tracking-widest text-slate-500 px-5 py-3">
                      {t('brandModel.tableAvgPrice')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pricesByCity.map((row) => (
                    <tr key={row.city} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="text-white font-medium px-5 py-3">{row.city}</td>
                      <td className="text-right text-slate-400 px-5 py-3">{row.count}</td>
                      <td className="text-right text-white font-semibold px-5 py-3">{formatPrice(row.avgPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">{t('brandModel.priceByCityEmpty')}</p>
          )}
        </section>

        {/* Otros años disponibles */}
        {otherYears.length > 1 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">
              {t('brandModel.availableYearsTitle')}
            </h2>
            <div className="flex flex-wrap gap-3">
              {otherYears.filter((y) => y !== modelYear).map((year) => (
                <Link
                  key={year}
                  href={`/precios/${marca}/${modelo}/${year}`}
                  className="glass-panel px-4 py-2 rounded-full text-sm text-slate-300 hover:bg-white/10 transition-colors"
                >
                  {brandName} {modelName} {year}
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <Link
                href={`/precios/${marca}/${modelo}`}
                className="text-[#3c83f6] text-sm hover:underline"
              >
                {t('brandModel.backToModel', { brand: brandName, model: modelName })}
              </Link>
            </div>
          </section>
        )}

        {/* Listings recientes */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6">
            {t('brandModel.recentListingsTitle', { brand: brandName, model: modelName })}
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
        {stats.count > 10 && (
          <div className="mt-10 text-center">
            <GradientButton asChild size="lg">
              <Link
                href={`/buscar?brand=${encodeURIComponent(brandName)}&model=${encodeURIComponent(modelName)}&yearMin=${modelYear}&yearMax=${modelYear}`}
              >
                {t('brandModel.viewAll', { count: stats.count, brand: brandName, model: modelName })}
              </Link>
            </GradientButton>
          </div>
        )}
      </div>
    </main>
  )
}
