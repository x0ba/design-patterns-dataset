// Builds catai-seed.json (chat sessions + prompt history + UI prefs) from conversations.mjs
// and copies seed.html next to the built UI. Usage: node generate.mjs <www/catai-react dir>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CONVERSATIONS} from './conversations.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2];
if (!outDir) throw new Error('usage: node generate.mjs <outDir>');

const NOW = Date.parse('2026-11-17T08:40:00Z');
const MIN = 60_000, DAY = 86_400_000;
const THINKING_MODEL_SINCE_DAYS = 23; // qwen3-4b-thinking installed 23 days ago (see seed-server.mjs)

// deterministic PRNG so the seed is stable between builds
let s = 0x5eed;
const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const sessions = [];
const prompts = [];

CONVERSATIONS.forEach((c, i) => {
    const dayStart = Math.floor((NOW - c.daysAgo * DAY) / DAY) * DAY;
    const start = Math.min(dayStart + (c.hour ?? 15) * 60 * MIN + Math.floor(rnd() * 50) * MIN, NOW - 30 * MIN);
    const history = [];
    if (c.system) history.push({type: 'system', text: c.system});
    let t = start;
    for (const [user, thought, answer] of c.turns) {
        history.push({type: 'user', text: user});
        prompts.push({prompt: user, timestamp: t});
        const response = [];
        if (thought && c.daysAgo <= THINKING_MODEL_SINCE_DAYS) {
            response.push({type: 'segment', segmentType: 'thought', text: thought, ended: true});
        }
        response.push(answer);
        history.push({type: 'model', response});
        t += (2 + Math.floor(rnd() * 9)) * MIN;
    }
    const firstUser = c.turns[0][0];
    sessions.push({
        id: `${start}-${(i * 7919).toString(36).padStart(9, 'k')}`,
        title: firstUser.substring(0, 50) || 'Untitled Chat', // same rule as App.tsx auto-save
        history,
        createdAt: start,
        updatedAt: t,
    });
});

prompts.sort((a, b) => b.timestamp - a.timestamp);

const seed = {
    version: `v1-${sessions.length}-${prompts.length}`,
    anchor: NOW,
    sessions,
    localStorage: {
        history: prompts.slice(0, 40), // useHistory.ts keeps the 40 most recent prompts
        'color-theme': 'dark',
        catai_system_prompt: 'You are a concise senior engineer helping Maya with code reviews, SQL, and writing. Prefer TypeScript examples. Keep answers short unless asked for detail.',
        catai_builtin_api_settings: {webSearch: false, date: true, weather: true, currency: true, stocks: false},
    },
};

fs.writeFileSync(path.join(outDir, 'catai-seed.json'), JSON.stringify(seed));
fs.copyFileSync(path.join(here, 'seed.html'), path.join(outDir, 'seed.html'));
console.log(`wrote ${sessions.length} chat sessions, ${prompts.length} prompts -> ${outDir}`);
