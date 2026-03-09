'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={isParsing}
          className={`pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-500 ${large ? 'h-12 text-base' : ''}`}
        />
      </div>
      <Button
        type="submit"
        disabled={isParsing}
        className={`bg-white text-black hover:bg-zinc-200 font-semibold ${large ? 'h-12 px-6 text-base' : ''}`}
      >
        {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
      </Button>
    </form>
  )
}
