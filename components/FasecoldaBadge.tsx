'use client'

import { useTranslations } from 'next-intl'

interface FasecoldaBadgeProps {
  listingPrice: number
  fasecoldaValue: number
}

export function FasecoldaBadge({ listingPrice, fasecoldaValue }: FasecoldaBadgeProps) {
  const t = useTranslations('fasecolda')

  if (!listingPrice || !fasecoldaValue) return null

  const diff = ((listingPrice - fasecoldaValue) / fasecoldaValue) * 100
  const absDiff = Math.abs(diff)

  if (absDiff <= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-white/5 text-slate-300 border border-white/10">
        {t('priceAligned')}
      </span>
    )
  }

  if (diff < -5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-950 text-green-400 border border-green-800">
        {t('belowFasecolda', { percent: absDiff.toFixed(0) })}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-orange-950 text-orange-400 border border-orange-800">
      {t('aboveFasecolda', { percent: absDiff.toFixed(0) })}
    </span>
  )
}
