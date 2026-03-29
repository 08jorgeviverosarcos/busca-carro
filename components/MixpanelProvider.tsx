'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initMixpanel, trackPageView } from '@/lib/mixpanel'

const PAGE_NAMES: Record<string, string> = {
  '/': 'Home',
  '/buscar': 'Search',
}

function getPageName(pathname: string): string {
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname]
  if (pathname.startsWith('/carro/')) return 'Car Detail'
  if (pathname.startsWith('/precios/')) return 'Price Index'
  if (pathname.startsWith('/carros/ciudad/')) return 'City Category'
  if (pathname.startsWith('/carros/')) return 'Brand Category'
  return pathname
}

export function MixpanelProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initMixpanel()
  }, [])

  useEffect(() => {
    const pageName = getPageName(pathname)
    const properties: Record<string, unknown> = { path: pathname }

    if (pathname === '/buscar') {
      const brand = searchParams.get('brand')
      const city = searchParams.get('city')
      const q = searchParams.get('q')
      if (brand) properties.brand = brand
      if (city) properties.city = city
      if (q) properties.query = q
    }

    if (pathname.startsWith('/carro/')) {
      properties.listingId = pathname.split('/carro/')[1]
    }

    trackPageView(pageName, properties)
  }, [pathname, searchParams])

  return <>{children}</>
}
