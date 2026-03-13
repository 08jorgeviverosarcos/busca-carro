import mixpanel from 'mixpanel-browser'
import { initFirebase, trackFirebase } from '@/lib/firebase'

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ?? ''

let initialized = false

export function initMixpanel() {
  if (initialized) return
  if (MIXPANEL_TOKEN) {
    mixpanel.init(MIXPANEL_TOKEN, {
      track_pageview: false, // Manejamos page views manualmente
      persistence: 'localStorage',
    })
  }
  // Inicializar Firebase Analytics en paralelo (no bloquea)
  initFirebase().catch(() => {})
  initialized = true
}

export function track(event: string, properties?: Record<string, unknown>) {
  // Mixpanel
  if (MIXPANEL_TOKEN) {
    mixpanel.track(event, properties)
  }
  // Firebase Analytics
  trackFirebase(event, properties)
}

export function identify(userId: string) {
  if (!MIXPANEL_TOKEN) return
  mixpanel.identify(userId)
}

export function trackPageView(pageName: string, properties?: Record<string, unknown>) {
  track('Page Viewed', { page: pageName, ...properties })
}

// --- Eventos definidos ---
// Convención: PascalCase para nombres de evento

// Navegación
export const MP_PAGE_VIEWED = 'Page Viewed'

// Búsqueda
export const MP_SEARCH_SUBMITTED = 'Search Submitted'
export const MP_SEARCH_NLP_PARSED = 'Search NLP Parsed'
export const MP_SEARCH_NLP_FAILED = 'Search NLP Failed'
export const MP_SEARCH_RESULTS_LOADED = 'Search Results Loaded'

// Filtros
export const MP_FILTERS_APPLIED = 'Filters Applied'
export const MP_FILTERS_RESET = 'Filters Reset'
export const MP_SORT_CHANGED = 'Sort Changed'
export const MP_QUICK_FILTER_CLICKED = 'Quick Filter Clicked'

// Paginación
export const MP_PAGE_CHANGED = 'Page Changed'

// Listings
export const MP_CAR_CARD_CLICKED = 'Car Card Clicked'
export const MP_FAVORITE_TOGGLED = 'Favorite Toggled'
export const MP_EXTERNAL_LINK_CLICKED = 'External Link Clicked'

// Galería
export const MP_GALLERY_IMAGE_CHANGED = 'Gallery Image Changed'

// Alertas
export const MP_ALERT_MODAL_OPENED = 'Alert Modal Opened'
export const MP_ALERT_CREATED = 'Alert Created'
export const MP_ALERT_FAILED = 'Alert Failed'

// Fasecolda
export const MP_FASECOLDA_VERSION_SELECTED = 'Fasecolda Version Selected'

// CTA
export const MP_CTA_CLICKED = 'CTA Clicked'
