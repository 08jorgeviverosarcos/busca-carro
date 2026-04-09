import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { toSlug, brandFromSlug } from '@/lib/slugs'

const MIN_LISTINGS = 3

type PageProps = {
  params: Promise<{ marca: string }>
}

export async function generateStaticParams() {
  const brands = await prisma.listing.groupBy({
    by: ['brand'],
    where: { isActive: true, brand: { not: null }, priceCop: { not: null } },
    _count: { brand: true },
  })

  return brands
    .filter((b) => b.brand && (b._count.brand ?? 0) >= MIN_LISTINGS)
    .map((b) => ({ marca: toSlug(b.brand!) }))
    .filter((p) => p.marca)
}

export default async function PreciosMarcaPage({ params }: PageProps) {
  const { marca } = await params
  const brandName = brandFromSlug(marca)
  if (brandName) {
    redirect(`/buscar?brand=${encodeURIComponent(brandName)}`)
  }
  redirect('/buscar')
}
