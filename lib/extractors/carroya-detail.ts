// Scraping on-demand de página de detalle de CarroYa via Firecrawl
// CarroYa es una SPA React pura — Firecrawl renderiza el JS antes de devolver el markdown
// URL de detalle: urlOriginal del listing (ya corregida por buildDetailUrl en el extractor bulk)
//
// Estructura real del markdown (verificada inspeccionando respuesta de Firecrawl):
//   ### Publicada hace X [horas/días/semanas/meses/años]
//   #### Características
//   ##### ESTADO → #### Usado
//   ##### TIPO DE CAJA → #### Mecánica
//   ##### COMBUSTIBLE → #### Gasolina
//   ##### CILINDRAJE → #### 1.600   (punto = separador de miles, cc)
//   ##### COLOR → #### Vinotinto
//   ### Comentarios del vendedor → texto libre

import FirecrawlApp from '@mendable/firecrawl-js'

export type CarroyaDetailData =
  | { notFound: true }
  | {
      notFound: false
      description?: string
      color?: string
      engineSize?: number   // cilindrada en cc
      condition?: string    // "Usado" / "Nuevo"
      publishedAt?: Date    // aproximado, calculado desde texto relativo ("hace 2 semanas")
      images: string[]      // imágenes full-size del CDN de CarroYa
    }

// Corta el markdown antes de secciones de carros relacionados para no capturar imágenes ajenas
function cutAtRelatedSection(md: string): string {
  const cutMarkers = [
    /^##\s*Carros similares/im,
    /^##\s*También te puede interesar/im,
    /^##\s*Publicaciones relacionadas/im,
    /^##\s*Otros carros/im,
  ]
  let cutIdx = md.length
  for (const marker of cutMarkers) {
    const m = marker.exec(md)
    if (m && m.index < cutIdx) cutIdx = m.index
  }
  return md.slice(0, cutIdx)
}

// Convierte texto relativo de CarroYa en una fecha aproximada
// Ejemplos: "hace 5 horas", "hace 2 semanas", "hace 1 mes", "hace 3 días", "hace 1 año"
function parseRelativeDate(md: string): Date | undefined {
  const match = md.match(/Publicada?\s+hace\s+(\d+)\s+(horas?|d[ií]as?|semanas?|mes(es)?|a[ñn]os?)/i)
  if (!match) return undefined

  const n = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()
  const now = new Date()

  if (/^h/.test(unit)) {
    now.setHours(now.getHours() - n)
  } else if (/^d/.test(unit)) {
    now.setDate(now.getDate() - n)
  } else if (/^s/.test(unit)) {
    now.setDate(now.getDate() - n * 7)
  } else if (/^m/.test(unit)) {
    now.setMonth(now.getMonth() - n)
  } else if (/^a/.test(unit)) {
    now.setFullYear(now.getFullYear() - n)
  } else {
    return undefined
  }

  return now
}

// Extrae el valor que sigue a un label de característica
// Patrón real del markdown de CarroYa: ##### LABEL\n...\n#### valor
function extractFeatureValue(md: string, label: string): string | undefined {
  const regex = new RegExp(`#####\\s*${label}\\s*\\n[\\s\\S]*?####\\s*([^\\n#]+)`, 'i')
  const match = md.match(regex)
  return match?.[1]?.trim()
}

export async function scrapeCarroyaDetail(urlOriginal: string): Promise<CarroyaDetailData | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    console.error('❌ CarroYa detalle: FIRECRAWL_API_KEY no configurada')
    return null
  }

  if (!urlOriginal) {
    console.error('❌ CarroYa detalle: urlOriginal vacía')
    return null
  }

  try {
    const app = new FirecrawlApp({ apiKey })
    const result = await app.scrapeUrl(urlOriginal, { formats: ['markdown'] })

    if (!result.success || !result.markdown) {
      console.error(`❌ CarroYa detalle ${urlOriginal}: sin markdown`)
      return null
    }

    const md = result.markdown

    // Detectar página 404 / anuncio no disponible
    if (/no encontr|not found|no disponible|anuncio.*eliminado/i.test(md) && md.length < 2000) {
      console.log(`⚠️ CarroYa detalle ${urlOriginal}: anuncio no encontrado`)
      return { notFound: true }
    }

    const mainContent = cutAtRelatedSection(md)
    const detail: CarroyaDetailData = { notFound: false, images: [] }

    // --- Fecha de publicación (relativa) ---
    const publishedAt = parseRelativeDate(mainContent)
    if (publishedAt) detail.publishedAt = publishedAt

    // --- Color ---
    const color = extractFeatureValue(mainContent, 'COLOR')
    if (color && color.length < 40) detail.color = color

    // --- Cilindrada ---
    // CarroYa usa punto como separador de miles: "3.599" = 3599 cc
    const cilindrajeRaw = extractFeatureValue(mainContent, 'CILINDRAJE')
    if (cilindrajeRaw) {
      const val = parseInt(cilindrajeRaw.replace(/\./g, ''), 10)
      if (!isNaN(val) && val > 0) detail.engineSize = val
    }

    // --- Condición ---
    const estado = extractFeatureValue(mainContent, 'ESTADO')
    if (estado) detail.condition = estado

    // --- Descripción (Comentarios del vendedor) ---
    // Patrón real: #### Comentarios del vendedor\n\nTEXTO\n\nVer menos\n\n## Información del vendedor
    const descMatch = mainContent.match(
      /####\s*Comentarios del vendedor\s*\n+([\s\S]+?)(?=\n##|\n---|\n!\[|$)/i
    )
    if (descMatch?.[1]) {
      // Quitar "Ver menos" y links
      const desc = descMatch[1]
        .replace(/Ver menos\s*/gi, '')
        .replace(/\[.*?\]\(.*?\)/g, '')
        .replace(/[*_`]/g, '')
        .trim()
      if (desc) detail.description = desc
    }

    // --- Imágenes ---
    // CDN de CarroYa: carroya-commons.avaldigitallabs.com
    const imgMatches = [
      ...mainContent.matchAll(
        /!\[.*?\]\((https?:\/\/carroya-commons\.avaldigitallabs\.com\/[^\s)]+\.(?:webp|jpg|jpeg|png))[^)]*\)/gi
      ),
    ]
    const imgs = imgMatches
      .map((m) => m[1])
      .filter((url, i, arr) => arr.indexOf(url) === i)

    if (imgs.length > 0) detail.images = imgs

    return detail
  } catch (err) {
    console.error(`❌ CarroYa detalle ${urlOriginal} excepción:`, err)
    return null
  }
}
