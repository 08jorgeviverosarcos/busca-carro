// Estado global: filtros de búsqueda y favoritos (con persistencia en localStorage)
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SearchFilters = {
  q: string
  brand: string
  model: string
  yearMin: string
  yearMax: string
  priceMin: string
  priceMax: string
  city: string
  fuelType: string
  transmission: string
  portal: string
  sortBy: string
  page: number
}

type SearchStore = {
  filters: SearchFilters
  favorites: string[]
  setFilter: (key: keyof SearchFilters, value: string | number) => void
  setFilters: (filters: Partial<SearchFilters>) => void
  resetFilters: () => void
  toggleFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
}

const defaultFilters: SearchFilters = {
  q: '',
  brand: '',
  model: '',
  yearMin: '',
  yearMax: '',
  priceMin: '',
  priceMax: '',
  city: '',
  fuelType: '',
  transmission: '',
  portal: '',
  sortBy: 'recent',
  page: 1,
}

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      filters: defaultFilters,
      favorites: [],

      setFilter: (key, value) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [key]: value,
            // Resetear página al cambiar cualquier filtro que no sea la página
            page: key === 'page' ? Number(value) : 1,
          },
        })),

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters, page: 1 },
        })),

      resetFilters: () => set({ filters: defaultFilters }),

      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((f) => f !== id)
            : [...state.favorites, id],
        })),

      isFavorite: (id) => get().favorites.includes(id),
    }),
    {
      name: 'busca-carro-store',
      partialize: (state) => ({ favorites: state.favorites }),
    }
  )
)
