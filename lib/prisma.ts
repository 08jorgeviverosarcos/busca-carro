// Cliente Prisma con inicialización lazy para evitar que se cree
// antes de que Next.js inyecte las variables de entorno (.env)
import { PrismaClient } from '@/lib/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL no está configurada en .env')
  }
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Proxy lazy: el cliente se crea SOLO cuando se hace la primera consulta,
// no cuando el módulo se importa (momento en que .env puede no estar listo)
let _client: PrismaClient | undefined

function getClient(): PrismaClient {
  if (!_client) {
    _client = createPrismaClient()
  }
  return _client
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    const client = getClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
