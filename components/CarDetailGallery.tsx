'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { track, MP_GALLERY_IMAGE_CHANGED } from '@/lib/mixpanel'

type CarDetailGalleryProps = {
  images: string[]
  title: string
  badges?: string[]
}

export function CarDetailGallery({ images, title, badges = [] }: CarDetailGalleryProps) {
  const [current, setCurrent] = useState(0)
  const t = useTranslations('carDetails')

  if (!images.length) {
    return (
      <div className="h-[320px] md:h-[500px] glass-panel rounded-2xl flex items-center justify-center">
        <span className="text-slate-600">{t('noImages')}</span>
      </div>
    )
  }

  const prev = () => {
    track(MP_GALLERY_IMAGE_CHANGED, { direction: 'previous', totalImages: images.length })
    setCurrent((c) => (c === 0 ? images.length - 1 : c - 1))
  }
  const next = () => {
    track(MP_GALLERY_IMAGE_CHANGED, { direction: 'next', totalImages: images.length })
    setCurrent((c) => (c === images.length - 1 ? 0 : c + 1))
  }
  const goToImage = (index: number) => {
    track(MP_GALLERY_IMAGE_CHANGED, { direction: 'thumbnail', imageIndex: index, totalImages: images.length })
    setCurrent(index)
  }
  const hasOneImage = images.length === 1
  const hasTwoImages = images.length === 2
  const hasThreeOrMoreImages = images.length >= 3
  const sideTop = images[1]
  const sideBottom = images[2]
  const extraPhotos = Math.max(images.length - 3, 0)

  return (
    <div className="space-y-4">
      <div
        className={`grid grid-cols-1 gap-4 h-auto ${
          hasThreeOrMoreImages || hasTwoImages ? 'lg:grid-cols-4' : ''
        }`}
      >
        <div
          className={`relative h-[320px] md:h-[500px] rounded-2xl overflow-hidden group ${
            hasThreeOrMoreImages || hasTwoImages ? 'lg:col-span-3' : ''
          }`}
        >
          <Image
            src={images[current]}
            alt={`${title} - imagen ${current + 1}`}
            fill
            priority
            className="object-cover grayscale-[0.2] group-hover:scale-105 group-hover:grayscale-0 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {badges.length > 0 && (
            <div className="absolute left-4 bottom-4 flex flex-wrap items-center gap-2">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/15 text-white border border-white/20 backdrop-blur-sm"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full glass-panel text-white hover:bg-white/10 transition-colors"
                aria-label="Imagen anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full glass-panel text-white hover:bg-white/10 transition-colors"
                aria-label="Imagen siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute top-3 right-3 bg-black/55 text-white text-xs px-2.5 py-1 rounded-full border border-white/20">
                {current + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {hasTwoImages && sideTop && (
          <button
            onClick={() => goToImage(1)}
            className="hidden lg:block relative h-[500px] rounded-2xl overflow-hidden group"
            aria-label="Ver segunda imagen"
          >
            <Image
              src={sideTop}
              alt={`${title} - imagen secundaria`}
              fill
              className="object-cover grayscale-[0.2] group-hover:scale-105 group-hover:grayscale-0 transition-all duration-700"
            />
          </button>
        )}

        {hasThreeOrMoreImages && sideTop && sideBottom && (
          <div className="hidden lg:grid grid-rows-2 gap-4">
            <button
              onClick={() => goToImage(1)}
              className="relative rounded-2xl overflow-hidden group"
              aria-label="Ver segunda imagen"
            >
              <Image
                src={sideTop}
                alt={`${title} - imagen secundaria 1`}
                fill
                className="object-cover grayscale-[0.2] group-hover:scale-105 group-hover:grayscale-0 transition-all duration-700"
              />
            </button>
            <button
              onClick={() => goToImage(2)}
              className="relative rounded-2xl overflow-hidden group"
              aria-label="Ver tercera imagen"
            >
              <Image
                src={sideBottom}
                alt={`${title} - imagen secundaria 2`}
                fill
                className="object-cover grayscale-[0.2] group-hover:scale-105 group-hover:grayscale-0 transition-all duration-700"
              />
              {extraPhotos > 0 && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{t('extraPhotos', { count: extraPhotos })}</span>
                </div>
              )}
            </button>
          </div>
        )}
      </div>

      {!hasOneImage && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => goToImage(i)}
              className={`relative w-20 h-14 shrink-0 rounded-xl overflow-hidden border transition-colors ${
                i === current ? 'border-[#3c83f6]' : 'border-white/10 hover:border-white/30'
              }`}
              aria-label={`Ver imagen ${i + 1}`}
            >
              <Image src={img} alt={`Thumb ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
