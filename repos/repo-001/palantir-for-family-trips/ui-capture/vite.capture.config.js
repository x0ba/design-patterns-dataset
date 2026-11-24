// Build config used for the UI capture. Extends the repo's own vite.config.js and
// swaps external integrations for local stubs:
//  - @googlemaps/js-api-loader  -> stubs/google-maps-loader.js (offline google.maps)
//  - https://api.weather.gov    -> static JSON under /__stub/weather.gov
//  - Google Fonts (Inter)       -> bundled @fontsource/inter
//  - images.unsplash.com photos -> local SVG scenes under /__stub/photos
// and boots through seed/boot.js, which seeds localStorage before the app mounts.
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import baseConfig from '../vite.config.js'
import { buildWeatherFiles, WEATHER_STUB_ROOT } from './stubs/weather-gov.js'
import { buildPhotoFiles, rewriteUnsplash } from './stubs/photos.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..')

function captureStubs() {
  return {
    name: 'ui-capture-stubs',
    enforce: 'pre',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html
        .replace(/\s*<link rel="preconnect"[^>]*>/g, '')
        .replace(/\s*<link href="https:\/\/fonts\.googleapis\.com[^>]*>/g, '')
        .replace('/src/main.jsx', '/.ui-capture/seed/boot.js'),
    },
    transform(code, id) {
      if (id.endsWith('/src/weather.js')) {
        return code.replace("'https://api.weather.gov'", `'${WEATHER_STUB_ROOT}'`)
      }
      if (id.includes('/src/') && code.includes('images.unsplash.com')) {
        return rewriteUnsplash(code)
      }
      return null
    },
    generateBundle() {
      const weather = buildWeatherFiles(new Date())
      for (const [file, body] of Object.entries(weather)) {
        this.emitFile({ type: 'asset', fileName: `${WEATHER_STUB_ROOT.slice(1)}/${file}`, source: JSON.stringify(body) })
      }
      for (const [file, body] of Object.entries(buildPhotoFiles())) {
        this.emitFile({ type: 'asset', fileName: `__stub/photos/${file}`, source: body })
      }
    },
  }
}

export default mergeConfig(baseConfig, defineConfig({
  root: repoRoot,
  envDir: here,
  plugins: [captureStubs()],
  resolve: {
    alias: {
      '@googlemaps/js-api-loader': path.join(here, 'stubs/google-maps-loader.js'),
    },
  },
  build: {
    outDir: path.join(here, 'out'),
    emptyOutDir: true,
  },
  server: { fs: { allow: [repoRoot] } },
}))
