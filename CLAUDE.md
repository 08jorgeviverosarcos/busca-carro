# Carli

Meta-buscador de carros usados en Colombia. Agrega anuncios de múltiples portales (Autocosmos, VendeTuNave) en una sola interfaz con filtros, búsqueda y alertas.

## Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript estricto
- **Styling**: Tailwind CSS v4 + shadcn/ui (radix-ui)
- **Database**: PostgreSQL via Prisma 7 con PrismaPg adapter
- **Cache**: Upstash Redis (búsquedas 30min, stats 5min)
- **Scraping**: Firecrawl (Autocosmos) + fetch directo (VendeTuNave)
- **i18n**: next-intl (textos centralizados en `src/i18n/messages/es/`)
- **State**: Zustand v5 (filtros + favoritos) + TanStack Query v5
- **Analytics**: Mixpanel + Firebase Analytics — dual-track desde una sola función `track()`
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
  mixpanel.ts             # API pública analytics: track(), initMixpanel(), constantes MP_*
  firebase.ts             # Firebase Analytics internals (solo usado por mixpanel.ts)
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
  MixpanelProvider.tsx    # Init Mixpanel + auto page view tracking
  TrackedLink.tsx         # Link con tracking para server components
  TrackedExternalLink.tsx # <a> externo con tracking para server components
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

src/
  i18n/
    request.ts              # next-intl config (locale + messages)
    messages/es/
      common.json           # Textos compartidos (app name, footer, precio, etc.)
      home.json             # Landing page
      search.json           # Página de búsqueda y resultados
      filters.json          # Panel de filtros
      carDetails.json       # Detalle de vehículo
      carCard.json          # Tarjeta de vehículo
      alerts.json           # Modal de alertas
      stats.json            # Barra de estadísticas
      fasecolda.json        # Badges y selector Fasecolda

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

### Internacionalización (next-intl)

- **UI text must never be hardcoded** en componentes React. Todo texto visible al usuario debe venir de archivos de traducción.
- **Todos los strings** viven en `src/i18n/messages/es/` organizados por pantalla/feature.
- **Strings reutilizables** (app name, precio, loading, footer) van en `common.json`.
- **Client components**: usar `useTranslations('namespace')` de `next-intl`.
- **Server components**: usar `await getTranslations('namespace')` de `next-intl/server`.
- **Nunca importar JSON** directamente desde componentes. Solo usar los helpers de next-intl.
- **Keys semánticas**: usar nombres descriptivos (`search.title`, `filters.apply`), nunca genéricos (`text1`, `labelA`).
- **No extraer**: console.log, variable names, API strings, database fields.
- **Cada nueva pantalla** requiere un nuevo archivo JSON en `src/i18n/messages/es/` y registrarlo en `src/i18n/request.ts`.

## Variables de entorno

```
DATABASE_URL              # PostgreSQL connection string
UPSTASH_REDIS_REST_URL    # Upstash Redis URL
UPSTASH_REDIS_REST_TOKEN  # Upstash Redis token
FIRECRAWL_API_KEY         # Firecrawl API key (para Autocosmos)
RESEND_API_KEY            # Resend API key (para alertas email)
SYNC_SECRET               # Secret para autenticación de sync APIs
NEXT_PUBLIC_APP_URL       # URL pública de la app
NEXT_PUBLIC_MIXPANEL_TOKEN          # Mixpanel project token (analytics)
NEXT_PUBLIC_FIREBASE_API_KEY        # Firebase config
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN    # Firebase config
NEXT_PUBLIC_FIREBASE_PROJECT_ID     # Firebase config
NEXT_PUBLIC_FIREBASE_APP_ID         # Firebase config
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID # Firebase Analytics measurement ID (ej: G-XXXXXXXXXX)
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

## Protocolo de Sync

### Estrategias

| Modo | Comando | Cuándo usar |
|------|---------|-------------|
| Incremental | `npm run sync:incremental` | Uso normal diario — inserta nuevos, para cuando no hay inserts nuevos. **No desactiva listings.** |
| Full | `npm run sync:full` | Semanal o después de >5 días sin sync — recorre todo, actualiza campos, desactiva listings desaparecidos. |
| Por portal | `npm run sync:autocosmos` etc. | Sync puntual de un portal en modo incremental |

### Regla crítica: nunca incremental después de >5 días sin sync

Si llevas >5 días sin sync, **siempre empezar con `sync:full`**. El motivo:

- `sync:incremental` para al primer batch con `inserted = 0` (todos los listings ya existen)
- `deactivateStaleListings` (7 días) solo corre en modo `full` — no en incremental
- Si corres incremental después de 7+ días, los listings antiguos quedan sin actualizar su `scrapedAt` pero NO se desactivan (correcto desde el fix del 2026-03-26)
- Sin embargo, después de suficiente tiempo sin full sync, los listings desaparecidos del portal nunca se desactivarán

### Recuperación de listings desactivados por error

Los listings con `isActive = false` NO se borran de la DB. Un `sync:full` los reactiva al actualizar su `scrapedAt` y hacer `isActive: true` en el upsert.

```bash
# Verificar cuántos están inactivos por portal
docker exec cop-dress-db psql -U cop -d busca_carro -c \
  "SELECT \"sourcePortal\", COUNT(*) FROM \"Listing\" WHERE \"isActive\" = false GROUP BY \"sourcePortal\";"

# Recuperar todo con full sync
npm run sync:full
```

### Cómo funciona `deactivateStaleListings` vs `deactivateMissingListings`

- `deactivateStaleListings(portal)` — desactiva listings cuyo `scrapedAt` sea > 7 días. Corre por batch en modo **full** únicamente (en `route.ts`). Safety net para listings que dejan de aparecer.
- `deactivateMissingListings(portal, seenIds)` — desactiva listings del portal que NO estuvieron en el conjunto de IDs vistos. Corre al final del full sync completo (vía `/api/sync/deactivate`). Más preciso que el anterior.

## Analytics (Mixpanel)

### Setup
- **Librerías**: `mixpanel-browser` + `firebase` (ambas client-side only)
- **API pública**: `lib/mixpanel.ts` — exporta `track()`, `initMixpanel()`, `trackPageView()`, constantes `MP_*`
- **Internals**: `lib/firebase.ts` — init y track de Firebase Analytics (nunca importar directamente desde componentes)
- **Provider**: `components/MixpanelProvider.tsx` — wraps app en `layout.tsx`, inicia ambas plataformas y trackea page views automáticamente
- **Una sola llamada**: `track("My Event", { prop: value })` → envía a Mixpanel Y Firebase Analytics simultáneamente
- **Env vars necesarias**: `NEXT_PUBLIC_MIXPANEL_TOKEN` para Mixpanel, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (+ otras `FIREBASE_*`) para Firebase
- **Graceful degradation**: si falta cualquier env var, esa plataforma es un no-op silencioso. La otra sigue funcionando
- **Helpers para server components**: `components/TrackedLink.tsx` y `components/TrackedExternalLink.tsx`

### Conversión de nombres de evento
- **Mixpanel**: PascalCase con espacios → `"Search Submitted"`, `"Car Card Clicked"`
- **Firebase**: `lib/firebase.ts` convierte automáticamente a snake_case → `"search_submitted"`, `"car_card_clicked"` (≤40 chars)

### Eventos actuales

| Evento | Componente | Propiedades |
|--------|-----------|-------------|
| `Page Viewed` | MixpanelProvider (auto) | `page`, `path`, `brand?`, `city?`, `query?`, `listingId?` |
| `Search Submitted` | SearchBar | `query`, `variant` (hero/compact) |
| `Search NLP Parsed` | SearchBar | `query`, `parsedFilters` |
| `Search NLP Failed` | SearchBar | `query`, `reason` (no_filters_returned/api_error) |
| `Search Results Loaded` | SearchResults | `total`, `page`, `totalPages`, `query`, `brand`, `city`, `sortBy` |
| `Filters Applied` | FilterSidebar | Filtros activos (brand, yearMin, priceMax, etc.) |
| `Filters Reset` | FilterSidebar | — |
| `Sort Changed` | SearchResults | `sortBy` |
| `Page Changed` | SearchResults | `page`, `direction` (next/previous) |
| `Car Card Clicked` | CarCard | `listingId`, `title`, `sourcePortal`, `priceCop` |
| `Favorite Toggled` | CarCard | `listingId`, `action` (add/remove), `title` |
| `External Link Clicked` | CarroDetailPage | `listingId`, `portal`, `url` |
| `Gallery Image Changed` | CarDetailGallery | `direction` (previous/next/thumbnail), `totalImages`, `imageIndex?` |
| `Alert Modal Opened` | AlertModal | — |
| `Alert Created` | AlertModal | `filters` |
| `Alert Failed` | AlertModal | `filters` |
| `Fasecolda Version Selected` | FasecoldaSelector | `codigo`, `referencia`, `valueCop` |
| `Quick Filter Clicked` | HomePage | `label`, `href` |
| `CTA Clicked` | HomePage | `cta` (nombre del botón) |

### Constantes de eventos
Todas definidas en `lib/mixpanel.ts` como `MP_*` (ej: `MP_SEARCH_SUBMITTED`, `MP_FAVORITE_TOGGLED`).

### Reglas obligatorias para nuevas features
1. **Cada nueva página** debe ser registrada en `MixpanelProvider.tsx` → `PAGE_NAMES` para tracking automático de page views
2. **Cada nueva interacción de usuario** (click, submit, toggle) debe tener un `track()` call con un evento descriptivo en PascalCase
3. **Agregar constante** `MP_*` en `lib/mixpanel.ts` para cada evento nuevo
4. **Actualizar la tabla de eventos** en esta sección de CLAUDE.md
5. **Para server components**: usar `TrackedLink` o `TrackedExternalLink` en lugar de `Link` o `<a>` cuando se necesite tracking
6. **No trackear datos sensibles**: nunca enviar emails, passwords o datos personales a Mixpanel
