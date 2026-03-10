import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatPrice, formatMileage, PORTAL_LABELS } from '@/lib/utils'
import { getFasecoldaCandidates } from '@/lib/fasecolda/lookup'
import { CarDetailGallery } from '@/components/CarDetailGallery'
import { CarCard } from '@/components/CarCard'
import { FasecoldaSelector } from '@/components/FasecoldaSelector'
import type { FasecoldaCandidateSerialized } from '@/components/FasecoldaSelector'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'
import Link from 'next/link'

type PageProps = {
  params: Promise<{ id: string }>
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
  const listing = await prisma.listing.findUnique({ where: { id } })

  if (!listing) notFound()

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
  const fasecoldaCandidates = listing.brand && listing.year
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
    { label: 'Ciudad', value: listing.city },
    { label: 'Departamento', value: listing.department },
    { label: 'Portal', value: portalLabel },
    {
      label: 'Valor Fasecolda',
      value: singleCandidate ? formatPrice(Number(singleCandidate.valueCop)) : null,
    },
  ]

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 py-4">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-3">
          <Link href="/" className="text-white font-black text-xl tracking-tight">BuscaCarro</Link>
          <span className="text-zinc-600">/</span>
          <Link href="/buscar" className="text-zinc-400 hover:text-white text-sm transition-colors">Buscar</Link>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-500 text-sm truncate">{listing.title}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Galería */}
          <CarDetailGallery images={listing.images} title={listing.title} />

          {/* Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="text-xs">
                {portalLabel}
              </Badge>
            </div>

            <h1 className="text-white font-bold text-xl sm:text-2xl mb-4 leading-tight">
              {listing.title}
            </h1>

            {/* Precio + comparación Fasecolda */}
            <div className="mb-6">
              <p className="text-3xl font-black text-white">
                {price ? formatPrice(price) : 'Precio a consultar'}
              </p>
              {price && serializedCandidates.length > 0 && (
                <FasecoldaSelector
                  listingPrice={price}
                  candidates={serializedCandidates}
                />
              )}
            </div>

            {/* Specs en tabla */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6">
              {specs.filter((s) => s.value).map((spec, i) => (
                <div
                  key={spec.label}
                  className={`flex justify-between px-4 py-2.5 text-sm ${
                    i % 2 === 0 ? 'bg-transparent' : 'bg-zinc-800/30'
                  }`}
                >
                  <span className="text-zinc-400">{spec.label}</span>
                  <span className="text-white font-medium">{String(spec.value)}</span>
                </div>
              ))}
            </div>

            {/* CTA principal */}
            <a
              href={listing.urlOriginal}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Ver anuncio original →
            </a>
          </div>
        </div>

        {/* Carros similares */}
        {similares.length > 0 && (
          <div className="mt-12">
            <h2 className="text-white font-bold text-xl mb-4">
              {listing.brand} {listing.model} similares
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
