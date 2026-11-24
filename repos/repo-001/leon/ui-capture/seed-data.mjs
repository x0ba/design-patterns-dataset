// Realistic content for one owner (a product designer in Lyon who also codes)
// after ~7 months with Leon. Consumed by seed.mjs.

export const WORKSPACES = [
  {
    name: 'Kitchen renovation',
    color: 'orange',
    pinned: true,
    daysAgo: 118,
    brief: 'Renovating the kitchen at Rue Saint-Georges. Budget €14,500 incl. VAT. Contractor: Atelier Morel (Julien). Cabinets from IKEA Metod, oak fronts from Plykea. Works planned 12 Jan – 6 Feb.',
    resources: [
      { kind: 'folder', label: 'Quotes & plans', location: '/Users/camille/Documents/Maison/Cuisine' },
      { kind: 'link', label: 'Plykea order', location: 'https://www.plykea.com/account/orders' }
    ]
  },
  {
    name: 'Trailhead — hiking app',
    color: 'green',
    daysAgo: 160,
    brief: 'Side project: offline-first hiking companion (React Native + SQLite). Current focus: GPX import, elevation profile, and battery usage while tracking.',
    resources: [
      { kind: 'folder', label: 'trailhead', location: '/Users/camille/Code/trailhead' },
      { kind: 'link', label: 'GitHub', location: 'https://github.com/camille-dev/trailhead' }
    ]
  },
  {
    name: 'Lisbon — March trip',
    color: 'teal',
    daysAgo: 41,
    brief: 'Long weekend in Lisbon with Inès, 12–16 March. Flights booked (LYS → LIS, TAP). Still to do: apartment in Alfama or Graça, Sintra day trip, restaurant list.',
    resources: [
      { kind: 'link', label: 'Shared itinerary', location: 'https://docs.google.com/document/d/lisbon-march' }
    ]
  },
  {
    name: 'Atelier Brun — website',
    color: 'violet',
    daysAgo: 74,
    brief: 'Freelance: new website for Atelier Brun (ceramics studio). Astro + Tailwind, Shopify Buy Button for the shop. Deadline 15 Dec. Contact: Margaux Brun.',
    resources: [
      { kind: 'folder', label: 'atelier-brun-site', location: '/Users/camille/Code/clients/atelier-brun-site' },
      { kind: 'link', label: 'Figma', location: 'https://www.figma.com/file/atelier-brun' }
    ]
  },
  {
    name: 'Half marathon training',
    color: 'blue',
    daysAgo: 133,
    brief: 'Training for Run in Lyon half marathon. Goal: sub 1:50. Long runs Sunday, intervals Wednesday along the quais.',
    resources: []
  }
]

const weatherLyon = {
  location: { name: 'Lyon', country: 'France', latitude: 45.764, longitude: 4.8357, timezone: 'Europe/Paris' },
  current: { temperature: 9.4, apparentTemperature: 7.1, weather: 'Light rain', windSpeedKmh: 14, humidity: 87 },
  daily: [
    { date: 'today', min: 6.2, max: 12.8, precipitationMm: 3.4, precipitationProbability: 80, weather: 'Rain showers' },
    { date: 'tomorrow', min: 4.9, max: 13.6, precipitationMm: 0.2, precipitationProbability: 15, weather: 'Partly cloudy' }
  ]
}

// Rich, hand-written sessions.
const RICH = [
  {
    title: 'Morning weather and umbrella', daysAgo: 0, hour: 7, generatedTitle: true,
    turns: [{
      q: 'Do I need an umbrella today?',
      tools: [{ name: 'weather.openmeteo.getWeather', title: 'Check the forecast for Lyon', input: { location: 'Lyon, France', days: 2 }, output: weatherLyon, ms: 640 }],
      a: 'Yes — take it. Lyon has **light rain right now (9 °C)** and showers are likely until mid‑afternoon (80 %, about 3 mm). It should dry out by the evening, and tomorrow looks much nicer: partly cloudy, up to 14 °C.'
    }, {
      q: 'ok and is it good for my run tomorrow morning?',
      a: 'Tomorrow morning looks good for a run: around 5–6 °C at 7 am, dry, light wind from the north. Wear a long‑sleeve layer for the first 2 km — you will warm up quickly along the quais.'
    }]
  },
  {
    title: 'Cabinet layout for the kitchen', daysAgo: 1, hour: 21, workspace: 'Kitchen renovation', pinned: true,
    turns: [{
      q: 'Can you read the latest plan Julien sent and tell me if the dishwasher placement works with the corner unit?',
      plan: ['Find the latest plan', 'Read the cabinet schedule', 'Check clearances'],
      reasoning: 'The owner wants a clearance check. I should find the most recent plan in the workspace folder, read the cabinet schedule, then compare the dishwasher door swing with the corner carousel.',
      tools: [
        { name: 'file_system.zvec_grep.search', title: 'Search the workspace for the latest plan', planStep: 1, input: { query: 'plan cuisine v4 lave-vaisselle', path: '/Users/camille/Documents/Maison/Cuisine' }, output: { matches: [{ path: '/Users/camille/Documents/Maison/Cuisine/Plan_cuisine_v4_Morel.pdf', score: 0.91 }, { path: '/Users/camille/Documents/Maison/Cuisine/Devis_Morel_2026-10-28.pdf', score: 0.62 }] } },
        { name: 'file_system.file.read', title: 'Read the cabinet schedule', planStep: 2, input: { path: '/Users/camille/Documents/Maison/Cuisine/cabinets.md' }, output: { path: '/Users/camille/Documents/Maison/Cuisine/cabinets.md', content: '# Cabinet schedule (v4)\n\n| # | Unit | Width | Notes |\n|---|------|-------|-------|\n| 1 | Corner carousel | 128 cm | blind corner, left |\n| 2 | Dishwasher (integrated) | 60 cm | next to sink |\n| 3 | Sink base | 80 cm | double bowl |\n| 4 | Drawers ×3 | 60 cm | |\n| 5 | Oven tower | 60 cm | |\n', contentHash: 'b7a1e0c2' } }
      ],
      a: 'It works, but only just. In **plan v4** the dishwasher (unit 2) sits directly next to the corner carousel (unit 1). With a standard 60 cm door, the open dishwasher door will block the carousel for about **5 cm** of its swing.\n\nTwo easy fixes:\n\n1. Add a **5 cm filler** between the corner unit and the dishwasher — cheapest, and Julien already has oak filler panels on the order.\n2. Swap the dishwasher and the sink base (units 2 and 3) — cleaner, but the plumbing moves 80 cm to the right.\n\nI would go with the filler. Want me to draft a short message to Julien?'
    }, {
      q: 'yes please, keep it short and friendly',
      a: 'Here you go:\n\n> Bonjour Julien, merci pour le plan v4 ! Petit point : la porte du lave‑vaisselle bloque un peu le carrousel d’angle. Est‑ce qu’on peut ajouter une fileuse de 5 cm en chêne entre les deux ? Bonne soirée, Camille'
    }]
  },
  {
    title: 'Fix GPX import crash on long tracks', daysAgo: 2, hour: 22, workspace: 'Trailhead — hiking app',
    turns: [{
      q: 'The GPX import crashes on tracks with more than ~20k points. Can you look at src/import/gpx.ts and find out why?',
      plan: ['Read the importer', 'Reproduce with the large sample', 'Patch and run tests'],
      tools: [
        { name: 'file_system.file.read', title: 'Read the GPX importer', planStep: 1, input: { path: '/Users/camille/Code/trailhead/src/import/gpx.ts' }, output: { path: '/Users/camille/Code/trailhead/src/import/gpx.ts', content: "export async function importGpx(xml: string, db: Database) {\n  const points = parseTrackPoints(xml)\n  const values = points.map((p) => `(${p.lat}, ${p.lon}, ${p.ele ?? 'NULL'}, ${p.time})`)\n  await db.execAsync(`INSERT INTO track_points (lat, lon, ele, time) VALUES ${values.join(',')}`)\n}\n", contentHash: '91c4d2' } },
        { name: 'operating_system_control.shell.executeCommand', title: 'Run the importer test with the large sample', planStep: 2, input: { command: 'pnpm vitest run src/import/gpx.test.ts', cwd: '/Users/camille/Code/trailhead' }, output: { exitCode: 1 }, commandOutput: ' FAIL  src/import/gpx.test.ts > imports the Tour du Mont Blanc sample (24,318 points)\nError: too many SQL variables\n    at Statement.run (node_modules/expo-sqlite/build/SQLiteStatement.js:88:13)\n\n Test Files  1 failed (1)\n      Tests  1 failed | 6 passed (7)\n' },
        { name: 'file_system.file.patch', title: 'Insert points in batches', planStep: 3, input: { path: '/Users/camille/Code/trailhead/src/import/gpx.ts' }, output: { changed: true, diff: "-  const values = points.map((p) => `(${p.lat}, ${p.lon}, ${p.ele ?? 'NULL'}, ${p.time})`)\n-  await db.execAsync(`INSERT INTO track_points (lat, lon, ele, time) VALUES ${values.join(',')}`)\n+  const insert = await db.prepareAsync('INSERT INTO track_points (lat, lon, ele, time) VALUES (?, ?, ?, ?)')\n+  await db.withTransactionAsync(async () => {\n+    for (const p of points) {\n+      await insert.executeAsync([p.lat, p.lon, p.ele ?? null, p.time])\n+    }\n+  })\n+  await insert.finalizeAsync()" } },
        { name: 'operating_system_control.shell.executeCommand', title: 'Run the importer tests again', planStep: 3, input: { command: 'pnpm vitest run src/import/gpx.test.ts', cwd: '/Users/camille/Code/trailhead' }, output: { exitCode: 0 }, commandOutput: ' ✓ src/import/gpx.test.ts (7 tests) 1843ms\n\n Test Files  1 passed (1)\n      Tests  7 passed (7)\n' }
      ],
      a: 'Found it. The importer built **one giant `INSERT … VALUES (…),(…)` statement** for every point. Past roughly 20k points SQLite hits its limit and throws `too many SQL variables`.\n\nI changed it to a prepared statement inside a single transaction, which is both safe and fast:\n\n```ts\nconst insert = await db.prepareAsync(\n  \'INSERT INTO track_points (lat, lon, ele, time) VALUES (?, ?, ?, ?)\'\n)\nawait db.withTransactionAsync(async () => {\n  for (const p of points) {\n    await insert.executeAsync([p.lat, p.lon, p.ele ?? null, p.time])\n  }\n})\nawait insert.finalizeAsync()\n```\n\nAll 7 importer tests pass now, including the Tour du Mont Blanc sample (24,318 points) in about 1.8 s.'
    }]
  },
  {
    title: 'Sintra day trip logistics', daysAgo: 3, hour: 13, workspace: 'Lisbon — March trip',
    turns: [{
      q: 'What is the easiest way to do Sintra as a day trip from Lisbon without a car? We want Pena and Quinta da Regaleira.',
      tools: [{ name: 'search_web.hosted.searchWeb', title: 'Search Sintra day trip transport', input: { query: 'Lisbon to Sintra train Rossio 434 bus Pena Palace tickets 2027' }, output: { results: [{ title: 'Sintra line — CP Comboios de Portugal', url: 'https://www.cp.pt/passageiros/en/train-times', snippet: 'Trains from Rossio every 20 minutes, about 40 minutes to Sintra.' }, { title: 'Parques de Sintra — tickets', url: 'https://www.parquesdesintra.pt/en/', snippet: 'Timed entry to Pena Palace; book online in advance.' }] } }],
      a: 'Simplest plan:\n\n1. **Train from Rossio** to Sintra — every ~20 min, about 40 min, a few euros with a Navegante card.\n2. Walk 10 min to **Quinta da Regaleira** first (opens 9:30) — the initiation well is quieter early.\n3. Take the **434 bus** (or a tuk‑tuk) up to **Pena**. Book a timed Pena ticket for around 13:00 on the Parques de Sintra site.\n4. Back down for a late lunch and *travesseiros* at Piriquita, then the train home.\n\nAvoid Saturdays if you can — the 434 queue can take 45 minutes.'
    }]
  },
  {
    title: 'Hero section copy for Atelier Brun', daysAgo: 4, hour: 10, workspace: 'Atelier Brun — website',
    turns: [{
      q: 'Margaux wants the homepage hero to feel calm and handmade, not salesy. Give me 3 headline + subline options in French and English.',
      a: '**1. Calm**\n- FR : *Des pièces façonnées à la main, à Lyon.* — Grès et porcelaine, cuits en petites séries.\n- EN : *Pieces shaped by hand, in Lyon.* — Stoneware and porcelain, fired in small batches.\n\n**2. Process**\n- FR : *Du tour à votre table.* — Chaque bol porte la trace de l’atelier.\n- EN : *From the wheel to your table.* — Every bowl carries a trace of the studio.\n\n**3. Slow**\n- FR : *Prendre le temps de la terre.* — Céramiques utilitaires, pensées pour durer.\n- EN : *Taking the time clay needs.* — Everyday ceramics, made to last.\n\nMy pick is #2: it is concrete and leads naturally into the shop section.'
    }, {
      q: 'love #2. can you also suggest alt text for the hero photo (Margaux at the wheel, hands covered in clay)?',
      a: 'FR : « Margaux Brun tourne un bol au tour de potier, les mains couvertes d’argile. »\nEN : "Margaux Brun throwing a bowl on the potter’s wheel, her hands covered in clay."'
    }]
  },
  {
    title: 'Interval session for Wednesday', daysAgo: 5, hour: 19, workspace: 'Half marathon training',
    turns: [{
      q: 'Plan my Wednesday interval session. Current 10k is 49:30, goal half is sub 1:50.',
      a: 'Here is a solid session for where you are:\n\n| Block | Distance | Pace |\n|---|---|---|\n| Warm‑up | 2 km easy | 5:50–6:10 /km |\n| Strides | 4 × 20 s | relaxed fast |\n| Main | **5 × 1 km** | **4:45 /km** |\n| Recovery | 2 min jog between | easy |\n| Cool‑down | 1.5 km | easy |\n\nThat is about 9.5 km total. The 1 km reps sit a little faster than your 10k pace, which builds the speed reserve you need to hold 5:12 /km for the half.'
    }]
  },
  {
    title: 'Contractor quote comparison', daysAgo: 9, hour: 20, workspace: 'Kitchen renovation',
    turns: [{
      q: 'Compare the three quotes in the Cuisine folder. Which one is the best value?',
      plan: ['Find the quotes', 'Extract totals and scope', 'Compare'],
      tools: [
        { name: 'file_system.ripgrep.search', title: 'Find the quotes', planStep: 1, input: { pattern: 'Total TTC', path: '/Users/camille/Documents/Maison/Cuisine' }, output: { matches: [{ path: 'Devis_Morel_2026-10-28.pdf.txt', line: 'Total TTC : 12 840,00 €' }, { path: 'Devis_RenovPlus.pdf.txt', line: 'Total TTC : 11 960,00 €' }, { path: 'Devis_Cuisines_Lumiere.pdf.txt', line: 'Total TTC : 15 300,00 €' }] } }
      ],
      a: '| Contractor | Total incl. VAT | Includes electrics | Worktop | Duration |\n|---|---|---|---|---|\n| **Atelier Morel** | €12,840 | Yes | Oak, oiled | 4 weeks |\n| RénovPlus | €11,960 | No (+ ~€1,400) | Laminate | 3 weeks |\n| Cuisines Lumière | €15,300 | Yes | Quartz | 5 weeks |\n\nRénovPlus looks cheapest but once you add the electrical work it lands around **€13,360** — more than Morel, with a laminate worktop. **Atelier Morel is the best value**, and they are the only ones who mentioned dust protection for the living room.'
    }]
  },
  {
    title: 'Shopify Buy Button on Astro', daysAgo: 12, hour: 15, workspace: 'Atelier Brun — website',
    turns: [{
      q: 'How do I embed the Shopify Buy Button in an Astro component without it breaking on page transitions?',
      a: 'The Buy Button script mounts once and does not know about Astro’s view transitions, so re‑initialise it on `astro:page-load`:\n\n```astro\n---\nconst { productId } = Astro.props\n---\n<div class="buy-button" data-product-id={productId}></div>\n\n<script>\n  import { mountBuyButtons } from \'../lib/shopify\'\n  document.addEventListener(\'astro:page-load\', () => mountBuyButtons())\n</script>\n```\n\nIn `mountBuyButtons()`, create the client once (module scope) and only call `ui.createComponent(\'product\', …)` for nodes that do not have a `data-mounted` attribute yet. That avoids duplicate buttons when you navigate back.'
    }, {
      q: 'the cart drawer opens twice now',
      a: 'That is the same issue one level up: the cart toggle component is created on every page load. Create it only once — guard with a module‑level flag:\n\n```ts\nlet cartReady = false\nexport function mountBuyButtons() {\n  if (!cartReady) {\n    ui.createComponent(\'cart\', { moneyFormat: \'{{amount_with_comma_separator}} €\' })\n    cartReady = true\n  }\n  // …product buttons as before\n}\n```'
    }]
  },
  {
    title: 'Restaurants in Alfama and Graça', daysAgo: 15, hour: 22, workspace: 'Lisbon — March trip',
    turns: [{
      q: 'Short list of restaurants near Alfama/Graça, mix of tascas and one nicer dinner. Inès is vegetarian.',
      tools: [{ name: 'search_web.hosted.searchWeb', title: 'Search restaurants in Alfama and Graça', input: { query: 'best tasca Alfama Graça vegetarian options' }, output: { results: [{ title: 'Where to eat in Alfama', url: 'https://www.timeout.com/lisbon/restaurants/best-restaurants-in-alfama' }] } }],
      a: '- **Taberna Sal Grosso** (Alfama) — tiny, book ahead; grilled vegetables and great petiscos.\n- **O Pitéu da Graça** — classic tasca, cheap and loud; ask for the *migas* without meat.\n- **Ao 26 – Vegan Food Project** (Chiado, 15 min walk) — fully vegan, very good.\n- **Prado** — the nicer dinner: seasonal, lots of vegetables, natural wine. Reserve ~2 weeks ahead.\n\nI added these to the itinerary notes for 13 and 14 March.'
    }]
  },
  {
    title: 'Battery drain while tracking', daysAgo: 21, hour: 23, workspace: 'Trailhead — hiking app', pinned: true,
    turns: [{
      q: 'Users report ~18%/hour battery drain while tracking. What are the usual suspects with expo-location?',
      reasoning: 'Typical causes: highest accuracy setting, very short distance interval, foreground service waking the CPU, map re-rendering every location update. I should list them in order of impact and suggest measurements.',
      a: 'In order of impact:\n\n1. **`Accuracy.BestForNavigation`** keeps GPS fully on. For hiking, `Accuracy.High` with `distanceInterval: 10` is plenty.\n2. **`timeInterval` too short** — 1 s updates are overkill; 5 s is a good balance.\n3. **Re-rendering the map on every update.** Batch points and update the polyline at most every 5 s, and pause rendering when the screen is off.\n4. **Elevation lookups per point** — compute the profile once at the end instead.\n\nWith the first three changes, similar apps get down to roughly 6–8 %/hour. I would measure with a 30‑minute walk before/after on the same phone.'
    }]
  },
  {
    title: 'Long run pacing — 18 km', daysAgo: 26, hour: 8, workspace: 'Half marathon training',
    turns: [{
      q: 'Sunday long run is 18k. what pace, and should I practice gels?',
      a: 'Run it at **5:50–6:00 /km** — easy enough to chat. Yes, practise fuelling: one gel at **45 minutes** and another at **1h30**, with a few sips of water each time. Use the exact gel you plan to race with so race day has no surprises.'
    }]
  },
  {
    title: 'Electrical plan questions', daysAgo: 33, hour: 18, workspace: 'Kitchen renovation',
    turns: [{
      q: 'What should I ask the electrician before they start? Induction hob + oven + dishwasher on the same wall.',
      a: '- Dedicated circuits: **32 A** for the induction hob, **20 A** each for oven and dishwasher (NF C 15‑100).\n- Is the panel’s main breaker enough for everything running at once?\n- Where exactly will the sockets above the worktop go — at least 6 for a kitchen this size.\n- Under‑cabinet lighting: on a separate switch, and transformer accessible.\n- Will they issue the **Consuel** certificate at the end?'
    }]
  },
  {
    title: 'Invoice reminder to Studio Halle', daysAgo: 38, hour: 11, generatedTitle: false,
    turns: [{
      q: 'Draft a polite follow-up for invoice F-2026-031 (€2,400, due 30 days ago) to Studio Halle.',
      a: 'Subject: Invoice F‑2026‑031 — friendly reminder\n\nHi Thomas,\n\nI hope the launch went well! A quick note that invoice **F‑2026‑031** (€2,400), sent on 2 September, is now 30 days past its due date. I have attached it again for convenience.\n\nCould you let me know when payment is planned? Happy to resend anything your accounts team needs.\n\nBest,\nCamille'
    }]
  },
  {
    title: 'Elevation profile smoothing', daysAgo: 47, hour: 21, workspace: 'Trailhead — hiking app',
    turns: [{
      q: 'GPS elevation is super noisy, total ascent shows 2,100 m for a hike that is really ~1,300 m. How do I smooth it?',
      a: 'Two things together work well:\n\n1. **Smooth** with a moving median (window ~7 points) before anything else — it kills spikes without flattening real climbs.\n2. **Hysteresis** when summing ascent: only count a climb once it exceeds a threshold (≈ 3–5 m) since the last local minimum.\n\n```ts\nfunction totalAscent(elevations: number[], threshold = 4) {\n  let ascent = 0\n  let base = elevations[0]\n  for (const e of elevations) {\n    if (e - base >= threshold) { ascent += e - base; base = e }\n    else if (e < base) base = e\n  }\n  return ascent\n}\n```\n\nOn your sample track that gives about **1,340 m**.'
    }]
  },
  {
    title: 'Apartment options in Graça', daysAgo: 52, hour: 21, workspace: 'Lisbon — March trip',
    turns: [{
      q: 'Help me pick between these two apartments: (A) Graça, 2nd floor, view, €142/night, no lift. (B) Alfama, ground floor, €128/night, near Fado bars.',
      a: 'I would pick **A (Graça)**. The view is the whole point of staying up there, and Graça is quieter at night. You only have cabin bags, so no lift is fine. Alfama ground floors near fado bars can be loud until 1 am and a bit damp in March. The €56 difference over four nights is worth the sleep.'
    }]
  },
  {
    title: 'Contract clause about revisions', daysAgo: 70, hour: 16, workspace: 'Atelier Brun — website',
    turns: [{
      q: 'Write a clear clause for my freelance contract limiting design revisions to 2 rounds.',
      a: '**Révisions.** Le prix inclut deux (2) cycles de révisions sur les maquettes. Un cycle correspond à une liste consolidée de retours transmise en une seule fois. Les révisions supplémentaires sont facturées 65 € HT de l’heure, après accord écrit du client.\n\n*(EN) Revisions. The fee includes two (2) rounds of revisions on the mockups. A round is one consolidated list of feedback sent at once. Additional revisions are billed at €65/hour excl. VAT, subject to the client’s written approval.*'
    }]
  },
  {
    title: 'Knee pain after long run', daysAgo: 88, hour: 12, workspace: 'Half marathon training',
    turns: [{
      q: 'outside of my right knee hurts after 15k, sharp-ish, goes away after a day. IT band?',
      a: 'That pattern — pain on the **outside of the knee**, worse later in long runs, gone after rest — is very typical of **IT band syndrome**, but I cannot diagnose it. What usually helps:\n\n- Cut the long run back by 20–30 % for a week or two.\n- Strengthen hips: side planks, clamshells, single‑leg squats, 3× per week.\n- Check your shoes’ mileage; past ~700 km they often contribute.\n\nIf it becomes sharp during short runs, or swells, see a physio — Kiné Sport Croix‑Rousse had good reviews when you asked in July.'
    }]
  },
  {
    title: 'Sync conflict strategy', daysAgo: 104, hour: 22, workspace: 'Trailhead — hiking app',
    turns: [{
      q: 'For offline sync of saved trails, should I use last-write-wins or something smarter?',
      a: 'For saved trails, **last‑write‑wins per field** is enough: conflicts are rare (one person, a few devices) and the data is not collaborative. Keep an `updated_at` per field (or per small group of fields), and never LWW the track points themselves — those are immutable once recorded.\n\nCRDTs would be overkill unless you add shared trip planning later.'
    }]
  },
  {
    title: 'Paint colours for the kitchen', daysAgo: 115, hour: 17, workspace: 'Kitchen renovation',
    turns: [{
      q: 'Oak fronts, white worktop, terracotta floor. What wall colour?',
      a: 'With oak and terracotta already bringing warmth, keep the walls calm:\n\n- **Farrow & Ball “Shaded White”** — soft, slightly grey; the safest choice.\n- **Little Greene “Slaked Lime – Mid”** — warmer, lovely in evening light.\n- If you want colour: **“Treron”** (muted green) on one wall only.\n\nTest A4 swatches on two walls for a few days — north light will make the greens look cooler.'
    }]
  },
  {
    title: 'Welcome back', daysAgo: 205, hour: 9, generatedTitle: false,
    turns: [{
      q: 'Hi Leon! Just installed you. What can you do?',
      a: 'Hi! Nice to meet you. I can help with everyday things — weather, reminders, quick research, writing and translating — and with deeper work like reading files in folders you share with me, running commands, and helping you code. I remember useful details over time so you do not have to repeat yourself.\n\nA good start: tell me what you are working on this month.'
    }, {
      q: 'Mostly a hiking app side project and freelancing. Also training for a half marathon.',
      a: 'Great mix! I will keep that in mind. If you want, create a **workspace** for each — I can then keep their files and context separate and pick up where we left off.'
    }]
  },
  {
    title: 'Tool error — Lyon bike stations', daysAgo: 6, hour: 8,
    turns: [{
      q: 'Are there free Vélo\'v bikes at Place Sathonay right now?',
      tools: [{ name: 'search_web.crawlberg.fetchUrl', title: 'Open the Vélo’v station map', input: { url: 'https://velov.grandlyon.com/fr/mapping' }, error: 'The page did not respond within 15 seconds (timeout).', ms: 15_000 }],
      a: 'I could not reach the Vélo’v map — it timed out. The quickest check is the Vélo’v app, or the station screen itself. Usually Sathonay is busy around 8:30, so Terreaux (3 min walk) is a good backup.'
    }]
  }
]

// Shorter everyday sessions.
const SHORT = [
  ['Translate a thank-you note', 'Translate into French: "Thanks again for helping me move the sofa, I owe you dinner."', '« Merci encore de m’avoir aidée à déménager le canapé, je te dois un dîner ! »'],
  ['Remind me to call the bank', 'Remind me tomorrow at 9 to call the bank about the loan simulation', 'Done — I will remind you **tomorrow at 9:00** to call the bank about the loan simulation.'],
  ['Risotto without white wine', 'can I make mushroom risotto without white wine?', 'Yes. Replace the wine with the same amount of stock plus **1 tbsp lemon juice** or a splash of white wine vinegar for acidity, added right after toasting the rice.'],
  ['What is a good Git commit message', 'how do I write a good commit message for a refactor that also fixes a bug? should it be two commits', 'Ideally two commits: refactor first (no behaviour change), then the fix. If you must keep one, lead with the fix: `fix(import): handle tracks over 20k points` and mention the refactor in the body.'],
  ['Birthday gift for Inès', 'Ideas for Inès\'s birthday, she likes ceramics, natural wine, and hiking. Budget ~80€', '- A handmade mug set from Atelier Brun (you know the maker!)\n- A wine‑tasting evening at La Cave des Voyageurs\n- A lightweight Sea to Summit hiking cup + a trail guide of the Vercors\n\nThe tasting evening feels the most "you two".'],
  ['Convert 2.5 cups of flour', '2.5 cups flour in grams?', 'About **313 g** of all‑purpose flour (125 g per cup).'],
  ['Summarise the Ademe report', 'Summarise the Ademe report on home insulation in 3 bullets', '- Attics and roofs cause up to 30 % of heat loss — insulate them first.\n- Wall insulation from the outside performs best but costs 2–3× more.\n- MaPrimeRénov’ covers 40–90 % depending on income.'],
  ['Train strike tomorrow?', 'Is there a train strike tomorrow on the Lyon–Grenoble line?', 'SNCF lists **normal traffic** on Lyon Part‑Dieu ↔ Grenoble tomorrow. A regional strike notice exists for Friday, so check again Thursday evening.'],
  ['Typescript generic constraint', 'what does `T extends keyof U` mean in plain words', 'It means "T must be one of the property names of U". For `U = { a: 1, b: 2 }`, T can only be `\'a\'` or `\'b\'`.'],
  ['Quick dinner with leeks', 'I have leeks, eggs, and some comté. Dinner idea?', 'Leek and comté omelette: soften 2 sliced leeks in butter (8 min), pour in 4 beaten eggs, grate comté on top, fold. Ten minutes, very good with a green salad.'],
  ['Explain my electricity bill', 'Why is my EDF bill higher this month? 412 kWh vs 290 last month', 'Mostly heating: the first cold weeks started on 3 November, and 412 kWh is in line with a 45 m² flat with electric heaters. The tariff did not change. Lowering the heating by 1 °C saves about 7 %.'],
  ['Podcast recommendations', 'podcasts about design that are not too business-y', '- **99% Invisible** — design in everyday life\n- **Design Matters** — long interviews with designers\n- **Dezeen Agenda** — short weekly roundup\n- **Talking Shop (Radio France)** — crafts and makers, in French'],
  ['Pace calculator', 'what pace do I need for a 1:50 half', '**5:13 /km** (about 8:24 /mile).'],
  ['Spanish phrase for the hotel', 'how do I say "could we have a late check-out" in Portuguese', '« Seria possível fazermos o check‑out mais tarde? »'],
  ['Expo build fails on iOS', 'EAS build fails with "Pod install failed: CocoaPods could not find compatible versions for pod ExpoModulesCore"', 'Usually a stale lockfile. Run `npx expo install --fix`, delete `ios/Podfile.lock` (if you commit it), then rebuild with `eas build --clear-cache`.'],
  ['Watering the olive tree', 'how often should I water my balcony olive tree in winter?', 'Very little: every **2–3 weeks**, only when the top 5 cm of soil is dry. Overwatering in winter is the main risk.'],
  ['Write alt text for a product photo', 'alt text for a speckled blue stoneware bowl on a linen cloth', '"Speckled blue stoneware bowl resting on a natural linen cloth."'],
  ['Best time to visit Belém', 'when is Belém less crowded?', 'Weekday mornings right at opening (10:00), or after 16:30. Avoid Sunday mornings — Jerónimos is free for residents and very busy.'],
  ['Fix CSS grid overflow', 'my grid items overflow when text is long, using grid-template-columns: repeat(3, 1fr)', 'Use `repeat(3, minmax(0, 1fr))`. `1fr` has an implicit minimum of `auto`, so long words push the column wider.'],
  ['Book club pick', 'suggest a short novel for our book club, something we can discuss for 2 hours', '*Small Things Like These* by Claire Keegan — 110 pages, quietly devastating, lots to discuss about complicity and courage.'],
  ['Meeting notes cleanup', 'clean up these notes: margaux ok w/ palette, wants bigger product photos, shop launch moved 15/12 → 8/1, need shipping rates', '**Atelier Brun — call notes**\n- Palette approved ✅\n- Product photos: make them larger on listing pages\n- Shop launch moved from **15 Dec → 8 Jan**\n- To do: get shipping rates (Colissimo + Mondial Relay)'],
  ['Pressure cooker beans', 'how long for dried chickpeas in a pressure cooker, soaked', '**12–15 minutes** at high pressure, then natural release. Unsoaked: 35–40 minutes.'],
  ['Why is my sourdough flat', 'my sourdough spreads flat in the oven', 'Usually under‑developed gluten or over‑proofing. Try: one more set of stretch & folds, a shorter final proof (or cold proof overnight), and a tighter pre‑shape.'],
  ['Regex for French postcodes', 'regex for a French postcode', '`^(?:0[1-9]|[1-8]\\d|9[0-8])\\d{3}$` — five digits, rejects 00xxx and 99xxx.'],
  ['Weekend hike near Lyon', 'easy-ish hike near Lyon for Saturday, max 1h drive, ~12 km', '**Crêt de l’Œillon from Le Bessat** (Pilat): 12 km, ~450 m ascent, great views on clear days, 1h drive. Bring a layer — it is windy at the top.'],
  ['Explain UV index', 'what does UV index 3 mean', 'Moderate. Sunglasses and sunscreen if you are out for more than an hour around midday.'],
  ['Cancel gym membership letter', 'write a short letter to cancel my Fitness Park membership', 'Objet : Résiliation de mon abonnement\n\nMadame, Monsieur,\nJe vous informe de ma décision de résilier mon abonnement n° FP‑2241‑0918 à compter de ce jour, conformément aux conditions générales.\nMerci de me confirmer la date effective de fin de contrat.\nCordialement,\nCamille Martin'],
  ['Compare two running shoes', 'Novablast 5 vs Pegasus 42 for long runs?', 'Novablast 5 is bouncier and softer — nicer past 15 km. Pegasus 42 is firmer and more stable. For your long runs (and the IT band history), I would try the Novablast.'],
  ['How much to tip in Lisbon', 'tipping in restaurants in Portugal?', 'Not expected. Round up or leave **5–10 %** for good service in sit‑down restaurants; nothing in tascas or cafés.'],
  ['SQL window function', 'get each user\'s latest workout row in postgres', '```sql\nSELECT DISTINCT ON (user_id) *\nFROM workouts\nORDER BY user_id, started_at DESC;\n```'],
  ['Thanks', 'thanks leon 🙏', 'Anytime!'],
  ['Change the meeting time', 'Move my 3pm with Margaux to 4:30', 'Moved **“Atelier Brun — check-in”** from 15:00 to **16:30** today and let Margaux know.'],
  ['Defrost chicken safely', 'fastest safe way to defrost chicken breasts', 'Sealed bag in cold water, change the water every 30 minutes — about 1 hour for two breasts. Never on the counter.'],
  ['Name for the hiking app', 'other names for my hiking app than Trailhead? short, works in French and English', '- **Sente** (FR for a small path)\n- **Cairn**\n- **Balise**\n- **Ridge**\n\n"Cairn" works in both languages and is easy to remember.'],
  ['Figma auto layout question', 'in figma how do I make a frame hug contents vertically but fill horizontally', 'Select the frame → in Auto layout, set **Width: Fill container** and **Height: Hug contents**. The parent must also use auto layout.'],
  ['Inflation-adjusted rent', 'my rent is 780€, IRL went up 3.26%, what is the new max rent', '**€805.43** per month (780 × 1.0326).'],
  ['What to pack for Lisbon in March', 'packing list for Lisbon in March, 4 nights, cabin bag', '- Light rain jacket + a warm layer (14–19 °C)\n- Comfortable shoes with grip — the cobblestones are slippery\n- 2 trousers, 4 tops, 1 nicer outfit for Prado\n- Adapter not needed (same plugs)\n- Navegante card from the airport metro'],
  ['Is it a holiday on 11 Nov', 'is 11 November a public holiday in France', 'Yes — **Armistice Day**, a public holiday. Most shops are open, banks and post offices are closed.']
]

function shortSessions() {
  const workspaceHints = {
    'Name for the hiking app': 'Trailhead — hiking app',
    'Expo build fails on iOS': 'Trailhead — hiking app',
    'Write alt text for a product photo': 'Atelier Brun — website',
    'Meeting notes cleanup': 'Atelier Brun — website',
    'Change the meeting time': 'Atelier Brun — website',
    'Pace calculator': 'Half marathon training',
    'Compare two running shoes': 'Half marathon training',
    'Best time to visit Belém': 'Lisbon — March trip',
    'How much to tip in Lisbon': 'Lisbon — March trip',
    'What to pack for Lisbon in March': 'Lisbon — March trip',
    'Spanish phrase for the hotel': 'Lisbon — March trip'
  }
  // Spread over ~200 days, denser recently (people use assistants more once settled).
  return SHORT.map(([title, q, a], index) => {
    const t = index / SHORT.length
    const daysAgo = Math.round(Math.pow(t, 1.6) * 195) + (index % 3 === 0 ? 0 : 1)

    return {
      title, daysAgo, generatedTitle: index % 7 !== 0,
      ...(workspaceHints[title] ? { workspace: workspaceHints[title] } : {}),
      ...(title === 'Pace calculator' ? { pinned: true } : {}),
      turns: [{ q, a }]
    }
  })
}

export const SESSIONS = [...RICH, ...shortSessions()]
