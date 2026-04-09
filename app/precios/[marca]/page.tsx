import { redirect } from 'next/navigation'
import { brandFromSlug } from '@/lib/slugs'

type PageProps = {
  params: Promise<{ marca: string }>
}

export default async function PreciosMarcaPage({ params }: PageProps) {
  const { marca } = await params
  const brandName = brandFromSlug(marca)
  if (brandName) {
    redirect(`/buscar?brand=${encodeURIComponent(brandName)}`)
  }
  redirect('/buscar')
}
