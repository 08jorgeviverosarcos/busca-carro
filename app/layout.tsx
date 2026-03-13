import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/QueryProvider'
import appIcon from './apple-touch-icon.png'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'BuscaCarro — Todos los carros de Colombia en un solo lugar',
    template: '%s | BuscaCarro',
  },
  description: 'Meta-buscador de carros usados en Colombia. Agrega anuncios de MercadoLibre, TuCarro, VendeTuNave y OLX.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  icons: {
    icon: appIcon.src,
    shortcut: appIcon.src,
    apple: appIcon.src,
  },
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-[#0B0B0F] text-white antialiased`}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
