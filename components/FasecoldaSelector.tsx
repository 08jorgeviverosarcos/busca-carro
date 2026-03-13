'use client'

import { useState } from 'react'
import { formatPrice } from '@/lib/utils'
import { FasecoldaBadge } from './FasecoldaBadge'
import { track, MP_FASECOLDA_VERSION_SELECTED } from '@/lib/mixpanel'

export interface FasecoldaCandidateSerialized {
  codigo: string
  referencia: string
  referencia1: string | null
  referencia2: string | null
  referencia3: string | null
  valueCop: string   // BigInt serializado como string
  clase: string
  score: number
}

interface FasecoldaSelectorProps {
  listingPrice: number
  candidates: FasecoldaCandidateSerialized[]
}

export function FasecoldaSelector({ listingPrice, candidates }: FasecoldaSelectorProps) {
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(
    candidates.length === 1
      ? candidates[0].codigo
      : null
  )

  if (candidates.length === 0) return null

  const selected = candidates.find((c) => c.codigo === selectedCodigo) ?? null
  const selectedValue = selected ? Number(selected.valueCop) : null

  // Un único match: mostrar badge directamente sin selector
  if (candidates.length === 1) {
    return (
      <div className="mt-2">
        <FasecoldaBadge listingPrice={listingPrice} fasecoldaValue={Number(candidates[0].valueCop)} />
        <p className="text-xs text-slate-600 mt-1">
          Ref. Fasecolda: {candidates[0].referencia2 ?? candidates[0].referencia1}
          {' '}· {formatPrice(Number(candidates[0].valueCop))}
        </p>
      </div>
    )
  }

  // Múltiples versiones: mostrar selector
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-slate-400">
        Hay {candidates.length} versiones en Fasecolda para este modelo. Selecciona la tuya:
      </p>
      <select
        className="w-full text-xs bg-[#15151A] border border-white/10 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-white/20 cursor-pointer"
        value={selectedCodigo ?? ''}
        onChange={(e) => {
          const codigo = e.target.value || null
          setSelectedCodigo(codigo)
          if (codigo) {
            const candidate = candidates.find((c) => c.codigo === codigo)
            track(MP_FASECOLDA_VERSION_SELECTED, {
              codigo,
              referencia: candidate?.referencia,
              valueCop: candidate?.valueCop,
            })
          }
        }}
      >
        <option value="">— Seleccionar versión —</option>
        {candidates.map((c) => (
          <option key={c.codigo} value={c.codigo}>
            {[c.referencia2, c.referencia3].filter(Boolean).join(' · ')} — {formatPrice(Number(c.valueCop))}
          </option>
        ))}
      </select>

      {selected && selectedValue && (
        <FasecoldaBadge listingPrice={listingPrice} fasecoldaValue={selectedValue} />
      )}

      {!selected && (
        <p className="text-xs text-slate-600">Selecciona una versión para comparar el precio</p>
      )}
    </div>
  )
}
