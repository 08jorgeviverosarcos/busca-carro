# Carli Colombia

Meta-buscador de carros usados en Colombia. Agrega anuncios de MercadoLibre, TuCarro, VendeTuNave y OLX en una sola plataforma con búsqueda y filtros en tiempo real.

## Arquitectura de 4 capas

```
CAPA 1: Extracción    → lib/extractors/  (ML API + Firecrawl)
CAPA 2: Normalización → lib/normalizer.ts (unifica formatos)
CAPA 3: Almacenamiento → lib/storage.ts  (PostgreSQL via Prisma)
CAPA 4: Interfaz      → app/ + components/ (Next.js frontend)
```

El frontend **nunca** llama a APIs externas directamente — todo pasa por `/api/search` que lee de la DB local, garantizando respuestas < 200ms.

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- Cuenta Upstash (Redis) — opcional, para caché
- Cuenta Firecrawl — para scraping de TuCarro, VendeTuNave, OLX
- Cuenta Resend — para alertas por email

## Setup

```bash
# 1. Clonar repo
git clone <url> busca-carro
cd busca-carro

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Aplicar migraciones de base de datos
npm run db:migrate

# 5. Generar cliente Prisma
npm run db:generate

# 6. Iniciar servidor de desarrollo
npm run dev

# 7. Poblar la DB con anuncios de MercadoLibre (requiere servidor corriendo)
npm run sync:ml
```

Abre http://localhost:3000

## Sincronización de portales

```bash
# MercadoLibre (API oficial, sin costo)
npm run sync:ml

# TuCarro via Firecrawl
npm run sync:tucarro

# VendeTuNave via Firecrawl
npm run sync:vendetunave

# Todos los portales
npm run sync:all
```

## Agregar un nuevo portal

1. Crear `lib/extractors/miportal.ts` que exporte `extractMiPortal(): Promise<RawListing[]>`
2. El extractor debe retornar siempre `RawListing[]` (nunca lanzar excepciones)
3. Usar rate limiting: máximo 1 req/segundo
4. Agregar el portal en `app/api/sync/firecrawl/route.ts` en `PORTALES_VALIDOS`
5. Agregar badge de color en `lib/utils.ts` en `PORTAL_COLORS`

## Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Estado**: Zustand + TanStack Query
- **DB**: PostgreSQL + Prisma ORM
- **Cache**: Upstash Redis (TTL 30 min busquedas, 5 min stats)
- **Scraping**: Firecrawl API
- **Emails**: Resend
