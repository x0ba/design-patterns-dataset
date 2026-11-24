// Drop-in replacement for @googlemaps/js-api-loader (v2 functional API) that
// installs the offline google.maps stub instead of fetching maps.googleapis.com.
import { installGoogleMapsStub } from './google-maps-stub.js'

let options = {}

export function setOptions(next = {}) {
  options = { ...options, ...next }
}

export async function importLibrary(name) {
  installGoogleMapsStub()
  return window.google.maps.importLibrary(name)
}

export function getOptions() {
  return options
}
