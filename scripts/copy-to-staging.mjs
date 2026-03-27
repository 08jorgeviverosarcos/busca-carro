import { Pool } from 'pg'
import { config } from 'dotenv'

config({ path: '.env.staging' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const tables = [
  'FasecoldaAbreviatura',
  'FasecoldaCode',
  'FasecoldaValue',
  'Listing',
  'PriceHistory',
  'Alert',
  'ScrapeLog',
]

async function run() {
  for (const table of tables) {
    const res = await pool.query(`INSERT INTO staging."${table}" SELECT * FROM public."${table}" ON CONFLICT DO NOTHING`)
    console.log(`${table}: ${res.rowCount} filas copiadas`)
  }
  // Verificar
  const check = await pool.query(`
    SELECT 'public' as schema, COUNT(*) as listings FROM public."Listing"
    UNION ALL
    SELECT 'staging', COUNT(*) FROM staging."Listing"
  `)
  console.log('\nVerificación:')
  check.rows.forEach(r => console.log(`  ${r.schema}: ${r.listings} listings`))
  await pool.end()
}

run().catch(e => { console.error(e.message); process.exit(1) })
