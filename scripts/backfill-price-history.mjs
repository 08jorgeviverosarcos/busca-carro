// Backfill: firstSeenAt + PriceHistory inicial para listings existentes
import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/index.js'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // 1. Obtener todos los listings con precio
  const listings = await prisma.listing.findMany({
    where: { priceCop: { not: null } },
    select: { id: true, priceCop: true, scrapedAt: true },
  })

  console.log(`📋 ${listings.length} listings con precio encontrados`)

  // Usar raw query para setear firstSeenAt = scrapedAt
  await prisma.$executeRaw`UPDATE "Listing" SET "firstSeenAt" = "scrapedAt" WHERE "priceCop" IS NOT NULL`
  console.log(`✅ firstSeenAt actualizado en ${listings.length} listings`)

  // 2. Crear PriceHistory inicial para cada listing (solo si no tiene ya)
  const existing = await prisma.priceHistory.findMany({
    select: { listingId: true },
  })
  const existingIds = new Set(existing.map((e) => e.listingId))

  const toCreate = listings.filter((l) => !existingIds.has(l.id) && l.priceCop !== null)
  console.log(`📝 Creando ${toCreate.length} entradas de PriceHistory...`)

  let created = 0
  for (const listing of toCreate) {
    await prisma.priceHistory.create({
      data: {
        listingId: listing.id,
        priceCop: listing.priceCop,
        recordedAt: listing.scrapedAt,
      },
    })
    created++
    if (created % 100 === 0) console.log(`  ${created}/${toCreate.length}...`)
  }

  console.log(`✅ Backfill completo: ${created} entradas de PriceHistory creadas`)
  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error('❌ Error en backfill:', e)
  process.exit(1)
})
