// GET /api/auth/ml/callback — Recibe el código de autorización de MercadoLibre
// y lo intercambia por access_token + refresh_token

import { NextRequest, NextResponse } from 'next/server'

const ML_API_BASE = 'https://api.mercadolibre.com'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return html(`
      <h1 style="color:red">❌ Error de autorización</h1>
      <p>${escapeHtml(error)}: ${escapeHtml(searchParams.get('error_description'))}</p>
    `)
  }

  if (!code) {
    return html(`<h1 style="color:red">❌ No se recibió el parámetro "code"</h1>`)
  }

  const clientId = process.env.ML_CLIENT_ID
  const clientSecret = process.env.ML_CLIENT_SECRET
  const redirectUri = process.env.ML_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return html(`<h1 style="color:red">❌ Faltan ML_CLIENT_ID, ML_CLIENT_SECRET o ML_REDIRECT_URI en .env</h1>`)
  }

  // Intercambiar code por tokens
  const res = await fetch(`${ML_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    return html(`
      <h1 style="color:red">❌ Error al obtener tokens (${escapeHtml(res.status)})</h1>
      <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    `)
  }

  const { access_token, refresh_token, expires_in, user_id } = data

  return html(`
    <h1 style="color:green">✅ Autenticación exitosa</h1>
    <p><b>User ID:</b> ${escapeHtml(user_id)}</p>
    <p><b>Access token</b> (expira en ${escapeHtml(Math.round(expires_in / 3600))}h): <code>${escapeHtml(access_token?.substring(0, 40))}...</code></p>
    <hr/>
    <h2>📋 Agrega esto a tu <code>.env</code>:</h2>
    <pre style="background:#1e1e1e;color:#4ec9b0;padding:16px;border-radius:8px;font-size:14px">ML_REFRESH_TOKEN=&quot;${escapeHtml(refresh_token)}&quot;</pre>
    <p style="color:#888">Una vez copiado, reinicia el servidor y ejecuta <code>npm run sync:all</code></p>
  `)
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function html(body: string) {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{font-family:monospace;max-width:800px;margin:40px auto;padding:20px}
    pre{overflow-x:auto}code{background:#f0f0f0;padding:2px 6px;border-radius:4px}</style>
    </head><body>${body}</body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
