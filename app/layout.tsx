import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'
import { QueryProvider } from '@/components/QueryProvider'
import { MixpanelProvider } from '@/components/MixpanelProvider'
import appIcon from './apple-touch-icon.png'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Carli — Todos los carros de Colombia en un solo lugar',
    template: '%s | Carli',
  },
  description: 'Meta-buscador de carros usados en Colombia. Agrega anuncios de MercadoLibre, TuCarro, VendeTuNave y OLX.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: appIcon.src,
    apple: appIcon.src,
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    siteName: 'Carli',
    title: 'Carli — Todos los carros de Colombia en un solo lugar',
    description: 'Meta-buscador de carros usados en Colombia. Agrega anuncios de Carroya, VendeTuNave, Autocosmos.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Carli — Todos los carros de Colombia en un solo lugar',
    description: 'Meta-buscador de carros usados en Colombia.',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className="dark">
      <body className={`${inter.className} bg-[#0B0B0F] text-white antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <Suspense fallback={null}>
              <MixpanelProvider>
                {children}
              </MixpanelProvider>
            </Suspense>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
