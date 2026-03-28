import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/lib/generated/prisma'
import { toSlug, brandFromSlug } from '@/lib/slugs'
import { formatPrice, formatMileage } from '@/lib/utils'
import { CarCard } from '@/components/CarCard'
import { NavHeader } from '@/components/NavHeader'
import { JsonLd } from '@/components/JsonLd'
import { GradientButton } from '@/components/ui/gradient-button'
import Link from 'next/link'
import type { Metadata } from 'next'

export const revalidate = 21600 // 6 horas

const MIN_LISTINGS = 5

type PageProps = {
  params: Promise<{ marca: string; modelo: string }>
}

// Buscar el nombre canónico del modelo a partir del slug, dentro de una marca
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
    where: { isActive: true, brand: { not: null }, model: { not: null } },
    _count: { model: true },
  })

  return combos
    .filter((c) => c.brand && c.model && (c._count.model ?? 0) >= MIN_LISTINGS)
    .map((c) => ({
      marca: toSlug(c.brand!),
      modelo: toSlug(c.model!),
    }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marca, modelo } = await params
  const brandName = brandFromSlug(marca)
  if (!brandName) return { title: 'No encontrado' }

  const modelName = await resolveModel(brandName, modelo)
  if (!modelName) return { title: 'No encontrado' }

  const t = await getTranslations('categories')

  const [count, agg] = await Promise.all([
    prisma.listing.count({ where: { brand: brandName, model: modelName, isActive: true } }),
    prisma.listing.aggregate({
      where: { brand: brandName, model: modelName, isActive: true, priceCop: { not: null } },
      _avg: { priceCop: true },
    }),
  ])

  const avgPrice = agg._avg.priceCop ? formatPrice(Number(agg._avg.priceCop)) : ''
  const title = t('brandModel.metaTitle', { brand: brandName, model: modelName })
  const description = t('brandModel.metaDescription', { brand: brandName, model: modelName, count, avgPrice })

  return {
    title,
    description,
    alternates: { canonical: `/carros/${marca}/${modelo}` },
    openGraph: { title, description, url: `/carros/${marca}/${modelo}`, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function BrandModelPage({ params }: PageProps) {
  const { marca, modelo } = await params
  const brandName = brandFromSlug(marca)
  if (!brandName) notFound()

  const modelName = await resolveModel(brandName, modelo)
  if (!modelName) notFound()

  const t = await getTranslations('categories')
  const tc = await getTranslations('common')

  const [count, agg, listings, percentiles] = await Promise.all([
    prisma.listing.count({ where: { brand: brandName, model: modelName, isActive: true } }),
    prisma.listing.aggregate({
      where: { brand: brandName, model: modelName, isActive: true, priceCop: { not: null } },
      _avg: { priceCop: true, mileage: true, year: true },
    }),
    prisma.listing.findMany({
      where: { brand: brandName, model: modelName, isActive: true },
      orderBy: { scrapedAt: 'desc' },
      take: 20,
    }),
    // P25/P75 via raw SQL — PostgreSQL percentile_cont
    prisma.$queryRaw<{ p25: string | null; p75: string | null }[]>(
      Prisma.sql`
        SELECT
          (percentile_cont(0.25) WITHIN GROUP (ORDER BY "priceCop"))::bigint::text AS p25,
          (percentile_cont(0.75) WITHIN GROUP (ORDER BY "priceCop"))::bigint::text AS p75
        FROM "Listing"
        WHERE "isActive" = true
          AND "priceCop" IS NOT NULL
          AND brand = ${brandName}
          AND model = ${modelName}
      `
    ),
  ])

  if (count < MIN_LISTINGS) notFound()

  const avgPrice = agg._avg.priceCop ? Number(agg._avg.priceCop) : null
  const avgYear = agg._avg.year ? Math.round(Number(agg._avg.year)) : null
  const avgMileage = agg._avg.mileage ? Math.round(Number(agg._avg.mileage)) : null
  const p25 = percentiles[0]?.p25 ? Number(percentiles[0].p25) : null
  const p75 = percentiles[0]?.p75 ? Number(percentiles[0].p75) : null
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const statCards = [
    { label: 'Anuncios', value: count.toLocaleString('es-CO'), highlight: false },
    avgPrice ? { label: t('brandModel.statsAvgPrice'), value: formatPrice(avgPrice), highlight: true } : null,
    p25 ? { label: t('brandModel.statsP25'), value: formatPrice(p25), highlight: false } : null,
    p75 ? { label: t('brandModel.statsP75'), value: formatPrice(p75), highlight: false } : null,
    avgYear ? { label: t('brandModel.statsAvgYear'), value: String(avgYear), highlight: false } : null,
    avgMileage ? { label: t('brandModel.statsAvgMileage'), value: formatMileage(avgMileage), highlight: false } : null,
  ].filter(Boolean) as { label: string; value: string; highlight: boolean }[]

  return (
    <main className="min-h-screen bg-[#0B0B0F]">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${brandName} ${modelName} usados en Colombia`,
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
          { label: brandName, href: `/carros/${marca}` },
          { label: modelName },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
          {t('brandModel.title', { brand: brandName, model: modelName })}
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          {t('brandModel.statsCount', { count })}
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

        {/* Grid de listings */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6">
            {t('brandModel.listingsTitle', { brand: brandName, model: modelName })}
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
              <Link
                href={`/buscar?brand=${encodeURIComponent(brandName)}&model=${encodeURIComponent(modelName)}`}
              >
                {t('brandModel.viewAll', { count, brand: brandName, model: modelName })}
              </Link>
            </GradientButton>
          </div>
        )}
      </div>
    </main>
  )
}
