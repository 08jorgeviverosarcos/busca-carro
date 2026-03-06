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
const listingRegex = () => /\[!\[([^\]]+)\]\(([^)]+)\)(\\+\n\\+\n)([\s\S]+?)\]\(([^"]+) "([^"]+)"\)/g

async function getListings(url) {
  const result = await app.scrapeUrl(url, { formats: ['markdown'] })
  const md = result.markdown ?? ''
  const re = listingRegex()
  const urls = []
  let m
  while ((m = re.exec(md)) !== null) urls.push(m[5]?.split('/').pop()?.substring(0,12))
  return urls
}

const p1 = await getListings('https://www.autocosmos.com.co/auto/usado')
const p2 = await getListings('https://www.autocosmos.com.co/auto/usado?paginaResultados=2')
console.log('Page 1 count:', p1.length, 'First 3:', p1.slice(0,3))
console.log('Page 2 count:', p2.length, 'First 3:', p2.slice(0,3))
console.log('Same?', p1[0] === p2[0])
