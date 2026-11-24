// Builds .ui-capture/seed/seed.js: a one-time bootstrap the local server
// injects ahead of the app bundle. Agora Cosmica has no accounts; a returning
// visitor's state lives in this browser's localStorage under the app's own
// keys (storageKeysV2.ts, userState.ts, domainStore persist blob). This writes
// six months of a regular listener's state in exactly those formats.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname;
const A = join(ROOT, 'client/src/assets');
const councils = JSON.parse(readFileSync(join(A, 'councils/councilCatalog.json')));
const councilList = Array.isArray(councils) ? councils : Object.values(councils);

let s = 20260519;
const rnd = () => ((s = (s * 48271) % 2147483647) / 2147483647);
const start = Date.parse('2026-05-19T19:40:00Z');
const end = Date.parse('2026-11-16T21:10:00Z');
const at = (f) => new Date(start + (end - start) * f + Math.floor(rnd() * 3) * 3600_000).toISOString();

const ls = {};
const story = (fig, n) => readFileSync(join(A, 'stories', fig, 'en', `${fig}_${n}_en.txt`), 'utf8');
const title = (fig, n) => JSON.parse(readFileSync(join(A, 'translations/seeds/en', `${fig}-seeds.json`))).seeds[n - 1].title;

// figure -> [completed chapters], [in-progress chapter, seconds]
const listening = {
  aurelius: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], null],
  woolf: [[1, 2, 3, 4, 5, 6, 7], [8, 412]],
  gautama: [[1, 2, 3, 4, 5], [6, 133]],
  lovelace: [[1, 2, 3, 4, 5, 6, 7, 8, 9], null],
  rumi: [[1, 2, 3], [4, 655]],
  einstein: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], null],
  dickinson: [[1, 2], null],
  mandela: [[1, 2, 3, 4], [5, 287]],
  laozi: [[1, 2, 3, 4, 5, 6], null],
  kahlo: [[1], [2, 58]],
  nietzsche: [[1, 2, 3], null],
  goethe: [[], [1, 341]],
  tubman: [[1, 2, 3, 4, 5, 6, 7, 8], null],
  austen: [[1, 2], [3, 520]],
};
let i = 0;
const total = Object.values(listening).reduce((a, [c]) => a + c.length, 0);
for (const [fig, [done, prog]] of Object.entries(listening)) {
  for (const n of done) {
    ls[`story_content_${fig}_${n}`] = JSON.stringify({ content: story(fig, n), title: title(fig, n), timestamp: at(i++ / total * 0.97), language: 'en' });
    ls[`story_${fig}_${n}_completed`] = 'true';
  }
  if (prog) {
    const [n, secs] = prog;
    ls[`story_content_${fig}_${n}`] = JSON.stringify({ content: story(fig, n), title: title(fig, n), timestamp: at(0.9 + rnd() * 0.09), language: 'en' });
    ls[`storyProgress_${fig}_${n}_en`] = JSON.stringify({ lastTimeSeconds: secs, updatedAt: Date.parse(at(0.95)) });
  }
}

// Prisms listened to (recorded multi-voice dialogues on a teaching)
for (const [fig, n] of [['aurelius', 2], ['aurelius', 6], ['aurelius', 10], ['einstein', 4], ['lovelace', 3], ['woolf', 1], ['gautama', 2]]) {
  ls[`prism_content_${fig}_${n}`] = JSON.stringify({ content: `${title(fig, n)}: four voices on one teaching.`, timestamp: at(0.3 + rnd() * 0.6) });
  ls[`prism_${fig}_${n}_completed`] = 'true';
}

// Councils heard
for (const c of councilList.slice(0, 40).filter((_, k) => k % 4 === 1).slice(0, 7)) {
  ls[`council_content_${c.id}`] = JSON.stringify({ title: c.title, timestamp: at(0.2 + rnd() * 0.7) });
  ls[`council_${c.id}_completed`] = 'true';
}

// Conversations from before the chat ended in October 2026
const conv = (fig, n, turns, f) => {
  const t0 = Date.parse(at(f));
  return JSON.stringify(turns.map((content, k) => ({ role: k % 2 ? 'assistant' : 'user', content, timestamp: new Date(t0 + k * 95_000).toISOString(), figureId: fig, seedId: n, mode: 'seed_conversation' })));
};
ls['starseed_aurelius_6'] = conv('aurelius', 6, [
  "My manager rewrote my report in front of the whole team on Friday. I've been angry all weekend. How do I not carry this into Monday?",
  "Start by separating two things. There is what happened: a document was changed while others watched. And there is what you added: that it was meant to shame you, that everyone now thinks less of you. The first you cannot undo. The second is yours to examine. Which part of the anger belongs to the event, and which to the story you told yourself on Saturday morning?",
  "Honestly most of it is the story. He probably didn't even think about it.",
  "Then you already have the work for Monday. Not to forgive him, not to confront him, just to walk in without the story. If something needs saying about the report, say it plainly, the way a clerk would describe it. I wrote a note to myself most mornings: today I will meet people who are careless. That was not cynicism. It was taking the surprise out of the day.",
], 0.41);
ls['starseed_aurelius_6_completed'] = 'true';
ls['starseed_woolf_3'] = conv('woolf', 3, [
  "I work from the kitchen table and I never get anything written. Is a room of one's own still about an actual room?",
  "It was always about an actual room. And five hundred a year, which people prefer to forget. The room is a door that locks. The money is the right to say no to something. What would your door be, in a flat where the kitchen is also the office?",
  "Maybe headphones and the hour before everyone wakes up",
  "Then guard that hour as if it were rent. Nobody will give it to you; you'll have to take it, and take it again tomorrow.",
], 0.55);
ls['starseed_lovelace_4'] = conv('lovelace', 4, [
  "What did you actually mean by poetical science?",
  "That imagination is not the opposite of rigour. To see what the Engine might do with symbols, not merely numbers, I had to picture it first. The calculation came after the picture. My mother feared the poetry in me. I put it to work.",
], 0.62);
ls['starseed_gautama_2'] = conv('gautama', 2, [
  "I can't stop replaying a conversation from last week where I said the wrong thing.",
  "Notice that the conversation ended a week ago, and the replaying is happening now. Each replay is a new arrow you shoot at yourself. What happens if, the next time it starts, you simply note: replaying. And let the breath be the next thing you attend to?",
  "I tried it twice today. It came back but it was quieter.",
  "Quieter is the path. Not gone. Quieter.",
], 0.68);
ls['challenge_aurelius_4'] = JSON.stringify([
  { role: 'assistant', content: 'Question 1 of 5. A colleague takes credit for your idea. Which of the four virtues is most at stake in how you respond, and why?', timestamp: at(0.47), mode: 'challenge' },
  { role: 'user', content: 'Justice, because it is about what is owed to people. But also self-control so I don\'t blow up.', timestamp: at(0.47), mode: 'challenge' },
  { role: 'assistant', content: 'Good. You saw that virtues travel together. Justice names what is owed; temperance governs how you claim it. Question 2 of 5 follows.', timestamp: at(0.47), mode: 'challenge' },
]);
ls['freetalk_einstein'] = JSON.stringify([
  { role: 'user', content: 'Did you really fail maths at school?', timestamp: at(0.74), mode: 'free_conversation' },
  { role: 'assistant', content: 'No, and I have been denying it for decades. I had mastered differential and integral calculus before I was fifteen. What I failed, once, was the entrance exam to the Polytechnic in Zurich, in the non-scientific sections. French, mostly. The physics and mathematics went rather well.', timestamp: at(0.74), mode: 'free_conversation' },
]);

// Consent, entry, store
ls['agb_consent'] = JSON.stringify({ version: JSON.parse(readFileSync(join(ROOT, 'client/src/utils/public/termsVersion.json'))).version, timestamp: Date.parse('2026-10-24T18:02:00Z') });
ls['age_confirmed'] = JSON.stringify({ confirmed: true, minAge: 16, timestamp: start });
ls['isLoggedIn'] = 'true';
ls['selectedLanguage'] = 'en';
ls['audioUnlocked'] = 'true';
ls['agora-cosmica-visited'] = new Date(start).toISOString();
ls['agora-cosmica-store'] = JSON.stringify({
  state: {
    language: { current: 'en' },
    figures: { selectedId: 'woolf' },
    seeds: { selectedId: 8 },
    mode: { selected: 'story', preferences: {} },
    onboarding: { complete: true, skipped: false, forceShow: false },
    hasVisitedBefore: true,
    visited: true,
    visitDate: new Date(start).toISOString(),
    firstSelection: 'aurelius',
    discoveryCount: Object.keys(listening).length,
  },
  version: 1,
});

mkdirSync(join(ROOT, '.ui-capture/seed'), { recursive: true });
writeFileSync(join(ROOT, '.ui-capture/seed/seed.js'), `// Returning-listener state, written once (see .ui-capture/gen-seed.mjs)
(function () {
  try {
    if (localStorage.getItem('uicap_seed') === 'v1') return;
    var data = ${JSON.stringify(ls)};
    for (var k in data) localStorage.setItem(k, data[k]);
    localStorage.setItem('uicap_seed', 'v1');
  } catch (e) { console.warn('seed failed', e); }
})();
`);
console.log(`seed: ${Object.keys(ls).length} localStorage records`);
