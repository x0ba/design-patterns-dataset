// More history, July – November 2026. Same shape as conversations.mjs.
export const extraConversations = [
  {
    topic: 'Spanish – small talk with neighbors',
    icon: 'orange-circle',
    at: '2026-07-24 08:40',
    lang: 'es',
    msgs: [
      ['u', 'practice small talk in spanish like i just met my neighbor in the elevator'],
      ['a', '¡Buenos días! ¿Usted es el nuevo vecino del 302? Yo soy Lupita, vivo en el 405.'],
      ['u', 'si soy daniel me mude la semana pasada mucho gusto'],
      ['a', '¡Mucho gusto, Daniel! Muy bien dicho. Solo acentos: "Sí, soy Daniel. Me mudé la semana pasada." ¿Y de dónde es usted?'],
      ['u', 'soy de san diego pero mis padres son de corea'],
      ['a', '¡Qué interesante! Frase perfecta. ¿Y qué le trae a la Ciudad de México? ¿Trabajo o vacaciones?'],
      ['u', 'trabajo remoto. trabajo como ingeniero de software'],
      ['a', '"Trabajo de forma remota" o "trabajo en remoto" suena más natural. ¡Pero se entiende perfectamente! Bueno, aquí me bajo. ¡Que tenga buen día!']
    ]
  },
  {
    topic: 'Summarize: Thinking, Fast and Slow ch. 1–4',
    icon: 'purple-circle',
    at: '2026-07-29 21:15',
    lang: 'en',
    msgs: [
      ['u', 'I\'m in a book club and we\'re discussing the first part of Thinking, Fast and Slow on Sunday. Give me a short summary of chapters 1 to 4 and two discussion questions.'],
      ['a', '**Summary:** Kahneman introduces System 1 (fast, automatic, intuitive) and System 2 (slow, effortful, deliberate). System 2 is lazy and often accepts System 1\'s answers; self-control and focus deplete the same resources; priming shows how subtly context shapes behavior.\n\n**Questions:**\n1. Where do you rely on System 1 at work?\n2. Do the priming studies convince you, given the replication crisis?'],
      ['u', 'oh good point about replication. which studies didn\'t replicate'],
      ['a', 'Most notably the "Florida effect" (elderly-word priming making people walk slower) and several money-priming studies. Kahneman himself acknowledged in 2017 that he had placed too much faith in underpowered studies in Chapter 4.']
    ]
  },
  {
    topic: 'Mock interview: system design – rate limiter',
    icon: 'blue-circle',
    liked: true,
    at: '2026-08-03 20:02',
    lang: 'en',
    msgs: [
      ['u', 'Next round is system design. Interview me: design a rate limiter for a public API.'],
      ['a', 'Let\'s start. Before designing anything, what clarifying questions would you ask me about the requirements?'],
      ['u', 'i would ask what the limits are per user or per ip, whether it\'s distributed across multiple servers, what happens when someone is over the limit, and how strict it needs to be like can we allow small bursts'],
      ['a', 'Great questions. Answers: per API key, 1,000 requests/minute, running on 40 servers globally, return HTTP 429, small bursts are fine. Which algorithm would you pick, and why?'],
      ['u', 'I\'d use a token bucket since it allows bursts. Store the bucket state in Redis keyed by API key, with a Lua script so the refill-and-decrement is atomic.'],
      ['a', 'Solid. Follow-up: Redis is now a single point of failure and adds latency to every request across regions. How would you handle that?'],
      ['u', 'maybe a local in memory limiter on each server that syncs with redis every few hundred milliseconds so it\'s approximately correct, and fail open if redis is down'],
      ['a', 'Excellent—mentioning the accuracy vs. latency trade-off and failing open is exactly what interviewers look for. Also mention returning `X-RateLimit-Remaining` and `Retry-After` headers. Overall: strong hire signal on this question.']
    ]
  },
  {
    topic: 'Help with Mexican visa / FMM',
    icon: 'green-circle',
    at: '2026-08-06 14:30',
    lang: 'en',
    msgs: [
      ['u', 'Do I need a visa to stay in Mexico for 3 months as a US citizen working remotely for a US company?'],
      ['a', 'US citizens can enter Mexico visa-free as visitors for up to 180 days; the officer decides the number of days on your FMM/entry stamp, so be ready to show a return ticket and accommodation. Remote work for a foreign employer is a gray area—check the latest rules with the Mexican consulate before you go.'],
      ['u', 'ok thanks. what should i say at immigration in spanish'],
      ['a', 'Keep it simple: "Vengo de turismo por tres meses. Me voy a quedar en la colonia Roma. Aquí tengo mi boleto de regreso." Short, honest answers work best.']
    ]
  },
  {
    topic: 'New Conversation',
    icon: 'blue-circle',
    at: '2026-08-10 07:55',
    lang: 'en',
    msgs: []
  },
  {
    topic: 'Japanese – ordering ramen',
    icon: 'red-circle',
    liked: true,
    at: '2026-08-17 19:44',
    lang: 'ja',
    msgs: [
      ['u', 'Role-play: I walk into a ramen shop in Tokyo. You are the staff. Use simple Japanese with romaji and English in brackets.'],
      ['a', 'Irasshaimase! Nanmei-sama desu ka? [Welcome! How many people?]'],
      ['u', 'hitori desu'],
      ['a', 'Hai, kochira e douzo. Shokken wa ano kikai de onegaishimasu. [This way, please. Please buy a meal ticket at that machine.]'],
      ['u', 'what does shokken mean'],
      ['a', 'Shokken (食券) is a meal ticket. Many ramen shops have a vending machine at the entrance: you pay, pick your dish, and hand the ticket to the staff. Look for 醤油 (shoyu) or 豚骨 (tonkotsu) buttons.'],
      ['u', 'tonkotsu ramen o kudasai. kaedama wa arimasu ka'],
      ['a', 'Hai, kaedama wa hyaku-en desu! [Yes, an extra noodle refill is 100 yen.] Great job—"kaedama" is a pro-level word. Tip: say "katame de" for firmer noodles.']
    ]
  },
  {
    topic: 'Tokyo 10-day itinerary',
    icon: 'red-circle',
    at: '2026-08-21 22:10',
    lang: 'en',
    msgs: [
      ['u', 'I land at Haneda on Sept 12 and leave Sept 22. I like food, design, architecture, and walking around neighborhoods. Not big on nightlife. Rough itinerary?'],
      ['a', '**Days 1–2:** Shibuya, Daikanyama, Nakameguro (design shops, cafés)\n**Day 3:** Asakusa & Kuramae (craft workshops)\n**Day 4:** Omotesando architecture walk (Prada, Tod\'s, Nezu Museum)\n**Day 5:** Day trip to Kamakura\n**Days 6–7:** Kyoto by Shinkansen\n**Day 8:** Yanaka & Nezu (old Tokyo)\n**Day 9:** Tsukiji outer market, Ginza\n**Day 10:** Shimokitazawa, packing'],
      ['u', 'is two days in kyoto enough or should i do three'],
      ['a', 'Two days covers highlights (Fushimi Inari early, Higashiyama, Arashiyama) but feels rushed. If architecture matters to you, take three and drop Kamakura—Kyoto has more of what you like.'],
      ['u', 'ok swap kamakura for a third kyoto day'],
      ['a', 'Updated: Days 5–7 Kyoto. Book the Shinkansen with a reserved seat on the right side (E seat) going west for a view of Mt. Fuji on clear days.']
    ]
  },
  {
    topic: 'Wedding toast – final run-through',
    icon: 'purple-circle',
    at: '2026-08-28 23:31',
    lang: 'en',
    msgs: [
      ['u', 'wedding is tomorrow. i\'m nervous. any last tips for delivering the toast'],
      ['a', 'You\'ll do great. Hold the notes on a small card, look up at the couple during the emotional lines, and pause after jokes. Take one slow breath before you start. And keep the drink in your other hand—not the mic hand!'],
      ['u', 'haha ok. what if i forget a line'],
      ['a', 'Just look at your card and smile—nobody minds. If you blank completely, jump to the closing toast. Audiences remember warmth, not perfect wording.']
    ]
  },
  {
    topic: 'Spanish – doctor visit vocabulary',
    icon: 'orange-circle',
    at: '2026-09-02 17:05',
    lang: 'es',
    msgs: [
      ['u', 'teach me how to describe symptoms at a doctor in spanish'],
      ['a', '• Me duele la cabeza / la garganta / el estómago – my head/throat/stomach hurts\n• Tengo fiebre – I have a fever\n• Tengo tos – I have a cough\n• Estoy mareado – I\'m dizzy\n• Desde hace dos días – for two days\n• Soy alérgico a la penicilina – I\'m allergic to penicillin'],
      ['u', 'me duele la garganta desde hace tres dias y tengo un poco de fiebre'],
      ['a', '¡Perfecto! Muy natural. El doctor podría preguntar: "¿Ha tomado algún medicamento?" ¿Cómo responderías?'],
      ['u', 'si tome ibuprofeno ayer'],
      ['a', '¡Bien! Con acentos: "Sí, tomé ibuprofeno ayer." También puedes decir "Tomé un ibuprofeno anoche." Gran trabajo.']
    ]
  },
  {
    topic: 'Fix: TypeScript "possibly undefined" error',
    icon: 'cyan-circle',
    at: '2026-09-05 11:48',
    lang: 'en',
    msgs: [
      ['u', 'TS says Object is possibly undefined on `user.profile.avatarUrl` even though I check `if (user)` first. Why?'],
      ['a', 'Your check narrows `user`, but `profile` itself is probably optional (`profile?: Profile`). Use optional chaining: `user.profile?.avatarUrl`, or check `if (user?.profile)` before accessing it.'],
      ['u', 'ah yes profile is optional. thanks']
    ]
  },
  {
    topic: 'Tokyo trip – train etiquette',
    icon: 'red-circle',
    at: '2026-09-13 06:20',
    lang: 'en',
    msgs: [
      ['u', 'just landed in tokyo. quick tips for trains and suica'],
      ['a', 'Add Suica to Apple Wallet—tap in and out at gates. Stand on the left of escalators in Tokyo (right in Osaka). Keep phone calls off, backpack in front during rush hour, and queue at the marked lines on the platform. Welcome to Tokyo!'],
      ['u', 'how do i say excuse me im getting off'],
      ['a', '"Sumimasen, orimasu" (すみません、降ります). Say it gently while moving toward the door—people will make space.']
    ]
  },
  {
    topic: 'Japanese – thanking a host',
    icon: 'red-circle',
    at: '2026-09-18 21:57',
    lang: 'ja',
    msgs: [
      ['u', 'I stayed at a ryokan in Kyoto and the owner was super kind. How can I thank her politely in Japanese when I check out tomorrow?'],
      ['a', 'Try: "Taihen osewa ni narimashita. Hontou ni arigatou gozaimashita." [Thank you for taking such good care of me.] Add a slight bow. If you want more: "Mata kitai desu" [I\'d love to come again].'],
      ['u', 'taihen osewa ni narimashita hontou ni arigatou gozaimashita mata kitai desu'],
      ['a', 'Beautiful! That\'s exactly right and very polite. She\'ll appreciate the effort.']
    ]
  },
  {
    topic: 'Packing list – 3 months CDMX',
    icon: 'green-circle',
    at: '2026-09-27 15:12',
    lang: 'en',
    msgs: [
      ['u', 'Packing for 3 months in Mexico City, Oct to Dec. Working remotely. What should I bring that I might forget?'],
      ['a', '- Light layers + a warm jacket (Dec nights drop to ~6°C)\n- Compact umbrella (October rain)\n- Universal adapter isn\'t needed—same plugs as US\n- Laptop stand & travel keyboard\n- Copies of passport and lease\n- Electrolytes, sunscreen (altitude 2,240 m)\n- A small Spanish phrasebook or offline translator pack'],
      ['u', 'good call on altitude. anything about water'],
      ['a', 'Don\'t drink tap water. Most apartments have a garrafón (20 L jug) delivery service—ask your landlord which company they use. Ice in restaurants is usually purified.']
    ]
  },
  {
    topic: 'Spanish – first week in CDMX',
    icon: 'orange-circle',
    liked: true,
    at: '2026-10-06 20:33',
    lang: 'es',
    msgs: [
      ['u', 'quiero contarte sobre mi primera semana en la ciudad de mexico solo en español'],
      ['a', '¡Me encanta la idea! Cuéntame, ¿qué fue lo que más te sorprendió?'],
      ['u', 'me sorprendio que hay mucha comida en la calle y todo es muy barato. comi tacos al pastor cuatro veces'],
      ['a', '¡Cuatro veces! Muy bien dicho. Solo: "Me sorprendió que hubiera tanta comida callejera" (subjuntivo) es más avanzado, pero tu versión es correcta y natural. ¿Dónde comiste los mejores?'],
      ['u', 'en una taqueria en la colonia condesa se llama el califa creo'],
      ['a', '¡El Califa es famoso! "Creo que se llama El Califa" suena un poco más natural. ¿Y cómo te va con el español en la vida real?'],
      ['u', 'es dificil porque la gente habla muy rapido y usan muchas palabras que no conozco como neta y chido'],
      ['a', '¡Ja! "¿Neta?" significa "¿en serio?" y "chido" es "cool". Otras útiles: "¿qué onda?" (¿qué tal?), "padrísimo" (genial), "ahorita" (ahora… o más tarde, depende). ¡Ya estás aprendiendo el español chilango!'],
      ['u', 'ahorita is confusing lol'],
      ['a', 'Totally! "Ahorita" can mean right now, in five minutes, or never. Context and tone are everything. Try using it this week: "Ahorita vengo" (I\'ll be right back).']
    ]
  },
  {
    topic: 'Draft: message to coworking space',
    icon: 'green-circle',
    at: '2026-10-08 10:02',
    lang: 'es',
    msgs: [
      ['u', 'Help me write a WhatsApp message in Spanish to a coworking space asking about monthly prices for a hot desk and if they have phone booths for calls.'],
      ['a', 'Hola, buenas tardes. Estoy interesado en un escritorio compartido (hot desk) por mes. ¿Me podrían compartir los precios y horarios? También quisiera saber si tienen cabinas para llamadas o videollamadas. ¡Muchas gracias!'],
      ['u', 'perfect, can it sound a bit less formal'],
      ['a', '¡Hola! 👋 Me interesa un hot desk por mes. ¿Cuánto cuesta y qué horarios tienen? ¿Hay cabinas para llamadas? ¡Gracias!']
    ]
  },
  {
    topic: 'Explain React Server Components simply',
    icon: 'cyan-circle',
    at: '2026-10-13 09:27',
    lang: 'en',
    msgs: [
      ['u', 'My PM asked what React Server Components are. Explain it in a way I can repeat to a non-engineer in 30 seconds.'],
      ['a', '"Normally, the user\'s browser downloads code and builds the page itself. With Server Components, our server builds parts of the page ahead of time and sends just the finished pieces. The page loads faster and the browser does less work—especially on slower phones."'],
      ['u', 'nice and what\'s the downside i should mention'],
      ['a', '"It adds complexity for engineers: we have to think about which parts run on the server versus the browser, and some libraries don\'t support it yet. So it\'s a gradual adoption, not a flip of a switch."']
    ]
  },
  {
    topic: 'Spanish – Día de Muertos',
    icon: 'orange-circle',
    at: '2026-10-29 19:16',
    lang: 'es',
    msgs: [
      ['u', 'explicame en español simple que es el dia de muertos y que debo hacer como visitante'],
      ['a', 'El Día de Muertos (1 y 2 de noviembre) celebra a los seres queridos que murieron. Las familias ponen ofrendas con fotos, flores de cempasúchil, pan de muerto y su comida favorita. Como visitante: observa con respeto, pide permiso antes de tomar fotos y prueba el pan de muerto. ¿Vas a ir a algún desfile?'],
      ['u', 'si voy a ir al desfile en el zocalo el sabado con unos amigos del coworking'],
      ['a', '¡Qué padre! Frase muy natural. Llega temprano, porque hay mucha gente. ¿Se van a maquillar como catrinas?'],
      ['u', 'mi amiga quiere maquillarme pero tengo miedo jaja'],
      ['a', '¡Jaja! No pasa nada, es parte de la diversión. Puedes decirle: "Va, pero algo sencillo, ¿sí?" ¡Disfruta mucho!']
    ]
  },
  {
    topic: 'Interview follow-up – offer negotiation',
    icon: 'blue-circle',
    liked: true,
    at: '2026-11-03 18:45',
    lang: 'en',
    msgs: [
      ['u', 'I got the offer!! Base is $192k, 0.04% equity, $15k signing. I was hoping for $205k base. How should I negotiate?'],
      ['a', 'Congratulations! 🎉 Express enthusiasm first, then anchor with data: "I\'m really excited to join. Based on market data for senior frontend roles and my payments experience, I was expecting a base closer to $210k. Is there flexibility?" Asking slightly above $205k leaves room.'],
      ['u', 'should i mention the other company i\'m interviewing with'],
      ['a', 'Only if it\'s real and active. Say it neutrally: "I\'m also in final stages with another company, but this role is my first choice." It creates urgency without sounding like a threat.'],
      ['u', 'they came back with 203 base and 25k signing. take it?'],
      ['a', 'That\'s a strong result—$11k more base and $10k more signing. Unless equity or start date matter more to you, it\'s reasonable to accept. You could ask once about the equity refresh policy, then sign.'],
      ['u', 'accepted! start date is january 12'],
      ['a', 'Amazing, congratulations! That gives you time to finish your stay in Mexico City. Enjoy the last weeks there before starting.']
    ]
  },
  {
    topic: 'Spanish – explaining my job',
    icon: 'orange-circle',
    at: '2026-11-09 20:05',
    lang: 'es',
    msgs: [
      ['u', 'help me explain my new job in spanish to my neighbor lupita'],
      ['a', '¡Claro! Intenta decirlo tú primero y yo te corrijo. Empieza con: "Conseguí un trabajo nuevo en…"'],
      ['u', 'consegui un trabajo nuevo en una empresa de pagos en linea. voy a ser ingeniero senior y voy a trabajar en la pagina donde la gente paga'],
      ['a', '¡Muy bien! Con acentos: "Conseguí", "línea", "página". Más natural: "Voy a trabajar en la parte del pago, donde los clientes compran". ¿Cuándo empiezas?'],
      ['u', 'empiezo en enero pero primero regreso a san diego en diciembre para navidad'],
      ['a', '¡Perfecto, sin errores! Lupita seguramente te dirá: "¡Felicidades! Te vamos a extrañar." ¿Cómo le responderías?'],
      ['u', 'gracias yo tambien voy a extrañarlos mucho'],
      ['a', '¡Precioso! También: "Yo también los voy a extrañar mucho." Las dos formas son correctas.']
    ]
  },
  {
    topic: 'chicken tinga recipe',
    icon: 'green-circle',
    at: '2026-11-11 18:12',
    lang: 'en',
    msgs: [
      ['u', 'my neighbor made chicken tinga and i want to make it for my coworking friends. simple recipe for 6 people'],
      ['a', '**Chicken tinga (6 servings)**\n1. Poach 1 kg chicken breast with onion & garlic, 20 min; shred.\n2. Blend 4 tomatoes, 3 chipotles in adobo, 2 garlic cloves, salt.\n3. Sauté 2 sliced onions until soft, add sauce, simmer 5 min.\n4. Add chicken + ½ cup broth, cook 10 min.\nServe on tostadas with crema, lettuce, and queso fresco.'],
      ['u', 'how spicy is 3 chipotles'],
      ['a', 'Medium—noticeable heat but not overwhelming. For a milder version use 2 chipotles and an extra spoonful of the adobo sauce for smoky flavor.']
    ]
  },
  {
    topic: 'Pronunciation: Spanish r and rr',
    icon: 'purple-circle',
    at: '2026-11-14 08:30',
    lang: 'es',
    msgs: [
      ['u', 'people still don\'t understand me when i say "perro" vs "pero". help'],
      ['a', '"Pero" uses a single tap—like the "tt" in American "butter". "Perro" is a trill: relax your tongue behind your top teeth and let air make it vibrate. Practice "butter → pero", then hold it: "perrrro".'],
      ['u', 'pero perro pero perro'],
      ['a', 'The transcription caught both—good sign! Try a tongue twister: "Erre con erre cigarro, erre con erre barril, rápido ruedan los carros del ferrocarril." Slowly first.'],
      ['u', 'erre con erre cigarro erre con erre barril rapido ruedan los carros del ferro carril'],
      ['a', '¡Muy bien! "Ferrocarril" is one word, but the recognizer split it—probably because you paused. Try saying it in one breath: fe-rro-ca-RRIL. You\'re improving!']
    ]
  },
  {
    topic: 'Last week in CDMX – plans',
    icon: 'orange-circle',
    at: '2026-11-15 21:20',
    lang: 'es',
    msgs: [
      ['u', 'I have about 3 weeks left in Mexico City. Help me plan things I haven\'t done yet. I\'ve done Coyoacán, Teotihuacán, Chapultepec and the Zócalo.'],
      ['a', 'Ideas you haven\'t covered:\n- **Xochimilco** trajineras on a weekday morning\n- **Museo Anahuacalli** (Diego Rivera\'s pyramid-museum)\n- **Casa Luis Barragán** – book weeks ahead\n- **San Ángel** Saturday art market\n- **Lucha libre** at Arena México on Tuesday or Friday\n- Day trip to **Puebla** for mole poblano'],
      ['u', 'casa barragan sounds perfect since i like architecture. how do i book'],
      ['a', 'Book on the official Casa Luis Barragán website; tours are small and often sell out 2–3 weeks ahead. There are English and Spanish tours—take the Spanish one for practice!'],
      ['u', 'jaja ok voy a reservar el tour en español'],
      ['a', '¡Excelente decisión! Prepárate con palabras como "la luz", "el patio", "los muros" y "la escalera". ¿Quieres practicar algunas preguntas para el guía?']
    ]
  }
];
