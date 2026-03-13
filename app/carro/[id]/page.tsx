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
import { GradientButton } from '@/components/ui/gradient-button'
import { NavHeader } from '@/components/NavHeader'
import type { Metadata } from 'next'
import Image from 'next/image'
import appIcon from '@/app/apple-touch-icon.png'
import Link from 'next/link'
import {
  Building2,
  CalendarDays,
  CarFront,
  CircleGauge,
  Cog,
  Fuel,
  Gauge,
  MapPin,
  MessageCircle,
  Palette,
  ShieldCheck,
  PhoneCall,
  Shuffle,
  Sparkles,
  Tags,
} from 'lucide-react'

type PageProps = {
  params: Promise<{ id: string }>
}

const DETAIL_STALE_DAYS = 7

function formatCompactMillions(value: number | null): string {
  if (value === null) return 'Sin dato'
  const millions = value / 1_000_000
  const rounded = millions >= 100 ? Math.round(millions) : Math.round(millions * 10) / 10
  return `$${rounded.toLocaleString('es-CO')} M`
}

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
          listing.fuelType ?? null,
          listing.engineSize ?? null
        )
      : []

  // Serializar BigInt a string para pasar al componente cliente
  const serializedCandidates: FasecoldaCandidateSerialized[] = fasecoldaCandidates.map((c) => ({
    ...c,
    valueCop: c.valueCop.toString(),
  }))

  const priceReference = fasecoldaCandidates[0] ? Number(fasecoldaCandidates[0].valueCop) : null
  const location = [listing.city, listing.department].filter(Boolean).join(', ')
  const marketLow = priceReference ? Math.round(priceReference * 0.92) : null
  const marketHigh = priceReference ? Math.round(priceReference * 1.08) : null
  const insightText =
    price && priceReference
      ? (() => {
          const diff = ((price - priceReference) / priceReference) * 100
          if (diff <= -5) {
            return `Este carro está ${Math.abs(Math.round(diff))}% por debajo del valor de referencia en Fasecolda.`
          }
          if (diff >= 5) {
            return `Este carro está ${Math.abs(Math.round(diff))}% por encima del valor de referencia en Fasecolda.`
          }
          return 'Este carro está alineado con el valor de referencia actual en Fasecolda.'
        })()
      : 'Aún no tenemos una referencia única de Fasecolda para estimar el precio de mercado.'

  const technicalCards = [
    {
      label: 'Kilometraje',
      value: listing.mileage ? formatMileage(listing.mileage) : 'Sin dato',
      icon: CircleGauge,
    },
    {
      label: 'Transmisión',
      value: listing.transmission ?? 'Sin dato',
      icon: Shuffle,
    },
    {
      label: 'Color',
      value: listing.color ?? 'Sin dato',
      icon: Palette,
    },
    {
      label: 'Combustible',
      value: listing.fuelType ?? 'Sin dato',
      icon: Fuel,
    },
  ]

  const additionalDetails = [
    {
      label: 'Cilindraje',
      value: listing.engineSize ? `${listing.engineSize} cc` : null,
      icon: Gauge,
    },
    {
      label: 'Condición',
      value: listing.condition ?? null,
      icon: ShieldCheck,
    },
    {
      label: 'Dígito placa',
      value: listing.plateDigit ?? null,
      icon: Tags,
    },
    {
      label: 'Portal',
      value: portalLabel,
      icon: Building2,
    },
    {
      label: 'Publicado',
      value: listing.publishedAt ? formatDate(listing.publishedAt) : null,
      icon: CalendarDays,
    },
    {
      label: 'Referencia Fasecolda',
      value: priceReference ? formatPrice(priceReference) : null,
      icon: Cog,
    },
  ].filter((item) => item.value)

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

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
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
              <GradientButton asChild size="sm" className="shrink-0 text-center px-5">
                <Link href="/buscar">← Volver a buscar</Link>
              </GradientButton>
            </div>
          </div>
        )}

        <CarDetailGallery
          images={listing.images}
          title={listing.title}
          badges={['Verificado', portalLabel]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:items-start gap-8 mt-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="pb-8 border-b border-white/5">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight text-white">
                    {listing.title}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-slate-400 text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-500" />
                      {location || 'Ubicación no disponible'}
                    </span>
                    {listing.mileage && (
                      <span className="inline-flex items-center gap-1.5">
                        <CircleGauge className="w-4 h-4 text-slate-500" />
                        {formatMileage(listing.mileage)}
                      </span>
                    )}
                    {listing.publishedAt && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-slate-500" />
                        Publicado {formatDate(listing.publishedAt)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Precio</p>
                  <p className="text-3xl md:text-4xl font-black text-[#3c83f6]">
                    {price ? formatPrice(price) : 'Precio a consultar'}
                  </p>
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-2xl p-6 border border-[#3c83f6]/30 bg-[#3c83f6]/5 relative overflow-hidden">
              <div className="absolute -top-14 -right-14 w-40 h-40 rounded-full ai-gradient opacity-15 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#3c83f6]" />
                  <p className="text-sm font-bold uppercase tracking-widest text-[#3c83f6]">
                    AI Price Intelligence
                  </p>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{insightText}</p>
                {price && serializedCandidates.length > 0 && (
                  <div className="mt-4">
                    <FasecoldaSelector listingPrice={price} candidates={serializedCandidates} />
                  </div>
                )}
              </div>
            </section>

            {hasFlags && (
              <div className="flex flex-wrap gap-2">
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
                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-xs">
                    Blindado
                  </Badge>
                )}
              </div>
            )}

            <section>
              <h2 className="text-xl font-bold text-white mb-4">Especificaciones técnicas</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {technicalCards.map((spec) => (
                  <div key={spec.label} className="glass-panel rounded-2xl p-4">
                    <spec.icon className="w-4 h-4 text-[#3c83f6] mb-3" />
                    <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">{spec.label}</p>
                    <p className="text-sm font-semibold text-white">{spec.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-panel rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Descripción</h2>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {listing.description?.trim() || 'El portal no proporcionó una descripción adicional para este vehículo.'}
              </p>
            </section>

            {additionalDetails.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">Más detalles</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {additionalDetails.map((detail) => (
                    <div key={detail.label} className="glass-panel rounded-2xl p-4">
                      <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500 mb-2">
                        <detail.icon className="w-4 h-4 text-[#3c83f6]" />
                        <span>{detail.label}</span>
                      </div>
                      <p className="text-white text-sm font-semibold">{String(detail.value)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {price && (
              <section className="pt-4 border-t border-white/5">
                <h2 className="text-2xl font-black text-white mb-6">Comparación de mercado</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass-panel rounded-2xl p-5 min-h-32 flex flex-col items-center justify-center text-center gap-1">
                    <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Mercado bajo</p>
                    <p className="w-full min-w-0 text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight break-words">
                      {formatCompactMillions(marketLow)}
                    </p>
                  </div>
                  <div className="glass-panel rounded-2xl p-5 min-h-32 flex flex-col items-center justify-center text-center gap-2 border border-[#3c83f6]/40 bg-[#3c83f6]/10">
                    <span className="px-3 py-1 rounded-full ai-gradient text-[10px] uppercase tracking-widest font-black text-white">
                      Este carro
                    </span>
                    <p className="text-[11px] uppercase tracking-widest text-[#3c83f6]">Precio publicado</p>
                    <p className="w-full min-w-0 text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight break-words">
                      {formatCompactMillions(price)}
                    </p>
                  </div>
                  <div className="glass-panel rounded-2xl p-5 min-h-32 flex flex-col items-center justify-center text-center gap-1">
                    <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Mercado alto</p>
                    <p className="w-full min-w-0 text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight break-words">
                      {formatCompactMillions(marketHigh)}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:self-start">
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Información del vendedor</h3>
              <div className="flex items-center gap-3 mb-5">
                <div className="size-12 rounded-full ai-gradient flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">{portalLabel}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Portal de publicación</p>
                </div>
              </div>

              <div className="space-y-3">
                <GradientButton asChild fullWidth size="lg" className="h-auto py-3 gap-2">
                  <a href={listing.urlOriginal} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4" />
                    Ver anuncio original
                  </a>
                </GradientButton>
                <button
                  type="button"
                  className="w-full glass-panel text-slate-300 font-bold py-3 rounded-xl inline-flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  Contacto en portal
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">Ubicación</p>
                <div
                  className="glass-panel rounded-2xl h-40 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(60,131,246,0.12), rgba(168,85,247,0.08))' }}
                >
                  <div className="size-10 rounded-full border border-white/20 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#3c83f6]" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-300">
                  {location || 'Ubicación no disponible'}
                </p>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
                Resumen rápido
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-slate-300 inline-flex items-center gap-2">
                  <CarFront className="w-4 h-4 text-slate-500" />
                  {listing.brand ?? 'Marca'} {listing.model ?? 'Modelo'} {listing.year ?? ''}
                </p>
                <p className="text-slate-300 inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  {location || 'Ubicación no disponible'}
                </p>
                <p className="text-slate-300 inline-flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-slate-500" />
                  {listing.fuelType ?? 'Combustible no especificado'}
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Carros similares */}
        {similares.length > 0 && (
          <div className="mt-14 mb-10 border-t border-white/5 pt-10">
            <h2 className="text-white font-black text-2xl mb-6">
              Vehículos similares
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

        <footer className="mt-14 border-t border-white/5 pt-10 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <Image
                  src={appIcon}
                  alt="BuscaCarro"
                  width={28}
                  height={28}
                  className="size-7 rounded-lg shrink-0"
                />
                <p className="text-white font-bold">BuscaCarro</p>
              </div>
              <p className="text-slate-500 text-sm max-w-md">
                Compara anuncios de múltiples portales en una sola vista y encuentra oportunidades
                con datos de mercado en Colombia.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-3">Compañía</p>
              <div className="space-y-2 text-sm">
                <Link href="/" className="block text-slate-400 hover:text-white transition-colors">
                  Inicio
                </Link>
                <Link href="/buscar" className="block text-slate-400 hover:text-white transition-colors">
                  Buscar carros
                </Link>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-3">Soporte</p>
              <div className="space-y-2 text-sm">
                <a
                  href={listing.urlOriginal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-slate-400 hover:text-white transition-colors"
                >
                  Ver publicación original
                </a>
                <Link href="/buscar" className="block text-slate-400 hover:text-white transition-colors">
                  Explorar inventario
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-white/5 text-xs text-slate-500">
            © {new Date().getFullYear()} BuscaCarro. Todos los derechos reservados.
          </div>
        </footer>
      </div>
    </main>
  )
}
