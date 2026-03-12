// Scraping on-demand de página de detalle de Autocosmos via Firecrawl
// El externalId de Autocosmos ya es la URL completa del detalle (urlOriginal)
//
// Estructura del markdown de Autocosmos (detectada inspeccionando páginas reales):
//   Línea 1: # Título
//   Líneas top: Año, Km, Color{valor} (sin separador)
//   Una imagen: ![...](https://acroadtrip.blob.core.windows.net/publicaciones-imagenes/...)
//   ## Descripción — texto libre
//   ## Especificaciones técnicas — tabla markdown con Cilindrada, Combustible, Transmisión
//   ## Equipamiento — tabla
//   ## Los interesados en este aviso también vieron — ZONA PELIGROSA: imágenes de otros carros

import FirecrawlApp from '@mendable/firecrawl-js'

export type AutocosmosDetailData =
  | { notFound: true }
  | {
      notFound: false
      description?: string
      color?: string
      engineSize?: number   // cilindrada en cc
      fuelType?: string     // "Gasolina", "Diesel", etc.
      transmission?: string // "Automático", "Manual", etc.
      images: string[]
    }

// Corta el markdown en la sección de carros relacionados para evitar capturar imágenes ajenas
function cutAtRelatedSection(md: string): string {
  const cutMarkers = [
    /^##\s*Los interesados/im,
    /^##\s*Oportunidades/im,
    /^##\s*Modelos rivales/im,
  ]
  let cutIdx = md.length
  for (const marker of cutMarkers) {
    const m = marker.exec(md)
    if (m && m.index < cutIdx) cutIdx = m.index
  }
  return md.slice(0, cutIdx)
}

export async function scrapeAutocosmosDetail(urlOriginal: string): Promise<AutocosmosDetailData | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    console.error('❌ Autocosmos detalle: FIRECRAWL_API_KEY no configurada')
    return null
  }

  try {
    const app = new FirecrawlApp({ apiKey })
    const result = await app.scrapeUrl(urlOriginal, { formats: ['markdown'] })

    if (!result.success || !result.markdown) {
      console.error(`❌ Autocosmos detalle ${urlOriginal}: sin markdown`)
      return null
    }

    const md = result.markdown

    // Detectar página de error/404 de Autocosmos
    if (/no encontr|not found|página no existe|anuncio.*no.*disponible/i.test(md) && md.length < 2000) {
      console.log(`⚠️ Autocosmos detalle ${urlOriginal}: anuncio no encontrado`)
      return { notFound: true }
    }

    // Cortar antes de la sección de carros relacionados para no capturar imágenes ajenas
    const mainContent = cutAtRelatedSection(md)

    const detail: AutocosmosDetailData = { notFound: false, images: [] }

    // --- Descripción ---
    const descMatch = mainContent.match(
      /#+\s*Descripci[oó]n[^\n]*\n+([\s\S]+?)(?=\n#+|\n\*\*|\n---|\n!\[|$)/i
    )
    if (descMatch?.[1]) {
      const desc = descMatch[1]
        .replace(/\[.*?\]\(.*?\)/g, '')
        .replace(/[*_`]/g, '')
        .trim()
      if (desc) detail.description = desc
    }

    // --- Color ---
    // Formato: "ColorBlanco Ibis" (sin separador) o "Color: Blanco" (con separador)
    const colorMatch = mainContent.match(
      /\bColor[:\s]*([A-ZÁÉÍÓÚa-záéíóúñü][A-ZÁÉÍÓÚa-záéíóúñü\s]+?)(?:\n|$)/
    )
    if (colorMatch?.[1]) {
      const color = colorMatch[1].trim()
      if (color && color.length < 40) detail.color = color
    }

    // --- Cilindrada ---
    // Tabla: | Cilindrada | 1798 cc |
    const engMatch = mainContent.match(/\|\s*Cilindrada\s*\|\s*(\d+)\s*cc\s*\|/i)
    if (engMatch?.[1]) {
      const val = parseInt(engMatch[1], 10)
      if (!isNaN(val) && val > 0) detail.engineSize = val
    }

    // --- Combustible ---
    // Tabla: | Combustible | Gasolina |
    const fuelMatch = mainContent.match(/\|\s*Combustible\s*\|\s*([^|]+?)\s*\|/i)
    if (fuelMatch?.[1]) {
      const fuel = fuelMatch[1].trim()
      if (fuel) detail.fuelType = fuel
    }

    // --- Transmisión ---
    // Tabla: | Transmisión | S-Tronic de 7 velocidades |
    const transMatch = mainContent.match(/\|\s*Transmisi[oó]n\s*\|\s*([^|]+?)\s*\|/i)
    if (transMatch?.[1]) {
      const trans = transMatch[1].trim()
      if (trans) detail.transmission = trans
    }

    // --- Imágenes ---
    // Solo del contenido recortado (antes de "Los interesados") y solo del CDN de publicaciones
    // Excluir: marcas-img (logos de marca), agencias-imgs (logos de agencias), img/icons (íconos UI)
    const imgMatches = [
      ...mainContent.matchAll(
        /!\[.*?\]\((https?:\/\/acroadtrip\.blob\.core\.windows\.net\/publicaciones-imagenes\/[^\s)]+\.(?:webp|jpg|jpeg|png))[^)]*\)/gi
      ),
    ]
    const imgs = imgMatches
      .map((m) => m[1])
      .filter((url, i, arr) => arr.indexOf(url) === i) // deduplicar

    if (imgs.length > 0) detail.images = imgs

    return detail
  } catch (err) {
    console.error(`❌ Autocosmos detalle ${urlOriginal} excepción:`, err)
    return null
  }
}
