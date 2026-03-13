# 🚗 Carli Colombia — Buscador Agregador de Carros

## ROL
Eres un senior full-stack developer experto en Next.js, Node.js, PostgreSQL y 
automatización con n8n. Vamos a construir un meta-buscador de carros en Colombia 
llamado "Carli" que centraliza anuncios de múltiples portales en una sola 
plataforma con arquitectura de 4 capas.

---

## OBJETIVO GENERAL
Construir una web app completa que:
1. Agrega anuncios de carros de múltiples portales colombianos
2. Permite buscar y filtrar en tiempo real sobre datos locales (no scraping en vivo)
3. Usa la API oficial de MercadoLibre Colombia (gratis, sin autenticación)
4. Usa Firecrawl para scrapear VendeTuNave.com, OLX.com.co
5. Normaliza y unifica toda la data en una sola base de datos PostgreSQL
6. Tiene un frontend moderno, rápido, móvil y con buen SEO

---

## STACK TECNOLÓGICO — NO CAMBIAR NADA DE ESTO

### Frontend + Backend
- Next.js  (App Router) — monolito, todo en un solo proyecto
- TypeScript estricto (sin any)
- Tailwind CSS
- shadcn/ui para componentes
- Tanstack Query para fetching y caché del lado cliente
- Zustand para estado global (filtros activos, favoritos)

### Base de datos y caché
- PostgreSQL (via DATABASE_URL)
- Prisma ORM
- Redis via Upstash (caché de búsquedas, TTL 30 min)

### Integraciones externas
- MercadoLibre API oficial: https://api.mercadolibre.com (sin auth para búsquedas)
- Firecrawl API (FIRECRAWL_API_KEY en .env)
- Resend para emails de alertas (RESEND_API_KEY en .env)

---

## ESTRUCTURA DE CARPETAS EXACTA A CREAR
BuscaCarro/
├── app/
│   ├── page.tsx                        # Homepage: hero + buscador + stats
│   ├── buscar/
│   │   └── page.tsx                    # Resultados con filtros y paginación
│   ├── carro/
│   │   └── [id]/
│   │       └── page.tsx                # Detalle del anuncio + SEO
│   ├── api/
│   │   ├── search/
│   │   │   └── route.ts                # GET /api/search con todos los filtros
│   │   ├── sync/
│   │   │   ├── mercadolibre/
│   │   │   │   └── route.ts            # POST /api/sync/mercadolibre
│   │   │   └── firecrawl/
│   │   │       └── route.ts            # POST /api/sync/firecrawl
│   │   └── alerts/
│   │       └── route.ts                # POST /api/alerts
│   └── layout.tsx
├── components/
│   ├── SearchBar.tsx
│   ├── FilterSidebar.tsx
│   ├── CarCard.tsx
│   ├── CarGrid.tsx
│   ├── PriceRangeSlider.tsx
│   └── AlertModal.tsx
├── lib/
│   ├── extractors/
│   │   ├── mercadolibre.ts             # CAPA 1: extractor ML
│   │   ├── tucarro.ts                  # CAPA 1: extractor TuCarro
│   │   ├── vendetunave.ts              # CAPA 1: extractor VendeTuNave
│   │   └── olx.ts                     # CAPA 1: extractor OLX
│   ├── normalizer.ts                   # CAPA 2: normalizador universal
│   ├── storage.ts                      # CAPA 3: upsert y gestión DB
│   ├── prisma.ts                       # Cliente Prisma singleton
│   ├── redis.ts                        # Cliente Upstash singleton
│   └── utils.ts                        # formatPrice, formatMileage, etc
├── store/
│   └── searchStore.ts                  # Zustand: filtros, favoritos
├── prisma/
│   └── schema.prisma
├── .env.example
└── README.md

---

## ARQUITECTURA DE 4 CAPAS — IMPLEMENTAR EN ORDEN

---

### CAPA 1: EXTRACCIÓN

Cada extractor vive en `lib/extractors/` y es completamente independiente.
Todos retornan el mismo tipo `RawListing[]`.

**Tipo RawListing (datos crudos, sin normalizar):**
```typescript
type RawListing = {
  sourcePortal: string      // "mercadolibre" | "tucarro" | "vendetunave" | "olx"
  externalId: string
  rawTitle: string
  rawPrice: string          // puede venir como "$ 45.000.000" o "45000000"
  rawYear: string           // puede venir como "2020" o "Año: 2020"
  rawMileage: string        // puede venir como "52.000 km" o "52000"
  rawCity: string           // puede venir como "Bogotá D.C." o "bogota"
  rawFuelType: string       // puede venir como "Gasolina" o "gas" o "NAFTA"
  rawTransmission: string   // puede venir como "Automatica" o "AT"
  rawBrand: string          // puede venir como "TOYOTA" o "toyota"
  rawModel: string          // puede venir como "Hilux" o "HILUX 4X4"
  images: string[]
  urlOriginal: string
  scrapedAt: Date
}
```

**lib/extractors/mercadolibre.ts:**
- Endpoint: GET https://api.mercadolibre.com/sites/MCO/search
- Categoría autos usados Colombia: MCO1744
- Sin autenticación necesaria
- Parámetros: limit=50, offset para paginación
- Buscar las siguientes marcas populares en Colombia:
  ["Chevrolet","Renault","Mazda","Toyota","Kia","Hyundai","Ford","Nissan","Volkswagen","Suzuki"]
- Parsear atributos del response: BRAND, MODEL, VEHICLE_YEAR, KILOMETERS, FUEL_TYPE, TRANSMISSION
- Manejar rate limiting: 1 request por segundo máximo
- Log: 🔄 Extrayendo ML... ✅ X anuncios extraídos o ❌ Error: mensaje

**lib/extractors/tucarro.ts:**
- Usar Firecrawl con scrapeUrl o crawlUrl
- URL base: https://www.tucarro.com.co/carros_usados/
- Schema de extracción estructurado con Firecrawl:
  { title, price, year, mileage, city, imageUrl, listingUrl }
- Manejar paginación hasta N páginas configurables
- Log igual que ML

**lib/extractors/vendetunave.ts:**
- Usar Firecrawl
- URL base: https://www.vendetunave.co/vehiculos/carros/
- Mismo schema de extracción
- Manejar paginación

**lib/extractors/olx.ts:**
- Usar Firecrawl  
- URL base: https://www.olx.com.co/autos-motos-y-otros/autos_c195
- Mismo schema

**Regla de todos los extractores:**
- Nunca lanzar excepciones que rompan el proceso general
- Si falla una página, loggear y continuar con la siguiente
- Retornar siempre RawListing[] aunque sea vacío

---

### CAPA 2: NORMALIZACIÓN

Crear `lib/normalizer.ts` que convierte RawListing[] → NormalizedListing[]

**Tipo NormalizedListing:**
```typescript
type NormalizedListing = {
  sourcePortal: string
  externalId: string
  title: string
  brand: string | null
  model: string | null
  year: number | null
  priceCop: number | null
  mileage: number | null
  fuelType: string | null
  transmission: string | null
  city: string | null
  department: string | null
  images: string[]
  urlOriginal: string
  scrapedAt: Date
}
```

**Tablas de normalización OBLIGATORIAS a implementar:**
```typescript
const CITY_MAP: Record<string, string> = {
  "bogota": "Bogotá",
  "bogotá": "Bogotá",
  "bogotá d.c.": "Bogotá",
  "bogotá dc": "Bogotá",
  "santa fe de bogota": "Bogotá",
  "medellin": "Medellín",
  "medellín": "Medellín",
  "cali": "Cali",
  "barranquilla": "Barranquilla",
  "bucaramanga": "Bucaramanga",
  "cartagena": "Cartagena",
  "cucuta": "Cúcuta",
  "cúcuta": "Cúcuta",
  "pereira": "Pereira",
  "manizales": "Manizales",
  "ibague": "Ibagué",
  "ibagué": "Ibagué",
  "villavicencio": "Villavicencio",
  "pto de hierro": "Puerto de Hierro",
  "puerto de hierro": "Puerto de Hierro",
  // si no encuentra match: capitalizar primera letra de cada palabra
}

const BRAND_MAP: Record<string, string> = {
  "toyota": "Toyota",
  "chevrolet": "Chevrolet",
  "chevy": "Chevrolet",
  "gm": "Chevrolet",
  "renault": "Renault",
  "mazda": "Mazda",
  "kia": "Kia",
  "hyundai": "Hyundai",
  "ford": "Ford",
  "nissan": "Nissan",
  "volkswagen": "Volkswagen",
  "vw": "Volkswagen",
  "suzuki": "Suzuki",
  "honda": "Honda",
  "mitsubishi": "Mitsubishi",
  "jeep": "Jeep",
  "dodge": "Dodge",
  "bmw": "BMW",
  "mercedes": "Mercedes-Benz",
  "mercedes-benz": "Mercedes-Benz",
  "audi": "Audi",
  "volvo": "Volvo",
  "peugeot": "Peugeot",
  "fiat": "Fiat",
  "subaru": "Subaru",
  "land rover": "Land Rover",
  "landrover": "Land Rover",
  "isuzu": "Isuzu",
  "chery": "Chery",
  "jac": "JAC",
  "great wall": "Great Wall",
  "haval": "Haval",
  "dfsk": "DFSK",
}

const FUEL_MAP: Record<string, string> = {
  "gasolina": "Gasolina",
  "gas": "Gasolina",
  "nafta": "Gasolina",
  "gasoline": "Gasolina",
  "diesel": "Diésel",
  "diésel": "Diésel",
  "diesel/gas": "Diésel",
  "electrico": "Eléctrico",
  "eléctrico": "Eléctrico",
  "electric": "Eléctrico",
  "hibrido": "Híbrido",
  "híbrido": "Híbrido",
  "hybrid": "Híbrido",
  "gas natural": "Gas Natural",
  "gnv": "Gas Natural",
}

const TRANSMISSION_MAP: Record<string, string> = {
  "automatica": "Automática",
  "automática": "Automática",
  "automatico": "Automática",
  "automático": "Automática",
  "at": "Automática",
  "auto": "Automática",
  "automatic": "Automática",
  "manual": "Manual",
  "mt": "Manual",
  "mecanica": "Manual",
  "mecánica": "Manual",
  "standar": "Manual",
  "estándar": "Manual",
}
```

**Reglas de transformación:**

Precio:
- Eliminar "$", ".", ",", "COP", espacios
- Convertir a número entero
- Si el resultado < 1.000.000 probablemente está en millones → multiplicar x 1.000.000
- Si el resultado < 10.000 probablemente está en USD → multiplicar por 4.200 (tasa aprox)
- Si no parseable → null

Año:
- Extraer primeros 4 dígitos numéricos
- Validar: entre 1990 y (año actual + 1)
- Si inválido → null

Kilometraje:
- Eliminar "km", ".", ",", espacios
- Convertir a entero
- Si > 1.000.000 → null (error de datos)
- Si = 0 en carro con año < (actual - 1) → null (sospechoso)

Ciudad:
- Convertir a lowercase y trim
- Buscar en CITY_MAP
- Si no encuentra → capitalizar cada palabra

Marca y Modelo:
- Extraer del título si no viene explícito
- Aplicar BRAND_MAP para marca
- Modelo: limpiar la parte del título que no es marca/año

**La función principal:**
```typescript
export function normalizeListings(raw: RawListing[]): {
  normalized: NormalizedListing[]
  stats: {
    total: number
    normalized: number
    discarded: number
    reasons: Record<string, number>
  }
}
```
Loggear al final: 📊 Normalización: X/Y exitosos, Z descartados

---

### CAPA 3: ALMACENAMIENTO

Crear `lib/storage.ts`:
```typescript
// Upsert masivo: insertar nuevos, actualizar precio/estado de existentes
// Retornar conteos para el log
async function upsertListings(listings: NormalizedListing[]): Promise<{
  inserted: number
  updated: number
  skipped: number
}>

// Marcar inactivos anuncios no vistos en últimos 7 días por portal
async function deactivateStaleListings(portal: string): Promise<number>

// Stats para homepage y dashboard
async function getGlobalStats(): Promise<{
  totalActive: number
  byPortal: Record<string, number>
  lastSync: Record<string, Date>
}>
```

**Flujo completo de un sync (obligatorio seguir este orden):**

extractor.extract() → RawListing[]
normalizer.normalizeListings() → NormalizedListing[]
storage.upsertListings() → { inserted, updated, skipped }
storage.deactivateStaleListings(portal)
prisma.scrapeLog.create({ stats completos })
Log final: ✅ Sync ML completo: 120 nuevos, 45 actualizados, 3 descartados


---

### CAPA 4: INTERFAZ (Frontend)

**REGLA CRÍTICA: El frontend NUNCA llama a ML API ni Firecrawl directamente.**
Todo pasa por /api/search que lee de PostgreSQL local.
Esto garantiza respuestas < 200ms sin importar qué portal origine el dato.

**app/page.tsx — Homepage:**
- Hero con headline: "Todos los carros de Colombia. Un solo lugar."
- Buscador principal con input de texto libre
- Filtros rápidos inline: Ciudad, Año, Precio (dropdowns)
- Estadísticas en vivo desde /api/stats: total anuncios, portales activos, última sync
- Diseño oscuro, moderno, tipografía bold tipo Bebas Neue o similar
- Completamente responsive para móvil

**app/buscar/page.tsx — Resultados:**
- Sidebar izquierdo con filtros completos:
  Marca (checkbox list), Modelo, Año min/max,
  Precio min/max (slider), Km max, Ciudad, Combustible,
  Transmisión, Portal de origen
- Grid de CarCards (2 columnas desktop, 1 móvil)
- Contador: "1.284 resultados para Toyota Hilux"
- Ordenar por: Relevancia, Menor precio, Mayor precio, Más nuevo, Menor km
- Paginación: 20 resultados por página
- Loading skeletons mientras carga
- URL params sincronizados con filtros (para compartir búsquedas)

**components/CarCard.tsx:**
- Imagen principal con fallback si URL muere
- Badge portal origen: color distinto por portal
  ML=amarillo, TuCarro=azul, VendeTuNave=verde, OLX=naranja
- Título del anuncio
- Año · Kilometraje formateado (52.000 km) · Ciudad
- Combustible · Transmisión
- Precio en COP formateado: $45.000.000 (con puntos, no comas)
- Indicador vs mercado:
  "✓ Buen precio" (verde) si está 10%+ bajo el promedio de marca/modelo/año
  "↑ Sobre precio" (rojo) si está 10%+ sobre el promedio
- Botón favorito (corazón) guardado en Zustand + localStorage
- Click en card → abrir urlOriginal en nueva pestaña

**app/carro/[id]/page.tsx — Detalle:**
- Galería de imágenes (swipeable en móvil)
- Todos los specs en tabla limpia
- Precio grande y destacado con indicador vs mercado
- Botón principal: "Ver anuncio original" → urlOriginal nueva pestaña
- Sección: "Carros similares" (misma marca+modelo, distinto id)
- Meta tags SEO completos:
  title: "{marca} {modelo} {año} - ${precio} | BuscaCarro"
  description: "{km}km, {ciudad}, {transmisión}, {combustible}"
  og:image: primera imagen del anuncio

---

## BASE DE DATOS — SCHEMA PRISMA EXACTO
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model Listing {
  id            String   @id @default(cuid())
  externalId    String
  sourcePortal  String
  title         String
  brand         String?
  model         String?
  year          Int?
  priceCop      BigInt?
  mileage       Int?
  fuelType      String?
  transmission  String?
  city          String?
  department    String?
  images        String[]
  description   String?
  urlOriginal   String
  isActive      Boolean  @default(true)
  scrapedAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([sourcePortal, externalId])
  @@index([brand, model, year])
  @@index([city])
  @@index([priceCop])
  @@index([isActive, updatedAt])
}

model Alert {
  id          String    @id @default(cuid())
  email       String
  filtersJson Json
  lastSentAt  DateTime?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
}

model ScrapeLog {
  id           String    @id @default(cuid())
  portal       String
  startedAt    DateTime
  finishedAt   DateTime?
  countNew     Int       @default(0)
  countUpdated Int       @default(0)
  countDiscarded Int     @default(0)
  errors       String?
  createdAt    DateTime  @default(now())
}
```

---

## API ROUTES

**GET /api/search**
Parámetros query:
- q: string (búsqueda en título)
- brand: string
- model: string
- yearMin, yearMax: number
- priceMin, priceMax: number (en COP)
- city: string
- fuelType: string
- transmission: string
- portal: string
- sortBy: "price_asc" | "price_desc" | "year_desc" | "mileage_asc" | "recent"
- page: number (default 1)
- limit: number (default 20, max 50)

Implementar caché Redis:
- Key: "search:" + hash SHA256 de los parámetros ordenados
- TTL: 1800 segundos (30 min)
- Si hay hit de caché, incluir header: X-Cache: HIT

Respuesta:
```json
{
  "data": [...listings],
  "meta": {
    "total": 1284,
    "page": 1,
    "limit": 20,
    "totalPages": 65
  },
  "error": null
}
```

**POST /api/sync/mercadolibre**
- Header requerido: x-sync-secret = SYNC_SECRET del .env
- Si falta header → 401
- Ejecuta flujo completo: extractor → normalizer → storage
- Respuesta con stats del sync

**POST /api/sync/firecrawl**
- Header requerido: x-sync-secret
- Body: { portal: "tucarro" | "vendetunave" | "olx", pages: number }
- Mismo flujo

**GET /api/stats**
- Sin auth
- Retorna getGlobalStats() para la homepage
- Caché Redis TTL: 300 segundos

---

## VARIABLES DE ENTORNO (.env.example)
Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/BuscaCarro"
Redis (Upstash)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
APIs externas
FIRECRAWL_API_KEY=""
RESEND_API_KEY=""
Seguridad
SYNC_SECRET="cambiar-por-secreto-largo-aleatorio"
App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Carli"

---

## SCRIPTS EN package.json
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "db:migrate": "prisma migrate dev",
  "db:generate": "prisma generate",
  "db:studio": "prisma studio",
  "db:seed": "ts-node prisma/seed.ts",
  "sync:ml": "curl -X POST $NEXT_PUBLIC_APP_URL/api/sync/mercadolibre -H 'x-sync-secret: '$SYNC_SECRET",
  "sync:tucarro": "curl -X POST $NEXT_PUBLIC_APP_URL/api/sync/firecrawl -H 'x-sync-secret: '$SYNC_SECRET -H 'Content-Type: application/json' -d '{\"portal\":\"tucarro\",\"pages\":5}'",
  "sync:vendetunave": "curl -X POST $NEXT_PUBLIC_APP_URL/api/sync/firecrawl -H 'x-sync-secret: '$SYNC_SECRET -H 'Content-Type: application/json' -d '{\"portal\":\"vendetunave\",\"pages\":5}'",
  "sync:all": "npm run sync:ml && npm run sync:tucarro && npm run sync:vendetunave"
}
```

---

## REGLAS GENERALES DE DESARROLLO

1. TypeScript estricto en todo — cero `any`
2. Todos los API routes con try/catch y respuesta uniforme `{ data, error, meta }`
3. Precios siempre en BigInt en DB, convertir a number solo para mostrar
4. Nunca re-hostear imágenes, solo guardar y mostrar URLs originales
5. Rate limiting en todos los extractores: máximo 1 req/seg a APIs externas
6. Logs siempre con emoji: 🔄 procesando, ✅ éxito, ❌ error, 📊 estadísticas
7. Comentarios en español
8. El frontend es responsive mobile-first obligatoriamente
9. Skeleton loaders en todos los estados de carga
10. URLs de búsqueda con parámetros query sincronizados (para poder compartir)

---

## README.md A GENERAR

Debe incluir:
- Descripción del proyecto
- Arquitectura de 4 capas explicada brevemente
- Requisitos: Node 18+, PostgreSQL, cuenta Upstash, cuenta Firecrawl
- Setup paso a paso:
  1. clonar repo
  2. npm install
  3. copiar .env.example a .env y llenar variables
  4. npm run db:migrate
  5. npm run dev
  6. npm run sync:ml (para poblar la DB por primera vez)
- Cómo agregar un nuevo portal (guía breve)

---

## ENTREGABLE FINAL — CHECKLIST

Al terminar debe existir y funcionar:
- [ ] Proyecto Next.js corriendo en localhost:3000
- [ ] Schema Prisma creado con migración aplicada
- [ ] lib/extractors/ con los 4 extractores implementados
- [ ] lib/normalizer.ts con todas las tablas de equivalencias
- [ ] lib/storage.ts con upsert y deactivate
- [ ] /api/sync/mercadolibre funcionando y guardando en DB
- [ ] /api/sync/firecrawl funcionando para tucarro y vendetunave
- [ ] /api/search con todos los filtros y caché Redis
- [ ] Homepage con buscador y stats en vivo
- [ ] Página /buscar con sidebar de filtros y CarCards
- [ ] Página /carro/[id] con detalle y SEO
- [ ] .env.example completo
- [ ] README.md con instrucciones de setup
- [ ] npm run sync:ml puebla la DB correctamente

---

## INSTRUCCIÓN FINAL PARA CLAUDE CODE

Antes de escribir cualquier línea de código:
1. Muéstrame el plan completo dividido en fases
2. Indica qué archivos vas a crear en cada fase
3. Estima cuántos pasos tiene cada fase
4. Espera mi confirmación antes de empezar

Luego ejecuta fase por fase, confirmando conmigo 
antes de pasar a la siguiente. Si algo no funciona, 
depura en el mismo contexto antes de continuar.