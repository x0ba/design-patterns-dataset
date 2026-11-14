// Session log source: each expedition leaves Greyhollow (1004) and walks straight lines between waypoints.
export interface SessionSeed {
  n: number
  date: string
  title: string
  players: string[]
  waypoints: string[]
  summary: string
}

export const SESSION_SEEDS: SessionSeed[] = [
  { n: 1, date: '2025-09-13', title: 'The Miller’s Ghost', players: ['dev', 'aisha', 'mateo', 'nadia', 'tobias'],
    waypoints: ['0906', '0907'], summary: 'Opening session. Walked the south road to Marlow’s Mill, scouted the bank below it, and laid the miller’s ghost to rest for a sack of flour.' },
  { n: 2, date: '2025-09-27', title: 'Water from the Well', players: ['dev', 'aisha', 'nadia', 'ogechi'],
    waypoints: ['0902', '1001'], summary: 'Tested Saint Orrel’s Well. Ogechi drank twice and slept through the next watch.' },
  { n: 3, date: '2025-10-11', title: 'Steam on the Tarn', players: ['mateo', 'tobias', 'rhys', 'priya'],
    waypoints: ['0803', '0604'], summary: 'Bellwether Farm’s bell rang in clear weather. Followed the sound to Kettle Tarn; sighted standing stones through the trees to the west.' },
  { n: 4, date: '2025-10-25', title: 'Alms for the Road', players: ['priya', 'dev', 'nadia', 'kofi'],
    waypoints: ['1304', '1303'], summary: 'Followed the Pilgrim’s Road east to Pilgrims’ Rest. Brother Anselm told them of a brass dome and a pass in the eastern mountains.' },
  { n: 5, date: '2025-11-15', title: 'Barrow Digging', players: ['aisha', 'mateo', 'ogechi', 'rhys', 'sam'],
    waypoints: ['0906', '0809'], summary: 'Opened the first chamber of Harrow Barrow, took a silvered torc, and sealed the inner door when the cold got to be too much.' },
  { n: 6, date: '2025-12-06', title: 'A Hen for the Troll', players: ['priya', 'kofi', 'tobias', 'dev'],
    waypoints: ['0706'], summary: 'Met the Stonebridge troll. Paid a hen; Kofi counted the troll’s teeth and wished he hadn’t.' },
  { n: 7, date: '2025-12-20', title: 'Webs in the Greywood', players: ['sam', 'nadia', 'rhys', 'mateo'],
    waypoints: ['0602', '0501'], summary: 'Fled the Hollow Oak spider brood with two nights of rations lost and one boot.' },
  { n: 8, date: '2026-01-17', title: 'Charcoal and Smoke', players: ['priya', 'aisha', 'ogechi', 'kofi', 'sam'],
    waypoints: ['0507', '0410'], summary: 'Charcoal Burners’ Clearing for pelts and lamp-oil; the Hermit’s Cairn for his weather ledger.' },
  { n: 9, date: '2026-02-07', title: 'The Choir Under the Water', players: ['dev', 'tobias', 'kofi', 'mateo'],
    waypoints: ['1105', '1205', '1206'], summary: 'First look at the Drowned Chapel. The choir rose at dusk, three wights. Dev’s group backed out along the causeway stones.' },
  { n: 10, date: '2026-02-28', title: 'Knee-Deep at the Ford', players: ['priya', 'sam', 'nadia', 'aisha'],
    waypoints: ['1304', '1405'], summary: 'Crossed the Ashen Ford to the east bank and back. Priya mapped the braids.' },
  { n: 11, date: '2026-03-21', title: 'South by the Barrow Road', players: ['ogechi', 'rhys', 'kofi', 'tobias'],
    waypoints: ['0809', '0811', '0913'], summary: 'Pushed south past Harrow Barrow to the edge of rough hills before the rains turned them back.' },
  { n: 12, date: '2026-04-11', title: 'Eels for Supper', players: ['priya', 'dev', 'mateo', 'aisha'],
    waypoints: ['1006', '1107'], summary: 'Walked the western edge of the fen to Reedcutters’ Landing. Bought a punt, sold a secret.' },
  { n: 13, date: '2026-05-02', title: 'Hounds in the Reeds', players: ['sam', 'kofi', 'nadia', 'ogechi'],
    waypoints: ['1006', '1107', '1108'], summary: 'Went deeper along the west fen edge. The Gar-hound pack harried them back to the Landing.' },
  { n: 14, date: '2026-05-23', title: 'A Favor for the Wardens', players: ['priya', 'tobias', 'rhys', 'aisha'],
    waypoints: ['1304', '1505'], summary: 'Escorted a Warden courier from Pilgrims’ Rest to Ford Watch. Captain Ilse Marrow owes them a favor.' },
  { n: 15, date: '2026-06-13', title: 'The Stones That Weep', players: ['dev', 'mateo', 'kofi', 'sam'],
    waypoints: ['1505', '1606', '1708'], summary: 'Crossed the Ford and followed the east bank to the Weeping Stones, then on to the ravens of Ravenscar Cut before the light failed.' },
  { n: 16, date: '2026-07-11', title: 'Eel Basket Blues', players: ['priya', 'nadia', 'ogechi', 'rhys'],
    waypoints: ['1106'], summary: 'Cut through the reeds to the Heron Blind and raided the dried-eel cache for the Landing.' },
  { n: 17, date: '2026-08-01', title: 'The Greywood Ring', players: ['aisha', 'tobias', 'kofi', 'dev'],
    waypoints: ['0507', '0305'], summary: 'Charcoal Burners’ Clearing, then deeper to the Standing Ring where compasses spin.' },
  { n: 18, date: '2026-08-29', title: 'Upriver', players: ['priya', 'sam', 'mateo', 'ogechi'],
    waypoints: ['1403', '1602', '1802'], summary: 'Followed the Ash River north-east with the Wardens’ blessing. Spotted smoke from Ember Spring but turned for home.' },
  { n: 19, date: '2026-09-19', title: 'Gallows Oak', players: ['nadia', 'rhys', 'tobias', 'dev', 'aisha'],
    waypoints: ['1204', '1305', '1405', '1306'], summary: 'Cut from the ford toward the causeway and met a swinging lamp near the Gallows Oak that was not there on the way out.' },
  { n: 20, date: '2026-10-10', title: 'Mist and Mirrors', players: ['priya', 'kofi', 'mateo', 'sam', 'lena'],
    waypoints: ['0606', '0805', '1005'], summary: 'First session for Lena. A mist-crossing of the western shore and a fox-skin bargain with the Reedcutters.' },
  { n: 21, date: '2026-10-24', title: 'The Bogwife’s Bargain', players: ['dev', 'aisha', 'nadia', 'rhys'],
    waypoints: ['1105', '1205', '1306', '1307'], summary: 'Crossed the causeway to the Bogwife’s hummock and traded a memory for safe passage back. From the hut they glimpsed a ruined tower to the south-east.' },
  { n: 22, date: '2026-11-07', title: 'Pilgrim Road Patrol', players: ['tobias', 'ogechi', 'rhys', 'lena'],
    waypoints: ['1104', '1204', '1203'], summary: 'Escorted a pilgrim along the road to the Penitents’ Cairns and paid to listen to the hymns. Lena learned Identify.' },
]
