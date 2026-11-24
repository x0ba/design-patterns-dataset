// Seeds catai's own server-side store (CATAI_DIR/app-db.json + CATAI_DIR/models/*),
// in exactly the shape `catai install <model>` writes (see fetch-models.ts startDownload()).
// Model weights can't be downloaded offline, so the model files are small placeholders;
// inference is served by the node-llama-cpp stub (stub/node-llama-cpp-stub.mjs).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(fs.readFileSync(path.join(here, '..', 'models.json'), 'utf8'));
const CATAI_DIR = process.env.CATAI_DIR || path.join(here, 'catai-data');
const MODEL_DIR = path.join(CATAI_DIR, 'models');
fs.mkdirSync(MODEL_DIR, {recursive: true});

const day = 24 * 3600 * 1000;
const now = Date.parse('2026-11-17T09:00:00Z');

// installed over time: oldest first
const installs = [
    ['meta-llama-3-8b-q4_k_m', 212],
    ['gemma-3-12b-it-q4_k_m', 96],
    ['qwen3-8b-q4_k_m', 71],
    ['gpt-oss-20b.mxfp4', 44],
    ['qwen3-4b-thinking-2507-q4_k_m', 23],
];

// what the user has tweaked in the admin JSON editor over time
const userTweaks = {
    'qwen3-4b-thinking-2507-q4_k_m': {
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 2048,
        builtInAPICall: {webSearch: false, date: true, weather: true, currency: true, stocks: false},
    },
    'qwen3-8b-q4_k_m': {temperature: 0.6},
    'gemma-3-12b-it-q4_k_m': {gpuLayers: 28},
};

const db = {
    activeModel: 'qwen3-4b-thinking-2507-q4_k_m',
    installedCatAIVersion: '8.0.0',
    models: {},
};

for (const [tag, ageDays] of installs) {
    const model = catalog[tag];
    if (!model) throw new Error(`model ${tag} not in models.json`);
    const modelPath = path.join(MODEL_DIR, tag);
    if (!fs.existsSync(modelPath)) fs.writeFileSync(modelPath, 'GGUF placeholder (offline UI capture)\n');

    const defaultSettings = structuredClone(model.settings ?? {});
    defaultSettings.bind ??= 'node-llama-cpp-v2';
    const settings = {...structuredClone(defaultSettings), ...(userTweaks[tag] ?? {})};

    db.models[tag] = {
        ...structuredClone(model),
        downloadedFiles: {model: modelPath},
        settings,
        defaultSettings,
        createDate: now - ageDays * day - Math.floor(ageDays * 3137) * 1000,
    };
}

fs.writeFileSync(path.join(CATAI_DIR, 'app-db.json'), JSON.stringify(db));
console.log(`seeded ${Object.keys(db.models).length} installed models into ${CATAI_DIR}`);
