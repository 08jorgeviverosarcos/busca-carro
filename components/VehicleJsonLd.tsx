import { JsonLd } from '@/components/JsonLd'

type VehicleJsonLdProps = {
  brand: string | null
  model: string | null
  year: number | null
  priceCop: bigint | null
  mileage: number | null
  fuelType: string | null
  transmission: string | null
  color: string | null
  description: string | null
  images: string[]
  urlOriginal: string
  isActive: boolean
}

export function VehicleJsonLd({
  brand,
  model,
  year,
  priceCop,
  mileage,
  fuelType,
  transmission,
  color,
  description,
  images,
  urlOriginal,
  isActive,
}: VehicleJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: [brand, model, year].filter(Boolean).join(' '),
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    model: model ?? undefined,
    vehicleModelDate: year?.toString() ?? undefined,
    mileageFromOdometer: mileage
      ? { '@type': 'QuantitativeValue', value: mileage, unitCode: 'KMT' }
      : undefined,
    offers: priceCop
      ? {
          '@type': 'Offer',
          price: Number(priceCop),
          priceCurrency: 'COP',
          availability: isActive
            ? 'https://schema.org/InStock'
            : 'https://schema.org/Discontinued',
          url: urlOriginal,
        }
      : undefined,
    vehicleTransmission: transmission ?? undefined,
    fuelType: fuelType ?? undefined,
    color: color ?? undefined,
    itemCondition: 'https://schema.org/UsedCondition',
    description: description ?? undefined,
    image: images.length > 0 ? images : undefined,
  }

  return <JsonLd data={data} />
}
