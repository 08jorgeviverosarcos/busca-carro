// Scraping on-demand de página de detalle de VendeTuNave
// La URL /vehiculo/{id} redirige a la URL real del detalle (slug completo)
// Usamos redirect: 'follow' para seguir automáticamente el redirect

const BASE_URL = 'https://www.vendetunave.co'
const IMG_DETAIL_BASE = 'https://d3bmp4azzreq60.cloudfront.net/fit-in/2000x2000/vendetunave/images/vehiculos'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-CO,es;q=0.9',
}

export type VTNDetailData =
  | {
      notFound: true  // anuncio confirmado como eliminado/inactivo en el portal
    }
  | {
      notFound: false
      description?: string
      color?: string
      engineSize?: number     // cilindraje en cc
      condition?: string      // "Usado" / "Nuevo"
      publishedAt?: Date      // fecha_publicacion
      viewCount?: number
      permuta?: boolean
      financiacion?: boolean
      blindado?: boolean
      plateDigit?: string     // último dígito de placa
      images: string[]        // imágenes full-size (2000x2000)
    }

type VTNImageItem = {
  nameImage?: string
  extension?: string
}

type VTNVehiculoDetalle = {
  descripcion?: string
  color_label?: string
  cilindraje?: string | number
  condicion?: string
  fecha_publicacion?: string
  views?: number
  permuta?: boolean
  financiacion?: boolean
  blindado?: boolean
  placa?: string | number
}

export async function scrapeVendeTuNaveDetail(externalId: string): Promise<VTNDetailData | null> {
  const url = `${BASE_URL}/vehiculo/${externalId}`
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow' })

    // 404 = anuncio eliminado del portal
    if (res.status === 404) {
      console.log(`⚠️ VTN detalle ${externalId}: 404 — anuncio no encontrado`)
      return { notFound: true }
    }

    if (!res.ok) {
      console.error(`❌ VTN detalle ${externalId}: HTTP ${res.status}`)
      return null
    }

    const html = await res.text()
    const match = html.match(/<script id="__NEXT_DATA__[^>]*>([\s\S]+?)<\/script>/)
    if (!match) {
      console.error(`❌ VTN detalle ${externalId}: sin __NEXT_DATA__`)
      return null
    }

    const json = JSON.parse(match[1])
    const data = json?.props?.pageProps?.data

    // vehicleExists: false = el portal confirma que el vehículo no existe
    if (!data || data.vehicleExists === false) {
      console.log(`⚠️ VTN detalle ${externalId}: vehicleExists=false — anuncio no encontrado`)
      return { notFound: true }
    }

    const vehiculo: VTNVehiculoDetalle = data.vehiculo ?? {}
    const imagenes: VTNImageItem[] = data.imagenes ?? []

    // Construir URLs full-size para todas las imágenes disponibles
    const images = imagenes
      .filter((img) => img.nameImage && img.extension)
      .map((img) => `${IMG_DETAIL_BASE}/${img.nameImage}.${img.extension}`)

    // Parsear cilindrada
    const engineSizeRaw = vehiculo.cilindraje ? parseInt(String(vehiculo.cilindraje), 10) : NaN
    // VTN a veces devuelve cilindraje en unidades de 100cc (ej. 15 → 1500cc).
    // Si el valor es < 100, lo multiplicamos por 100 para convertir a cc.
    const engineSizeNorm = !isNaN(engineSizeRaw) && engineSizeRaw > 0
      ? (engineSizeRaw < 100 ? engineSizeRaw * 100 : engineSizeRaw)
      : NaN
    const engineSize = !isNaN(engineSizeNorm) && engineSizeNorm > 0 ? engineSizeNorm : undefined

    // Parsear fecha de publicación
    let publishedAt: Date | undefined
    if (vehiculo.fecha_publicacion) {
      const d = new Date(vehiculo.fecha_publicacion)
      if (!isNaN(d.getTime())) publishedAt = d
    }

    // Parsear dígito de placa (omitir si es "0" o vacío — significa no aplica)
    const placaStr = vehiculo.placa !== undefined ? String(vehiculo.placa).trim() : ''
    const plateDigit = placaStr && placaStr !== '0' ? placaStr : undefined

    const result: VTNDetailData = {
      notFound: false,
      images,
    }

    if (vehiculo.descripcion?.trim()) result.description = vehiculo.descripcion.trim()
    if (vehiculo.color_label?.trim()) result.color = vehiculo.color_label.trim()
    if (engineSize !== undefined) result.engineSize = engineSize
    if (vehiculo.condicion?.trim()) result.condition = vehiculo.condicion.trim()
    if (publishedAt) result.publishedAt = publishedAt
    if (typeof vehiculo.views === 'number') result.viewCount = vehiculo.views
    if (typeof vehiculo.permuta === 'boolean') result.permuta = vehiculo.permuta
    if (typeof vehiculo.financiacion === 'boolean') result.financiacion = vehiculo.financiacion
    if (typeof vehiculo.blindado === 'boolean') result.blindado = vehiculo.blindado
    if (plateDigit) result.plateDigit = plateDigit

    return result
  } catch (err) {
    console.error(`❌ VTN detalle ${externalId} excepción:`, err)
    return null
  }
}
