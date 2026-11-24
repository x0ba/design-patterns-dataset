import type { Bookmark, Item } from '../types';
import { parseTranscript, ts } from './parse';

const transcript = parseTranscript(`
0:00:00|W|[Recording starts — street noise, Praça da Ribeira]
0:00:14|I|Bom dia, good morning everyone! Okay, I think we are all here — eight of you, perfect. My name is Inês, I'm a licensed guide here in Porto, and I was born about fifteen minutes up that hill, so I'm a little biased about this city.
0:00:52|I|Today is a new walk for me, so you are my first group on this route — which means if something is boring, you tell me. Honestly. That's the deal.
0:01:20|G|Do we get a discount for being the guinea pigs?
0:01:24|I|(laughs) You get extra bolinhos de bacalhau. That's better than a discount.
0:01:40|I|So, the plan. Two hours, nine stops, all of it within maybe one kilometre of where we're standing. We'll eat twice, we'll drink a little port at the end, and in between I want to show you how this riverbank made Porto rich — the boats, the merchants, the tiles, all of it.
0:02:35|I|Before we start — the weather. They said rain this morning and look, nothing. In Porto we say if you don't like the weather, wait ten minutes. Last week I had a group with sun, then hail, then sun again, inside one hour…
0:04:05|I|…anyway. Okay, the square. Praça da Ribeira. What you're standing on was the heart of the river trade for about six hundred years. Fish, salt, wine, cloth — everything came up the Douro or in from the sea and was sold right here.
0:05:20|I|See the fountain with the cube on top? That's modern, from 2000, by the sculptor João Cutileiro — São João, our saint, as a boy. People either love it or hate it. I'll let you decide.
0:06:10|I|And the houses behind — tall and thin, painted every colour. They're thin because you paid tax on how much street front you had. So everyone built up, not wide.
0:07:15|I|Right — one more thing about the weather, sorry, because you will need this — if you want an umbrella, the shop by the arches sells them for five euros, don't pay more…
0:08:20|I|Okay! Let's go down to the water. Two minutes. Watch the tram rails, they're slippery when wet.
0:08:45|W|[Walking — group moves toward the quay]
0:09:40|I|So — the boats. These wooden ones with the big square sail: barcos rabelos. For centuries this was the only way to bring wine down from the Douro valley, about a hundred kilometres upriver.
0:10:35|I|The river was wild then — rapids, rocks, no dams. The man steering stood on that high platform at the back, with that long oar, the espadela. It needed four, five men just to hold it.
0:11:40|G|How many barrels would one carry?
0:11:44|I|Good question — the big ones, around sixty pipes. A pipe is about 550 litres. So you do the maths, that's a lot of wine on a flat boat with no keel.
0:12:30|I|And many sank. Many. There are families in the valley who still talk about the grandfather who didn't come home.
0:13:20|I|Today the wine comes by road, of course, and the rabelos you see are for the regatta every 24th of June, São João, and for photos. The port houses across the river each have one with their name on the sail.
0:14:40|I|Across there — Vila Nova de Gaia. Technically a different city. Don't say that to anyone from Gaia; they get very… Gaia.
0:15:30|I|The lodges are on that side because it faces north — cooler, more stable for ageing wine. And the merchants liked that they could keep the wine out of Porto's tax.
0:16:45|I|Up there, the Dom Luís I bridge. 1886. Two decks. People will tell you Eiffel built it — he didn't. It was his former partner, Théophile Seyrig. Eiffel did the other one, the Maria Pia, upriver.
0:18:05|G2|Can we walk across it?
0:18:08|I|The top deck, yes — with the metro going past your elbow. Do it at sunset, after the tour. Tonight, ideally.
0:18:40|I|Okay, I'm going to take you into the back streets now — where the people who did the actual work lived. And we're going to eat. Follow me, it's steep for thirty seconds.
0:19:10|W|[Walking — Rua de São João, uphill]
0:21:30|I|Here, slow down, the door on the left with the green frame.
0:22:05|I|Okay, this is Adelino's. Everyone in? Squeeze, squeeze. He's been frying here for thirty-one years.
0:23:00|I|So the plate coming now: bolinhos de bacalhau. Codfish cakes. Salt cod, potato, egg, parsley, a bit of onion. Fried in that pan you can see, which I promise is cleaner than it looks.
0:24:20|I|Funny thing — the cod is not Portuguese. Not one of these fish swam in our waters. It's from Norway, from Newfoundland. We've been sailing up there to catch it since the 1500s, and salting it on the boats so it survived the trip home.
0:25:45|G|So why is it the national dish if it isn't from here?
0:25:50|I|Because it kept. No fridges. A salted cod lasts for months. And the Church had many fasting days with no meat — more than a hundred a year — so cod became the food of everyone. Rich, poor, everyone.
0:27:30|I|We say there are three hundred and sixty-five recipes for bacalhau, one for every day of the year. My mother says it's more like a thousand, and hers is the only correct one.
0:28:40|W|[Plates arrive — eating, background chatter]
0:31:40|I|Adelino — Senhor Adelino, here — he learned from his mother, who had a stall at the Bolhão market. Say obrigado to him, he loves it.
0:32:15|G|Obrigado!
0:32:20|I|Perfect, very good accent. Now — the drink. This is vinho verde. Green wine, but it's not green, it's young. Light, a little sparkle, cold. Perfect with fried things.
0:33:45|I|It comes from the Minho, north of here. Rainy, green country — that's where the name comes from, people say, though the winemakers will tell you it's about the young age of the wine.
0:35:10|I|Who wants another one? There's a second plate. Don't be shy, it's included.
0:36:24|I|While you finish — look at the photo on the wall above the till. That's this street in 1952. Same doorways. Same washing on the line. The only thing missing is the cars.
0:37:30|I|This neighbourhood almost disappeared. In the seventies and eighties it was poor, very poor, buildings falling down. Then in 1996 UNESCO listed the historic centre, and money came for restoration.
0:39:05|G|Is it mostly tourist flats now?
0:39:10|I|Honestly? A lot of it, yes. It's a real problem. Many of the families who lived here for generations have moved out to Gondomar, to Valongo, because rents went crazy. Adelino lives upstairs, he owns it — that's why he's still here.
0:41:15|I|I don't want to be the guide who only tells you nice things. This is a beautiful place and also a complicated one.
0:42:30|I|Okay. Five more minutes, finish your wine, use the bathroom if you need — it's through the kitchen, Adelino doesn't mind.
0:43:00|W|[Break — background chatter]
0:46:20|I|Right, everybody ready? Our next stop is two minutes up, and it's my favourite on this route. Bring your cameras.
0:46:40|W|[Walking — Rua de São Nicolau]
0:48:10|I|Okay, stop here, here, on this side, so you can see the whole front. Look up.
0:48:30|I|This is the church of São Nicolau. Saint Nicholas — patron of sailors, which makes sense, right? We are two hundred metres from the river.
0:49:15|I|And the front — the tiles. Azulejos. Blue and white, from the doorway almost to the roof. This is the thing people come to Porto to photograph, and most of them don't know what they're looking at.
0:50:20|I|The word azulejo — people think it comes from azul, blue. It doesn't. It's from Arabic, al-zulayj, a little polished stone. The blue came later.
0:51:20|I|The church itself is older than the tiles. There was a fire, the church was rebuilt in the eighteenth century, and the tiles…
0:52:30|I|…the tiles you see were put up in 1739, during the great period of blue-and-white, when every church in Portugal wanted to be covered.
0:53:25|I|Look at how they're painted — each tile is one piece of a bigger picture. The painter worked on the whole wall laid out flat on the floor of the workshop, then they numbered every tile on the back and carried them here.
0:54:40|I|If you get close — not now, later — you can see some tiles are a slightly different blue. Those are replacements. Some from the fifties, some from much later.
0:55:30|I|The scene in the middle panel is Saint Nicholas himself. You can see the three bags of gold — the story where he throws gold through a window so three poor girls could marry.
0:56:40|I|And on the sides, the patterns — those geometric ones, they're repeated, like a wallpaper. That's a much older style, a carpet style, and actually it's the oldest idea in Portuguese tiles…
0:57:48|G|Sorry — were these made here in Porto, or did they come from Lisbon?
0:58:05|I|Oh! Good question. Okay, so — this is something I love. Porto had its own factories. The most famous was Massarelos, right down the river, just past the Alfândega — founded in 1766, I think, the oldest one in the city.
0:59:20|I|And my grandmother — sorry, I have to tell you this — my grandmother's house in Ovar, which is south of here, the whole front is tiles. Green ones, with a little raised pattern, so when the sun moves the colour changes. Ovar is full of these houses, they call it the city-museum of the azulejo.
1:00:40|I|When I was small I used to count them. Four hundred and twelve tiles on the front. I counted many times because I always lost my place at the window.
1:01:30|G|(laughs) Is the house still in the family?
1:01:35|I|It is! My uncle lives there. But — and this is the sad part — two years ago someone came in the night and took eleven tiles off the front. With a chisel. Just gone.
1:02:40|I|Because there's a whole black market. Old tiles from Porto and Lisbon, sold to collectors, in antique shops, online. Some go to Brazil, to the States.
1:03:10|I|There's a project in Lisbon — SOS Azulejo, it started with the Judiciary Police and the museums — and they keep a database of stolen tiles so the police can identify them. My uncle registered ours. They never came back.
1:04:30|G2|Is it legal to buy them at all? I saw some at a market.
1:04:35|I|Ah — the Vandoma? The Saturday flea market? Okay. So, it's complicated. Modern copies, totally fine. Old ones, if they have mortar on the back — that's the sign it came off a wall. Then you have to ask where.
1:06:05|I|And the sellers will tell you, oh, it's from a demolition. Sometimes true. A lot of buildings were demolished in the sixties, seventies. Sometimes not true.
1:07:00|I|My cousin is a restorer, she works for the city, and she says the worst thing is the gaps — once one tile is gone, water gets behind, and in five years you lose twenty more.
1:08:15|G|Is that why the station is so famous? São Bento — all the tiles?
1:08:20|I|São Bento! Oh, you have to go. Twenty thousand tiles, Jorge Colaço, the battles, the history of transport — finished around 1916. And it's free, it's a working station, you just walk in.
1:09:40|I|Colaço also did the side of the Santo Ildefonso church, up at Batalha. And the Capela das Almas, on Santa Catarina — that's Eduardo Leite, 1929, I think — that one is the whole outside covered, sixteen thousand tiles.
1:11:00|I|If you only have time for one, Capela das Almas at about five in the afternoon, when the light comes along the street. I take my nieces there. They're bored after four minutes, but four minutes is enough.
1:12:10|I|And then there's the Fábrica Sant'Anna in Lisbon, still making them by hand, you can buy one there that's not stolen —
1:12:45|G|(laughs) Good to know.
1:12:50|I|— and my grandmother would want me to say: buy the new ones. Leave the old ones on the walls.
1:13:52|I|Okay — I have completely lost track of time. Sorry! Back to this church. Where was I?
1:14:10|G2|Saint Nicholas, the gold.
1:14:13|I|Thank you. Yes. So the three bags of gold — that's why he becomes Santa Claus, eventually. Saint Nicholas, Sinterklaas, Santa Claus. The gift through the window.
1:15:20|I|Inside, normally I'd take you in — there's gilded woodwork, talha dourada, the gold carving Porto is famous for. But there's a mass right now, so we'll respect that.
1:16:30|I|What I want you to take from here: when you walk around Porto today, look at the walls. Every tile you see was painted by a person. And many of them are on houses, not churches — that's the Porto thing. We'll see some in a minute.
1:17:40|G|Can we go inside after the mass?
1:17:44|I|Mass ends at eleven-thirty, so — yes, after the tour, absolutely. It's free. Just be quiet and no flash photos.
1:18:30|I|Okay. Photos now, two minutes, then we walk. Take one with the doorway — the light is good right now.
1:18:50|W|[Photos — group chatter]
1:20:40|I|Right, let's go. Up the steps on the left, Rua da Reboleira. Hold the rail.
1:21:00|W|[Walking]
1:21:55|I|This street is one of the oldest in Porto. Rua da Reboleira. Look at the house with the tower — number 59 — that's a medieval merchant house, fourteenth century, one of very few left.
1:23:10|I|The ground floor was the warehouse — goods from the river came straight in. The family lived upstairs, away from the damp and the smell.
1:24:30|I|And look at the next houses along — narrow, iron balconies, and the tiles on the front. You see? Now you know how to look.
1:25:30|I|These are a different style from the church. Small, patterned, repeating — sometimes in relief, so they catch the light. Like my grandmother's house, which I already told you about. (laughs)
1:26:40|I|Tiles on the outside of houses became fashionable from the 1850s. Before that, tiles were for inside — churches, palaces, kitchens. Outside it was practical: it protects from the rain, and it's easy to wash.
1:28:00|G|So the church front came later than the inside?
1:28:04|I|Hm. Good question. I… I'll check that for you, actually. I don't want to tell you something wrong.
1:28:40|I|Okay, the doorways — look at the stone. Granite. Everything in Porto is granite, it's why the city looks grey when it rains and gold when it's sunny.
1:30:10|I|And the little shrine on the corner, with the candle — that's still looked after by a lady who lives here. Dona Fernanda. She's ninety-one. She changes the flowers every Thursday.
1:31:20|I|Next stop — lunch, part two. It's very traditional, and I'm going to ask you to be brave.
1:31:45|W|[Walking — Rua dos Mercadores]
1:33:20|I|This is Dona Rosa's. Sit, sit, the long table at the back is ours.
1:34:05|I|So. Why are people from Porto called tripeiros — tripe eaters? The story is 1415. The fleet leaving for Ceuta, in North Africa. Porto gave all its meat to the sailors, and kept only the tripe for itself.
1:35:40|I|Is it true? Historians argue. But we're proud of it. And this dish — tripas à moda do Porto — tripe with white beans, chouriço, carrot, cumin. It's Sunday food.
1:37:00|G2|I'll try it, but I'm not promising anything.
1:37:04|I|That's all I ask. Half the group usually loves it. The other half loves the bread.
1:37:40|W|[Food arrives — eating, chatter]
1:41:05|I|The trick with tripas is it cooks for hours. Dona Rosa starts at six in the morning. It's not fast food. It's the opposite of fast food. It's slow food that somehow became the city's whole personality.
1:42:30|G|Okay, I'll admit, the beans are amazing.
1:42:35|I|See? Converted.
1:43:10|I|Dona Rosa's daughter, Paula, is the one who'll run it next — say hello, she's at the counter. Third generation.
1:45:00|I|While you eat — let me tell you about the merchants who lived on this street. Rua dos Mercadores, literally merchants' street. Cloth, mostly. Flemish cloth, English wool coming in, wine going out.
1:47:20|I|The English connection is very old — the Treaty of Windsor, 1386, the oldest alliance in the world still in force. Porto and England have been doing business for more than six hundred years.
1:49:30|G|Is that why the port houses have English names?
1:49:34|I|Exactly. Taylor's, Croft, Graham's, Sandeman — Sandeman was Scottish, but don't tell him. The English came for the wine, stayed for the money.
1:51:00|W|[Eating — background chatter]
1:55:10|I|Okay, coffee for those who want — a cimbalino, that's what we call an espresso here in Porto. In Lisbon they say bica. Don't mix them up.
1:57:40|I|Right. Let's walk off this lunch. Down to the square with the statue.
1:58:00|W|[Walking]
1:58:40|I|Okay — the man on the column: Infante Dom Henrique. Henry the Navigator. Born in Porto, 1394, a few metres from here, in the house that's now a museum.
1:59:50|I|He didn't navigate anything himself, by the way. He paid for others to do it. The first great sponsor.
2:00:50|I|Behind you, the Palácio da Bolsa — the old stock exchange. Built by the merchants' association from 1842. The Arab Room inside is unbelievable — all gold and patterns. Book a visit, it's guided only.
2:02:30|G|Is it worth the ticket?
2:02:33|I|For the Arab Room alone, yes. Twenty minutes, in and out.
2:03:20|I|The Bolsa was built on the ruins of the São Francisco convent — which burned during the siege, in 1832. Which brings us to the church right next door.
2:05:30|W|[Walking — a few metres]
2:06:15|I|From outside it looks simple — Gothic, grey, a bit severe. Inside, it's the opposite: most of the walls are covered in gilded carving. Something like three hundred kilos of gold, people say.
2:07:40|I|In the nineteenth century the bishop said it was too much — people weren't praying, they were staring. So it was closed for worship. It's a museum now.
2:09:00|I|There are catacombs underneath — the merchant families were buried there. You can still see the numbered tombs.
2:09:50|I|The fire I mentioned, at the convent — it was the siege, 1833, when the liberals were defending the city…
2:11:00|G2|How long was the siege?
2:11:03|I|About a year. Hunger, cholera. Porto got the title "Invicta" — the unconquered — from that time. You'll see it on the city crest.
2:12:20|I|Okay! Last stop, and it's the one you've been waiting for.
2:12:40|W|[Walking — Cais da Estiva]
2:13:30|I|Here we are. Sit, there's a glass for everyone. This one is a ten-year-old tawny. Smell it first.
2:14:40|I|Port is wine where they stop the fermentation with grape spirit — brandy, basically. That keeps the sugar and makes it strong, about twenty percent.
2:16:00|I|Tawny ages in small barrels, so it touches the wood a lot — nutty, caramel. Ruby ages in big vats, stays fruity, red. Both are good, both are Porto.
2:17:30|G|This is dangerous. It tastes like dessert.
2:17:34|I|That's why we drink it slowly. (laughs)
2:18:20|I|So — that's the walk. Thank you for being my first group on this one. I'll send you all a map tonight with the places we went, and the São Bento and Capela das Almas tips.
2:19:30|I|And please — tell me honestly — what was too long? What would you cut?
2:19:45|G|Honestly? Maybe the church was a bit long. But I loved the grandmother story.
2:19:55|I|(laughs) Everyone loves the grandmother. Okay. Noted. Obrigada, everyone!
2:20:30|W|[Goodbyes — group disperses]
2:21:50|W|[Recording ends]
`);

const stops: [string, string, string, number][] = [
  ['Praça da Ribeira — meeting point', '0:00:00', '0:09:40', 10],
  ['Cais da Ribeira & the rabelo boats', '0:09:40', '0:22:05', 12],
  ["Adelino's — bolinhos de bacalhau", '0:22:05', '0:48:10', 25],
  ['São Nicolau church — the tile façade', '0:48:10', '1:21:55', 14],
  ['Rua da Reboleira — medieval houses', '1:21:55', '1:33:20', 11],
  ["Dona Rosa's — tripas à moda do Porto", '1:33:20', '1:58:40', 24],
  ['Praça do Infante & Palácio da Bolsa', '1:58:40', '2:06:15', 8],
  ['São Francisco church (outside)', '2:06:15', '2:13:30', 7],
  ['Cais da Estiva — port tasting & wrap-up', '2:13:30', '2:22:14', 9],
];

export const RIBEIRA_ID = 'tour-ribeira-trial';

export const ribeira: Item = {
  id: RIBEIRA_ID,
  kind: 'tour',
  title: 'Ribeira & the River Trades',
  subtitle: 'Trial run',
  route: 'Ribeira & the River Trades',
  date: '2026-11-15',
  duration: ts('2:22:14'),
  planned: 120 * 60,
  guests: 8,
  weather: 'Dry, 14°C',
  tag: 'New route',
  chapters: stops.map(([title, s, e, p]) => ({ title, start: ts(s), end: ts(e), planned: p * 60 })),
  transcript,
  position: ts('0:36:24'),
  played: ts('0:36:24'),
};

export const ribeiraBookmarks: Bookmark[] = [
  { id: 'bm1', itemId: RIBEIRA_ID, t: ts('0:07:15'), note: 'weather bit again — say it once, cut this', kind: 'note', created: '2026-11-15T21:12:00' },
  { id: 'bm2', itemId: RIBEIRA_ID, t: ts('0:52:30'), note: 'wrong year — 1739?', kind: 'note', created: '2026-11-15T21:40:00' },
  { id: 'bm3', itemId: RIBEIRA_ID, t: ts('1:00:40'), note: 'cut here?', kind: 'note', created: '2026-11-15T21:44:00' },
  { id: 'bm4', itemId: RIBEIRA_ID, t: ts('1:26:40'), note: "said 'from the 1850s' — check lecture", kind: 'note', created: '2026-11-15T22:03:00' },
  { id: 'bm5', itemId: RIBEIRA_ID, t: ts('1:41:05'), note: 'slow food line — keep', kind: 'note', created: '2026-11-15T22:10:00' },
  { id: 'bm6', itemId: RIBEIRA_ID, t: ts('2:09:50'), note: 'siege fire: said 1832 AND 1833', kind: 'note', created: '2026-11-15T22:19:00' },
];
