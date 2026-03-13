'use client'

import { track } from '@/lib/mixpanel'

type TrackedExternalLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventName: string
  eventProperties?: Record<string, unknown>
}

export function TrackedExternalLink({
  eventName,
  eventProperties,
  onClick,
  children,
  ...props
}: TrackedExternalLinkProps) {
  return (
    <a
      {...props}
      onClick={(e) => {
        track(eventName, eventProperties)
        onClick?.(e)
      }}
    >
      {children}
    </a>
  )
}
