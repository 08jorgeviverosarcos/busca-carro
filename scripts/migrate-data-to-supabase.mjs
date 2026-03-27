/**
 * Migra data del Docker local (schema public) → Supabase (schema destino)
 * Uso:
 *   node scripts/migrate-data-to-supabase.mjs staging    → copia a staging
 *   node scripts/migrate-data-to-supabase.mjs prod       → copia a public (prod)
 */
import { Pool } from 'pg'
import { config } from 'dotenv'

const target = process.argv[2]
if (!target || !['staging', 'prod'].includes(target)) {
  console.error('Uso: node scripts/migrate-data-to-supabase.mjs [staging|prod]')
  process.exit(1)
}

// Fuente: Docker local
config({ path: '.env' })
const localPool = new Pool({ connectionString: process.env.DATABASE_URL })

// Destino: Supabase
const envFile = target === 'staging' ? '.env.staging' : '.env.prod-migrations'
config({ path: envFile, override: true })
const targetSchema = process.env.DB_SCHEMA
const remotePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const BATCH = 500

async function migrateTable(table, orderBy = 'id') {
  const { rows: [{ count }] } = await localPool.query(`SELECT COUNT(*) as count FROM public."${table}"`)
  const total = parseInt(count)
  if (total === 0) { console.log(`  ${table}: vacía, skip`); return }

  let copied = 0
  let offset = 0
  process.stdout.write(`  ${table}: 0/${total}`)

  while (offset < total) {
    const { rows } = await localPool.query(`SELECT * FROM public."${table}" ORDER BY "${orderBy}" LIMIT $1 OFFSET $2`, [BATCH, offset])
    if (rows.length === 0) break

    const cols = Object.keys(rows[0]).map(c => `"${c}"`).join(', ')
    const vals = rows.map((row, i) =>
      `(${Object.values(row).map((_, j) => `$${i * Object.keys(row).length + j + 1}`).join(', ')})`
    ).join(', ')
    const flat = rows.flatMap(r => Object.values(r))

    await remotePool.query(
      `INSERT INTO ${targetSchema}."${table}" (${cols}) VALUES ${vals} ON CONFLICT DO NOTHING`,
      flat
    )

    copied += rows.length
    offset += rows.length
    process.stdout.write(`\r  ${table}: ${copied}/${total}`)
  }
  console.log(`\r  ${table}: ${copied}/${total} ✓`)
}

async function run() {
  console.log(`\nMigrando local → Supabase [${targetSchema}]\n`)
  try {
    // Orden importante por foreign keys
    await migrateTable('FasecoldaAbreviatura')
    await migrateTable('FasecoldaCode', 'codigo')
    await migrateTable('FasecoldaValue')
    await migrateTable('ScrapeLog')
    await migrateTable('Alert')
    await migrateTable('Listing')
    await migrateTable('PriceHistory')

    // Verificación final
    const { rows } = await remotePool.query(`SELECT COUNT(*) as count FROM ${targetSchema}."Listing"`)
    console.log(`\nListings en ${targetSchema}: ${rows[0].count}`)
    console.log('Migración completada ✓')
  } finally {
    await localPool.end()
    await remotePool.end()
  }
}

run().catch(e => { console.error('\n' + e.message); process.exit(1) })
