// Builds the trip document an established planning group would have after ~3
// months of use: the app's own seeded document, plus dozens of checklist tasks,
// extra meals/activities, edited expenses, notes and edit history from the three
// families. Written into localStorage (the app's persistence layer) by seed.js.
import { createInitialTripDocument, makeEntityKey } from '../../src/tripModel'

export const SEED_VERSION = '2026-11-16.2'
export const VIEWER_PROFILE = { familyId: 'silver-peak' }

const P = 'north-star' // Parkers (LA)
const J = 'silver-peak' // Jiangs (SF)
const R = 'desert-bloom' // Riveras (Reno)

// Deterministic pseudo-random so the seed is stable between builds.
let s = 20260409
const rand = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)

// Planning happened between mid-January and the trip (Apr 9-12, 2026).
const PLAN_START = Date.parse('2026-01-14T19:20:00-08:00')
const PLAN_END = Date.parse('2026-04-08T22:40:00-07:00')
function stamp(progress) {
  const t = PLAN_START + (PLAN_END - PLAN_START) * Math.min(Math.max(progress, 0), 1)
  const jitter = (rand() - 0.5) * 36 * 3600 * 1000
  return new Date(Math.min(t + jitter, PLAN_END)).toISOString()
}
const who = () => [P, J, J, R, P][Math.floor(rand() * 5)]

// [id, title, dayId, status, owner, links[], note, progress(0..1)]
const TASKS = [
  // Parkers
  ['task-p-oil', 'Oil change + tire rotation on the Highlander', 'thu', 'done', P, [['family', P]], 'Done at the Jiffy Lube on Los Feliz 3/28.', 0.82],
  ['task-p-carseat', 'Re-install car seat in 3rd row (booster for Mia)', 'thu', 'done', P, [['family', P]], '', 0.9],
  ['task-p-podcast', 'Download offline audiobooks + Bluey eps for the drive', 'thu', 'done', P, [['itineraryItem', 'north-star-drive']], 'Spotify offline is flaky past Bakersfield, use the iPad downloads', 0.95],
  ['task-p-grapevine', 'Check Grapevine / I-5 conditions Wed night', 'thu', 'done', P, [['itineraryItem', 'north-star-drive']], 'Caltrans QuickMap showed clear. Leave by 8:30am latest.', 0.99],
  ['task-p-cash', 'Get small bills for Oakdale + tips', 'thu', 'open', P, [['location', 'north-star-oakdale-break']], '', 0.97],
  ['task-p-houseplants', 'Neighbor waters plants + grabs mail', 'thu', 'done', P, [['family', P]], 'Asked Denise across the street. Spare key under the frog.', 0.7],
  ['task-p-smores', 'S’mores kit (grahams, Hershey’s, marshmallows x2)', 'thu', 'done', P, [['meal', 'thu-dinner']], '', 0.88],
  ['task-p-firepit', 'Confirm fire pit rules w/ HOA (no burn days?)', 'thu', 'open', P, [['stayItem', 'stay-basecamp']], 'Tuolumne County posts burn status daily. Check morning-of.', 0.93],
  ['task-p-kettleman', 'Call ahead re: Bravo Farms wait time', 'thu', 'open', P, [['location', 'north-star-kettleman-lunch']], '', 0.98],
  ['task-p-games', 'Pack board games (Ticket to Ride, Uno, Spot It)', 'fri', 'done', P, [['activity', 'fri-lake']], '', 0.74],
  ['task-p-sunscreen', 'Sunscreen + hats for lake day', 'fri', 'done', P, [['activity', 'fri-lake']], '', 0.8],
  ['task-p-checkout-trash', 'Trash + recycling run before checkout', 'sun', 'open', P, [['stayItem', 'stay-checkout-reset']], 'Bins go to the end of the driveway, NOT the street. per host msg', 0.96],
  // Jiangs
  ['task-j-cooler-ice', 'Ice for both coolers (2 bags each) in Oakdale', 'thu', 'open', J, [['location', 'north-star-oakdale-break']], 'Save Mart on F St if Oakdale Cheese is out', 0.97],
  ['task-j-coffee', 'Bring the pour-over setup + 2 bags of beans', 'fri', 'done', J, [['meal', 'fri-breakfast']], 'House only has a Keurig apparently', 0.72],
  ['task-j-pancake', 'Pancake mix, maple syrup, blueberries for Fri breakfast', 'fri', 'done', J, [['meal', 'fri-breakfast']], '', 0.86],
  ['task-j-bay-bridge', 'Leave SF before 10am to beat Bay Bridge + 580', 'thu', 'done', J, [['itineraryItem', 'silver-peak-drive']], '', 0.99],
  ['task-j-ev', 'Charge the Model Y to 100% Wed night', 'thu', 'done', J, [['itineraryItem', 'silver-peak-drive']], 'Supercharger in Manteca as backup. Groveland has one L2 at the hotel only.', 0.98],
  ['task-j-firstaid', 'Restock first aid kit (children’s Tylenol, bandaids, tweezers)', 'fri', 'done', J, [['family', J]], '', 0.66],
  ['task-j-paddle', 'Borrow paddleboard + pump from Kevin', 'fri', 'done', J, [['activity', 'fri-lake']], 'Picked up 4/4. Fits on roof rack w/ the foam blocks.', 0.92],
  ['task-j-lifejackets', 'Kid life jackets (Theo needs a size up)', 'fri', 'done', J, [['activity', 'fri-lake']], 'REI had the 30-50lb one on sale', 0.84],
  ['task-j-splitwise', 'Reconcile shared expenses after the trip', 'sun', 'open', J, [['expense', 'groceries']], 'Venmo requests by the following Fri', 0.94],
  ['task-j-photos', 'Make a shared Google Photos album', 'sun', 'open', J, [['family', J]], '', 0.9],
  ['task-j-sat-breakfast', 'Overnight oats + hard-boiled eggs for Sat early start', 'sat', 'done', J, [['activity', 'sat-yosemite']], 'Make Fri night so nobody cooks at 6am', 0.95],
  // Riveras
  ['task-r-chains', 'Throw tire chains in the trunk (just in case on 120)', 'fri', 'done', R, [['itineraryItem', 'desert-bloom-drive']], 'Probably not needed in April but Sonora Pass is still closed so we’re coming 395 > 108?? confirm', 0.89],
  ['task-r-route', 'Decide Reno route: 395 → 108 vs I-80 → Sac → 120', 'fri', 'done', R, [['itineraryItem', 'desert-bloom-drive']], 'Sonora Pass (108) and Tioga (120 E) both still closed for the season. Going via Carson + 88/49 instead. ~5h.', 0.86],
  ['task-r-pto', 'Confirm Friday PTO', 'fri', 'done', R, [['family', R]], '', 0.4],
  ['task-r-dog', 'Dog sitter for Biscuit Thu-Sun', 'fri', 'done', R, [['family', R]], 'Rover booking #2291 — Kayla, $55/night', 0.6],
  ['task-r-propane', 'Fill propane tank for the grill', 'sat', 'open', R, [['meal', 'sat-dinner']], 'Groveland Hardware fills tanks, closes 5pm', 0.97],
  ['task-r-bear', 'Bear canister / lock-up plan for food in cars at Yosemite', 'sat', 'done', R, [['activity', 'sat-yosemite']], 'Use the lockers at the trailhead. Nothing scented in the car, incl. car seats crumbs lol', 0.91],
  ['task-r-binoculars', 'Pack binoculars + kid scavenger hunt cards', 'sat', 'done', R, [['activity', 'sat-yosemite']], '', 0.8],
  ['task-r-arrival-text', 'Text group when past Jamestown', 'fri', 'open', R, [['itineraryItem', 'desert-bloom-drive']], '', 0.99],
  ['task-r-rain', 'Rain shells for everyone (Sat showers forecast)', 'sat', 'open', R, [['activity', 'sat-yosemite']], 'Forecast keeps flip-flopping. Pack them regardless.', 0.99],
  // Shared / unassigned
  ['task-s-reservation', 'Yosemite entry reservation for Sat 4/11', 'sat', 'done', null, [['activity', 'sat-yosemite']], 'Not required in April this year per NPS site — just pay at gate. Pass covers all 3 cars if we carpool to 2.', 0.55],
  ['task-s-annual-pass', 'Who has the America the Beautiful pass?', 'sat', 'done', null, [['expense', 'parking']], 'Parkers have it (exp 8/26).', 0.62],
  ['task-s-carpool', 'Saturday carpool: 3 cars → 2', 'sat', 'open', null, [['activity', 'sat-yosemite']], 'Highlander (7 seats) + Model Y. Riveras ride w/ Parkers.', 0.97],
  ['task-s-trail', 'Pick the kid hike (Lower Yosemite Fall vs Bridalveil)', 'sat', 'done', null, [['activity', 'sat-yosemite']], 'Lower Yosemite Fall loop — 1 mi, paved, stroller ok. Bridalveil as backup.', 0.78],
  ['task-s-grocery-list', 'Shared grocery list in the notes app', 'fri', 'done', null, [['task', 'task-grocery-run']], '', 0.5],
  ['task-s-wifi', 'Ask host for wifi + gate code', 'thu', 'done', null, [['stayItem', 'stay-gate-access']], 'Got it via Airbnb msgs 4/6. Not putting it here.', 0.96],
  ['task-s-quiet-hours', 'Read house rules (quiet hrs 10pm, no parking on street)', 'thu', 'done', null, [['stayItem', 'stay-basecamp']], '', 0.3],
  ['task-s-group-chat', 'Start the group chat', 'all', 'done', null, [], '', 0.02],
  ['task-s-dates', 'Lock dates (spring break week overlap)', 'all', 'done', null, [], 'Thu 4/9 - Sun 4/12. Riveras can only do Fri.', 0.05],
  ['task-s-book', 'Book the house', 'all', 'done', null, [['expense', 'airbnb']], 'Booked 1/22. Free cancel until 3/10.', 0.1],
  ['task-s-budget', 'Agree rough budget per family', 'all', 'done', null, [['expense', 'airbnb']], '~$700/family all-in excluding gas', 0.14],
  ['task-s-sunday-lunch', 'Sunday lunch on the road? (Oakdale again?)', 'sun', 'open', null, [['activity', 'sun-home']], '', 0.98],
  ['task-s-late-checkout', 'Ask host about 12pm late checkout', 'sun', 'open', null, [['stayItem', 'stay-checkout-reset']], 'asked, waiting', 0.99],
  ['task-s-towels', 'Beach towels — does the house have them?', 'fri', 'done', null, [['activity', 'fri-lake']], 'Yes, in the garage closet per the listing.', 0.6],
  ['task-s-marina', 'Marina beach day pass for non-members?', 'fri', 'open', null, [['location', 'pine-lake-beach']], 'Guest pass comes from the host. $10/person?? need to confirm', 0.95],
  ['task-s-movie', 'Movie night pick (Fri)', 'fri', 'open', null, [['meal', 'fri-dinner']], 'kids vote: Moana 2 vs Wild Robot', 0.99],
]

const EXTRA_MEALS = [
  {
    id: 'thu-road-lunch-sf', title: 'Oakdale Cheese picnic lunch', dayId: 'thu', startSlot: 2.1, status: 'Assigned', owner: 'Jiangs',
    reservationType: 'Road stop', timeLabel: '12:30 PM', locationId: 'north-star-oakdale-break',
    note: 'Grilled cheese + gouda samples at the picnic tables. Theo wants to see the goats again.', taskIds: ['task-j-cooler-ice'],
  },
  {
    id: 'thu-road-lunch-la', title: 'Bravo Farms lunch', dayId: 'thu', startSlot: 1.95, status: 'Assigned', owner: 'Parkers',
    reservationType: 'Road stop', timeLabel: '11:45 AM', locationId: 'north-star-kettleman-lunch',
    note: 'Halfway point. Tri-tip sandwich, bathroom, 30 min max.', taskIds: ['task-p-kettleman'],
  },
  {
    id: 'thu-dessert', title: 'S’mores at the fire pit', dayId: 'thu', startSlot: 3.4, status: 'Pending', owner: 'Parkers',
    reservationType: 'Cook-in', timeLabel: '8:00 PM', locationId: 'pine-airbnb',
    note: 'Only if burn status allows. Otherwise stovetop s’mores, which the kids will still love.', taskIds: ['task-p-smores', 'task-p-firepit'],
  },
  {
    id: 'fri-snacks', title: 'Lake day snack bag', dayId: 'fri', startSlot: 5.5, status: 'Assigned', owner: 'Jiangs',
    reservationType: 'Pack-out', timeLabel: '11:00 AM', locationId: 'pine-lake-beach',
    note: 'Goldfish, clementines, cheese sticks, LaCroix. Keep it in the soft cooler.', taskIds: [],
  },
  {
    id: 'fri-riveras-arrival', title: 'Late lunch plate for Riveras', dayId: 'fri', startSlot: 6.3, status: 'Pending', owner: 'Shared',
    reservationType: 'Cook-in', timeLabel: '1:30 PM', locationId: 'pine-airbnb',
    note: 'They’ll arrive hungry around 1. Save leftovers from Grill lunch or make quesadillas.', taskIds: ['task-r-arrival-text'],
  },
  {
    id: 'sat-early-breakfast', title: 'Grab-and-go breakfast', dayId: 'sat', startSlot: 8.9, status: 'Assigned', owner: 'Jiangs',
    reservationType: 'Cook-in', timeLabel: '5:30 AM', locationId: 'pine-airbnb',
    note: 'Overnight oats, hard-boiled eggs, bananas. Coffee in thermoses. Out the door by 6.', taskIds: ['task-j-sat-breakfast'],
  },
  {
    id: 'sat-ice-cream', title: 'Degnan’s ice cream stop', dayId: 'sat', startSlot: 10.3, status: 'Pending', owner: 'Walk-in',
    reservationType: 'Treat', timeLabel: '2:00 PM', locationId: 'yosemite',
    note: 'Bribe for finishing the hike. Skip if the line is long.', taskIds: [],
  },
  {
    id: 'sun-road-lunch', title: 'Sunday lunch on the road', dayId: 'sun', startSlot: 14.2, status: 'Pending', owner: 'Each family',
    reservationType: 'Road stop', timeLabel: '12:30 PM', locationId: 'north-star-oakdale-break',
    note: 'Each family on their own. Jiangs + Parkers might overlap in Oakdale around 12:30.', taskIds: ['task-s-sunday-lunch'],
  },
]

const EXTRA_ACTIVITIES = [
  {
    id: 'activity-user-paddleboard', title: 'Paddleboard + kayak on Pine Mountain Lake', dayId: 'fri', window: 'Fri / 10:00 AM - 12:30 PM',
    status: 'Go', riskLevel: 'Low', weatherSensitivity: 'Medium', locationId: 'pine-lake-beach', taskIds: ['task-j-paddle', 'task-j-lifejackets'],
    description: 'One paddleboard (borrowed) and the marina’s rental kayaks. Adults rotate; kids stay in life jackets the whole time, no exceptions.',
    backup: 'If it’s windy, swap to the beach + sandcastles and skip the water.', note: 'Marina kayak rental opens at 10.',
  },
  {
    id: 'activity-user-golf', title: 'Sunset mini golf + playground', dayId: 'fri', window: 'Fri / 4:00 PM',
    status: 'Pending', riskLevel: 'Low', weatherSensitivity: 'Low', locationId: 'grill-pml', taskIds: [],
    description: 'Kids burn off energy near the country club while the Riveras settle in.',
    backup: 'Board games at the house.', note: 'not sure the mini golf is actually open in April — check',
  },
  {
    id: 'activity-user-tunnel-view', title: 'Tunnel View photo stop', dayId: 'sat', window: 'Sat / ~9:30 AM',
    status: 'Go', riskLevel: 'Low', weatherSensitivity: 'High', locationId: 'yosemite', taskIds: [],
    description: 'Quick group photo at Tunnel View on the way into the valley. 15 minutes, everyone out of the car, then go.',
    backup: 'If it’s socked in with clouds, do the photo at Valley View on the way out instead.', note: 'Bring the tripod. Parkers have the good camera.',
  },
  {
    id: 'activity-user-lower-falls', title: 'Lower Yosemite Fall loop', dayId: 'sat', window: 'Sat / 10:30 AM - 12:00 PM',
    status: 'Watch', riskLevel: 'Medium', weatherSensitivity: 'Medium', locationId: 'yosemite', taskIds: ['task-s-trail', 'task-r-rain'],
    description: 'Paved 1-mile loop, falls should be roaring in April. Spray at the bridge gets everyone soaked — rain shells on for that part.',
    backup: 'Cook’s Meadow boardwalk if the trail is jammed or it’s pouring.',
    note: 'Parking at Yosemite Falls lot fills by 10. Use the shuttle from Yosemite Village if needed.',
  },
  {
    id: 'activity-user-hetch-hetchy', title: 'Hetch Hetchy detour', dayId: 'sat', window: 'Sat / afternoon (optional)',
    status: 'Pending', riskLevel: 'High', weatherSensitivity: 'Medium', locationId: 'big-oak-flat', taskIds: [],
    description: 'Adds ~1.5 hrs round trip from Big Oak Flat. Gorgeous but probably too much for the kids after the valley.',
    backup: 'Skip it and get to Around The Horn earlier.', note: 'Parked idea. Revisit next trip.',
  },
  {
    id: 'activity-user-railtown', title: 'Railtown 1897 in Jamestown', dayId: 'sun', window: 'Sun / 11:30 AM (Jiangs only)',
    status: 'Pending', riskLevel: 'Low', weatherSensitivity: 'Low', locationId: null, taskIds: [],
    description: 'Theo is obsessed with trains. It’s basically on the way home via 108. Only if checkout goes smoothly.',
    backup: 'Straight home.', note: '',
  },
]

const EXPENSE_EDITS = {
  airbnb: { amount: 1486.42, payer: 'Parkers', settled: false, note: '3 nights @ $389 + $221 cleaning + taxes. Riveras only staying 2 nights but we said equal split anyway.', by: P, at: 0.12 },
  groceries: { amount: 318.67, payer: 'Jiangs', settled: false, note: 'Safeway SF $187.20 + Groveland Grocery $96.40 + Oakdale ice/snacks $35.07. Receipts in the group chat.', by: J, at: 0.995 },
  gas: { note: 'Each family covers its own. FYI: Parkers ~$140, Riveras ~$95, Jiangs ~$22 in Supercharging.', by: R, at: 0.99 },
  parking: { amount: 87, allocationMode: 'manual', split: 'Manual allocation', allocations: { 'north-star': 35, 'silver-peak': 35, 'desert-bloom': 17 }, settled: false, note: 'Kayak rental $52 + marina guest passes $35. Riveras missed the kayaks so they only cover passes.', by: J, at: 0.995 },
}

const PAGE_NOTES = {
  itinerary: 'Mission priority: reduce Friday arrival chaos and make Saturday easy on the kids.\n\nUpdate 4/7: Sonora Pass + Tioga still closed — Riveras coming the long way (88/49). Plan for ~1:30 PM arrival, not 1:00.',
  stay: 'Need one clean arrival protocol so the first family is not doing all the setup work. Gate code + wifi are in the Airbnb thread (not here!). First family in: turn on water heater, check fire pit status.',
  meals: 'Thursday = pizza in Groveland, Friday = Grill lunch + cook-in dinner, Saturday = packed lunch in the park + Around The Horn on the way back. Sunday brunch at the house then everyone’s on their own.\n\nAllergies: Theo — tree nuts. Mia — none. Riveras’ Sofia is vegetarian.',
  activities: 'Yosemite is the headline day, but Friday should stay easy and Saturday should read as one clean outbound and one clean return. Don’t overschedule. Naps are a real constraint.',
  expenses: 'Keep this light. Shared visibility matters more than perfect accounting. Jiangs will Venmo-request everyone after we’re home.',
  families: 'Each family should know its task package before Thursday morning. Riveras: you own Saturday grill + park bags. Parkers: firewood + first-night open. Jiangs: coolers, breakfasts, lake gear.',
}

const FAMILY_EDITS = {
  [P]: { responsibility: 'Firewood, s’mores + first-night open', note: 'Lead family for Thursday arrival setup and first-night basecamp opening. Leaving Los Feliz 8:15 AM.', by: P, at: 0.97 },
  [J]: { responsibility: 'Coolers, breakfasts + lake gear', note: 'Strongest readiness posture. Good fallback family for floating support tasks. Model Y — charge at Manteca if <40%.', by: J, at: 0.98 },
  [R]: { responsibility: 'Grill kit, Saturday lunch + park bags', note: 'Friday arrival handoff is the main coordination wrinkle. Sonora Pass still closed, coming via 88/49.', by: R, at: 0.93 },
}

const STAY_NOTES = {
  'stay-basecamp': ['Everything gets easier if arrival protocol and room assignments are decided before wheels-up. Water heater switch is in the garage.', P, 0.94],
  'stay-room-assignments': ['Room 1 Parkers (king), Room 2 Jiangs (queen + pack n play), Room 3 Riveras (queen + bunk). Kids may all end up in the bunk room anyway.', J, 0.88],
  'stay-checkout-reset': ['Do the annoying part on Saturday night. Dishwasher run Sat night, strip beds Sun AM, towels in the tub per host.', P, 0.96],
}

export function buildSeedDocument() {
  const doc = createInitialTripDocument()

  // Existing checklist items: realistic progress just before departure.
  const existingStatus = {
    'task-road-snacks': 'done', 'task-firewood': 'open', 'task-lake-gear': 'done', 'task-breakfast-fruit': 'done',
    'task-kids-shoes': 'done', 'task-charger': 'open', 'task-late-arrival': 'open', 'task-grill-kit': 'done',
    'task-yosemite-daypacks': 'open', 'task-park-docs': 'done', 'task-gate-access': 'done', 'task-room-assignments': 'done',
    'task-grocery-run': 'open', 'task-cabin-reset': 'open', 'task-pack-yosemite-bags': 'open',
  }
  doc.tasks = doc.tasks.map((task, index) => ({
    ...task,
    status: existingStatus[task.id] || task.status,
    createdByFamilyId: task.ownerFamilyId || P,
    createdAt: stamp(0.05 + index * 0.02),
    lastEditedByFamilyId: task.ownerFamilyId || who(),
    lastEditedAt: stamp(0.85 + rand() * 0.15),
  }))

  const newTasks = TASKS.map(([id, title, dayId, status, owner, links, note, progress]) => {
    const creator = owner || who()
    return {
      id, type: 'task', title, dayId, status, ownerFamilyId: owner,
      linkedEntityKeys: links.map(([type, eid]) => makeEntityKey(type, eid)), note,
      createdByFamilyId: creator, createdAt: stamp(progress - 0.06),
      lastEditedByFamilyId: status === 'done' ? creator : who(), lastEditedAt: stamp(progress),
    }
  })
  doc.tasks = [...doc.tasks, ...newTasks]

  // Attach new tasks to the entities they reference, as addTask() would.
  const attach = (collection, type) => {
    doc[collection] = doc[collection].map((item) => {
      const ids = newTasks.filter((t) => t.linkedEntityKeys.includes(makeEntityKey(type, item.id))).map((t) => t.id)
      return ids.length ? { ...item, taskIds: [...new Set([...(item.taskIds || []), ...ids])] } : item
    })
  }

  doc.meals = [
    ...doc.meals,
    ...EXTRA_MEALS.map((m) => ({ type: 'meal', linkedEntityKeys: [], createdByFamilyId: who(), createdAt: stamp(0.4 + rand() * 0.4), lastEditedByFamilyId: who(), lastEditedAt: stamp(0.85 + rand() * 0.14), ...m })),
  ].sort((a, b) => a.startSlot - b.startSlot)
  doc.activities = [
    ...doc.activities,
    ...EXTRA_ACTIVITIES.map((a) => ({ type: 'activity', linkedEntityKeys: [], createdByFamilyId: who(), createdAt: stamp(0.3 + rand() * 0.5), lastEditedByFamilyId: who(), lastEditedAt: stamp(0.8 + rand() * 0.19), ...a })),
  ]
  ;[['meals', 'meal'], ['activities', 'activity'], ['stayItems', 'stayItem'], ['locations', 'location'], ['itineraryItems', 'itineraryItem']].forEach(([c, t]) => attach(c, t))

  doc.expenses = doc.expenses.map((expense) => {
    const edit = EXPENSE_EDITS[expense.id]
    if (!edit) return expense
    const { by, at, ...fields } = edit
    return { ...expense, ...fields, createdByFamilyId: by, createdAt: stamp(at - 0.1), lastEditedByFamilyId: by, lastEditedAt: stamp(at) }
  })

  doc.families = doc.families.map((family) => {
    const edit = FAMILY_EDITS[family.id]
    const { by, at, ...fields } = edit
    const owned = doc.tasks.filter((t) => t.ownerFamilyId === family.id)
    const readiness = Math.round((owned.filter((t) => t.status === 'done').length / Math.max(owned.length, 1)) * 100)
    return { ...family, ...fields, readiness, taskIds: owned.map((t) => t.id), lastEditedByFamilyId: by, lastEditedAt: stamp(at) }
  })

  doc.stayItems = doc.stayItems.map((item) => {
    const edit = STAY_NOTES[item.id]
    return edit ? { ...item, note: edit[0], lastEditedByFamilyId: edit[1], lastEditedAt: stamp(edit[2]) } : item
  })

  doc.pageNotes = { ...doc.pageNotes, ...PAGE_NOTES }
  doc.pageNoteMeta = {
    itinerary: { updatedByFamilyId: R, updatedAt: stamp(0.97) },
    stay: { updatedByFamilyId: P, updatedAt: stamp(0.9) },
    meals: { updatedByFamilyId: J, updatedAt: stamp(0.95) },
    activities: { updatedByFamilyId: P, updatedAt: stamp(0.7) },
    expenses: { updatedByFamilyId: J, updatedAt: stamp(0.99) },
    families: { updatedByFamilyId: J, updatedAt: stamp(0.92) },
  }

  doc.selection = { type: 'activity', id: 'sat-yosemite' }
  doc.ui = { ...doc.ui, timeline: { ...doc.ui.timeline, cursorSlot: 6.5 } }
  return doc
}
