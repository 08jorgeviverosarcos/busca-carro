'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type CarDetailGalleryProps = {
  images: string[]
  title: string
}

export function CarDetailGallery({ images, title }: CarDetailGalleryProps) {
  const [current, setCurrent] = useState(0)

  if (!images.length) {
    return (
      <div className="aspect-video bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center">
        <span className="text-zinc-600">Sin imágenes disponibles</span>
      </div>
    )
  }

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1))
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1))

  return (
    <div className="space-y-2">
      {/* Imagen principal */}
      <div className="relative aspect-video bg-zinc-900 rounded-xl overflow-hidden">
        <Image
          src={images[current]}
          alt={`${title} - imagen ${current + 1}`}
          fill
          className="object-cover"
          unoptimized
        />

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              {current + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`relative w-16 h-12 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                i === current ? 'border-white' : 'border-zinc-700 hover:border-zinc-500'
              }`}
            >
              <Image src={img} alt={`Thumb ${i + 1}`} fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
