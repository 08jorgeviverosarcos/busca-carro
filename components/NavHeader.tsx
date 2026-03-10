import Link from 'next/link'

type NavHeaderProps = {
  breadcrumbs?: { label: string; href?: string }[]
}

export function NavHeader({ breadcrumbs }: NavHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0B0B0F]/80 backdrop-blur-md px-6 md:px-12 py-4">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          {/* Logo con gradiente AI igual al Stitch */}
          <div className="size-8 ai-gradient rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">BuscaCarro</span>
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
