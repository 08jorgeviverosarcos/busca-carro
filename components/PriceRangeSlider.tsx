'use client'

import { Slider } from '@/components/ui/slider'
import { formatPrice } from '@/lib/utils'

type PriceRangeSliderProps = {
  min: number
  max: number
  value: [number, number]
  onChange: (value: [number, number]) => void
}

export function PriceRangeSlider({ min, max, value, onChange }: PriceRangeSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{formatPrice(value[0])}</span>
        <span>{formatPrice(value[1])}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={1_000_000}
        value={value}
        onValueChange={(v) => onChange(v as [number, number])}
        className="w-full"
      />
    </div>
  )
}
