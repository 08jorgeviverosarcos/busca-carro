import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatPrice, formatMileage, formatDate, PORTAL_LABELS } from '@/lib/utils'
import { updateListingDetail } from '@/lib/storage'
import { scrapeVendeTuNaveDetail, type VTNDetailData } from '@/lib/extractors/vendetunave-detail'
import { scrapeAutocosmosDetail, type AutocosmosDetailData } from '@/lib/extractors/autocosmos-detail'
import { getFasecoldaCandidates } from '@/lib/fasecolda/lookup'
import { CarDetailGallery } from '@/components/CarDetailGallery'
import { CarCard } from '@/components/CarCard'
import { FasecoldaSelector } from '@/components/FasecoldaSelector'
import type { FasecoldaCandidateSerialized } from '@/components/FasecoldaSelector'
import { Badge } from '@/components/ui/badge'
import { NavHeader } from '@/components/NavHeader'
import type { Metadata } from 'next'

type PageProps = {
  params: Promise<{ id: string }>
}

const DETAIL_STALE_DAYS = 7

// Generar metadata SEO dinámico
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const listing = await prisma.listing.findUnique({ where: { id } })

  if (!listing) return { title: 'Anuncio no encontrado' }

  const price = listing.priceCop ? formatPrice(Number(listing.priceCop)) : 'Consultar'
  const title = `${listing.brand ?? ''} ${listing.model ?? ''} ${listing.year ?? ''} - ${price}`
  const description = [
    listing.mileage ? formatMileage(listing.mileage) : null,
    listing.city,
    listing.transmission,
    listing.fuelType,
  ]
    .filter(Boolean)
    .join(', ')

  return {
    title: title.trim(),
    description,
    openGraph: {
      title: title.trim(),
      description,
      images: listing.images[0] ? [{ url: listing.images[0] }] : [],
    },
  }
}

export default async function CarroDetailPage({ params }: PageProps) {
  const { id } = await params
  let listing = await prisma.listing.findUnique({ where: { id } })

  if (!listing) notFound()

  // Enriquecimiento on-demand: scrappear detalle si nunca se hizo o está desactualizado (> 7 días)
  const staleThreshold = new Date()
  staleThreshold.setDate(staleThreshold.getDate() - DETAIL_STALE_DAYS)
  const detailIsStale = !listing.detailScrapedAt || listing.detailScrapedAt < staleThreshold

  if (detailIsStale) {
    // Llamar directamente al extractor (sin HTTP interno) con timeout de 10s
    // Si la promesa tarda más de 10s, resolve(null) y se continúa con datos básicos
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000))

    let scrapePromise: Promise<VTNDetailData | AutocosmosDetailData | null> | null = null
    if (listing.sourcePortal === 'vendetunave') {
      scrapePromise = scrapeVendeTuNaveDetail(listing.externalId)
    } else if (listing.sourcePortal === 'autocosmos') {
      scrapePromise = scrapeAutocosmosDetail(listing.urlOriginal)
    }

    if (scrapePromise) {
      try {
        const detailData = await Promise.race([scrapePromise, timeout])
        if (detailData) {
          if (detailData.notFound) {
            await prisma.listing.update({
              where: { id },
              data: { isActive: false, detailScrapedAt: new Date() },
            })
          } else {
            // Extraer notFound antes de pasar a updateListingDetail
            // (Prisma lanzaría error si recibe campos que no existen en el modelo)
            const { notFound: _, ...detailFields } = detailData
            await updateListingDetail(listing.id, detailFields)
          }
          // Re-fetch para obtener los datos actualizados
          const refreshed = await prisma.listing.findUnique({ where: { id } })
          if (refreshed) listing = refreshed
        }
      } catch {
        // Si falla el scraping, continuar con los datos básicos
      }
    }
  }

  // Carros similares (misma marca + modelo, distinto id)
  const similares = listing.brand
    ? await prisma.listing.findMany({
        where: {
          brand: listing.brand,
          model: listing.model ?? undefined,
          id: { not: listing.id },
          isActive: true,
        },
        take: 4,
        orderBy: { scrapedAt: 'desc' },
      })
    : []

  const price = listing.priceCop ? Number(listing.priceCop) : null
  const portalLabel = PORTAL_LABELS[listing.sourcePortal] ?? listing.sourcePortal

  // Obtener candidatos Fasecolda ordenados por score (transmisión/combustible)
  const fasecoldaCandidates =
    listing.brand && listing.year
      ? await getFasecoldaCandidates(
          listing.brand,
          listing.year,
          listing.model ?? undefined,
          listing.transmission ?? null,
          listing.fuelType ?? null
        )
      : []

  // Serializar BigInt a string para pasar al componente cliente
  const serializedCandidates: FasecoldaCandidateSerialized[] = fasecoldaCandidates.map((c) => ({
    ...c,
    valueCop: c.valueCop.toString(),
  }))

  // Para la tabla de specs: si hay un único candidato, mostrar el valor directamente
  const singleCandidate = fasecoldaCandidates.length === 1 ? fasecoldaCandidates[0] : null

  const specs = [
    { label: 'Marca', value: listing.brand },
    { label: 'Modelo', value: listing.model },
    { label: 'Año', value: listing.year },
    { label: 'Kilometraje', value: listing.mileage ? formatMileage(listing.mileage) : null },
    { label: 'Combustible', value: listing.fuelType },
    { label: 'Transmisión', value: listing.transmission },
    { label: 'Color', value: listing.color },
    { label: 'Cilindrada', value: listing.engineSize ? `${listing.engineSize} cc` : null },
    { label: 'Condición', value: listing.condition },
    { label: 'Ciudad', value: listing.city },
    { label: 'Departamento', value: listing.department },
    { label: 'Dígito de placa', value: listing.plateDigit },
    { label: 'Publicado', value: listing.publishedAt ? formatDate(listing.publishedAt) : null },
    { label: 'Portal', value: portalLabel },
    {
      label: 'Valor Fasecolda',
      value: singleCandidate ? formatPrice(Number(singleCandidate.valueCop)) : null,
    },
  ]

  // Flags de características especiales
  const hasFlags = listing.permuta || listing.financiacion || listing.blindado

  return (
    <main className="min-h-screen bg-[#0B0B0F]">
      <NavHeader
        breadcrumbs={[
          { label: 'Buscar', href: '/buscar' },
          { label: listing.title },
        ]}
      />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Banner: anuncio inactivo */}
        {!listing.isActive && (
          <div className="glass-panel rounded-2xl p-5 mb-6 border border-yellow-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-yellow-400 font-semibold text-sm mb-1">
                  Este anuncio ya no está disponible
                </p>
                <p className="text-slate-400 text-xs">
                  El anuncio fue eliminado o vendido en el portal de origen.
                </p>
              </div>
              <a
                href="/buscar"
                className="shrink-0 text-center ai-gradient text-white text-sm font-bold px-5 py-2 rounded-lg hover:scale-[1.02] active:scale-95 transition-transform"
              >
                ← Volver a buscar
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Galería */}
          <CarDetailGallery images={listing.images} title={listing.title} />

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="text-xs">{portalLabel}</Badge>
            </div>

            <h1 className="text-white font-bold text-xl sm:text-2xl mb-4 leading-tight">
              {listing.title}
            </h1>

            {/* Precio + comparación Fasecolda */}
            <div className="mb-4">
              <p className="text-3xl font-black text-white">
                {price ? formatPrice(price) : 'Precio a consultar'}
              </p>
              {price && serializedCandidates.length > 0 && (
                <FasecoldaSelector listingPrice={price} candidates={serializedCandidates} />
              )}
            </div>

            {/* Flags: permuta, financiación, blindado */}
            {hasFlags && (
              <div className="flex flex-wrap gap-2 mb-4">
                {listing.permuta && (
                  <Badge variant="outline" className="border-white/20 text-slate-300 text-xs">
                    Acepta permuta
                  </Badge>
                )}
                {listing.financiacion && (
                  <Badge variant="outline" className="border-white/20 text-slate-300 text-xs">
                    Acepta financiación
                  </Badge>
                )}
                {listing.blindado && (
                  <Badge
                    variant="outline"
                    className="border-yellow-500/50 text-yellow-400 text-xs"
                  >
                    Blindado
                  </Badge>
                )}
              </div>
            )}

            {/* Specs en tabla */}
            <div className="glass-panel rounded-2xl overflow-hidden mb-6">
              {specs.filter((s) => s.value).map((spec, i) => (
                <div
                  key={spec.label}
                  className={`flex justify-between px-4 py-2.5 text-sm ${
                    i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'
                  }`}
                >
                  <span className="text-slate-400">{spec.label}</span>
                  <span className="text-white font-medium">{String(spec.value)}</span>
                </div>
              ))}
            </div>

            {/* Descripción del vendedor */}
            {listing.description && (
              <div className="glass-panel rounded-2xl p-4 mb-6">
                <h2 className="text-slate-400 text-xs uppercase tracking-widest mb-3">
                  Descripción
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            )}

            {/* CTA principal */}
            <a
              href={listing.urlOriginal}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center ai-gradient text-white font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform"
            >
              Ver anuncio original →
            </a>
          </div>
        </div>

        {/* Carros similares */}
        {similares.length > 0 && (
          <div className="mt-12">
            <h2 className="text-white font-bold text-xl mb-6">
              {listing.brand} {listing.model} similares
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {similares.map((s) => (
                <CarCard
                  key={s.id}
                  id={s.id}
                  sourcePortal={s.sourcePortal}
                  title={s.title}
                  brand={s.brand}
                  model={s.model}
                  year={s.year}
                  priceCop={s.priceCop ? Number(s.priceCop) : null}
                  mileage={s.mileage}
                  fuelType={s.fuelType}
                  transmission={s.transmission}
                  city={s.city}
                  images={s.images}
                  urlOriginal={s.urlOriginal}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
