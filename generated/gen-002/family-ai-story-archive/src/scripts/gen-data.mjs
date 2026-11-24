// Generates src/data/stories.json + src/data/orders.json (deterministic) and validates the brief's numbers.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'src', 'data');

// ---------- seeded rng ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261116);
const rnd = (n) => Math.floor(rng() * n);
const pick = (arr) => arr[rnd(arr.length)];
const chance = (p) => rng() < p;
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function weighted(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d, h, mi) => `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(mi)}`;

// ---------- cast ----------
export const CHARACTERS = [
  { id: 'ember', name: 'Ember', kind: 'the dragon', count: 23 },
  { id: 'biscuit', name: 'Captain Biscuit', kind: 'the dog', count: 41 },
  { id: 'juniper', name: 'Juniper', kind: 'the fox', count: 27 },
  { id: 'wick', name: 'Professor Wick', kind: 'the owl', count: 19 },
  { id: 'tinker', name: 'Tinker', kind: 'the little robot', count: 16 },
  { id: 'mabel', name: 'Mabel', kind: 'the cloud-whale', count: 12 },
  { id: 'pim', name: 'Nana Pim', kind: 'the hedgehog', count: 9 },
];
const charById = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
const affinity = {
  ember: ['mountain', 'cave', 'snow', 'castle', 'campsite', 'bakery', 'village', 'desert'],
  biscuit: ['seaside', 'island', 'ship', 'campsite', 'village', 'farm', 'ocean'],
  juniper: ['forest', 'snow', 'farm', 'garden', 'treehouse', 'rainy day'],
  wick: ['forest', 'library', 'moon', 'treehouse', 'castle'],
  tinker: ['space', 'village', 'train', 'library', 'moon'],
  mabel: ['moon', 'ocean', 'space', 'mountain', 'rainy day'],
  pim: ['garden', 'bakery', 'village', 'farm', 'rainy day'],
};
const ALL_SETTINGS = ['forest', 'ocean', 'seaside', 'castle', 'moon', 'mountain', 'village', 'garden', 'snow', 'desert', 'space', 'farm', 'train', 'bakery', 'library', 'treehouse', 'cave', 'island', 'rainy day', 'campsite', 'ship'];
const places = {
  forest: ['in the pine forest', 'deep in the woods'],
  ocean: ['out on the open sea', 'under the waves'],
  seaside: ['at the seaside', 'on the beach'],
  castle: ['in an old stone castle', 'at the castle on the hill'],
  moon: ['on the moon', 'under a huge full moon'],
  mountain: ['high up a snowy mountain', 'on the mountain path'],
  village: ['in the little village', 'in a sleepy village'],
  garden: ['in the vegetable garden', 'in a walled garden'],
  snow: ['in the snow', 'on a snowy night'],
  desert: ['in the desert', 'across the sand dunes'],
  space: ['in outer space', 'out past the planets'],
  farm: ['on the farm', 'in the old red barn'],
  train: ['on the night train', 'at the train station'],
  bakery: ['in the bakery', 'at the corner bakery'],
  library: ['in the library', 'in a giant library'],
  treehouse: ['in a treehouse', 'up in the treetops'],
  cave: ['in a glowing cave', 'in a cave under the hill'],
  island: ['on a tiny island', 'on Hollow Island'],
  'rainy day': ['on a rainy day', 'in the pouring rain'],
  campsite: ['at the campsite', 'on a camping trip'],
  ship: ['on a little sailing ship', 'aboard the good ship Marigold'],
  lighthouse: ['at the old lighthouse', 'at the lighthouse on Gull Rock'],
};
const scenes = {
  forest: ['The pine forest was quiet except for the crickets.', 'Deep in the woods, the fireflies were just waking up.'],
  ocean: ['The sea was calm and silver under the first stars.', 'Out on the water, the waves rocked everything gently.'],
  seaside: ['The tide was going out, leaving shells like tiny lanterns on the sand.', 'The beach was empty except for the gulls tucking in for the night.'],
  castle: ['The old stone castle creaked in the evening wind.', 'Every window of the castle glowed a different shade of gold.'],
  moon: ['The moon hung low and enormous over the hills.', 'The moon was so bright that night it cast shadows like blue ink.'],
  mountain: ['The mountain path wound up through the clouds.', 'Snow glittered on the high peaks as the evening came on.'],
  village: ['In the little village, the chimneys were puffing their last smoke of the day.', 'The village lamps came on, one by one, down the crooked lane.'],
  garden: ['The garden smelled of mint and warm earth.', 'Behind the tall stone wall, the garden was humming itself to sleep.'],
  snow: ['Snow fell in slow, fat flakes.', 'The whole world had been tucked under a white blanket.'],
  desert: ['The desert cooled quickly once the sun was gone.', 'The dunes glowed pink and then purple as the sky went dim.'],
  space: ['Past the last planet, the stars were close enough to hear.', 'The little ship drifted through a sea of quiet stars.'],
  farm: ['At the farm, the hens had gone to bed and the barn cat was on watch.', 'The old red barn smelled of hay and sweet apples.'],
  train: ['The night train rattled softly along the track.', 'At the station, the last train sighed and settled.'],
  bakery: ['The bakery was warm and smelled of cinnamon.', 'Flour floated in the lamplight like snow.'],
  library: ['The library was so quiet you could hear the books breathing.', 'Ladders leaned against shelves that went up and up and up.'],
  treehouse: ['The treehouse swayed a little in the breeze.', 'Up in the treetops, the lanterns were already lit.'],
  cave: ['The cave glittered with a thousand tiny crystals.', 'Water dripped somewhere, keeping a slow and sleepy beat.'],
  island: ['The island was small enough to walk around before bedtime.', 'On the island, even the seagulls spoke in whispers.'],
  'rainy day': ['Rain tapped on every roof, as if asking to come in.', 'It had been raining all afternoon, and the puddles were enormous.'],
  campsite: ['The campfire crackled, and the tent glowed from the inside.', 'At the campsite, the stars came out one by one.'],
  ship: ['The little ship rocked on the swells, its lantern swinging.', 'The sails were folded, and the deck creaked a lullaby.'],
  lighthouse: ['The old lighthouse stood tall and white against the evening.', 'Gull Rock lighthouse turned its slow golden eye over the sea.'],
};

// ---------- activities (pronoun-free) ----------
const ACT = [
  ['can\'t fall asleep', '{L} had counted clouds, counted stars, and even counted counting, but sleep would not come.', 'At last {L} stopped trying so hard, closed both eyes, and sleep tiptoed right in.'],
  ['finds a map that leads to the moon', '{L} found a crinkled map folded inside an old book, and every line on it pointed at the moon.', 'At the end of the trail, {L} lay back and watched the moon wink, as if to say: you made it.'],
  ['loses a favorite mitten and has to find it', 'It was the left mitten, the red one, and it was simply gone. {L} looked under everything.', 'The mitten turned up in the last place anyone would look, and it was warm, as if it had been waiting.'],
  ['bakes a giant cake for the whole town', '{L} had a recipe, a very large bowl, and exactly one hour before the town gathered.', 'The cake was lopsided and enormous and perfect, and everyone got a piece with extra frosting.'],
  ['has a first day at a new school', '{L} stood at the gate with a brand-new backpack and a tummy full of butterflies.', 'By afternoon, the butterflies had settled, and {L} had two new friends and a seat by the window.'],
  ['makes an unlikely best friend', '{L} was not looking for a friend that day, and certainly not one so prickly, or so loud, or so late.', '{L} waved goodbye, already planning tomorrow. Some friends are worth the wait.'],
  ['is scared of the dark and finds a night-light in an unexpected place', '{L} did not like the dark, not one bit, and bedtime was getting closer and closer.', 'The dark turned out to be full of tiny glowing things, and {L} fell asleep counting them.'],
  ['is scared of thunder and learns what makes the sound', 'Every time the sky rumbled, {L} hid under the biggest blanket in the house.', 'The next time the thunder rolled, {L} counted the seconds and smiled. Just the sky, stretching.'],
  ['gets lost in the fog and follows a tiny bell home', 'The fog came in so thick that {L} could not see a single paw, or boot, or tail in front.', 'The bell rang once more, and there was home, with the porch light on.'],
  ['plants a seed that grows into a staircase', '{L} planted one odd little seed on Monday. By Tuesday, it had started to climb.', 'At the top of the staircase was a cloud as soft as a pillow, and {L} was very glad to be tired.'],
  ['discovers a door in the back of the closet', '{L} had looked in the closet a hundred times. Today there was a small round door.', 'The little door closed softly behind {L}, and the closet was just a closet again, but a warmer one.'],
  ['has to return a lost kite to the wind', 'The kite had landed in the yard with a thump and a message tied to its tail: please take me home.', 'The wind took the kite in a great gentle sweep and whispered thank you all the way up.'],
  ['learns to share the last cookie', 'There was one cookie left, a big one with chocolate chunks, and {L} wanted it very much.', 'Half a cookie turned out to taste even better than a whole one, shared.'],
  ['goes camping for the first time', '{L} had packed a flashlight, a marshmallow stick, and a stuffed rabbit for emergencies.', 'Zipped into the sleeping bag, {L} listened to the owls and the crickets and the wind, and was not even a little worried.'],
  ['builds a boat out of a bathtub', 'It was a perfectly good bathtub, and it needed only a sail, a snack, and a name.', 'The bathtub bobbed home on the evening tide, and {L} slept in it, rocking all night.'],
  ['gets the hiccups at the worst possible time', 'The hiccups began right before the biggest, quietest moment of the whole concert.', 'The last hic turned into a tiny song, and the whole audience hummed along.'],
  ['is chosen to ring the village bell at midnight', 'Nobody had ever asked {L} to do anything so important, or so late.', 'The bell rang out soft and round, and every window in the village glowed.'],
  ['meets a friendly cloud that wants to come home for dinner', 'The cloud floated down to the garden gate and politely asked if it could stay.', 'The cloud tucked itself over the bed like a quilt, and it rained, just a little, in its sleep.'],
  ['tries to catch a falling star', '{L} saw it fall behind the hills and set off at once with a butterfly net and a jar.', '{L} did not catch the star, but the star left behind a spark, and the spark was enough.'],
  ['wakes up and finds everything upside down', 'The ceiling was where the floor should be, and the porridge was floating politely.', 'Right-side up again at last, {L} decided that tonight the world could stay exactly where it was.'],
  ['throws a surprise party for a grumpy neighbor', 'The neighbor had not smiled since spring, and {L} had a plan involving balloons and a very quiet cake.', 'The neighbor smiled, and then laughed, and then asked for a second slice.'],
  ['learns to swim', '{L} stood at the edge of the pond, toes curled over the stones.', '{L} floated on the pond with arms wide, looking up at the first stars.'],
  ['collects the lost sounds of the forest in a jar', '{L} had a jar with a cork lid, and tonight the forest was full of sounds that nobody had caught yet.', 'The jar hummed on the shelf all night, the whole forest asleep inside it.'],
  ['tries to stay awake all night to meet the moon', '{L} had a thermos of cocoa, two pillows, and a very firm plan.', 'The moon smiled down at {L}, who was fast asleep, and decided that was just fine.'],
  ['is too big for the little door and too small for the big one', 'The little door was too narrow. The big door was too heavy. There had to be a third way.', 'The third way turned out to be a window with a ladder, and it led to the best view in the world.'],
  ['writes a letter to the sea and gets an answer', '{L} folded the letter into a boat and set it on the first wave.', 'The answer came back in a bottle, in handwriting made of foam, and it said: goodnight.'],
  ['finds a baby bird that fell from its nest', 'It was small and fluffy and very loud, and it was sitting right in the middle of the path.', 'The little bird tucked its head under a wing, and {L} tiptoed away, grinning.'],
  ['has a sleepover where nobody wants to sleep', 'The sleepover had begun at six, and at nine o\'clock nobody had so much as yawned.', 'One yawn started it, and then they all caught it, and the whole room went quiet.'],
  ['is the only one who can hear the mountain humming', 'Everyone else said it was the wind. {L} knew better, and the hum was getting louder.', 'The mountain hummed one last low note, and {L} hummed it right back.'],
  ['forgets the words to the lullaby', '{L} knew the tune by heart, but the words had gone right out of the window.', 'It turned out the tune was enough, and the words came wandering back in, one by one.'],
  ['goes on a rainy-day treasure hunt', 'The rain was drumming on the roof, which meant it was the best possible day for a treasure hunt.', 'The treasure was a tin of buttons and a note that said: thank you for looking so hard.'],
  ['sneezes and everything turns to bubbles', 'It started as a tickle in the nose. Then came the sneeze. Then came the bubbles.', 'The last bubble drifted up to the ceiling and popped into a tiny rainbow.'],
  ['delivers the last pie before sunset', 'The pie was still warm, and the address was at the very top of the hill.', 'The pie was delivered with seconds to spare, and the sunset held its breath until it was done.'],
  ['discovers the world\'s smallest library', 'It was tucked between two bricks, with a tiny sign: please whisper. All the books were the size of stamps.', '{L} borrowed one very small book and read it by the light of a single firefly.'],
  ['swaps places with a shadow for a day', 'The shadow had been following along for years and wanted a turn at being in front.', 'By sunset, {L} and the shadow were back where they belonged, and a little closer than before.'],
  ['has a wobbly tooth and a very big decision', 'The tooth had been wobbling since Sunday, and tonight it was ready to go.', 'The tooth went under the pillow, and in the morning there was a coin and a tiny thank-you note.'],
  ['paints the night sky a new color', '{L} had a bucket of paint and a very tall ladder, and the sky had been the same blue for ages.', 'The sky glowed violet and gold, just for one night, and the stars looked extra pleased.'],
  ['tries to teach a goose to say goodnight', 'The goose could honk, hiss, and flap, but it had never once said goodnight.', 'The goose honked something very close to goodnight, and that was good enough.'],
  ['gets a very important job at the train station', '{L} was handed a bright green flag and a whistle, and told that the night train was counting on them.', 'The train pulled out exactly on time, and {L} waved until the last light disappeared.'],
  ['makes soup for a sick friend', 'The friend had a cold, a cough, and a very sad sneeze, and only one cure came to mind.', 'The soup was a little too salty and exactly right, and the friend fell asleep with an empty bowl.'],
  ['finds out why the wind is always in a hurry', 'The wind blew past {L} every day without so much as a hello, until today.', 'The wind slowed down for one long breath, and then it hurried off, and {L} waved.'],
  ['dances at the winter festival', 'The whole festival was lit with paper lanterns, and {L} had practiced the dance a hundred times, but only in the mirror.', 'The music slowed, the lanterns swayed, and {L} danced the last steps with a very sleepy smile.'],
];
const noEmberActs = new Set([6, 7]);

const TAILS = [
  'Then {L} gave a great big yawn, and so did everyone else, and one by one the lights went out.',
  'Back home, {L} climbed under the patchwork blanket and whispered, "Same adventure tomorrow?" And the night said yes.',
  'The stars blinked slowly, the way they do when they are about to fall asleep themselves, and {L} blinked slowly back.',
  'And if you listen very carefully tonight, you might hear {L} humming, far away and almost asleep.',
  'They all went home together under the moon, and not one of them was in a hurry.',
  '"Goodnight," said {L} to the sky, and the sky said goodnight back, the way it always does.',
  '{L} snuggled down, warm and tired and very proud, and the story folded itself up for the night.',
  'The night was soft and the pillow was softer, and {L} slept all the way until morning.',
];
const ONEOFFS = ['Dot the snail', 'Pickle the penguin', 'Wren the cloud painter', 'Moss the sleepy bear', 'Clementine the goat', 'Rosie the beekeeper', 'Fig the mouse', 'Otis the otter', 'Bramble the badger', 'Posy the pony', 'Mr. Tumble the clockmaker', 'Tilly the lamplighter', 'Barnaby the rabbit', 'Odette the ballerina mouse', 'Hugo the hippo', 'Marigold the duck'];
const TONES = {
  pia: ['Gentle and sweet', 'Soft ending please', 'Not scary', 'Lots of animal sounds', 'Short and sleepy', 'Silly voices', 'Something sparkly in it'],
  leo: ['A little adventure', 'Funny, not babyish', 'Can have a small mystery', 'Longer than usual', 'Not scary', 'A few jokes for Leo', 'Make it exciting but still sleepy'],
  both: ['Something both kids will like', 'Adventure but gentle', 'Funny for both of them', 'Not too long'],
};
const ADJ = ['Brave', 'Sleepy', 'Little', 'Golden', 'Whispering', 'Wobbly', 'Moonlit', 'Gentle', 'Giggling', 'Secret', 'Tiny', 'Fluffy', 'Starry', 'Cozy', 'Curious', 'Sparkling', 'Quiet', 'Magical', 'Big', 'Marvelous', 'Humming', 'Faraway'];
const NOUN = ['Glow', 'Cloud Parade', 'Lantern', 'Pancake', 'Moonbeam', 'Adventure', 'Surprise', 'Garden', 'Button', 'Puddle', 'Whistle', 'Blanket', 'Map', 'Cookie', 'Bubble', 'Treasure', 'Dream', 'Quest', 'Pillow', 'Journey', 'Sock', 'Hat', 'Kite', 'Picnic', 'Teapot', 'Echo', 'Snowflake', 'Compass', 'Wish', 'Secret', 'Bell', 'Ribbon'];
const BORING = ['Pia bedtime story', 'Leo bedtime story', 'Untitled story', 'Story for tonight', 'Bedtime story 2', 'Bedtime story 3', 'Leo\'s long one', 'new one for pia', 'Story (copy)', 'Story (copy)', 'Untitled story'];

// ---------- hand-written stories: the nine dragon + lighthouse ----------
const HAND = [
  {
    key: 'A', title: 'The Great Big Rumble', createdAt: iso(2025, 7, 12, 20, 52), by: 'Hana', for: 'leo', readingAge: 8, wordCount: 1040, illustrations: 5,
    characters: ['ember'], settings: ['lighthouse', 'ocean', 'rainy day'], heart: null,
    prompt: 'ember is scared of thunder but the lighthouse lamp went out and someone has to fix it. leo is 8 so can be exciting, no bad guys',
    opening: 'Every dragon knows that thunder is just the sky clearing its throat. Every dragon except Ember, who hid under the nearest rock whenever the clouds began to grumble. Tonight, though, the clouds over Gull Rock were grumbling louder than ever, and the lighthouse lamp had gone out.',
    versions: [{ kind: 'original', ending: 'Ember counted the rumbles, one, two, three, and on the fourth he roared back, loud and proud and a little bit silly. The sky rumbled again, as if it were laughing. The lamp blazed up, the ships found the harbor, and Ember curled up in the lamp room with a mug of warm cocoa, listening to the storm go quiet. "Not so scary," he said. "Just noisy."', readAloud: 2 }],
  },
  {
    key: 'B', title: 'A Spark by the Sea', createdAt: iso(2025, 9, 20, 22, 5), by: 'Jonah', for: 'pia', readingAge: 5, wordCount: 520, illustrations: 4,
    characters: ['ember'], settings: ['lighthouse', 'seaside', 'rainy day'], heart: 'Pia',
    prompt: 'pia wants ember and the lighthouse AGAIN!! ember is scared of thunder, a baby seagull needs help. soft ending pls',
    opening: 'A baby seagull named Pebble had tumbled into the lighthouse garden, and her wing was too wobbly to fly. Ember wanted to help. There was just one problem: the rain had started, and with the rain came thunder, and with thunder came Ember\'s knees knocking together like two little drums.',
    versions: [{ kind: 'original', ending: 'Ember wrapped Pebble in one warm wing and carried her up the spiral stairs while the thunder rolled outside. At the top, they watched the storm slide away over the sea. By morning, Pebble could flap, and Ember, for the very first time, waved goodbye to the thunder.', readAloud: 7 }],
  },
  {
    key: 'C', title: 'The Button Collector', createdAt: iso(2025, 11, 2, 21, 40), by: 'Hana', for: 'leo', readingAge: 8, wordCount: 880, illustrations: 3,
    characters: [], settings: ['lighthouse', 'ocean', 'cave'], heart: null,
    prompt: 'a sea dragon (not ember, a new one) who lives under a lighthouse and collects lost buttons. funny, for leo',
    opening: 'Far below the lighthouse, in a cave that smelled of salt and old pennies, lived a sea dragon named Brine. Brine collected buttons. Brass ones, pearl ones, and a purple one the size of a pancake. Every night the tide brought a few more, and every night Brine counted them twice, just to be sure.',
    versions: [{ kind: 'original', ending: 'In the morning, the lighthouse keeper discovered that every coat in town had a button again, and a very small note tucked into each pocket that said, "From Brine, with thanks for the shiny ones." The keeper laughed so hard that the lamp wobbled.', readAloud: 4 }],
  },
  {
    key: 'D', title: 'Race to the Rocks', createdAt: iso(2026, 1, 18, 21, 12), by: 'Jonah', for: 'both', readingAge: 6, wordCount: 760, illustrations: 4,
    characters: ['ember', 'biscuit'], settings: ['lighthouse', 'seaside', 'ocean'], heart: null,
    prompt: 'ember and captain biscuit race to the lighthouse before the tide comes in. for both kids, adventure, not too long',
    opening: 'The tide was coming in fast, and the lighthouse was a long way off. "I can fly there in a minute," said Ember. "I can run there in two," said Captain Biscuit, "and I have a shortcut." They looked at each other. They looked at the waves. "Ready," said Ember. "Set," said Captain Biscuit. "Go!"',
    versions: [
      { kind: 'original', ending: 'They reached the lighthouse door at exactly the same moment, soaked and laughing, and the keeper handed them both a towel. "A tie," said Captain Biscuit. "A tie," Ember agreed, and they watched the tide fill in the path behind them, safe and sound at the top of the rocks.', readAloud: 4 },
      { kind: 'rewrite', label: 'Retold in rhyme', createdAt: iso(2026, 1, 18, 21, 40), ending: 'Over the rocks and across the foam, they raced as fast as they could go. At the door they stopped, both out of breath, and the keeper called, "Come in from the cold!" Two tired friends in two thick towels, and the lamp turned round like a sleepy owl.', readAloud: 2 },
    ],
  },
  {
    key: 'E', title: 'The Whistling Lesson', createdAt: iso(2026, 2, 9, 23, 26), by: 'Hana', for: 'pia', readingAge: 5, wordCount: 430, illustrations: 3,
    characters: ['ember'], settings: ['lighthouse', 'seaside'], heart: null,
    prompt: 'ember learns to whistle from the lighthouse keeper\'s parrot. silly. pia age 5',
    opening: 'Ember could roar and rumble and puff, but he could not whistle, no matter how hard he tried. The keeper\'s parrot, Pippin, perched on the railing of the lighthouse and shook her head. "Lips like this," she said. "Not nose. Never nose."',
    versions: [{ kind: 'original', ending: 'After one hundred and four tries, Ember produced a squeak, then a toot, then a whole tiny tune. Pippin clapped her wings. The seagulls hummed along, and the lighthouse lamp swayed in time, all the way to bedtime.', readAloud: 3 }],
  },
  {
    key: 'F', title: 'The Sleepy Little Spark', createdAt: iso(2026, 3, 3, 22, 47), by: 'Jonah', for: 'pia', readingAge: 5, wordCount: 640, illustrations: 4,
    characters: ['ember'], settings: ['lighthouse', 'ocean', 'moon'], heart: null,
    prompt: 'dragon who is scared of the dark, set at a lighthouse. gentle, pia, ends sleepy. use ember',
    opening: 'At the very end of Gull Rock, where the waves hum themselves to sleep, there stood a tall white lighthouse with a round, quiet lamp room at the top. Ember the dragon had flown all day to reach it, and now the sun was slipping into the sea. "It\'s getting dark," Ember whispered, and a thin curl of smoke trembled out of his nose. Ember was a very good dragon at almost everything. But the dark? The dark was the one thing Ember had never learned to like.',
    versions: [{ kind: 'original', ending: 'Ember climbed the last step and breathed one small, warm flame into the great lamp. The glass glowed gold, and a long ribbon of light stretched out over the water. "There," said Old Marguerite, the keeper. "Now the ships can find their way home. And so can you." Ember curled up beside the lamp, no longer afraid. The dark was only the night, tucked in for sleep, same as everyone else.', readAloud: 5 }],
  },
  {
    key: 'G', title: 'The Brave Little Glow', createdAt: iso(2026, 3, 4, 22, 14), by: 'Hana', for: 'pia', readingAge: 5, wordCount: 780, illustrations: 5,
    characters: ['ember', 'biscuit'], settings: ['lighthouse', 'ocean', 'moon'], heart: 'Pia',
    prompt: 'Same idea as last night\'s lighthouse story, but add Captain Biscuit as the keeper\'s dog. Ember is still afraid of the dark, just a little braver. Pia loved the lighthouse part.',
    opening: 'Ember the dragon was back at the Gull Rock lighthouse, and this time he had brought a flashlight, a blanket, and three socks, just in case. "It\'s only a little dark," he told himself, and then the sun dropped into the sea and it was a lot dark. Captain Biscuit, the keeper\'s dog, trotted out from behind the door with a lantern in his mouth. "Evening, Ember," he said around the lantern. "Come on in. The stairs are steep, and the night is long."',
    versions: [
      { kind: 'original', ending: 'At the top of the stairs, Ember lit the great lamp with one brave puff. Captain Biscuit barked three happy barks, and a ship far out on the water blew its horn back. "Thank you!" it seemed to say. Ember grinned. Then he yawned, and Captain Biscuit yawned, and the whole lighthouse yawned right along with them. They fell asleep side by side under the glowing lamp, and the sea hummed a lullaby until morning.', readAloud: 3 },
      { kind: 'ending', label: 'Regenerated ending', createdAt: iso(2026, 3, 6, 21, 31), ending: 'Ember lit the great lamp with one brave puff, and the light swept out across the waves. Then he noticed something wonderful: every shadow in the room had a soft golden edge. "The dark isn\'t empty," Ember whispered. "It\'s just waiting for a little light." Captain Biscuit nudged a blanket over Ember\'s tail. "Same time tomorrow night?" he asked. "Same time tomorrow," said Ember, and he fell asleep smiling, with the lamp turning slowly above him like a gentle, golden moon.', readAloud: 11 },
    ],
  },
  {
    key: 'H', title: 'The Long Way Round', createdAt: iso(2026, 8, 19, 21, 3), by: 'Jonah', for: 'leo', readingAge: 9, wordCount: 1180, illustrations: 6,
    characters: ['ember', 'wick'], settings: ['lighthouse', 'island', 'forest'], heart: null,
    prompt: 'Leo wants a longer Ember story. Ember is scared of the dark again and has to cross the whole island to get to the lighthouse. Little bit of mystery, ok to be a tiny bit spooky. Professor Wick can help',
    opening: 'Ember had been away from Gull Rock for a whole summer, and now the only way back was across Hollow Island, where the paths twisted like ribbons and the trees closed over the sky. "It will be dark by the time I get there," Ember muttered. He was right. By the time the moon came up, he was alone among the roots and whispering branches, with Professor Wick the owl blinking at him from a low branch. "Whoo goes there?" said the owl. "Ember," said the dragon, in a very small voice. "And I\'m not scared. Much."',
    versions: [{ kind: 'original', ending: 'They reached the cliff at last. The lighthouse stood silent, because Old Marguerite had gone to the mainland for supplies and no one had lit the lamp. "Ships are counting on this light," said Professor Wick. Ember swallowed hard. He climbed all three hundred steps one at a time, and when he reached the top he lit the lamp with the steadiest flame of his life. The beam swung out over the water, and far below a row of little boats turned for home. Ember looked out at the night and finally understood it was full of friends he had not met yet.', readAloud: 2 }],
  },
  {
    key: 'I', title: 'The Cozy Corner', createdAt: iso(2026, 10, 11, 20, 38), by: 'Hana', for: 'pia', readingAge: 6, wordCount: 590, illustrations: 4,
    characters: ['ember'], settings: ['lighthouse', 'rainy day', 'seaside'], heart: null,
    prompt: 'Pia is nervous about the thunderstorm tonight, so Ember is scared of thunder too, but at the lighthouse, and finds a cozy spot. Help her feel ok',
    opening: 'The storm rolled in over Gull Rock just after supper. Ember the dragon pulled a quilt over his head and listened to the windows rattle. "It\'s only weather," said the lighthouse keeper kindly. "But it\'s a very big weather," whispered Ember. "Maybe we should find the coziest place in the whole lighthouse."',
    versions: [{ kind: 'original', ending: 'The coziest place turned out to be the little round window seat halfway up the stairs, with a view of the whole storm and a heap of cushions. Ember tucked in with a cup of warm milk. Every rumble of thunder was softer than the last, until the sea was quiet and the lamp turned slow and golden, and the dragon was fast asleep.', readAloud: 1 }],
  },
];

// ---------- generate the other 309 ----------
const N_TOTAL = 318;
const handCount = HAND.length;
const nGen = N_TOTAL - handCount;

// who/for assignment among generated
const forArr = shuffle([...Array(199).fill('pia'), ...Array(94).fill('leo'), ...Array(16).fill('both')]);
const byArr = shuffle([...Array(177).fill('Jonah'), ...Array(132).fill('Hana')]);

// months
const months = [];
for (let i = 0; i < 19; i++) { const y = 2025 + Math.floor((4 + i) / 12); const m = ((4 + i) % 12) + 1; months.push([y, m]); }
const monthW = [22, 24, 20, 16, 15, 17, 15, 14, 20, 13, 14, 15, 16, 12, 15, 17, 18, 15, 8];

function sampleDate(by) {
  const [y, m] = weighted(months, monthW);
  const dim = new Date(y, m, 0).getDate();
  let lo = 1, hi = dim;
  if (y === 2025 && m === 5) lo = 9;
  if (y === 2026 && m === 11) hi = 15;
  const d = lo + rnd(hi - lo + 1);
  // late-night bias: Jonah later than Hana
  let hr, mi = rnd(60);
  if (by === 'Jonah') hr = weighted([20, 21, 22, 23, 0, 1], [8, 24, 32, 24, 10, 2]);
  else hr = weighted([19, 20, 21, 22, 23, 0], [8, 22, 34, 24, 10, 2]);
  let yy = y, mm = m, dd = d;
  if (hr === 0 || hr === 1) { // after midnight: next calendar day
    const t = new Date(y, m - 1, d + 1);
    if (t > new Date(2026, 10, 15, 23, 59)) hr = 23;
    else { yy = t.getFullYear(); mm = t.getMonth() + 1; dd = t.getDate(); }
  }
  return iso(yy, mm, dd, hr, mi);
}

// designate generated stories
const genIdx = [...Array(nGen).keys()];
const lhSet = new Set(shuffle(genIdx).slice(0, 7)); // lighthouse without dragon
const dragonOnly = new Set(shuffle(genIdx.filter((i) => !lhSet.has(i))).slice(0, 3));
const charAssign = genIdx.map(() => []);
function assignChar(id, n, eligible) {
  let left = n; const pool = shuffle(eligible);
  for (const i of pool) {
    if (left === 0) break;
    if (charAssign[i].length >= 2) continue;
    charAssign[i].push(id); left--;
  }
  if (left) throw new Error('could not assign ' + id);
}
const notLH = genIdx.filter((i) => !lhSet.has(i) && !dragonOnly.has(i));
const handCharCount = (id) => HAND.filter((h) => h.characters.includes(id)).length;
assignChar('ember', 23 - handCharCount('ember'), notLH);
for (const c of CHARACTERS) if (c.id !== 'ember') assignChar(c.id, c.count - handCharCount(c.id), genIdx.filter((i) => !dragonOnly.has(i)));

const usedTitles = new Set(HAND.map((h) => h.title));
function makeTitle(child) {
  if (chance(0.06)) return pick(BORING);
  for (let t = 0; t < 50; t++) {
    const r = rnd(5);
    let s;
    if (r === 0) s = `The ${pick(ADJ)} ${pick(['Little ', ''])}${pick(NOUN)}`;
    else if (r === 1) s = `The ${pick(NOUN)} of ${pick(['Willow Lane', 'Maple Hill', 'Pebble Creek', 'Thistle Hollow', 'Foxglove Row', 'Moss Bridge'])}`;
    else if (r === 2) s = `${pick(ADJ)} ${pick(NOUN)} Night`;
    else if (r === 3) s = `A ${pick(NOUN)} for ${child === 'leo' ? 'Leo' : child === 'pia' ? 'Pia' : 'Everyone'}`;
    else s = `${pick(['Moonlit', 'Sleepy', 'Midnight', 'Evening', 'Twilight'])} ${pick(NOUN)} ${pick(['Mix-Up', 'Parade', 'Party', 'Hunt', 'Trouble', 'Tale'])}`;
    s = s.replace('The Little Little', 'The Little');
    if (/dragon|lighthouse|dark|thunder/i.test(s)) continue;
    if (!usedTitles.has(s) || s === 'x') { usedTitles.add(s); return s; }
  }
  return `The ${pick(ADJ)} ${pick(NOUN)} ${rnd(90) + 10}`;
}

const dragonOnlyPrompts = [
  ['Leo turns 7 tomorrow and wants a story about a birthday cake shaped like a dragon that is too proud to be eaten. Funny please', ['bakery', 'village'], 'leo', 'The Cake That Wouldn\'t Be Eaten'],
  ['pia wants a story about a tiny baby dragon who hatches from an egg in the garden and needs a name. gentle', ['garden', 'rainy day'], 'pia', 'The Egg in the Tomatoes'],
  ['story about a school play where leo is the dragon costume and the back half gets stuck in the door. hana says make it funny', ['village', 'castle'], 'leo', 'Back Half of the Costume'],
];

function leadFor(chars, rn) {
  if (chars.length) { const c = charById[chars[0]]; return { name: c.name, ref: c.name, recurring: true, id: c.id }; }
  const o = pick(ONEOFFS); return { name: o.split(' the ')[0].replace('Mr. ', 'Mr. '), ref: o, recurring: false };
}

function childName(f) { return f === 'pia' ? 'Pia' : f === 'leo' ? 'Leo' : 'Pia and Leo'; }

function makeGenerated(i, forKid, by) {
  const createdAt = sampleDate(by);
  const chars = charAssign[i];
  const isLH = lhSet.has(i);
  let settings; let prompt; let title; let lead; let act; let actIdx;
  if (dragonOnly.has(i)) {
    const [p, st, , t] = dragonOnlyPrompts[[...dragonOnly].indexOf(i)];
    return { createdAt, by, for: forKid, prompt: p, title: t, characters: [], settings: st, special: true };
  }
  lead = leadFor(chars);
  do { actIdx = rnd(ACT.length); } while (lead.id === 'ember' && noEmberActs.has(actIdx));
  act = ACT[actIdx];
  const pool = chars.length ? chars.flatMap((c) => affinity[c]) : ALL_SETTINGS;
  settings = [];
  const first = isLH ? 'lighthouse' : pick(pool.length ? pool : ALL_SETTINGS);
  settings.push(first);
  const extra = chance(0.65) ? 1 : 0;
  const extra2 = chance(0.2) ? 1 : 0;
  for (let k = 0; k < extra + extra2; k++) {
    const s = chance(0.6) ? pick(pool) : pick(ALL_SETTINGS);
    if (!settings.includes(s)) settings.push(s);
  }
  const placeP = places[settings[0]] ? pick(places[settings[0]]) : '';
  const kid = childName(forKid);
  const tone = pick(TONES[forKid]);
  const lowerNames = (s) => s.replace(/\bPia\b/g, 'pia').replace(/\bLeo\b/g, 'leo');
  const leadRef = lead.ref;
  const againable = lead.recurring && chance(0.35);
  const hanaV = rnd(4);
  if (by === 'Hana') {
    if (hanaV === 0) prompt = `${kid} would like a story about ${leadRef}, who ${act[0]} ${placeP}. ${tone}.`;
    else if (hanaV === 1) prompt = `A story for ${kid}: ${leadRef} ${act[0]} ${placeP}. ${tone}.`;
    else if (hanaV === 2) prompt = againable ? `${kid} asked for ${leadRef} again tonight. ${lead.name} ${act[0]} ${placeP}. ${tone}.` : `Please make a bedtime story where ${leadRef} ${act[0]} ${placeP}. ${tone}.`;
    else prompt = tone.includes(kid) ? `Bedtime story where ${leadRef} ${act[0]} ${placeP}. ${tone}.` : `Bedtime story where ${leadRef} ${act[0]} ${placeP}. ${tone}. It's for ${kid}.`;
  } else {
    const v = rnd(3);
    if (v === 0) prompt = `${leadRef} ${act[0]} ${placeP}. ${tone.toLowerCase()}. for ${kid}`;
    else if (v === 1) prompt = `${kid} story - ${leadRef} ${act[0]} ${placeP}. ${tone.toLowerCase()}`;
    else prompt = `story for ${kid}: ${leadRef} ${act[0]}. ${tone.toLowerCase()}`;
    if (chance(0.6)) prompt = lowerNames(prompt).replace(leadRef, leadRef.toLowerCase());
    if (v === 2 && chance(0.7)) prompt = prompt.replace(/\.\s*$/, '') + ` (${placeP})`;
  }
  prompt = prompt.replace(/\s+/g, ' ').replace(/\s\./g, '.').replace(/\.\./g, '.').trim();
  if (isLH && !/lighthouse/i.test(prompt)) prompt = prompt.replace(/\.?$/, '') + ' - set at the old lighthouse';
  const L = lead.name;
  const sceneLine = pick(scenes[settings[0]] || scenes.forest);
  const opening = `${sceneLine} ${act[1].replaceAll('{L}', L)}`;
  const makeEnding = (k) => `${act[2].replaceAll('{L}', L)} ${TAILS[(actIdx + k * 3 + i) % TAILS.length].replaceAll('{L}', L)}`;
  return { createdAt, by, for: forKid, prompt, title: makeTitle(forKid), characters: chars, settings, opening, makeEnding, actIdx };
}

const generated = genIdx.map((i) => makeGenerated(i, forArr[i], byArr[i]));

// ---------- finalize numeric fields ----------
function ageFor(story, monthIndex) {
  if (story.for === 'pia') return Math.max(4, Math.min(7, 4 + Math.floor(monthIndex / 7) + rnd(2)));
  if (story.for === 'leo') return Math.max(7, Math.min(10, 7 + Math.floor(monthIndex / 8) + rnd(2)));
  return Math.max(5, Math.min(8, 5 + Math.floor(monthIndex / 9) + rnd(2)));
}
function monthIndexOf(createdAt) { const y = +createdAt.slice(0, 4), m = +createdAt.slice(5, 7); return (y - 2025) * 12 + m - 5; }

function fillGenerated(g, idx) {
  const mi = monthIndexOf(g.createdAt);
  g.readingAge = ageFor(g, mi);
  const base = g.for === 'pia' ? 330 + g.readingAge * 55 : g.for === 'leo' ? 300 + g.readingAge * 85 : 350 + g.readingAge * 80;
  g.wordCount = Math.max(300, Math.min(1400, Math.round((base + (rng() - 0.5) * 420) / 10) * 10));
  const iWeights = g.wordCount > 900 ? [1, 2, 4, 14, 22, 26, 31] : g.wordCount > 550 ? [4, 6, 12, 24, 26, 18, 10] : [8, 10, 20, 28, 20, 10, 4];
  g.illustrations = weighted([0, 1, 2, 3, 4, 5, 6], iWeights);
  const heartP = g.for === 'both' ? 0.22 : g.for === 'pia' ? 0.17 : 0.1;
  g.heart = chance(heartP) ? (g.for === 'both' ? pick(['Pia', 'Leo']) : g.for === 'pia' ? 'Pia' : 'Leo') : null;
  const age = 18 - mi; // months old: older stories get read more
  let ra = Math.floor(Math.pow(rng(), 1.7) * (3 + age * 0.45));
  if (g.heart) ra += 2 + rnd(5);
  g.baseRead = Math.min(ra, 24);
}
generated.forEach(fillGenerated);

// force extremes present
generated[0].wordCount = generated[0].wordCount; // keep
const longIdx = generated.findIndex((g) => g.for === 'leo' && !g.special);
generated[longIdx].wordCount = 1400;
const shortIdx = generated.findIndex((g) => g.for === 'pia' && !g.special && g.createdAt.startsWith('2025-05'));
generated[shortIdx >= 0 ? shortIdx : generated.findIndex((g) => g.for === 'pia' && !g.special)].wordCount = 300;

// versions: 50 of the generated have >=2 (42 with 2, 8 with 3)
const verIdx = shuffle(genIdx.filter((i) => !generated[i].special || true)).slice(0, 50);
const threeSet = new Set(verIdx.slice(0, 8));
function addDays(isoStr, d, hh) {
  const dt = new Date(isoStr + ':00');
  dt.setDate(dt.getDate() + d);
  if (hh != null) dt.setHours(hh, rnd(60));
  const cap = new Date(2026, 10, 15, 23, 59);
  if (dt > cap) return isoStr;
  return iso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), dt.getHours(), dt.getMinutes());
}
generated.forEach((g, i) => {
  const hasV = verIdx.includes(i);
  const e0 = g.makeEnding ? g.makeEnding(0) : 'The cake sat very still, very proud, and then, quietly, was shared. Everyone agreed it was the best cake ever to be admired first and eaten second, and the house fell asleep full and happy.';
  const total = g.baseRead;
  g.versions = [];
  if (!hasV) {
    g.versions.push({ kind: 'original', ending: e0, readAloud: total });
  } else {
    const n = threeSet.has(i) ? 3 : 2;
    const parts = []; let left = total;
    for (let k = 0; k < n; k++) { const take = k === n - 1 ? left : Math.min(left, Math.floor(rng() * (left + 1) * 0.6)); parts.push(take); left -= take; }
    g.versions.push({ kind: 'original', ending: e0, readAloud: parts[0] });
    for (let k = 1; k < n; k++) {
      const isRewrite = chance(0.22);
      g.versions.push({
        kind: isRewrite ? 'rewrite' : 'ending',
        label: isRewrite ? pick(['Second version', 'Gentler retelling', 'Shorter retelling']) : pick(['Regenerated ending', 'Regenerated ending', 'New ending']),
        createdAt: addDays(g.createdAt, chance(0.5) ? 0 : 1 + rnd(5), chance(0.5) ? null : 20 + rnd(4)),
        ending: g.makeEnding ? g.makeEnding(k) : 'The cake was cut into exactly as many slices as there were guests, and one extra for the dragon on top. Then the lights went down, and the whole table dreamed in frosting.',
        readAloud: parts[k],
      });
    }
  }
});

// ---------- merge, sort, id ----------
const all = [];
for (const h of HAND) all.push({ ...h, hand: true });
generated.forEach((g) => all.push(g));
all.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));

// ensure unique id & final shape
const stories = all.map((s, idx) => {
  const id = 's' + String(idx + 1).padStart(3, '0');
  const versions = s.versions.map((v, k) => {
    const label = v.label || (v.kind === 'original' ? 'Original' : 'Alternate');
    return { id: `${id}-v${k + 1}`, kind: v.kind, label, createdAt: v.createdAt || s.createdAt, ending: v.ending, readAloud: v.readAloud };
  });
  const readAloud = versions.reduce((a, v) => a + v.readAloud, 0);
  return {
    id, title: s.title, createdAt: s.createdAt, by: s.by, for: s.for, readingAge: s.readingAge, wordCount: s.wordCount,
    prompt: s.prompt, characters: s.characters, settings: s.settings, illustrations: s.illustrations,
    readAloud, favoriteBy: s.heart ?? null, opening: s.opening ?? '', versions,
  };
});
// opening for the dragon-only specials
for (const s of stories) if (!s.opening) {
  s.opening = s.title === 'The Cake That Wouldn\'t Be Eaten'
    ? 'The cake was shaped like a dragon, with scales of sliced almonds and eyes of blueberry, and it had decided it was far too magnificent to be eaten. "Not today," it told the candles. "I have a reputation."'
    : s.title === 'The Egg in the Tomatoes'
      ? 'The egg was the size of a melon and speckled green, and it had appeared overnight between the tomato plants. When it began to rock back and forth, the whole garden leaned in to watch.'
      : 'The costume had a head, two wings, a long green tail, and exactly one pair of legs inside it. Leo had the front half. His cousin Marcus had the back half. Neither of them had thought about the door.';
}

// ---------- orders ----------
const handTitles = new Set(HAND.map((h) => h.title));
function findOrderStory(afterIso, beforeIso, forKid, used) {
  return stories.find((s) => !handTitles.has(s.title) && s.createdAt > afterIso && s.createdAt < beforeIso && s.for === forKid && s.illustrations >= 4 && s.favoriteBy && !used.has(s.id));
}
const used = new Set();
const o1 = findOrderStory('2025-05-01', '2025-08-01', 'pia', used); used.add(o1.id);
const o2 = findOrderStory('2025-09-01', '2025-11-20', 'pia', used); used.add(o2.id);
const o3 = findOrderStory('2025-11-01', '2026-02-20', 'leo', used) || findOrderStory('2025-11-01', '2026-03-01', 'both', used); used.add(o3.id);
const o4 = findOrderStory('2026-02-01', '2026-05-25', 'pia', used) || stories.find((s) => !handTitles.has(s.title) && s.createdAt > '2026-04-01' && s.createdAt < '2026-05-30' && s.illustrations >= 4 && s.favoriteBy && !used.has(s.id)); used.add(o4.id);
const orders = [
  { id: 'LL-1041', storyId: o1.id, versionId: o1.versions[0].id, title: o1.title, orderedAt: '2025-08-14T21:55', format: 'hardcover', qty: 2, total: 78.95, deliveredAt: '2025-08-22', by: 'Hana' },
  { id: 'LL-1186', storyId: o2.id, versionId: o2.versions[o2.versions.length - 1].id, title: o2.title, orderedAt: '2025-12-03T22:20', format: 'softcover', qty: 3, total: 75.8, deliveredAt: '2025-12-11', by: 'Jonah' },
  { id: 'LL-1312', storyId: o3.id, versionId: o3.versions[0].id, title: o3.title, orderedAt: '2026-03-26T21:48', format: 'softcover', qty: 1, total: 27.95, deliveredAt: '2026-04-03', by: 'Jonah' },
  { id: 'LL-1544', storyId: o4.id, versionId: o4.versions[0].id, title: o4.title, orderedAt: '2026-06-12T22:31', format: 'hardcover', qty: 1, total: 41.95, deliveredAt: '2026-06-19', by: 'Hana' },
];
for (const o of orders) { const s = stories.find((x) => x.id === o.storyId); if (!(s.createdAt < o.orderedAt)) throw new Error('order before story ' + o.id); }

// ---------- validate brief ----------
const count = (f) => stories.filter(f).length;
const assert = (cond, msg) => { if (!cond) { console.error('ASSERT FAILED:', msg); process.exitCode = 1; } else console.log('ok  ', msg); };
const hay = (s) => [s.title, s.prompt, ...s.characters.map((c) => charById[c].name + ' ' + charById[c].kind), ...s.settings].join(' ').toLowerCase();
assert(stories.length === 318, `318 stories (${stories.length})`);
assert(count((s) => s.for === 'pia') === 204, `204 for Pia (${count((s) => s.for === 'pia')})`);
assert(count((s) => s.for === 'leo') === 97, `97 for Leo (${count((s) => s.for === 'leo')})`);
assert(count((s) => s.for === 'both') === 17, `17 for both (${count((s) => s.for === 'both')})`);
assert(count((s) => s.by === 'Jonah') === 181, `Jonah 181 (${count((s) => s.by === 'Jonah')})`);
assert(count((s) => s.by === 'Hana') === 137, `Hana 137 (${count((s) => s.by === 'Hana')})`);
assert(stories[0].createdAt.startsWith('2025-05'), `first story May 2025 (${stories[0].createdAt})`);
assert(stories[317].createdAt.startsWith('2026-11'), `last story Nov 2026 (${stories[317].createdAt})`);
assert(stories.every((s) => s.createdAt <= '2026-11-16T00:00'), 'no stories in the future');
assert(Math.min(...stories.map((s) => s.wordCount)) === 300 && Math.max(...stories.map((s) => s.wordCount)) === 1400, 'word counts span 300–1400');
assert(Math.min(...stories.map((s) => s.illustrations)) === 0 && Math.max(...stories.map((s) => s.illustrations)) === 6, 'illustrations span 0–6');
for (let n = 0; n <= 6; n++) assert(count((s) => s.illustrations === n) > 0, `has stories with ${n} illustrations (${count((s) => s.illustrations === n)})`);
for (const c of CHARACTERS) assert(count((s) => s.characters.includes(c.id)) === c.count, `${c.name}: ${c.count} (${count((s) => s.characters.includes(c.id))})`);
assert(count((s) => s.versions.length >= 2) === 52, `52 with 2+ versions (${count((s) => s.versions.length >= 2)})`);
const dl = stories.filter((s) => /dragon/.test(hay(s)) && /lighthouse/.test(hay(s)));
assert(dl.length === 9, `9 dragon+lighthouse (${dl.length})`);
const edark = stories.filter((s) => s.characters.includes('ember') && /dark/.test(s.prompt.toLowerCase()) && /scared|afraid/.test(s.prompt.toLowerCase()));
assert(edark.length === 3 && edark.map((s) => s.createdAt.slice(0, 10)).join() === '2026-03-03,2026-03-04,2026-08-19', `3 Ember afraid-of-dark: ${edark.map((s) => s.createdAt.slice(0, 10))}`);
assert(edark[1].versions.length === 2 && edark[0].versions.length === 1 && edark[2].versions.length === 1, 'Mar 4 has two endings, others one');
const darkLike = stories.filter((s) => /\bdark\b/.test(hay(s)) && /dragon/.test(hay(s)) && /lighthouse/.test(hay(s)));
assert(darkLike.length === 3, `dragon+lighthouse+dark = 3 (${darkLike.length})`);
assert(stories.filter((s) => /lighthouse/.test(hay(s))).length === 16, `lighthouse total ${stories.filter((s) => /lighthouse/.test(hay(s))).length} (9 + 7)`);
assert(stories.filter((s) => /dragon/.test(hay(s))).length === 23 + 1 + 3, `dragon total ${stories.filter((s) => /dragon/.test(hay(s))).length}`);
assert(orders.length === 4 && orders[3].orderedAt.startsWith('2026-06'), 'four orders, last June 2026');
const embers = stories.filter((s) => s.characters.includes('ember'));
assert(embers.filter((s) => /thunder/.test(s.prompt)).length === 3, `Ember thunder stories = 3 (${embers.filter((s) => /thunder/.test(s.prompt)).length})`);
assert(new Set(stories.map((s) => s.title)).size > 290, `title variety ${new Set(stories.map((s) => s.title)).size}`);

writeFileSync(join(outDir, 'stories.json'), JSON.stringify({ characters: CHARACTERS, stories }));
writeFileSync(join(outDir, 'orders.json'), JSON.stringify(orders));
console.log('written', stories.length, 'stories,', orders.length, 'orders');
