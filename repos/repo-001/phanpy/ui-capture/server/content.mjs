// Hand-written seed content for the local fake Mastodon instance.
// The signed-in user is @priya (Priya Raman), a product designer in Portland.

export const INSTANCE_TITLE = 'Rosebud Social';

// [key, username, domain|null (local), display name, bio, color]
export const ACCOUNTS = [
  ['priya', 'priya', null, 'Priya Raman', 'Product designer at a small civic-tech shop. Bikes, bread, accessible interfaces and too many houseplants. She/her. Portland, OR.', '#c2410c'],
  ['marcus', 'marcusbell', null, 'Marcus Bell', 'Transit planner by day, amateur luthier by night. Opinions about bus stop spacing are my own.', '#0f766e'],
  ['lena', 'lena', 'hachyderm.io', 'Lena Vogt', 'Staff engineer. Rust, Postgres, distributed systems that are less distributed than they look. Berlin.', '#7c3aed'],
  ['tomas', 'tomas_r', 'mastodon.social', 'Tomás Rivera', 'Photographer & darkroom nerd. Film is not dead, it is just expensive. 📷 Mexico City → Portland', '#b45309'],
  ['aiko', 'aiko', 'front-end.social', 'Aiko Tanaka', 'CSS is my love language. Design systems @ a payments company. Speaker, occasional writer.', '#db2777'],
  ['dev', 'devnull', 'fosstodon.org', 'Dev Patel 🐧', 'Linux sysadmin, self-hoster, keyboard collector. My homelab draws more power than my fridge.', '#2563eb'],
  ['grace', 'gracehopkins', null, 'Grace Hopkins', 'Librarian. Reading 52 books a year and failing gracefully. Community garden plot #14.', '#15803d'],
  ['owen', 'owen', 'social.coop', 'Owen Whitaker', 'Co-op organizer, tenant union volunteer. Housing is a human right. He/him.', '#9333ea'],
  ['sofia', 'sofiam', 'mastodon.online', 'Sofía Morales', 'Pastry chef. Laminated dough evangelist. Will talk your ear off about butter temperature.', '#e11d48'],
  ['jun', 'junpark', 'hachyderm.io', 'Jun Park', 'Accessibility engineer. Screen reader user. If your button is a div, we need to talk.', '#0891b2'],
  ['ruth', 'ruth', null, 'Ruth Adeyemi', 'Urbanist, cargo bike mom of two, school board candidate (2027?). PDX.', '#ca8a04'],
  ['felix', 'felix', 'mstdn.ca', 'Felix Gagnon', 'Typeface designer in Montréal. Currently drawing a grotesque with way too many weights.', '#4f46e5'],
  ['hana', 'hana_writes', 'wandering.shop', 'Hana Kowalski', 'SF/F writer. Debut novel "The Salt Archive" out spring 2027. Agent: someone very patient.', '#be185d'],
  ['ben', 'bencarter', 'mastodon.social', 'Ben Carter', 'Weather nerd and amateur astronomer. Clouds are just sky opinions.', '#0369a1'],
  ['nadia', 'nadia', 'infosec.exchange', 'Nadia Haddad', 'AppSec. Threat modeling, supply chain paranoia, and sourdough. Views my own, CVEs everyone\'s.', '#475569'],
  ['pdxbikes', 'pdxbikes', null, 'PDX Bike Coalition', 'Volunteer-run group advocating for safe streets in Portland. Monthly rides, repair clinics, and lots of public comment.', '#16a34a'],
  ['kai', 'kai', 'tech.lgbt', 'Kai Nakamura', 'Game dev (tiny cozy games). Pixel art, chiptune, and too many unfinished prototypes. They/them.', '#f59e0b'],
  ['elena', 'elenap', 'scholar.social', 'Dr. Elena Petrova', 'Ecologist studying urban pollinators. Bees, bees, bees. Also some wasps (they deserve love too).', '#65a30d'],
  ['sam', 'samokoro', null, 'Sam Okoro', 'Barista at Third Wave on Division. Latte art attempts posted without shame.', '#78350f'],
  ['olivia', 'olivia', 'mas.to', 'Olivia Chen', 'Product manager turned pottery student. Learning to center clay and myself.', '#a21caf'],
  ['rafael', 'rafa', 'masto.es', 'Rafael Ortega', 'Desarrollador web en Valencia. JavaScript, ciclismo y paella los domingos.', '#dc2626'],
  ['ines', 'ines', 'piaille.fr', 'Inès Laurent', 'Illustratrice à Lyon. Carnets de croquis, aquarelle et beaucoup de café.', '#0d9488'],
  ['phanpy', 'phanpy', 'hachyderm.io', 'Phanpy', 'Minimalistic opinionated Mastodon web client. Updates and release notes.', '#64748b'],
  ['news', 'citydesk', 'newsie.social', 'Portland City Desk', 'Local news headlines for the Portland metro area. Run by humans, not bots. Corrections welcome.', '#1e3a8a'],
  ['mira', 'mira', null, 'Mira Solberg', 'UX researcher. Interview transcripts are my true crime podcast.', '#9d174d'],
  ['zoe', 'zoe', 'fosstodon.org', 'Zoe Adams', 'Maintainer of a mildly popular date library. Timezones have taken years off my life.', '#0e7490'],
  ['arjun', 'arjun', 'mastodon.social', 'Arjun Mehta', 'Data viz & maps. Making charts that make people go "huh".', '#1d4ed8'],
  ['claire', 'claire', null, 'Claire Dubois', 'Nurse, night shift. Knitting through the 3am lull. Be kind to your healthcare workers.', '#c026d3'],
];

// Bio links / extra fields for a few accounts
export const FIELDS = {
  priya: [
    ['Website', 'https://priyaraman.design'],
    ['Pronouns', 'she/her'],
    ['Portfolio', 'https://dribbble.com/priyaraman'],
    ['Location', 'Portland, OR 🌲'],
  ],
  aiko: [['Blog', 'https://aiko.dev'], ['Talks', 'https://aiko.dev/talks']],
  jun: [['Pronouns', 'he/him'], ['Blog', 'https://junpark.dev']],
  hana: [['Books', 'https://hanakowalski.com'], ['Newsletter', 'https://buttondown.email/hana']],
  pdxbikes: [['Website', 'https://pdxbikecoalition.org'], ['Next ride', 'Sat 10am, Laurelhurst Park']],
  zoe: [['GitHub', 'https://github.com/zoeadams'], ['Sponsor', 'https://github.com/sponsors/zoeadams']],
};

/*
 Posts: [authorKey, text, opts]
 opts: { h: hours ago, tags, media: [{desc, scene}], poll: {options, expiresH, multiple}, cw,
         reply: postKey, key, boostBy: [keys], lang, card: {...}, vis, edited, pinned, fav, bm,
         translations }
 Text supports: blank-line paragraphs, #hashtags, @mentions (by key), urls.
*/
export const POSTS = [
  // ---- very recent ----
  ['ruth', 'The new protected bike lane on SE Clinton is open and I just rode it with both kids in the bucket. Nobody honked. Nobody squeezed past. This is what it should feel like.\n\nThank you to everyone who showed up to those 7pm hearings. #BikePDX #Urbanism', { h: 0.3, media: [{ scene: 'street', desc: 'A green-painted protected bike lane with concrete planters separating it from car traffic, under a cloudy sky.' }], key: 'clinton' }],
  ['sam', 'Attempt #47 at a rosetta. I think this one actually looks like a leaf and not a sad jellyfish ☕', { h: 0.6, media: [{ scene: 'latte', desc: 'Overhead view of a latte in a white ceramic cup with a slightly lopsided rosetta pattern in the foam.' }] }],
  ['jun', 'Friendly reminder that `aria-label` on a `<div>` with no role does approximately nothing for most screen readers. If it\'s clickable, make it a <button>. If it navigates, make it an <a>. That\'s 90% of the battle. #a11y #WebDev', { h: 0.9, key: 'aria' }],
  ['lena', 'Today I learned that our "stateless" service has been writing a 40MB temp file to disk on every request since 2021. Nobody noticed because the disk was big. The disk is no longer big.', { h: 1.4 }],
  ['marcus', 'Bus stop consolidation is one of the least glamorous, highest-impact things a transit agency can do. Fewer stops = faster, more reliable buses = more riders. The trick is doing it without cutting off people who can\'t walk the extra 300m.\n\nWe spent eight months on Line 14 alone. Thread on what we learned 🧵', { h: 1.8, key: 'stops', tags: ['transit'] }],
  ['marcus', '1/ First: the data. We overlaid boardings per stop with sidewalk quality, slope, and proximity to clinics and senior housing. Some "low ridership" stops were low because the sidewalk to them was broken, not because nobody needed them.', { h: 1.75, reply: 'stops', key: 'stops2' }],
  ['marcus', '2/ Second: talk to drivers. Operators knew exactly which stops caused the worst bunching, and which ones had regulars who would be stranded. None of that was in the spreadsheet.', { h: 1.7, reply: 'stops2', key: 'stops3' }],
  ['marcus', '3/ End result: 11 stops removed, 3 moved, 2 *added*. Average trip time down 4 minutes, ridership up 9% in six months. And zero angry letters from the senior center, which honestly felt like the bigger win.', { h: 1.65, reply: 'stops3', key: 'stops4' }],
  ['tomas', 'Developed my first roll of Portra 800 pushed to 1600 tonight. Grainy, warm, a little chaotic. Exactly what I wanted from a rainy evening on Hawthorne.', { h: 2.2, media: [{ scene: 'night', desc: 'Grainy film photo of a rainy street at night with neon shop signs reflecting on wet pavement.' }, { scene: 'night2', desc: 'Silhouette of a cyclist passing under a streetlight, motion-blurred, with warm orange tones.' }, { scene: 'city', desc: 'A storefront window with handwritten signs, seen through raindrops on the camera lens.' }], tags: ['FilmPhotography', 'BelieveInFilm'] }],
  ['aiko', 'CSS `:has()` has fully changed how I write component styles. Parent selectors were "impossible" for 20 years and now I use them like five times a day.\n\n```\n.card:has(img) { padding-top: 0; }\n.field:has(input:invalid) label { color: var(--danger); }\n```\n#CSS', { h: 2.6, key: 'has' }],
  ['news', 'TriMet announces Saturday service increases on six frequent bus lines starting January. The agency cites ridership recovery to 87% of 2019 levels. https://citydesk.example/trimet-saturday-service', { h: 3.1, card: { title: 'TriMet to boost Saturday frequency on six bus lines', description: 'Lines 4, 12, 14, 20, 72 and 75 will run every 12 minutes or better on Saturdays beginning in January, the agency said.', provider: 'Portland City Desk', scene: 'bus' } }],
  ['grace', 'Library display this month is "Books that made our staff cry on public transit." It is our most popular display ever. People keep adding sticky notes with their own picks.', { h: 3.5, media: [{ scene: 'books', desc: 'A library display table with stacks of books and colorful sticky notes covering a handwritten sign.' }] }],
  ['dev', 'Upgraded the homelab Proxmox cluster from 8 to 9 and absolutely nothing broke. I am deeply suspicious. #homelab #selfhosted', { h: 4 }],
  ['sofia', 'Lamination day. 81% butter block, 3 single folds, rested overnight. The croissant honeycomb this time is *chef\'s kiss*.\n\nIf your croissants are bready inside, your butter was probably too warm during the folds. Aim for 12–14°C. #baking', { h: 4.4, media: [{ scene: 'croissant', desc: 'A croissant cut in half showing an open honeycomb crumb with distinct layers.' }], key: 'croissant' }],
  ['kai', 'small devlog: added a little frog that follows you around if you feed it a bug. it does nothing else. it is the most requested feature in the game\'s history 🐸 #gamedev #indiedev', { h: 5, media: [{ scene: 'pixel', desc: 'Pixel art screenshot of a tiny green frog sitting next to a player character in a mossy forest clearing.' }] }],
  ['phanpy', 'New in Phanpy: add and remove posts from collections right from the post menu. Also fixed a bunch of scroll restoration bugs in the multi-column view. Thanks to everyone who reported them!', { h: 5.5 }],
  ['ben', 'Atmospheric river incoming Thursday. Expect 2–3 inches of rain in the valley, more in the Coast Range. Clear your storm drains, folks — especially the ones under leaves. #PNWweather', { h: 6, key: 'rain' }],
  ['elena', 'Found a mining bee nest aggregation in a schoolyard today — over 200 little volcano-shaped burrows in a patch of bare dirt. The kids named the biggest one "Mount Buzzmore." #bees #ecology', { h: 6.5, media: [{ scene: 'dirt', desc: 'Close-up of bare soil dotted with small volcano-shaped mounds, each with a hole in the center.' }] }],
  ['owen', 'Our tenant union just won a rent freeze for all 140 units in the building. It took 14 months, three rent strikes threatened, and one very long meeting with the property manager\'s lawyer.\n\nOrganize your building. It works.', { h: 7, key: 'tenant' }],
  ['zoe', 'A user filed a bug that our library returns the wrong day for dates in Samoa in December 2011. Correct! Samoa skipped December 30, 2011 entirely when it moved across the date line. I love this job. I hate this job.', { h: 8, tags: ['javascript', 'timezones'] }],
  ['felix', 'Spent the whole day on the lowercase "g". Two-story or single-story? Single-story is friendlier, two-story has more character. I have drawn it 34 times. I will draw it 34 more times.', { h: 9, media: [{ scene: 'type', desc: 'Sketchbook page full of pencil drawings of the lowercase letter g in different styles.' }], tags: ['typography', 'typedesign'] }],
  ['nadia', 'Reminder: your CI pipeline has more permissions than most of your engineers. Treat it accordingly. Pin your actions to commit SHAs, not tags. #infosec #supplychain', { h: 10 }],
  ['mira', 'Interview today where a participant described our onboarding flow as "like being asked for my blood type before I can see the menu." I\'m putting that on a slide.', { h: 11, key: 'onboarding' }],
  ['arjun', 'Mapped every street tree in Portland by species. Turns out the city is ~11% Norway maple, which ecologists will tell you is... not great. Interactive version coming soon. #DataViz #Maps', { h: 12, media: [{ scene: 'map', desc: 'A dark map of Portland with thousands of colored dots representing street trees, clustered densely in older neighborhoods.' }] }],
  ['hana', 'Copyedits are back. My copyeditor has flagged that a character "sighed" 61 times in a 90,000-word manuscript. Sixty-one. My characters are apparently very tired.', { h: 13 }],
  ['claire', 'Shift report: 3 admissions, 1 discharge, 0 breaks, 2 rows of a sweater sleeve. Going to sleep now while the rest of you start your day ☀️🧶', { h: 14 }],
  ['olivia', 'My first bowl that didn\'t collapse on the wheel! It\'s lopsided and the walls are thick and I love it more than anything I shipped as a PM.', { h: 15, media: [{ scene: 'pottery', desc: 'A slightly uneven unglazed clay bowl sitting on a pottery wheel.' }] }],
  ['rafael', 'Hoy he migrado un proyecto entero de webpack a Vite. El tiempo de build ha pasado de 3 minutos a 11 segundos. No sé si reír o llorar por todos los minutos perdidos. #JavaScript', { h: 16, lang: 'es', translation: 'Today I migrated an entire project from webpack to Vite. Build time went from 3 minutes to 11 seconds. I don\'t know whether to laugh or cry about all those lost minutes. #JavaScript' }],
  ['ines', 'Carnet de croquis du marché de la Croix-Rousse ce matin. Les marchands de fromage sont les meilleurs modèles : ils ne bougent jamais 🧀', { h: 17, lang: 'fr', media: [{ scene: 'sketch', desc: 'Watercolor sketch of a market stall with wheels of cheese and a vendor in an apron.' }], translation: 'Sketchbook from the Croix-Rousse market this morning. The cheese sellers are the best models: they never move 🧀' }],
  ['pdxbikes', 'This Saturday: Fall Leaf Ride! Meet at Laurelhurst Park, 10am. ~12 easy miles through the east side, ending at a bakery. All bikes and paces welcome. No-drop ride. #BikePDX', { h: 18, media: [{ scene: 'park', desc: 'A group of cyclists gathered in a park with golden autumn trees.' }] }],
  ['jun', 'Tested 14 popular date pickers with VoiceOver and NVDA this week. Two were fully usable. TWO. Write-up coming, but the short version is: please just use <input type="date"> unless you have a very good reason.', { h: 20, tags: ['a11y'] }],
  ['lena', 'Hot take: most teams don\'t need Kubernetes, they need a boring VM, a systemd unit, and the discipline to write a runbook.', { h: 22, poll: { options: ['Agree, k8s is overkill', 'Disagree, k8s is fine', 'It depends (the senior answer)', 'What is a runbook'], expiresH: -2, votes: [412, 98, 531, 76] } }],
  ['ruth', 'Board meeting tonight about the Safe Routes to School budget. Bringing snacks for the folks waiting to testify. Last time we went until 10:40pm.', { h: 24 }],
  ['aiko', 'Design system tip: name your tokens by purpose, not by value. `--color-danger` will survive a rebrand. `--color-red-500` will haunt you.', { h: 26, key: 'tokens' }],
  ['tomas', 'Darkroom playlist suggestions? I\'ve been listening to the same Khruangbin album for six months and the enlarger is starting to judge me.', { h: 28, key: 'playlist' }],
  ['grace', 'Finished "The Ministry of Time" on the bus and had to pretend I wasn\'t crying at a stoplight. Book 47 of 52 this year. #BookToot', { h: 30 }],
  ['ben', 'Caught a clear 20 minutes between clouds last night and got Saturn with my little 5" scope. You can SEE the rings with your own eyeball. Never gets old. #astronomy', { h: 33 }],
  ['dev', 'TIL you can `ssh -J` through a jump host without touching your ssh config. 15 years of Linux and I still learn something every week.', { h: 36, tags: ['linux'] }],
  ['kai', 'Content warning test for the game\'s horror level. Does this spider sprite look too realistic? Be honest.', { h: 38, cw: 'spiders (pixel art)', media: [{ scene: 'pixel2', desc: 'Pixel art of a large brown spider in a dark cave, with glowing eyes.' }], sensitive: true }],
  ['sofia', 'Unpopular opinion: banana bread is cake. Just call it cake. You\'re allowed to eat cake for breakfast.', { h: 40 }],
  ['news', 'Portland City Council votes 9–3 to fund 24/7 restroom pilot at five transit centers downtown. Pilot begins in March.', { h: 42 }],
  ['elena', 'Stop raking all your leaves! Many native bees and butterflies overwinter in leaf litter. Leave some in garden beds. Your soil will thank you too. #LeaveTheLeaves #gardening', { h: 46, key: 'leaves' }],
  ['zoe', 'Released v4.2 of the date library. Highlights: Temporal interop, 18% smaller bundle, and finally — FINALLY — correct ISO week numbering for years starting on Thursday.', { h: 50, tags: ['opensource', 'javascript'] }],
  ['owen', 'If you\'re in Portland: the Rent Stabilization town hall is Thursday at the Midland Library, 6:30pm. Childcare and interpretation provided.', { h: 54 }],
  ['marcus', 'Strung up the archtop I\'ve been building since March. It buzzes on the 7th fret, the finish has a thumbprint in it, and it\'s the best thing I\'ve ever made.', { h: 58, media: [{ scene: 'guitar', desc: 'A hand-built archtop guitar with a sunburst finish leaning against a workbench covered in tools.' }] }],
  ['felix', 'Three weeks of kerning pairs. If you ever wonder why fonts cost money: there are 8,742 pairs in this family that I have looked at personally.', { h: 64 }],
  ['nadia', 'Phishing email of the week claims to be from "IT Departmant". Bold of them to misspell the one word they needed.', { h: 70 }],
  ['mira', 'Hot tip for usability tests: ask "what did you expect to happen?" after every misclick. The gap between expectation and reality is where all your design work lives.', { h: 75 }],
  ['claire', 'Knitting progress: sweater body is done, starting sleeves. This is the part where everyone gets "second sleeve syndrome" and abandons it for 3 years.', { h: 80, media: [{ scene: 'knit', desc: 'A half-finished teal knitted sweater laid flat on a couch with circular needles attached.' }] }],
  ['arjun', 'If your chart needs a legend with more than 7 colors, it probably needs to be small multiples instead. Fight me.', { h: 86, tags: ['DataViz'] }],
  ['hana', 'Cover reveal for THE SALT ARCHIVE is going out to my newsletter on Friday! I\'ve seen it and I may have screamed a little in a coffee shop.', { h: 92 }],
  ['jun', 'Accessibility isn\'t a feature you add at the end. It\'s a quality of the whole product, like performance or security. You can\'t "add security" in the last sprint either.', { h: 98 }],
  ['rafael', 'Domingo de paella con la familia. Mi abuela sigue diciendo que le echo demasiado azafrán. Tiene razón.', { h: 104, lang: 'es', media: [{ scene: 'paella', desc: 'A large paella pan with saffron rice, green beans and chicken on an outdoor table.' }], translation: 'Paella Sunday with the family. My grandmother keeps saying I put in too much saffron. She\'s right.' }],
  ['sam', 'Regular came in today, ordered "the usual," and I realized I have no idea what his usual is. Made him a cortado with confidence. He said "perfect." I will never know if I got it right.', { h: 110 }],
  ['ben', 'Gorgeous lenticular clouds over Mt. Hood this morning. They look like stacked UFOs. Means strong winds up high.', { h: 118, media: [{ scene: 'mountain', desc: 'Snow-capped Mount Hood under lens-shaped stacked clouds glowing pink at sunrise.' }] }],
  ['aiko', 'Gave my "Container Queries in Production" talk today. Slides and recording: https://aiko.dev/talks/container-queries\n\nThanks to everyone who came and asked great questions!', { h: 126, card: { title: 'Container Queries in Production — Aiko Tanaka', description: 'Lessons from shipping container queries across a design system with 300+ components.', provider: 'aiko.dev', scene: 'slides' } }],
  ['lena', 'Postgres tip: if a query is slow, run EXPLAIN (ANALYZE, BUFFERS). The BUFFERS part tells you if you\'re actually hitting disk, which is usually the real story.', { h: 140, tags: ['postgres'] }],
  ['grace', 'Seed library is open for winter! We have 60+ varieties donated by local gardeners, including a tomato someone\'s family has grown in Portland since 1932.', { h: 150, tags: ['gardening'] }],
  ['tomas', 'Some portraits from the Alberta Street Fair. Thank you to everyone who said yes to a stranger with a very loud medium format camera.', { h: 165, media: [{ scene: 'portrait', desc: 'Black and white portrait of an older man with a white beard laughing, wearing a flat cap.' }, { scene: 'portrait2', desc: 'Black and white portrait of a young woman with braids holding a paper cup of lemonade.' }] }],
  ['kai', 'Game jam result: "Moth Post Office" — deliver letters by flying toward lamps. 48 hours, 3 people, 0 sleep. Playable in browser!', { h: 180 }],
  ['pdxbikes', 'Huge thanks to the 140+ people who came to the repair clinic at Woodlawn Park. We fixed 63 bikes, replaced 41 tubes, and gave away 25 sets of lights.', { h: 200 }],
  ['olivia', 'Things pottery has taught me that product management didn\'t:\n\n- You can\'t rush drying\n- Sometimes you just have to cut it off the wheel and start over\n- The kiln doesn\'t care about your deadline', { h: 230 }],
  ['owen', 'Mutual aid fridge on Killingsworth needs volunteers for the Tuesday evening restock. DM me if you can do even one shift a month.', { h: 260 }],
  ['dev', 'My self-hosted Nextcloud has now been up for 400 days without a reboot, which my security friends tell me is not the brag I think it is.', { h: 290 }],
  ['sofia', 'Kouign-amann are the most stressful pastry in my case and also the one I\'d save in a fire.', { h: 320 }],
  ['zoe', 'Maintainer life: someone opened an issue titled "URGENT!!!" that turned out to be them asking how to format a date in a tutorial. I answered. It\'s fine. I\'m fine.', { h: 380 }],
  ['marcus', 'Ridership on the new frequent line is up 22% year over year. Frequency is freedom. Nobody wants to check a schedule.', { h: 450 }],

  // ---- Priya's own posts ----
  ['priya', 'Spent the morning doing a screen reader walkthrough of our benefits application form with @jun. Found 23 issues in 40 minutes. Humbling and extremely useful. Every design team should do this monthly. #a11y #UXDesign', { h: 2.9, key: 'p_sr', fav: false }],
  ['priya', 'Sourdough attempt #12. Finally got an ear! The crumb is still a bit tight but I\'m calling this a win 🍞', { h: 19, media: [{ scene: 'bread', desc: 'A round sourdough loaf with a dark crust and a pronounced ear along the score line, on a wire rack.' }], tags: ['sourdough', 'baking'], key: 'p_bread' }],
  ['priya', 'Design crit question for the timeline: what\'s your team\'s ritual for giving feedback on work-in-progress? We\'re trying to make ours less "everyone stares at Figma in silence for 10 minutes."', { h: 44, key: 'p_crit' }],
  ['priya', 'Which do you prefer for long civic forms?', { h: 68, poll: { options: ['One question per page', 'Grouped sections', 'Single long page', 'Depends on the form'], expiresH: -20, votes: [64, 118, 12, 87] }, key: 'p_poll' }],
  ['priya', 'Rode to work in the rain, arrived soaked, and our new office has no bike parking. Sent a very polite email to facilities with a very impolite subtext.', { h: 96 }],
  ['priya', 'My monstera has put out a new leaf with fenestrations for the first time. I am irrationally proud. 🌿', { h: 130, media: [{ scene: 'plant', desc: 'A new glossy monstera leaf with its first split holes, unfurling next to older solid leaves.' }], tags: ['houseplants'] }],
  ['priya', 'Hot take: "intuitive" is not a design requirement. It\'s a wish. Write down *who* it should be intuitive *for* and *what they already know*, and then it becomes a requirement.', { h: 170, key: 'p_intuitive', pinned: true }],
  ['priya', 'Wrote up our process for testing a SNAP benefits form with real applicants — including how we paid participants fairly and handled consent. https://priyaraman.design/notes/testing-with-applicants', { h: 260, card: { title: 'Testing a benefits form with the people who actually use it', description: 'How a three-person team ran 18 sessions with SNAP applicants, what we changed, and what we got wrong.', provider: 'priyaraman.design', scene: 'notes' }, pinned: true }],
  ['priya', 'Portland in October: 9am fog, 2pm sun, 5pm rain, 7pm a double rainbow over the Ross Island Bridge. All four seasons, one bike commute.', { h: 340 }],
  ['priya', 'Just finished "Design Justice" by Sasha Costanza-Chock. If you work on public services, read it. It reframed how I think about who our "edge cases" really are.', { h: 420, tags: ['BookToot'] }],
  ['priya', 'Hello Rosebud! Moving my design and bike posting over here. I make government forms less painful, bake bread with varying success, and ride a blue Surly everywhere. #introduction', { h: 2900, pinned: true }],
  ['priya', 'Our team shipped plain-language rewrites of 14 eligibility questions. Completion rate on the form went from 61% to 79%. Words are design.', { h: 700 }],
  ['priya', 'Things I\'ve learned from 6 months of bike commuting:\n\n1. Fenders are not optional in Portland\n2. Rain pants > rain jacket\n3. Drivers mostly aren\'t out to get you, they just aren\'t looking\n4. The hill is always worse in your head', { h: 1100 }],
  ['priya', 'First time leading a design workshop with caseworkers today. They had so many ideas for the intake form. The people who use your tool daily know things your research never will.', { h: 1500 }],
  ['priya', 'Fig tree in the community garden finally gave us figs. Three of them. We shared them between five people with a very sharp knife.', { h: 1900 }],
  ['priya', 'Accessibility audits find bugs. Accessibility *practice* prevents them. We\'re moving from the first to the second and it\'s slow and worth it.', { h: 2300 }],

  // ---- replies on Priya's posts (show in notifications + threads) ----
  ['jun', '@priya Thanks for having me! The fact that your team fixed the error message focus order the *same afternoon* made my week.', { h: 2.5, reply: 'p_sr', key: 'r_jun' }],
  ['priya', '@jun Honestly the focus order one was embarrassing. We\'d tested it with a keyboard but never with announcements on. Lesson learned.', { h: 2.4, reply: 'r_jun' }],
  ['mira', '@priya Seconding this. We started doing these with our research participants and it changed our backlog priorities completely.', { h: 2.3, reply: 'p_sr' }],
  ['sofia', '@priya Look at that ear!! For a more open crumb try a slightly wetter dough, like 78% hydration, and a longer bulk ferment. You\'re close!', { h: 17, reply: 'p_bread', key: 'r_sofia' }],
  ['priya', '@sofiam 78%?! My dough is already a puddle at 72%. But okay, I trust you. Trying it this weekend.', { h: 16.5, reply: 'r_sofia' }],
  ['grace', '@priya That is a beautiful loaf. Bring a slice to the garden on Sunday as proof 😄', { h: 16, reply: 'p_bread' }],
  ['aiko', '@priya We do "silent crit" first — 5 min of everyone leaving sticky comments in Figma — then talk only about the clusters. Cuts the dead air and the loudest-voice problem.', { h: 42, reply: 'p_crit', key: 'r_aiko' }],
  ['mira', '@priya We have the designer state upfront what *kind* of feedback they want: "is this the right direction?" vs "is this polished enough?" Saves so much time.', { h: 41, reply: 'p_crit' }],
  ['marcus', '@priya Not design, but in planning we do "I like / I wish / What if." Sounds corny. Works.', { h: 39, reply: 'p_crit' }],
  ['jun', '@priya Yes!! "Intuitive for whom" should be tattooed on every product brief.', { h: 168, reply: 'p_intuitive' }],
  ['ruth', '@priya Ugh, no bike parking in 2026?? Want me to forward you the city\'s bike parking code requirements? Your landlord may actually be out of compliance.', { h: 94, reply: null, mentionPriya: true }],
  ['claire', '@priya We need monstera updates weekly please 🌿', { h: 128, reply: null, mentionPriya: true }],
  ['owen', '@priya Are you coming to the tenant union design session next week? We need help making our flyers readable for folks with low vision.', { h: 9.5, reply: null, mentionPriya: true }],
  ['hana', '@priya Your form-testing writeup came up in my writing group of all places — someone was using it to think about reader beta tests. Small world!', { h: 230, reply: null, mentionPriya: true }],

  // ---- other threads ----
  ['tomas', '@marcusbell Fantastic thread. Do you know if the Line 14 changes affected the stop near the Hollywood library? My mom uses that one.', { h: 1.5, reply: 'stops4' }],
  ['aiko', '@sofiam I read this whole post as a CSS metaphor and it still worked.', { h: 4.1, reply: 'croissant' }],
  ['lena', '@aiko `:has()` + container queries and suddenly half our JS layout code was deletable. Glorious.', { h: 2.4, reply: 'has' }],
  ['grace', '@tomas_r Library has a great vinyl collection you can borrow! Try some Alice Coltrane.', { h: 27, reply: 'playlist' }],
  ['ben', '@elenap Doing my part. My front yard looks "unkempt" according to my neighbor. Tell that to the bumblebees.', { h: 45, reply: 'leaves' }],
];

// Boosts on the home timeline: [booster, postKey, hoursAgo]
export const BOOSTS = [
  ['marcus', 'clinton', 0.2],
  ['priya', 'aria', 0.8],
  ['grace', 'tenant', 6.8],
  ['pdxbikes', 'clinton', 0.25],
  ['ruth', 'stops', 1.6],
  ['jun', 'p_sr', 2.7],
  ['priya', 'tokens', 25],
  ['aiko', 'onboarding', 10],
  ['elena', 'rain', 5.5],
  ['owen', 'leaves', 45],
];

// Posts the user favourited / bookmarked (by key or index into POSTS)
export const FAVOURITED = ['clinton', 'aria', 'stops', 'has', 'croissant', 'tenant', 'onboarding', 'tokens', 'leaves', 'r_aiko', 'r_sofia', 'rain', 'playlist'];
export const BOOKMARKED = ['stops', 'aria', 'has', 'tokens', 'croissant', 'onboarding', 'leaves'];

export const LISTS = [
  { title: 'Design & a11y', members: ['aiko', 'jun', 'mira', 'felix', 'arjun', 'olivia'], replies_policy: 'list' },
  { title: 'PDX local', members: ['ruth', 'marcus', 'pdxbikes', 'news', 'grace', 'owen', 'sam', 'claire', 'ben'], replies_policy: 'followed' },
  { title: 'Tech friends', members: ['lena', 'dev', 'nadia', 'zoe', 'rafael', 'kai'], replies_policy: 'list' },
  { title: 'Makers', members: ['tomas', 'sofia', 'marcus', 'olivia', 'ines', 'claire'], replies_policy: 'none', exclusive: true },
];

export const FOLLOWED_TAGS = ['a11y', 'BikePDX', 'Urbanism', 'typography', 'sourdough', 'UXDesign'];
