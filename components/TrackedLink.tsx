'use client'

import Link from 'next/link'
import { track } from '@/lib/mixpanel'

type TrackedLinkProps = React.ComponentProps<typeof Link> & {
  eventName: string
  eventProperties?: Record<string, unknown>
}

export function TrackedLink({ eventName, eventProperties, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        track(eventName, eventProperties)
        onClick?.(e)
      }}
    />
  )
}
