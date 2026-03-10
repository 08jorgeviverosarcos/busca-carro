# BuscaCarro

Meta-buscador de carros usados en Colombia. Agrega anuncios de múltiples portales (Autocosmos, VendeTuNave) en una sola interfaz con filtros, búsqueda y alertas.

## Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript estricto
- **Styling**: Tailwind CSS v4 + shadcn/ui (radix-ui)
- **Database**: PostgreSQL via Prisma 7 con PrismaPg adapter
- **Cache**: Upstash Redis (búsquedas 30min, stats 5min)
- **Scraping**: Firecrawl (Autocosmos) + fetch directo (VendeTuNave)
- **State**: Zustand v5 (filtros + favoritos) + TanStack Query v5
- **Email**: Resend (alertas)

## Arquitectura de 4 capas

1. **Extractores** (`lib/extractors/`) — Scraping por portal → `RawListing[]`
2. **Normalizador** (`lib/normalizer.ts`) — Limpieza y estandarización → `NormalizedListing[]`
3. **Almacenamiento** (`lib/storage.ts`) — Upsert masivo en PostgreSQL via Prisma
4. **Frontend** (`app/` + `components/`) — Next.js App Router + Zustand + TanStack Query

## Comandos

```bash
# Desarrollo
node node_modules/next/dist/bin/next dev    # NO usar npx next

# Type checking
node node_modules/typescript/lib/tsc.js --noEmit

# Lint
npm run lint

# Base de datos
npm run db:migrate     # prisma migrate dev
npm run db:generate    # prisma generate
npm run db:studio      # prisma studio

# Sincronización de datos
npm run sync:autocosmos
npm run sync:vendetunave
npm run sync:all       # ambos portales
```

## Estructura de archivos clave

```
app/
  layout.tsx              # Layout root (Inter font, dark theme, QueryProvider)
  page.tsx                # Landing page
  buscar/page.tsx         # Página de búsqueda con filtros
  carro/[id]/page.tsx     # Detalle de vehículo
  api/
    search/route.ts       # GET — filtros + paginación + caché Redis
    stats/route.ts        # GET — estadísticas globales (caché 5min)
    alerts/route.ts       # POST — crear alerta por email
    sync/
      firecrawl/route.ts  # POST — sync Autocosmos/VendeTuNave/TuCarro/OLX
      mercadolibre/route.ts # POST — sync MercadoLibre (bloqueado)

lib/
  types.ts                # RawListing, NormalizedListing, ApiResponse, SearchParams
  prisma.ts               # Singleton con lazy Proxy (PrismaPg adapter)
  redis.ts                # Singleton Upstash, retorna null si no hay credenciales
  normalizer.ts           # Mapas de ciudades/marcas/combustible/transmisión colombianos
  storage.ts              # upsertListings, deactivateStaleListings, getGlobalStats
  utils.ts                # formatPrice, formatMileage, titleCase, sha256, PORTAL_COLORS/LABELS
  extractors/
    autocosmos.ts         # Firecrawl markdown + regex (20 marcas)
    vendetunave.ts        # Fetch HTML → __NEXT_DATA__ JSON (25 marcas)
    mercadolibre.ts       # API (bloqueado 403)
    tucarro.ts            # URL incorrecta
    olx.ts                # Bloqueado

components/
  SearchBar.tsx           # Barra de búsqueda principal
  FilterSidebar.tsx       # Panel lateral de filtros
  CarGrid.tsx             # Grilla de resultados
  CarCard.tsx             # Tarjeta individual de vehículo
  SearchResults.tsx       # Wrapper de resultados con paginación
  PriceRangeSlider.tsx    # Slider de rango de precio
  AlertModal.tsx          # Modal para crear alertas
  StatsBar.tsx            # Barra de estadísticas
  CarDetailGallery.tsx    # Galería de imágenes en detalle
  QueryProvider.tsx       # TanStack Query provider (client component)
  ui/                     # Componentes shadcn/ui

store/
  searchStore.ts          # Zustand: filtros + favoritos (localStorage persist)

prisma/
  schema.prisma           # Modelos: Listing, Alert, ScrapeLog
prisma.config.ts          # datasource URL (NO va en schema.prisma en Prisma 7)
```

## Convenciones

- **Idioma del código**: Comentarios y logs en español, nombres de variables/funciones en inglés
- **Imports**: Alias `@/*` para rutas desde la raíz del proyecto
- **Prisma 7**: La URL de la DB va en `prisma.config.ts`, NO en `schema.prisma`
- **BigInt**: `priceCop` es BigInt en Prisma; usar `serializeListing()` antes de enviar JSON
- **Firecrawl**: No acepta schemas Zod v4 — usar solo `prompt` sin `schema` en extract
- **Zod**: v4 instalado, pero Firecrawl SDK espera v3 (incompatible)
- **APIs protegidas**: Rutas de sync usan header `x-sync-secret` para autenticación

## Variables de entorno

```
DATABASE_URL              # PostgreSQL connection string
UPSTASH_REDIS_REST_URL    # Upstash Redis URL
UPSTASH_REDIS_REST_TOKEN  # Upstash Redis token
FIRECRAWL_API_KEY         # Firecrawl API key (para Autocosmos)
RESEND_API_KEY            # Resend API key (para alertas email)
SYNC_SECRET               # Secret para autenticación de sync APIs
NEXT_PUBLIC_APP_URL       # URL pública de la app
```

## Fuentes de datos activas

| Portal | Extractor | Método | Listings |
|--------|-----------|--------|----------|
| Autocosmos | `lib/extractors/autocosmos.ts` | Firecrawl markdown → regex | ~344 |
| VendeTuNave | `lib/extractors/vendetunave.ts` | Fetch HTML → `__NEXT_DATA__` JSON | ~422 |

Los portales MercadoLibre, TuCarro y OLX están bloqueados o con URLs incorrectas.

## Design System (Stitch)

Referencia visual: `stitch/code.html` + `stitch/screen.png`. Documentación completa: `thoughts/shared/design/DESIGN_SYSTEM.md`.

### Paleta de colores
- **Fondo app**: `#0B0B0F` (NO usar `bg-black` puro)
- **Surface**: `#15151A` (inputs, elementos internos)
- **Glass**: `rgba(255,255,255,0.03)` + `backdrop-blur(12px)` + `border rgba(255,255,255,0.08)` → clase `.glass-panel`
- **Primary**: `#3c83f6` (azul) — botones, links, precios
- **Accent**: `#a855f7` (púrpura) — gradientes, glow
- **Texto**: `text-white` (primario), `text-slate-400` (secundario), `text-slate-500` (terciario)
- **Bordes**: `border-white/5` (default), `border-white/10` (inputs), `border-white/20` (hover)

### Clases CSS custom (definidas en `globals.css`)
- `.glass-panel` — Glass morphism para cards, sidebar, modals
- `.ai-gradient` — `linear-gradient(135deg, #3c83f6, #a855f7)` para CTAs y logo
- `.text-gradient` — Texto gradiente blanco→púrpura (solo hero h1)

### Reglas obligatorias
1. **No zinc** — usar `slate` para textos, `white/N` para bordes y superficies
2. **Cards siempre `.glass-panel`** con `rounded-2xl`
3. **Imágenes en cards**: `group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0 duration-700`
4. **Labels**: siempre `uppercase tracking-wide` o `tracking-widest`
5. **Botón CTA principal**: `ai-gradient text-white font-bold rounded-lg`
6. **Botón solid**: `bg-primary text-white font-bold rounded-full`
7. **Botón ghost**: `glass-panel text-slate-300 hover:bg-white/10 rounded-full`
8. **Nav header**: `sticky top-0 z-50 bg-[#0B0B0F]/80 backdrop-blur-md border-b border-white/5`
9. **SearchBar hero**: glass-panel con glow `ai-gradient opacity-20 blur-xl` detrás
10. **Tipografía hero**: `text-5xl md:text-7xl font-black tracking-tighter` con `.text-gradient`

### Colores de portales (sin cambios)
ML=yellow, TuCarro=blue, VendeTuNave=green, OLX=orange, Autocosmos=purple

## Notas de scraping

- **Autocosmos**: URLs por marca (`/auto/usado/{marca}`). Firecrawl cachea querystrings, por eso se usan URLs por marca. Rate limit: 1.1s entre requests.
- **VendeTuNave**: `?pagina=N` no funciona server-side, se usa `?marca=BRAND`. Datos en `__NEXT_DATA__` → `props.pageProps.data.vehicles[]`. Rate limit: 600ms. Excluye motos automáticamente.
