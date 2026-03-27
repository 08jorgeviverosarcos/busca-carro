import type { MetadataRoute } from 'next'
import appIcon from './apple-touch-icon.png'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Carli',
    short_name: 'Carli',
    description: 'Meta-buscador de carros usados en Colombia',
    start_url: '/',
    theme_color: '#0B0B0F',
    background_color: '#0B0B0F',
    display: 'standalone',
    icons: [
      {
        src: appIcon.src,
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
