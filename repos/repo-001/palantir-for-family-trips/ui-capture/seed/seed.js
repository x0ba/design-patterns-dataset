// Seeds the trip document into localStorage (the app's own persistence layer)
// the first time the capture build is opened.
import { TRIP_DOCUMENT_STORAGE_KEY, VIEWER_PROFILE_STORAGE_KEY } from '../../src/tripModel'
import { buildSeedDocument, SEED_VERSION, VIEWER_PROFILE } from './seedData.js'

const MARKER_KEY = 'ui-capture/seed-version'

try {
  if (window.localStorage.getItem(MARKER_KEY) !== SEED_VERSION) {
    window.localStorage.setItem(TRIP_DOCUMENT_STORAGE_KEY, JSON.stringify(buildSeedDocument()))
    window.localStorage.setItem(VIEWER_PROFILE_STORAGE_KEY, JSON.stringify(VIEWER_PROFILE))
    window.localStorage.setItem(MARKER_KEY, SEED_VERSION)
  }
} catch (error) {
  console.warn('[ui-capture] seed skipped', error)
}
