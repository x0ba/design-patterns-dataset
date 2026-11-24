// @vitest-environment happy-dom
// Verification only (headless Chrome cannot start in the capture sandbox): renders the app's main
// screens with the seeded profile loaded into the store, and fails if any of them throws.
// Copied to frontend/src/ for the run by .ui-capture/render-check.sh, then removed.
import React, { act } from 'react'
import { describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync, readdirSync } from 'node:fs'
import { useStore } from './store/useStore.js'
import Home from './views/Home.jsx'
import Plan from './views/Plan.jsx'
import Stats from './views/Stats.jsx'
import History from './views/History.jsx'
import Measurements from './views/Measurements.jsx'
import Library from './views/Library.jsx'
import Journal from './views/Journal.jsx'
import Muscles from './views/Muscles.jsx'
import CheckIn from './views/CheckIn.jsx'
import Settings from './views/Settings.jsx'

const dir = process.env.SEED_DIR
const file = readdirSync(dir).find(f => /^state-.*\.json$/.test(f))
const state = JSON.parse(readFileSync(dir + '/' + file, 'utf8'))

const views = { Home, Plan, Stats, History, Measurements, Library, Journal, Muscles, Settings }  // CheckIn draws on a canvas, which happy-dom lacks

describe('seeded profile renders', () => {
  for (const [name, View] of Object.entries(views)) {
    it(name, async () => {
      globalThis.IS_REACT_ACT_ENVIRONMENT = true
      const original = useStore.getState().S
      useStore.setState({ S: { ...original, ...state } })
      const host = document.createElement('div')
      document.body.appendChild(host)
      const root = createRoot(host)
      await act(async () => root.render(<MemoryRouter><View /></MemoryRouter>))
      await act(async () => { await new Promise(r => setTimeout(r, 300)) })
      const text = host.textContent.replace(/\s+/g, ' ')
      process.stderr.write(`--- ${name} (${text.length} chars)\n` + text.slice(0, 900) + "\n")
      expect(text.length).toBeGreaterThan(50)
      act(() => root.unmount())
    })
  }
})
