'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { GradientButton } from '@/components/ui/gradient-button'
import { useSearchStore } from '@/store/searchStore'
import { SearchParams } from '@/lib/types'

type SearchBarProps = {
  large?: boolean
  placeholder?: string
}

export function SearchBar({ large = false, placeholder = 'Buscar marca, modelo, año...' }: SearchBarProps) {
  const router = useRouter()
  const { filters, setFilter } = useSearchStore()
  const [inputValue, setInputValue] = useState(filters.q)
  const [isParsing, setIsParsing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = inputValue.trim()

    if (!text) {
      router.push('/buscar')
      return
    }

    setIsParsing(true)
    try {
      const res = await fetch('/api/search/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const { filters: parsed } = (await res.json()) as { filters: Partial<SearchParams> }

      const params = new URLSearchParams()
      const hasFilters = Object.keys(parsed).length > 0

      if (hasFilters) {
        if (parsed.brand) params.set('brand', parsed.brand)
        if (parsed.model) params.set('model', parsed.model)
        if (parsed.city) params.set('city', parsed.city)
        if (parsed.yearMin) params.set('yearMin', String(parsed.yearMin))
        if (parsed.yearMax) params.set('yearMax', String(parsed.yearMax))
        if (parsed.priceMin) params.set('priceMin', String(parsed.priceMin))
        if (parsed.priceMax) params.set('priceMax', String(parsed.priceMax))
        if (parsed.fuelType) params.set('fuelType', parsed.fuelType)
        if (parsed.transmission) params.set('transmission', parsed.transmission)
        setFilter('q', '')
      } else {
        params.set('q', text)
        setFilter('q', text)
      }

      router.push(`/buscar?${params.toString()}`)
    } catch {
      setFilter('q', text)
      const params = new URLSearchParams()
      params.set('q', text)
      router.push(`/buscar?${params.toString()}`)
    } finally {
      setIsParsing(false)
    }
  }

  // Variante hero: glass panel con glow
  if (large) {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-3xl glass-panel p-2 rounded-2xl shadow-2xl relative group">
        <div className="absolute -inset-1 ai-gradient opacity-20 blur-xl group-focus-within:opacity-40 transition-opacity rounded-2xl" />
        <div className="relative flex items-center bg-[#15151A] rounded-xl overflow-hidden border border-white/10">
          <div className="pl-5 text-slate-500">
            {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </div>
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            disabled={isParsing}
            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-white py-5 px-4 text-lg placeholder:text-slate-600"
          />
          <div className="pr-2">
            <GradientButton
              type="submit"
              disabled={isParsing}
              size="md"
            >
              Buscar
            </GradientButton>
          </div>
        </div>
      </form>
    )
  }

  // Variante compacta: para página de búsqueda
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={isParsing}
          className="pl-10 bg-[#15151A] border-white/10 text-white placeholder:text-slate-500 focus:border-white/20"
        />
      </div>
      <GradientButton
        type="submit"
        disabled={isParsing}
        size="sm"
      >
        {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
      </GradientButton>
    </form>
  )
}
