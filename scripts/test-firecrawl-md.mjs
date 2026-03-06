import { readFileSync } from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const env = readFileSync('/Users/jorgeviveros/Proyects/busca-carro/.env', 'utf8')
env.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=')
  if (key && !key.startsWith('#')) {
    process.env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '')
  }
})

const FirecrawlApp = require('@mendable/firecrawl-js').default
const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })

// Intentar con waitFor para renderizado JS
console.log('🔄 Testing VendeTuNave with waitFor...')
try {
  const result = await app.scrapeUrl('https://www.vendetunave.co/vehiculos/', {
    formats: ['markdown'],
    waitFor: 3000,
  })
  console.log('Success:', result.success, '| Length:', result.markdown?.length)
  console.log(result.markdown?.substring(0, 2000))
} catch(e) {
  console.error('waitFor failed:', e.message?.substring(0, 200))
}

// Probar la API de VendeTuNave directamente (suelen tener API REST)
console.log('\n🔄 Testing VendeTuNave API...')
try {
  const res = await fetch('https://www.vendetunave.co/api/vehicles?category=car&page=1&limit=10')
  console.log('API status:', res.status)
  if (res.ok) {
    const json = await res.json()
    console.log('API response:', JSON.stringify(json).substring(0, 500))
  }
} catch(e) {
  console.error('API failed:', e.message?.substring(0, 100))
}
