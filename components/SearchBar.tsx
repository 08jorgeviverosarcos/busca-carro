'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSearchStore } from '@/store/searchStore'

type SearchBarProps = {
  large?: boolean
  placeholder?: string
}

export function SearchBar({ large = false, placeholder = 'Buscar marca, modelo, año...' }: SearchBarProps) {
  const router = useRouter()
  const { filters, setFilter } = useSearchStore()
  const [inputValue, setInputValue] = useState(filters.q)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFilter('q', inputValue)
    const params = new URLSearchParams()
    if (inputValue) params.set('q', inputValue)
    router.push(`/buscar?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className={`pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-500 ${large ? 'h-12 text-base' : ''}`}
        />
      </div>
      <Button
        type="submit"
        className={`bg-white text-black hover:bg-zinc-200 font-semibold ${large ? 'h-12 px-6 text-base' : ''}`}
      >
        Buscar
      </Button>
    </form>
  )
}
