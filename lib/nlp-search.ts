// Módulo de parsing de lenguaje natural → SearchParams usando Claude Haiku

import Anthropic from '@anthropic-ai/sdk'
import { VALID_BRANDS, VALID_CITIES, VALID_FUEL_TYPES, VALID_TRANSMISSIONS } from '@/lib/normalizer'
import { SearchParams } from '@/lib/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 5000,
})

const EXTRACT_TOOL: Anthropic.Tool = {
  name: 'extract_car_filters',
  description: 'Extrae filtros de búsqueda de carros usados en Colombia desde lenguaje natural',
  input_schema: {
    type: 'object' as const,
    properties: {
      brand: {
        type: 'string',
        description: `Marca del vehículo. Solo valores válidos: ${VALID_BRANDS.join(', ')}`,
      },
      model: {
        type: 'string',
        description: 'Modelo del vehículo, tal como lo menciona el usuario. Ej: CX-5, Spark, Tucson',
      },
      city: {
        type: 'string',
        description: `Ciudad colombiana. Solo valores válidos: ${VALID_CITIES.join(', ')}`,
      },
      yearMin: {
        type: 'number',
        description: 'Año mínimo del vehículo (4 dígitos)',
      },
      yearMax: {
        type: 'number',
        description: 'Año máximo del vehículo (4 dígitos)',
      },
      priceMin: {
        type: 'number',
        description: 'Precio mínimo en pesos colombianos (COP). Ej: "desde 30 millones" → 30000000',
      },
      priceMax: {
        type: 'number',
        description: 'Precio máximo en pesos colombianos (COP). Ej: "menor a 80 millones" → 80000000',
      },
      fuelType: {
        type: 'string',
        enum: VALID_FUEL_TYPES,
        description: 'Tipo de combustible',
      },
      transmission: {
        type: 'string',
        enum: VALID_TRANSMISSIONS,
        description: 'Tipo de transmisión',
      },
    },
    required: [],
  },
}

// Parsea lenguaje natural y retorna SearchParams parcial.
// Retorna {} si falla o no extrae nada útil.
export async function parseNaturalLanguageSearch(text: string): Promise<Partial<SearchParams>> {
  if (!process.env.ANTHROPIC_API_KEY) return {}

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system:
        'Eres un extractor de filtros para búsqueda de carros usados en Colombia. Extrae solo lo que el usuario menciona explícitamente. Si el usuario no menciona un campo, no lo incluyas.',
      messages: [{ role: 'user', content: text }],
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'extract_car_filters' },
    })

    const toolUse = response.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') return {}

    const input = toolUse.input as Partial<SearchParams>

    const filters: Partial<SearchParams> = {}
    if (input.brand) filters.brand = input.brand
    if (input.model) filters.model = input.model
    if (input.city) filters.city = input.city
    if (input.yearMin && input.yearMin >= 1990) filters.yearMin = input.yearMin
    if (input.yearMax && input.yearMax <= new Date().getFullYear() + 1) filters.yearMax = input.yearMax
    if (input.priceMin && input.priceMin > 0) filters.priceMin = input.priceMin
    if (input.priceMax && input.priceMax > 0) filters.priceMax = input.priceMax
    if (input.fuelType) filters.fuelType = input.fuelType
    if (input.transmission) filters.transmission = input.transmission

    return filters
  } catch {
    return {}
  }
}
