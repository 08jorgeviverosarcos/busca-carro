// Importa datos FASECOLDA desde un Excel a PostgreSQL
// Uso: node scripts/import-fasecolda.mjs fasecolda-febrero-2026.xlsx 2026-02
import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/index.js'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const XLSX = require('xlsx')
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CLASES_LIVIANAS = new Set([
  'AUTOMOVIL',
  'CAMPERO',
  'CAMIONETA PASAJ.',
  'PICKUP DOBLE CAB',
  'PICKUP SENCILLA',
  'CAMIONETA REPAR',
  'FURGONETA',
])

const BATCH_SIZE = 500

async function main() {
  const [, , excelArg, periodArg] = process.argv

  if (!excelArg || !periodArg) {
    console.error('❌ Uso: node scripts/import-fasecolda.mjs <archivo.xlsx> <período YYYY-MM>')
    console.error('   Ej: node scripts/import-fasecolda.mjs fasecolda-febrero-2026.xlsx 2026-02')
    process.exit(1)
  }

  const excelPath = path.isAbsolute(excelArg) ? excelArg : path.join(process.cwd(), excelArg)
  const period = periodArg

  if (!/^\d{4}-\d{2}$/.test(period)) {
    console.error('❌ El período debe tener formato YYYY-MM (ej: 2026-02)')
    process.exit(1)
  }

  console.log(`📂 Leyendo Excel: ${excelPath}`)
  console.log(`📅 Período: ${period}`)

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    // Leer el Excel
    const workbook = XLSX.readFile(excelPath)

    // === 1. Importar ABREVIATURAS ===
    const abrevsSheet = workbook.Sheets['ABREVIATURAS']
    if (!abrevsSheet) {
      console.warn('⚠️  No se encontró la hoja ABREVIATURAS')
    } else {
      const abrevsData = XLSX.utils.sheet_to_json(abrevsSheet, { header: 1 })
      // Primera fila es header: ["Abreviatura", "Definición"] o similar
      const abrevRows = abrevsData.slice(1).filter(row => row[0] && row[1])
      console.log(`\n📝 Importando ${abrevRows.length} abreviaturas...`)

      let abrevCount = 0
      for (const row of abrevRows) {
        const abreviatura = String(row[0]).trim()
        const definicion = String(row[1]).trim()
        if (!abreviatura || !definicion) continue

        await prisma.fasecoldaAbreviatura.upsert({
          where: { abreviatura },
          update: { definicion },
          create: { abreviatura, definicion },
        })
        abrevCount++
      }
      console.log(`✅ ${abrevCount} abreviaturas importadas`)
    }

    // === 2. Leer hoja Codigos ===
    const codigosSheet = workbook.Sheets['Codigos']
    if (!codigosSheet) {
      console.error('❌ No se encontró la hoja "Codigos" en el Excel')
      process.exit(1)
    }

    const rawData = XLSX.utils.sheet_to_json(codigosSheet, { header: 1, defval: null })
    const headers = rawData[0]
    const rows = rawData.slice(1)

    // Identificar columnas de años (1970-2027)
    const yearColumns = []
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i]
      if (typeof h === 'number' && h >= 1970 && h <= 2035) {
        yearColumns.push({ index: i, year: h })
      } else if (typeof h === 'string' && /^\d{4}$/.test(h.trim())) {
        const y = parseInt(h.trim())
        if (y >= 1970 && y <= 2035) yearColumns.push({ index: i, year: y })
      }
    }

    // Mapear headers a índices
    const colIndex = {}
    headers.forEach((h, i) => {
      if (h !== null && h !== undefined) colIndex[String(h).trim()] = i
    })

    // Filtrar solo clases livianas
    const filteredRows = rows.filter(row => {
      const clase = row[colIndex['Clase']]
      return clase && CLASES_LIVIANAS.has(String(clase).trim().toUpperCase())
    })

    console.log(`\n🚗 Total filas: ${rows.length} → Livianos: ${filteredRows.length}`)

    // === 3. Upsert FasecoldaCode en batches ===
    console.log(`\n⬆️  Importando códigos en batches de ${BATCH_SIZE}...`)

    let codesProcessed = 0
    let valuesInserted = 0
    let errors = 0

    for (let batchStart = 0; batchStart < filteredRows.length; batchStart += BATCH_SIZE) {
      const batch = filteredRows.slice(batchStart, batchStart + BATCH_SIZE)

      await prisma.$transaction(async (tx) => {
        for (const row of batch) {
          const codigo = row[colIndex['Codigo']]
          if (!codigo) continue

          const codigoStr = String(codigo).trim()
          const umRaw = row[colIndex['Um']]
          const um = umRaw === null || umRaw === undefined ? 0 : parseInt(String(umRaw)) || 0

          try {
            await tx.fasecoldaCode.upsert({
              where: { codigo: codigoStr },
              update: {
                homologoCodigo: row[colIndex['Homologocodigo']] ? String(row[colIndex['Homologocodigo']]).trim() : null,
                marca: String(row[colIndex['Marca']] ?? '').trim(),
                clase: String(row[colIndex['Clase']] ?? '').trim(),
                referencia1: row[colIndex['Referencia1']] ? String(row[colIndex['Referencia1']]).trim() : null,
                referencia2: row[colIndex['Referencia2']] ? String(row[colIndex['Referencia2']]).trim() : null,
                referencia3: row[colIndex['Referencia3']] ? String(row[colIndex['Referencia3']]).trim() : null,
                um,
              },
              create: {
                codigo: codigoStr,
                homologoCodigo: row[colIndex['Homologocodigo']] ? String(row[colIndex['Homologocodigo']]).trim() : null,
                marca: String(row[colIndex['Marca']] ?? '').trim(),
                clase: String(row[colIndex['Clase']] ?? '').trim(),
                referencia1: row[colIndex['Referencia1']] ? String(row[colIndex['Referencia1']]).trim() : null,
                referencia2: row[colIndex['Referencia2']] ? String(row[colIndex['Referencia2']]).trim() : null,
                referencia3: row[colIndex['Referencia3']] ? String(row[colIndex['Referencia3']]).trim() : null,
                um,
              },
            })

            // Upsert valores por año
            for (const { index, year } of yearColumns) {
              const rawVal = row[index]
              if (rawVal === null || rawVal === undefined || rawVal === '' || rawVal === '0' || rawVal === 0) continue

              const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal))
              if (isNaN(numVal) || numVal <= 0) continue

              // Multiplicar x1000 cuando um === 0 (miles de COP)
              const valueCop = um === 0 ? BigInt(Math.round(numVal * 1000)) : BigInt(Math.round(numVal))

              await tx.fasecoldaValue.upsert({
                where: { codigo_year_period: { codigo: codigoStr, year, period } },
                update: { valueCop },
                create: { codigo: codigoStr, year, period, valueCop },
              })
              valuesInserted++
            }

            codesProcessed++
          } catch (e) {
            errors++
            if (errors <= 5) console.error(`  ❌ Error en código ${codigoStr}:`, e.message)
          }
        }
      })

      const pct = Math.round(((batchStart + batch.length) / filteredRows.length) * 100)
      process.stdout.write(`\r  Progreso: ${batchStart + batch.length}/${filteredRows.length} (${pct}%)  `)
    }

    console.log('\n')
    console.log('═══════════════════════════════════════')
    console.log(`✅ Importación completa:`)
    console.log(`   Códigos procesados: ${codesProcessed}`)
    console.log(`   Valores insertados: ${valuesInserted}`)
    console.log(`   Errores:            ${errors}`)
    console.log('═══════════════════════════════════════')

  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('❌ Error fatal:', e)
  process.exit(1)
})
