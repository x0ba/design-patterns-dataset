// Generates seed-data.json in the shape of SpeechGPT's own persisted state:
//   localStorage.globalState  (src/store/reducer/global.ts)
//   localStorage.sessionState (src/store/reducer/session.ts / typings/session.d.ts)
//   IndexedDB chatDB.chat     (src/db/index.ts: { id, sessionId, role, content })
// Usage: node gen.mjs <output-file>
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { conversations } from './conversations.mjs';
import { extraConversations } from './conversations-extra.mjs';
import { earlyConversations } from './conversations-early.mjs';

const out = process.argv[2];
if (!out) throw new Error('usage: node gen.mjs <out.json>');

// Deterministic UUID v4-ish ids so re-seeding is stable
function uuidFor(seed) {
  const h = createHash('sha1').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// Same format as getFormatDateTime() in src/helpers/utils.ts
function fmt(at) {
  const [d, t] = at.split(' ');
  const [y, m, day] = d.split('-');
  const sec = String(Math.abs(at.split('').reduce((a, c) => a * 7 + c.charCodeAt(0), 3)) % 60).padStart(2, '0');
  return `${day}/${m}/${y}, ${t}:${sec}`;
}

const voiceByLang = {
  es: { systemLanguage: 'es', systemVoice: 'Mónica', voiceLang: 'es-MX', polly: 'es-MX', azure: 'es-MX' },
  ja: { systemLanguage: 'ja', systemVoice: 'Kyoko', voiceLang: 'ja-JP', polly: 'ja-JP', azure: 'ja-JP' },
  fr: { systemLanguage: 'fr', systemVoice: 'Thomas', voiceLang: 'fr-FR', polly: 'fr-FR', azure: 'fr-FR' },
  en: { systemLanguage: 'en', systemVoice: 'Samantha', voiceLang: 'en-US', polly: 'en-US', azure: 'en-US' }
};

const all = [...earlyConversations, ...conversations, ...extraConversations].sort((a, b) => a.at.localeCompare(b.at));

const chats = [];
let nextId = 1;
const sessions = all.map(c => {
  const id = uuidFor(c.topic + c.at);
  const v = voiceByLang[c.lang || 'en'];
  let chars = 0;
  for (const [r, text] of c.msgs) {
    chats.push({ id: nextId++, role: r === 'u' ? 'user' : 'assistant', content: text, sessionId: id });
    chars += text.length;
  }
  return {
    id,
    topic: c.topic,
    icon: c.icon || 'blue-circle',
    tags: [],
    liked: !!c.liked,
    date: fmt(c.at),
    stats: {
      messageCount: c.msgs.length,
      tokenCount: Math.round(chars / 3.8),
      characterCount: chars
    },
    chat: {
      systemRole: '',
      defaultPrompt: '',
      useAssistant: true,
      temperature: 0.8,
      maxMessages: 20
    },
    speech: {
      service: 'System',
      systemLanguage: v.systemLanguage,
      systemVoice: v.systemVoice,
      systemRate: 1,
      systemPitch: 1,
      pollyLanguage: v.polly,
      pollyVoice: '',
      pollyEngine: 'Standard',
      azureLanguage: v.azure,
      azureVoice: ''
    },
    voice: {
      service: 'System',
      systemLanguage: v.voiceLang,
      azureLanguage: v.azure,
      autoStart: false,
      startTime: 1
    }
  };
});

// Newest first, like addSession() (unshift) produces
sessions.reverse();

const globalState = {
  locale: 'en',
  appearance: 'system',
  developer: false,
  disableSpeaker: false,
  disableMicrophone: false,
  key: {
    accessCode: '',
    openaiApiKey: 'sk-proj-local-placeholder-key-not-real-0000000000000000',
    openaiModel: 'gpt-4',
    openaiHost: '', // filled with location.origin by seed-loader.js (local stub)
    awsRegion: '',
    awsKeyId: '',
    awsKey: '',
    azureRegion: '',
    azureKey: ''
  },
  chat: {
    systemRole:
      'You are my friendly conversation partner. Keep replies under 50 words. If I write in Spanish, answer in Spanish and gently correct my mistakes. End with a short follow-up question when it makes sense.',
    defaultPrompt: '',
    useAssistant: true,
    temperature: 0.7,
    maxMessages: 20
  },
  speech: {
    service: 'System',
    systemLanguage: 'en',
    systemVoice: 'Samantha',
    systemRate: 1,
    systemPitch: 1,
    pollyLanguage: 'en-US',
    pollyVoice: '',
    pollyEngine: 'Standard',
    azureLanguage: 'en-US',
    azureVoice: ''
  },
  voice: {
    service: 'System',
    systemLanguage: 'en-US',
    azureLanguage: 'en-US',
    autoStart: false,
    startTime: 1
  }
};

const sessionState = { currentSessionId: sessions[0].id, order: '', sessions };
const version = createHash('sha1').update(JSON.stringify({ globalState, sessionState, chats })).digest('hex').slice(0, 12);

writeFileSync(out, JSON.stringify({ version, globalState, sessionState, chats }));
console.log(`seed: ${sessions.length} sessions, ${chats.length} messages -> ${out}`);
