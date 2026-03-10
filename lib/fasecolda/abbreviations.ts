// Abreviaturas FASECOLDA (53 entradas)
export const FASECOLDA_ABBREVIATIONS: Record<string, string> = {
  '3P': '3 Puertas',
  '4P': '4 Puertas',
  '5P': '5 Puertas',
  AA: 'Aire Acondicionado',
  AB: 'Airbag',
  AMB: 'Ambulancia',
  ASL: 'Aislado',
  AT: 'Automático',
  CC: 'Centímetros Cúbicos',
  CMD: 'Camarote Doble',
  CMS: 'Camarote Sencillo',
  CT: 'Sunroof / Claraboya',
  DH: 'Dirección Hidráulica',
  DSL: 'Diésel',
  EST: 'Estacas',
  FE: 'Full Equipo',
  FV: 'Fibra de Vidrio',
  HB: 'Hatchback',
  IMP: 'Importado',
  INT: 'Intermunicipal',
  MT: 'Mecánico',
  NAL: 'Nacional',
  NB: 'Notchback',
  ND: 'Nuevo Diseño',
  PC: 'Pintura Corriente',
  PM: 'Pintura Metalizada',
  PT: 'Platón',
  SA: 'Sin Aire Acondicionado',
  SD: 'Sedán',
  STD: 'Estándar',
  SW: 'Station Wagon',
  T: 'Turbo',
  TC: 'Tapicería en Cuero',
  TD: 'Turbo Diésel',
  TP: 'Triptónico',
  URB: 'Urbano',
  INX: 'Inoxidable',
  PTL: 'Plataforma',
  CNST: 'Canasta',
  ESC: 'Escolar',
  FA: 'Freno de Aire',
  ELEC: 'Electrónico',
  VQT: 'Volqueta',
  LCH: 'Lechero',
  '2T': 'Motor 2 Tiempos',
  PHEV: 'Vehículo Híbrido Enchufable',
  MHEV: 'Vehículo Micro Híbrido',
  EREV: 'Vehículo Eléctrico de Autonomía Extendida',
  HEV: 'Vehículo Híbrido Completo',
}

export interface Ref3Parsed {
  transmission: string | null
  displacement: string | null
  turbo: boolean
  fuel: string | null
  features: string[]
}

// Parsea Referencia3 (ej: "AT 1800CC T DSL CT") en specs legibles
export function parseRef3(ref3: string | null | undefined): Ref3Parsed {
  if (!ref3) {
    return { transmission: null, displacement: null, turbo: false, fuel: null, features: [] }
  }

  const tokens = ref3.trim().toUpperCase().split(/\s+/)
  let transmission: string | null = null
  let displacement: string | null = null
  let turbo = false
  let fuel: string | null = null
  const features: string[] = []

  for (const token of tokens) {
    if (token === 'AT') {
      transmission = 'Automático'
    } else if (token === 'MT') {
      transmission = 'Mecánico'
    } else if (token === 'TP') {
      transmission = 'Triptónico'
    } else if (/^\d{3,4}CC$/.test(token)) {
      displacement = token
    } else if (token === 'T') {
      turbo = true
    } else if (token === 'TD') {
      turbo = true
      fuel = 'Diésel'
    } else if (token === 'DSL') {
      fuel = 'Diésel'
    } else if (FASECOLDA_ABBREVIATIONS[token]) {
      features.push(FASECOLDA_ABBREVIATIONS[token])
    }
  }

  return { transmission, displacement, turbo, fuel, features }
}
