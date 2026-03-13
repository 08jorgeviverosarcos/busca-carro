import Link from 'next/link'
import Image from 'next/image'
import appIcon from '@/app/apple-touch-icon.png'

type NavHeaderProps = {
  breadcrumbs?: { label: string; href?: string }[]
}

export function NavHeader({ breadcrumbs }: NavHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0B0B0F]/80 backdrop-blur-md px-6 md:px-12 py-4">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src={appIcon}
            alt="Carli"
            width={32}
            height={32}
            className="size-8 rounded-lg shrink-0"
          />
          <span className="text-xl font-bold tracking-tight">Carli</span>
        </Link>

        {breadcrumbs && breadcrumbs.length > 0 && (
          <>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-3">
                <span className="text-slate-600">/</span>
                {crumb.href ? (
                  <Link href={crumb.href} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-500 text-sm truncate max-w-[300px]">{crumb.label}</span>
                )}
              </span>
            ))}
          </>
        )}
      </div>
    </header>
  )
}
