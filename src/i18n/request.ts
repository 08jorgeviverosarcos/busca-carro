import { getRequestConfig } from 'next-intl/server'

import common from './messages/es/common.json'
import home from './messages/es/home.json'
import search from './messages/es/search.json'
import filters from './messages/es/filters.json'
import carDetails from './messages/es/carDetails.json'
import carCard from './messages/es/carCard.json'
import alerts from './messages/es/alerts.json'
import stats from './messages/es/stats.json'
import fasecolda from './messages/es/fasecolda.json'

export default getRequestConfig(async () => ({
  locale: 'es',
  messages: {
    common,
    home,
    search,
    filters,
    carDetails,
    carCard,
    alerts,
    stats,
    fasecolda,
  },
}))
