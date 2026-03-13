import { initializeApp, getApps } from 'firebase/app'
import { getAnalytics, logEvent, isSupported, type Analytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

let analytics: Analytics | null = null

export async function initFirebase(): Promise<void> {
  if (!firebaseConfig.measurementId) return
  if (typeof window === 'undefined') return
  if (analytics) return

  const supported = await isSupported()
  if (!supported) return

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  analytics = getAnalytics(app)
}

// Firebase exige nombres de evento: solo letras, números y guiones bajos, ≤ 40 chars
function toFirebaseEventName(event: string): string {
  return event
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 40)
}

// Firebase solo acepta string | number | boolean como valores de propiedades
type FirebaseParams = Record<string, string | number | boolean>

function sanitizeForFirebase(props?: Record<string, unknown>): FirebaseParams {
  if (!props) return {}
  const result: FirebaseParams = {}
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value
    } else if (value !== null && value !== undefined) {
      result[key] = String(value)
    }
  }
  return result
}

export function trackFirebase(event: string, properties?: Record<string, unknown>): void {
  if (!analytics) return
  logEvent(analytics, toFirebaseEventName(event), sanitizeForFirebase(properties))
}
