// Canned-but-relevant replies for the local OpenAI Chat Completions stub.
// The seeded system role asks for replies of at most ~50 words, so replies are short.

type Rule = { test: RegExp; replies: string[] };

const rules: Rule[] = [
  {
    test: /\b(hola|gracias|español|spanish|qué|cómo|estoy|quiero|puedo)\b/i,
    replies: [
      '¡Muy bien! Tu frase es clara. Un pequeño detalle: decimos "me gustaría" en lugar de "yo quiero" cuando queremos sonar más educados. ¿Quieres intentar pedir algo en un restaurante usando "me gustaría"?',
      'Casi perfecto. Recuerda que "estar" se usa para estados temporales: "Estoy cansado hoy". ¿Cómo te sientes después del trabajo normalmente?',
      '¡Excelente pronunciación en la transcripción! Ahora intenta contarme qué hiciste el fin de semana pasado usando el pretérito: "fui", "comí", "vi".'
    ]
  },
  {
    test: /\b(bonjour|merci|français|french|je suis|je voudrais)\b/i,
    replies: [
      'Très bien ! Petite correction : on dit « je voudrais un café » plutôt que « je veux un café » pour être poli. Vous voulez continuer la scène au café ?',
      'Bonne phrase ! Attention au genre : « une table », pas « un table ». Qu\'est-ce que vous aimez faire le week-end ?'
    ]
  },
  {
    test: /\b(interview|hiring|manager|resume|salary|weakness|strength|role)\b/i,
    replies: [
      'Good answer. To make it stronger, use the STAR format: briefly describe the Situation, your Task, the Action you took, and a measurable Result. Want to try that again with the database migration example?',
      'That works, but it sounds a bit rehearsed. Lead with one concrete example, then explain what you learned. Next question: tell me about a time you disagreed with a teammate.',
      'Nice. Keep it under two minutes. Here\'s a follow-up an interviewer might ask: "Why are you leaving your current position?"'
    ]
  },
  {
    test: /\b(pronounce|pronunciation|accent|sound|word)\b/i,
    replies: [
      'Try breaking it into syllables and stressing the second one: "de-VEL-op". Say it slowly three times, then at normal speed. Want another tricky word to practice?',
      'The "th" sound is made by placing your tongue lightly between your teeth and blowing air. Practice with "think", "three", and "throughout".'
    ]
  },
  {
    test: /\b(travel|trip|flight|hotel|airport|tokyo|lisbon|japan|book)\b/i,
    replies: [
      'Great plan! In a hotel you could say: "Hi, I have a reservation under Kim for three nights." Then ask: "Is breakfast included?" Shall we role-play the check-in?',
      'For the airport, useful phrases are "Where is the security checkpoint?" and "Is this the line for international departures?" Want to practice asking about a delayed flight?'
    ]
  },
  {
    test: /\b(code|python|javascript|bug|error|function|sql|react)\b/i,
    replies: [
      'Sounds like the state update is asynchronous. Read the value from the callback instead: `setCount(prev => prev + 1)`. That avoids using a stale value from the previous render.',
      'Check whether the variable is undefined before you call it. Logging the input right before the failing line usually shows the problem quickly. What does the stack trace say?'
    ]
  },
  {
    test: /\b(recipe|cook|dinner|bake|chicken|pasta|vegetarian)\b/i,
    replies: [
      'Try a quick lemon garlic pasta: boil spaghetti, sauté garlic in olive oil, add lemon zest, juice, and parmesan, then toss with pasta water. Ready in about 20 minutes.',
      'For a weeknight dinner, roast chicken thighs at 220°C for 35 minutes with potatoes, paprika, and garlic. One pan, minimal cleanup.'
    ]
  }
];

const generic = [
  'That\'s a great point. Could you tell me a bit more about why you feel that way? Try to use at least one linking word, like "however" or "because".',
  'Your sentence was clear and natural. One small tip: "I\'ve been doing it for two years" sounds better than "I do it since two years". What else would you like to talk about?',
  'Interesting! I\'d say the main thing is to stay consistent. Even ten minutes a day helps more than one long session a week. How often do you practice right now?',
  'Good question. In short: it depends on context, but in everyday conversation the simpler option is usually more natural. Do you want an example?'
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function replyFor(text: string, messages: { role: string; content: string }[]) {
  const n = hash(text + messages.length);
  for (const r of rules) {
    if (r.test.test(text)) return r.replies[n % r.replies.length];
  }
  return generic[n % generic.length];
}
