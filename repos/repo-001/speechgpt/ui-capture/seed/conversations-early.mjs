// Early use (March–April 2026): short speaking warm-ups and one-off questions,
// from when the user first started using SpeechGPT. Generated from a compact table.
const rows = [
  ['2026-03-02 07:58', 'First try – does voice work?', 'blue-circle', 'en', [
    ['u', 'testing testing is this thing on'],
    ['a', 'Loud and clear! I can read your speech transcription. What would you like to practice today?'],
    ['u', 'i want to get better at speaking spanish before i move to mexico in the fall'],
    ['a', 'Great goal! Let\'s practice a little every day. Start simple: introduce yourself in Spanish—your name, where you\'re from, and what you do.'],
    ['u', 'me llamo daniel soy de san diego y soy programador'],
    ['a', '¡Perfecto para empezar! Muy claro. Mañana podemos practicar cómo hablar de tu rutina diaria.']
  ]],
  ['2026-03-05 08:05', 'Spanish – daily routine', 'orange-circle', 'es', [
    ['u', 'normalmente me despierto a las siete y tomo cafe y despues trabajo en mi computadora'],
    ['a', '¡Muy bien! Solo un acento: "café", "después". ¿A qué hora terminas de trabajar?'],
    ['u', 'termino a las cinco y luego voy al gimnasio'],
    ['a', 'Perfecto. Fíjate que usaste "luego" correctamente. ¿Qué haces en el gimnasio?']
  ]],
  ['2026-03-09 21:30', 'Difference between ser and estar', 'orange-circle', 'en', [
    ['u', 'Explain ser vs estar with examples, short.'],
    ['a', '**Ser** = identity, traits, time, origin: "Soy ingeniero", "Es lunes".\n**Estar** = states, location, feelings: "Estoy cansado", "Estoy en casa".\nTrick: "Es aburrido" (he\'s boring) vs. "Está aburrido" (he\'s bored).']
  ]],
  ['2026-03-12 07:44', 'Spanish – describing my family', 'orange-circle', 'es', [
    ['u', 'tengo una hermana menor ella vive en seattle y es enfermera'],
    ['a', '¡Excelente! Todo correcto. ¿Cómo se llama tu hermana y qué le gusta hacer?'],
    ['u', 'se llama grace y le gusta mucho escalar y viajar'],
    ['a', '¡Qué bien! Frase perfecta. ¿Y tus padres? ¿Dónde viven?'],
    ['u', 'mis padres viven en san diego tambien cerca de mi'],
    ['a', '"También" lleva acento, pero el resto está perfecto. ¡Vas muy bien!']
  ]],
  ['2026-03-16 12:15', 'Lunch idea with leftover rice', 'green-circle', 'en', [
    ['u', 'what can i make for lunch with leftover rice, eggs, and kimchi'],
    ['a', 'Kimchi fried rice! Fry chopped kimchi in a little butter, add cold rice and a splash of kimchi juice, season with gochujang or soy sauce, and top with a fried egg. About 10 minutes.']
  ]],
  ['2026-03-19 08:02', 'Spanish – talking about the weather', 'orange-circle', 'es', [
    ['u', 'hoy hace mucho sol y hace calor en san diego'],
    ['a', '¡Muy bien usado el verbo "hacer"! ¿Y cómo es el clima en invierno allí?'],
    ['u', 'en invierno no hace mucho frio pero llueve a veces'],
    ['a', '¡Perfecto! Solo "frío" con acento. En la Ciudad de México, en octubre llueve mucho por las tardes, ¡prepárate!']
  ]],
  ['2026-03-24 22:40', 'Standup update – clearer wording', 'blue-circle', 'en', [
    ['u', 'Can you make my standup update sound clearer? "Yesterday I kind of worked on the checkout bug, it\'s mostly fixed but there\'s some edge cases maybe, today I\'ll probably look at that and also the design review."'],
    ['a', '"Yesterday I fixed the main checkout bug. A few edge cases remain—I\'ll finish those today. I\'ll also join the design review this afternoon." Cutting "kind of", "maybe", and "probably" makes you sound more confident.']
  ]],
  ['2026-03-28 09:10', 'Spanish – weekend plans (future)', 'orange-circle', 'es', [
    ['u', 'este fin de semana voy a ir a la playa con mis amigos y vamos a hacer una carne asada'],
    ['a', '¡Excelente uso de "ir a + infinitivo"! ¿Qué van a llevar para la carne asada?'],
    ['u', 'vamos a llevar tortillas guacamole y cervezas'],
    ['a', '¡Suena delicioso! Todo correcto. Para practicar más: ¿qué vas a hacer el domingo?']
  ]],
  ['2026-04-02 19:20', 'How to stop saying "um"', 'purple-circle', 'en', [
    ['u', 'I say um a lot when speaking. How do I stop?'],
    ['a', 'Replace "um" with a short silent pause—it sounds thoughtful, not hesitant. Practice by recording a 60-second answer daily and counting fillers. Slowing down slightly also reduces them a lot.'],
    ['u', 'ok let me try. um so the reason i like frontend is because um i like seeing results right away'],
    ['a', 'Two "ums"—a good baseline! Try again with a pause instead: "The reason I like frontend… is that I can see results right away."'],
    ['u', 'the reason i like frontend is that i can see results right away and i care about how people experience the product'],
    ['a', 'Zero fillers that time, and the second half was a strong addition. Keep practicing this way.']
  ]],
  ['2026-04-07 08:15', 'Spanish – at the pharmacy', 'orange-circle', 'es', [
    ['u', 'quiero practicar en una farmacia'],
    ['a', 'Buenas tardes, ¿en qué le puedo ayudar?'],
    ['u', 'buenas tardes necesito algo para el dolor de cabeza'],
    ['a', 'Claro, tenemos paracetamol o ibuprofeno. ¿Es alérgico a algún medicamento?'],
    ['u', 'no no soy alergico. me da el paracetamol por favor'],
    ['a', '¡Perfecto! Muy natural. Solo "alérgico" con acento. Son 45 pesos.']
  ]],
  ['2026-04-11 16:48', 'New Conversation', 'blue-circle', 'en', [
    ['u', 'what time is it in mexico city right now compared to pacific'],
    ['a', 'Mexico City doesn\'t observe daylight saving time anymore, so it\'s 1 hour ahead of Pacific Daylight Time in summer and 2 hours ahead of Pacific Standard Time in winter.']
  ]],
  ['2026-04-15 07:50', 'Spanish – telling a story (past)', 'orange-circle', 'es', [
    ['u', 'ayer fue un dia raro. perdi mis llaves y tenia que esperar a mi compañero por dos horas'],
    ['a', '¡Buena historia! Pequeñas correcciones: "perdí", "día", y "tuve que esperar" (acción completa, pretérito). ¿Qué hiciste mientras esperabas?'],
    ['u', 'mientras esperaba lei un libro en un cafe'],
    ['a', '¡Perfecto uso de "mientras" + imperfecto! Solo acentos: "leí", "café". ¿Qué libro leíste?']
  ]],
  ['2026-04-21 20:12', 'Git: undo last commit but keep changes', 'cyan-circle', 'en', [
    ['u', 'how do i undo my last git commit but keep the changes'],
    ['a', 'Run `git reset --soft HEAD~1`. The commit is removed, but your changes stay staged. Use `--mixed` (the default) to keep them unstaged instead.']
  ]],
  ['2026-04-26 09:35', 'Spanish – opinions & connectors', 'orange-circle', 'es', [
    ['u', 'teach me words to connect ideas when giving opinions in spanish'],
    ['a', '• Creo que… / Me parece que… – I think\n• Sin embargo – however\n• Además – also\n• Por eso – that\'s why\n• En cambio – on the other hand\nTry: give your opinion about remote work using two of them.'],
    ['u', 'creo que el trabajo remoto es muy bueno porque no tengo que manejar. sin embargo a veces me siento solo'],
    ['a', '¡Excelente! Usaste "creo que" y "sin embargo" perfectamente. ¿Qué haces para no sentirte solo?']
  ]]
];

export const earlyConversations = rows.map(([at, topic, icon, lang, msgs]) => ({ at, topic, icon, lang, msgs }));
