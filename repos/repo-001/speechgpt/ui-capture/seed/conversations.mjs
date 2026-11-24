// Conversation history for the seeded user: a software engineer practicing
// Spanish (moving to Mexico City for 3 months), some Japanese for a Tokyo trip,
// interview prep, presentation practice, and assorted everyday questions.
// Many user turns came from speech recognition, so they are lowercase,
// unpunctuated, or contain mis-transcriptions — as real voice input does.
//
// Each entry: { topic, icon, liked, at: 'YYYY-MM-DD HH:MM', lang, msgs: [[role, text], ...] }
// 'u' = user, 'a' = assistant

export const conversations = [
  {
    topic: 'Spanish – ordering at a café',
    icon: 'orange-circle',
    liked: true,
    at: '2026-05-04 08:12',
    lang: 'es',
    msgs: [
      ['u', 'Let\'s practice Spanish. Pretend you are a barista in Mexico City and I am ordering.'],
      ['a', '¡Claro! Buenos días, bienvenido a Café Avellaneda. ¿Qué le puedo servir hoy?'],
      ['u', 'hola buenos dias yo quiero un cafe con leche por favor'],
      ['a', '¡Muy bien! Más natural: "Me gustaría un café con leche, por favor" o "¿Me da un café con leche?". ¿Lo quiere caliente o frío, y de qué tamaño?'],
      ['u', 'caliente por favor y mediano'],
      ['a', 'Perfecto, un café con leche mediano y caliente. ¿Algo para comer? Hoy tenemos conchas recién horneadas y pan de elote.'],
      ['u', 'what is a concha'],
      ['a', 'A concha is a sweet Mexican bread roll with a crunchy sugar topping shaped like a seashell. Try asking for one in Spanish: "¿Me da una concha de vainilla?"'],
      ['u', 'me da una concha de vainilla tambien'],
      ['a', '¡Excelente! Son 78 pesos. ¿Paga con tarjeta o en efectivo?'],
      ['u', 'con tarjeta'],
      ['a', 'Muy bien. Acerque la tarjeta, por favor… ¡Listo! Su pedido estará en la barra en un momento. Great job — your sentences were short but completely understandable.']
    ]
  },
  {
    topic: 'Mock interview: Senior Frontend @ fintech',
    icon: 'blue-circle',
    liked: true,
    at: '2026-05-11 21:40',
    lang: 'en',
    msgs: [
      ['u', 'I have a final round interview on Thursday for a senior frontend engineer role at a payments company. Can you act as the hiring manager and ask me behavioral questions one at a time?'],
      ['a', 'Happy to. First question: tell me about a project where you had to make a significant technical decision with incomplete information. What did you decide, and how did it turn out?'],
      ['u', 'so last year we had to choose between rewriting our checkout in react or incrementally migrating from backbone and we didn\'t really know how much traffic the old flows got so i pushed for the incremental approach using a strangler pattern and we migrated about 80% in six months without any downtime'],
      ['a', 'Solid example. To strengthen it: mention how you reduced the uncertainty (e.g., adding analytics first), and quantify impact—conversion, bundle size, or incidents. Next: tell me about a time you disagreed with a product manager.'],
      ['u', 'Our PM wanted to ship a redesigned card form two weeks before Black Friday. I disagreed because we had no load testing on the new validation service. We compromised by shipping behind a feature flag to 5% of users and ramping after the holiday.'],
      ['a', 'That\'s strong—clear conflict, a reasoned position, and a compromise that protected the business. Add one line on how you kept the relationship good. Next: how do you mentor junior engineers?'],
      ['u', 'um i do weekly one on ones and i try to give them like ownership of small features end to end and i review their PRs with comments that explain the why not just the what'],
      ['a', 'Good substance, but drop the fillers ("um", "like") on the day. Consider naming a specific person\'s growth: "One engineer went from small bug fixes to leading our accessibility audit in eight months." Ready for a curveball question?'],
      ['u', 'yes'],
      ['a', 'Curveball: "What\'s something in our product you would change?" Tip: show you researched it, frame it respectfully, and tie it to user impact rather than personal taste.']
    ]
  },
  {
    topic: 'Japanese basics before Tokyo',
    icon: 'red-circle',
    liked: false,
    at: '2026-05-19 19:05',
    lang: 'en',
    msgs: [
      ['u', 'I\'m going to Tokyo in September for 10 days. What are the 10 most useful Japanese phrases for a tourist?'],
      ['a', '1. Sumimasen – excuse me/sorry\n2. Arigatou gozaimasu – thank you\n3. Kore wa ikura desu ka? – how much?\n4. ___ wa doko desu ka? – where is ___?\n5. Eigo no menyuu wa arimasu ka? – English menu?\n6. Kore o kudasai – this one, please\n7. Daijoubu desu – I\'m fine/no thanks\n8. Wakarimasen – I don\'t understand\n9. Okaikei onegaishimasu – check, please\n10. Toire wa doko desu ka? – where\'s the toilet?'],
      ['u', 'how do i pronounce arigatou gozaimasu'],
      ['a', 'Say it as: ah-ree-gah-toh go-zai-mahss. The final "u" is almost silent, and Japanese has no strong stress—keep each syllable even. Try saying it slowly, then naturally.'],
      ['u', 'ari gato go zai mass'],
      ['a', 'Very close! Blend "ari-gatou" into one smooth word and lengthen the "toh" slightly. You\'ll hear it constantly in shops, so you\'ll get plenty of practice.']
    ]
  },
  {
    topic: 'Rent negotiation email',
    icon: 'green-circle',
    liked: false,
    at: '2026-05-27 13:22',
    lang: 'en',
    msgs: [
      ['u', 'My landlord wants to raise the rent from $2,450 to $2,725 when the lease renews in August. Help me write a polite email asking to keep it closer to $2,550. I\'ve lived there 3 years and always paid on time.'],
      ['a', '**Subject:** Lease renewal – Unit 4B\n\nHi Mr. Alvarez,\n\nThank you for the renewal offer. I\'ve enjoyed living here for three years and have always paid on time. Would you consider $2,550/month for a 12-month renewal? I\'d be happy to sign promptly.\n\nBest regards,\nDaniel'],
      ['u', 'make it slightly firmer and mention comparable units in the area are listing around 2500'],
      ['a', 'Add after the first paragraph: "Comparable two-bedroom units nearby are currently listed around $2,500. Given my reliable payment history and low turnover cost for you, I believe $2,550 is fair." It stays polite but shows you\'ve done research.'],
      ['u', 'perfect thanks']
    ]
  },
  {
    topic: 'Pronunciation: tricky tech words',
    icon: 'purple-circle',
    liked: false,
    at: '2026-06-03 07:48',
    lang: 'en',
    msgs: [
      ['u', 'I\'m giving a talk at a meetup next week and I keep stumbling over some words. Can you help me practice? First one: "idempotent".'],
      ['a', 'It\'s pronounced "eye-dem-POH-tent", stress on the third syllable. Some people say "ID-em-poh-tent"—both are accepted in tech. Say it in a sentence: "PUT requests should be idempotent."'],
      ['u', 'put requests should be i dem potent'],
      ['a', 'Nice—the transcription caught all the syllables. Next word: "asynchronous". It\'s "ay-SING-kruh-nus", stress on the second syllable.'],
      ['u', 'a sink runner us'],
      ['a', 'Ha, the speech recognizer heard "a sink runner"! Try emphasizing the "SING" and linking the rest quickly: ay-SING-kruh-nus. Then try "ubiquitous": yoo-BIK-wih-tus.'],
      ['u', 'asynchronous. ubiquitous.'],
      ['a', 'Both correct this time! Last suggestion for your talk: slow down on key terms and pause after them. It sounds confident and gives the audience time to absorb them.']
    ]
  },
  {
    topic: 'Weeknight vegetarian dinners',
    icon: 'green-circle',
    liked: false,
    at: '2026-06-09 18:31',
    lang: 'en',
    msgs: [
      ['u', 'Give me 3 vegetarian dinner ideas that take under 30 minutes. I have chickpeas, spinach, feta, rice and a lot of lemons.'],
      ['a', '1. **Chickpea & spinach skillet** – sauté garlic, chickpeas, cumin, wilt spinach, top with feta and lemon.\n2. **Lemon feta rice bowls** – rice, roasted chickpeas, cucumber, herbs.\n3. **Greek-style spinach fritters** – spinach, feta, egg, flour; pan-fry, serve with lemon yogurt.'],
      ['u', 'the first one sounds good. how much cumin for two people'],
      ['a', 'About 1 teaspoon of ground cumin for one can of chickpeas (two servings). Toast it in the oil for 30 seconds before adding the chickpeas to bring out the flavor.']
    ]
  },
  {
    topic: 'Spanish – past tense practice',
    icon: 'orange-circle',
    liked: false,
    at: '2026-06-14 09:15',
    lang: 'es',
    msgs: [
      ['u', 'I want to practice the preterite. Ask me about my weekend in Spanish and correct my mistakes.'],
      ['a', '¡Vale! Cuéntame, ¿qué hiciste el fin de semana pasado?'],
      ['u', 'el sabado yo fui al mercado y compre fruta y despues yo cocine una paella con mis amigos'],
      ['a', '¡Muy bien! Solo acentos: "compré", "cociné", "sábado", "después". Y no necesitas repetir "yo": "El sábado fui al mercado, compré fruta y después cociné una paella". ¿Y el domingo?'],
      ['u', 'el domingo estaba muy cansado entonces miré una película en casa'],
      ['a', '¡Perfecto! Usaste el imperfecto "estaba" para describir y el pretérito "miré" para la acción. Eso es exactamente correcto. ¿Qué película viste?'],
      ['u', 'vi past lives es una pelicula muy triste pero bonita'],
      ['a', '¡Qué buena elección! Tu frase es natural. Una alternativa: "Es una película triste, pero muy bonita". ¿La recomendarías a tus amigos? ¿Por qué?'],
      ['u', 'si la recomendaria porque habla de las decisiones y del tiempo'],
      ['a', '¡Excelente! Recuerda el acento en "recomendaría" (condicional). Hoy usaste pretérito, imperfecto y condicional—gran progreso.']
    ]
  },
  {
    topic: 'Why is my useEffect running twice?',
    icon: 'cyan-circle',
    liked: false,
    at: '2026-06-22 23:02',
    lang: 'en',
    msgs: [
      ['u', 'In React 18 my useEffect that fetches data runs twice on mount and I see two network requests. Is that a bug?'],
      ['a', 'Not a bug. In development, React 18 StrictMode mounts, unmounts, and remounts components to surface missing cleanups. It doesn\'t happen in production builds. Add an AbortController cleanup so the first request is cancelled.'],
      ['u', 'can you show the abort controller version'],
      ['a', '```js\nuseEffect(() => {\n  const ctrl = new AbortController();\n  fetch(url, { signal: ctrl.signal })\n    .then(r => r.json())\n    .then(setData)\n    .catch(() => {});\n  return () => ctrl.abort();\n}, [url]);\n```'],
      ['u', 'nice that fixed the duplicate state update']
    ]
  },
  {
    topic: 'New Conversation',
    icon: 'blue-circle',
    liked: false,
    at: '2026-07-01 12:10',
    lang: 'en',
    msgs: [
      ['u', 'hey can you hear me'],
      ['a', 'Yes, your message came through clearly! What would you like to talk about today?']
    ]
  },
  {
    topic: 'Best man toast draft',
    icon: 'purple-circle',
    liked: true,
    at: '2026-07-08 22:47',
    lang: 'en',
    msgs: [
      ['u', 'My college roommate Marcus is getting married in August and I\'m the best man. I need a 2 minute toast. He met his fiancée Priya at a climbing gym. He is terrible at directions. Funny but not embarrassing.'],
      ['a', 'Opening: "For those who don\'t know me, I\'m Daniel—Marcus\'s roommate for four years and his unofficial GPS ever since." Then: "Marcus has gotten lost driving to his own house. So when he told me he\'d found the one, I double-checked the address."'],
      ['u', 'haha i like that. now a part about priya and climbing'],
      ['a', '"Then he met Priya at the climbing gym. She was on the hardest wall; he was… near it. But for the first time, Marcus knew exactly where he was going. Priya, thank you for being the one route he never gets lost on."'],
      ['u', 'that\'s really good. how should i end it'],
      ['a', 'End warmly and raise a glass: "Marcus, Priya—may your adventures always be uphill in the best way, and may you always find your way home to each other. Everyone, please raise your glasses: to Marcus and Priya!"'],
      ['u', 'let me read the whole thing out loud and you tell me if it sounds natural'],
      ['a', 'Go ahead! Read it at a relaxed pace and pause after each punchline. I\'ll give feedback on rhythm and wording.'],
      ['u', 'for those who dont know me im daniel marcus roommate for four years and his unofficial gps ever since marcus has gotten lost driving to his own house so when he told me he found the one i double checked the address'],
      ['a', 'Sounds natural! Pause for a beat after "ever since" and again after "his own house"—that\'s where the laughs will come. Overall length is about right for two minutes.']
    ]
  },
  {
    topic: 'Spanish – apartment hunting vocab',
    icon: 'orange-circle',
    liked: false,
    at: '2026-07-15 20:20',
    lang: 'es',
    msgs: [
      ['u', 'I\'m moving to Mexico City for 3 months in October. Teach me vocab for renting an apartment.'],
      ['a', '• el departamento – apartment (Mexico)\n• amueblado – furnished\n• el depósito – deposit\n• el contrato – lease\n• los servicios incluidos – utilities included\n• el fiador / aval – guarantor\n• la colonia – neighborhood\nTry: "¿El departamento está amueblado?"'],
      ['u', 'el departamento esta amueblado y los servicios estan incluidos'],
      ['a', '¡Muy bien! Como pregunta: "¿Los servicios están incluidos?" Ahora pregunta por el depósito y la duración mínima del contrato.'],
      ['u', 'cuanto es el deposito y cual es el contrato minimo'],
      ['a', 'Casi: "¿De cuánto es el depósito?" y "¿Cuál es la duración mínima del contrato?" Los mexicanos también dicen "¿Se puede rentar por tres meses?"'],
      ['u', 'se puede rentar por tres meses en la colonia roma'],
      ['a', '¡Perfecto! La Roma es muy popular. Tip: en Roma y Condesa muchos departamentos piden un aval; pregunta si aceptan "depósito adicional en lugar de aval".']
    ]
  },
  {
    topic: 'Explain index vs. composite index',
    icon: 'cyan-circle',
    liked: false,
    at: '2026-07-21 10:03',
    lang: 'en',
    msgs: [
      ['u', 'Quick one: when should I use a composite index in Postgres instead of two separate indexes?'],
      ['a', 'Use a composite index when queries filter on both columns together, especially with equality on the first and range/sort on the second, e.g. `(user_id, created_at)`. Column order matters: the leftmost column must appear in the filter.'],
      ['u', 'so where user_id = 5 order by created_at desc limit 20 would use it'],
      ['a', 'Exactly. Postgres can scan the index backward to satisfy the ORDER BY and stop after 20 rows—no separate sort step. Check with EXPLAIN ANALYZE to confirm.']
    ]
  }
];
