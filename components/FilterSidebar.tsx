'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GradientButton } from '@/components/ui/gradient-button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSearchStore } from '@/store/searchStore'

const MARCAS = [
  'Chevrolet', 'Renault', 'Mazda', 'Toyota', 'Kia',
  'Hyundai', 'Ford', 'Nissan', 'Volkswagen', 'Suzuki',
  'Honda', 'Mitsubishi', 'Jeep', 'BMW', 'Mercedes-Benz',
]

const COMBUSTIBLES = ['Gasolina', 'Diésel', 'Eléctrico', 'Híbrido', 'Gas Natural']
const TRANSMISIONES = ['Automática', 'Manual']
const PORTALES = [
  { value: 'mercadolibre', label: 'MercadoLibre' },
  { value: 'tucarro', label: 'TuCarro' },
  { value: 'vendetunave', label: 'VendeTuNave' },
  { value: 'olx', label: 'OLX' },
]

export function FilterSidebar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { filters, setFilter, resetFilters } = useSearchStore()

  const [localFilters, setLocalFilters] = useState({
    brand: filters.brand,
    yearMin: filters.yearMin,
    yearMax: filters.yearMax,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    city: filters.city,
    fuelType: filters.fuelType,
    transmission: filters.transmission,
    portal: filters.portal,
  })

  // Sincronizar con URL params al montar
  useEffect(() => {
    setLocalFilters({
      brand: searchParams.get('brand') ?? '',
      yearMin: searchParams.get('yearMin') ?? '',
      yearMax: searchParams.get('yearMax') ?? '',
      priceMin: searchParams.get('priceMin') ?? '',
      priceMax: searchParams.get('priceMax') ?? '',
      city: searchParams.get('city') ?? '',
      fuelType: searchParams.get('fuelType') ?? '',
      transmission: searchParams.get('transmission') ?? '',
      portal: searchParams.get('portal') ?? '',
    })
  }, [searchParams])

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(localFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    params.delete('page')
    router.push(`/buscar?${params.toString()}`)
  }

  const handleReset = () => {
    resetFilters()
    const q = searchParams.get('q')
    router.push(q ? `/buscar?q=${q}` : '/buscar')
  }

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="glass-panel rounded-2xl p-4 sticky top-20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Filtros</h2>
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Limpiar
          </button>
        </div>

        {/* Marca */}
        <div className="mb-4">
          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Marca</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {MARCAS.map((marca) => (
              <label key={marca} className="flex items-center gap-2 cursor-pointer group">
                <Checkbox
                  checked={localFilters.brand === marca}
                  onCheckedChange={(checked) =>
                    setLocalFilters({ ...localFilters, brand: checked ? marca : '' })
                  }
                  className="border-white/20 data-[state=checked]:bg-[#3c83f6] data-[state=checked]:border-[#3c83f6]"
                />
                <span className="text-sm text-slate-400 group-hover:text-white transition-colors">
                  {marca}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Año */}
        <div className="mb-4">
          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Año</p>
          <div className="flex gap-2">
            <Input
              placeholder="Desde"
              value={localFilters.yearMin}
              onChange={(e) => setLocalFilters({ ...localFilters, yearMin: e.target.value })}
              className="bg-[#15151A] border-white/10 text-white placeholder:text-slate-600 text-sm h-8"
            />
            <Input
              placeholder="Hasta"
              value={localFilters.yearMax}
              onChange={(e) => setLocalFilters({ ...localFilters, yearMax: e.target.value })}
              className="bg-[#15151A] border-white/10 text-white placeholder:text-slate-600 text-sm h-8"
            />
          </div>
        </div>

        {/* Precio */}
        <div className="mb-4">
          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Precio COP</p>
          <div className="flex gap-2">
            <Input
              placeholder="Mínimo"
              value={localFilters.priceMin}
              onChange={(e) => setLocalFilters({ ...localFilters, priceMin: e.target.value })}
              className="bg-[#15151A] border-white/10 text-white placeholder:text-slate-600 text-sm h-8"
            />
            <Input
              placeholder="Máximo"
              value={localFilters.priceMax}
              onChange={(e) => setLocalFilters({ ...localFilters, priceMax: e.target.value })}
              className="bg-[#15151A] border-white/10 text-white placeholder:text-slate-600 text-sm h-8"
            />
          </div>
        </div>

        {/* Ciudad */}
        <div className="mb-4">
          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Ciudad</p>
          <Input
            placeholder="Ej: Bogotá, Medellín..."
            value={localFilters.city}
            onChange={(e) => setLocalFilters({ ...localFilters, city: e.target.value })}
            className="bg-[#15151A] border-white/10 text-white placeholder:text-slate-600 text-sm h-8"
          />
        </div>

        {/* Combustible */}
        <div className="mb-4">
          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Combustible</p>
          <Select
            value={localFilters.fuelType}
            onValueChange={(v) => setLocalFilters({ ...localFilters, fuelType: v === 'all' ? '' : v })}
          >
            <SelectTrigger className="bg-[#15151A] border-white/10 text-sm h-8 text-white">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-[#15151A] border-white/10">
              <SelectItem value="all" className="text-slate-300">Todos</SelectItem>
              {COMBUSTIBLES.map((c) => (
                <SelectItem key={c} value={c} className="text-slate-300">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transmisión */}
        <div className="mb-4">
          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Transmisión</p>
          <Select
            value={localFilters.transmission}
            onValueChange={(v) => setLocalFilters({ ...localFilters, transmission: v === 'all' ? '' : v })}
          >
            <SelectTrigger className="bg-[#15151A] border-white/10 text-sm h-8 text-white">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent className="bg-[#15151A] border-white/10">
              <SelectItem value="all" className="text-slate-300">Todas</SelectItem>
              {TRANSMISIONES.map((t) => (
                <SelectItem key={t} value={t} className="text-slate-300">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Portal */}
        <div className="mb-5">
          <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Portal</p>
          <Select
            value={localFilters.portal}
            onValueChange={(v) => setLocalFilters({ ...localFilters, portal: v === 'all' ? '' : v })}
          >
            <SelectTrigger className="bg-[#15151A] border-white/10 text-sm h-8 text-white">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-[#15151A] border-white/10">
              <SelectItem value="all" className="text-slate-300">Todos</SelectItem>
              {PORTALES.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-slate-300">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <GradientButton
          onClick={applyFilters}
          size="lg"
          fullWidth
          className="font-semibold"
        >
          Aplicar filtros
        </GradientButton>
      </div>
    </aside>
  )
}
