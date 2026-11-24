// Seeds ./data/db.json — the state an established YomiNinja user's main process would hold.
// Entities are built with the app's own domain classes (compiled from electron-src
// into yomininja-e/main by `tsc -p electron-src`) and serialized with their toJson().
// Screenshots for OCR templates are rendered with sharp from SVG mock-ups.

const path = require('path');
const fs = require('fs');

const REPO = path.resolve(__dirname, '..', 'yomininja-e');
const CORE = path.join(REPO, 'main', 'electron-src', '@core');
const req = (p) => require(path.join(CORE, p));
const sharp = require(path.join(REPO, 'node_modules', 'sharp'));

const { getDefaultSettingsPresetProps } = req('domain/settings_preset/default_settings_preset_props.js');
const { SettingsPreset } = req('domain/settings_preset/settings_preset.js');
const { Language } = req('domain/language/language.js');
const { Profile } = req('domain/profile/profile.js');
const { OcrTemplate } = req('domain/ocr_template/ocr_template.js');
const { OcrTargetRegion } = req('domain/ocr_template/ocr_target_region/ocr_target_region.js');
const { BrowserExtension } = req('domain/browser_extension/browser_extension.js');
const { Dictionary } = req('domain/dictionary/dictionary.js');
const { getPpOcrDefaultSettings } = req('infra/ocr/ppocr.adapter/ppocr_settings.js');
const { getCloudVisionDefaultSettings } = req('infra/ocr/cloud_vision_ocr.adapter/cloud_vision_ocr_settings.js');
const { getGoogleLensDefaultSettings } = req('infra/ocr/google_lens_ocr.adapter/google_lens_ocr_settings.js');
const { getMangaOcrDefaultSettings } = req('infra/ocr/manga_ocr.adapter/manga_ocr_settings.js');

const NOW = new Date('2026-11-16T20:40:00Z');
const daysAgo = (d, h = 0) => new Date(NOW.getTime() - d * 86400000 - h * 3600000);

// ------------------------------------------------------------------ languages
const languageInputs = [
    { name: 'japanese', two_letter_code: 'ja', bcp47_tag: 'ja-JP' },
    { name: 'chinese (simplified)', two_letter_code: 'zh', bcp47_tag: 'zh-Hans' },
    { name: 'chinese (traditional)', two_letter_code: 'zh', bcp47_tag: 'zh-Hant' },
    { name: 'cantonese (simplified)', two_letter_code: '', bcp47_tag: 'yue-Hans' },
    { name: 'cantonese (traditional)', two_letter_code: '', bcp47_tag: 'yue-Hant' },
    { name: 'korean', two_letter_code: 'ko', bcp47_tag: 'ko-KR' },
    { name: 'thai', two_letter_code: 'th', bcp47_tag: 'th-TH' },
    { name: 'vietnamese', two_letter_code: 'vi', bcp47_tag: 'vi-VN' },
    { name: 'latin', two_letter_code: 'la', bcp47_tag: 'la' },
    { name: 'cyrillic', two_letter_code: 'cy', bcp47_tag: 'cyrl' },
    { name: 'english', two_letter_code: 'en', bcp47_tag: 'en' },
    { name: 'french (FR)', two_letter_code: 'fr', bcp47_tag: 'fr-FR' },
    { name: 'italian (IT)', two_letter_code: 'it', bcp47_tag: 'it-IT' },
    { name: 'german (DE)', two_letter_code: 'de', bcp47_tag: 'de-DE' },
    { name: 'spanish (ES)', two_letter_code: 'es', bcp47_tag: 'es-ES' },
    { name: 'portuguese (BR)', two_letter_code: 'pt', bcp47_tag: 'pt-BR' },
    { name: 'russian', two_letter_code: 'ru', bcp47_tag: 'ru-RU' },
    { name: 'ukrainian', two_letter_code: 'uk', bcp47_tag: 'uk-UA' },
];
const languages = languageInputs.map(l => Language.create(l));
const lang = (name) => languages.find(l => l.name === name);

const allLangNames = languageInputs.map(l => l.name);
const engine_languages = {
    GoogleLensOcrAdapter: allLangNames,
    CloudVisionOcrAdapter: allLangNames.filter(n => !n.startsWith('cantonese')),
    PpOcrAdapter: ['japanese', 'chinese (simplified)', 'chinese (traditional)', 'korean', 'latin', 'cyrillic', 'english'],
    MangaOcrAdapter: ['japanese'],
};

// ------------------------------------------------------------------ settings preset
const defaults = getDefaultSettingsPresetProps();
const cloudVision = {
    ...getCloudVisionDefaultSettings(),
    hotkey: 'Alt+H',
    monthly_request_limit: 1000,
    monthly_request_count: 412,
    monthly_reset_day: 1,
    last_reset_date: new Date('2026-11-01T00:00:00Z'),
    client_email: 'yomininja-ocr@jp-immersion-388212.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7local-placeholder\n-----END PRIVATE KEY-----\n',
    active_api: 'main',
};
const preset = SettingsPreset.create({
    ...defaults,
    general: { run_at_system_startup: 'minimized' },
    overlay: {
        ...defaults.overlay,
        visuals: {
            ...defaults.overlay.visuals,
            frame: { border_color: '#3d8bfd', border_width: 1 },
            ocr_item_box: {
                ...defaults.overlay.visuals.ocr_item_box,
                background_color: '#0b0f19',
                inactive_border_color: '#3d8bfd',
                active_border_color: '#f6c343',
                border_radius: 5,
                text: {
                    ...defaults.overlay.visuals.ocr_item_box.text,
                    font_size_factor: 96,
                    generated_furigana: { visibility: 'visible-on-word-hover' },
                },
                selected_text: { color: '#ffffff', background_color: '#2f6fd6' },
            },
            mouse: { show_custom_cursor: true, custom_cursor_size: 34 },
            indicators: { processing_icon_color: '#f6c343' },
        },
        hotkeys: {
            ...defaults.overlay.hotkeys,
            ocr: 'Alt+Q',
            copy_text: 'Alt+N',
            toggle: 'Alt+C',
            show: 'Alt+B',
            clear: 'Alt+X',
            remote_control_key: '7b1f4c2e-93d0-4a8e-b5f2-1c6e0d9a2f47',
        },
        behavior: {
            ...defaults.overlay.behavior,
            copy_text_on_click: true,
            copy_text_on_hover: false,
            show_window_on_copy: { enabled: true, title: 'Yomitan Search' },
            hide_results_on_blur: true,
        },
    },
    ocr_engines: [
        { ...getPpOcrDefaultSettings(), cpu_threads: 8, max_image_width: 1920, det_db_unclip_ratio: 1.8 },
        cloudVision,
        { ...getGoogleLensDefaultSettings(), hotkey: 'Alt+S' },
        { ...getMangaOcrDefaultSettings(), hotkey: 'Alt+J', cpu_threads: 8 },
    ],
    dictionary: { enabled: true },
});
preset.created_at = daysAgo(214);
preset.updated_at = daysAgo(2, 5);
const presetJson = preset.toJson();

// ------------------------------------------------------------------ profile
const profile = Profile.create({
    active_ocr_language: lang('japanese'),
    active_settings_preset: preset,
    selected_ocr_adapter_name: 'GoogleLensOcrAdapter',
});
const profileJson = profile.toJson();
delete profileJson.active_settings_preset;
profileJson.active_settings_preset_id = presetJson.id;
profileJson.created_at = daysAgo(214);
profileJson.updated_at = daysAgo(1, 3);

// ------------------------------------------------------------------ capture sources
const capture_sources = [
    { id: 'screen:-1:0', displayId: -1, name: 'Entire screen (auto)', type: 'screen' },
    { id: 'screen:0:0', displayId: 2528732444, name: 'Entire screen 1', type: 'screen' },
    { id: 'screen:1:0', displayId: 2779098405, name: 'Entire screen 2', type: 'screen' },
    { id: 'window:263398:0', name: 'DRAGON QUEST XI S: Echoes of an Elusive Age - Definitive Edition', type: 'window' },
    { id: 'window:854330:0', name: 'P5R', type: 'window' },
    { id: 'window:657112:0', name: 'STEINS;GATE', type: 'window' },
    { id: 'window:921540:0', name: 'mpv - [SubsPlease] Sousou no Frieren - 21 (1080p) [5A1C7B0E].mkv', type: 'window' },
    { id: 'window:330914:0', name: 'Ryujinx 1.1.1403 - ポケットモンスター スカーレット v3.0.1 (0100A3D008C5C000) (64bit)', type: 'window' },
    { id: 'window:1180666:0', name: 'Yakuza 0', type: 'window' },
    { id: 'window:402818:0', name: 'よつばと! 01 | mokuro - Google Chrome', type: 'window' },
    { id: 'window:722046:0', name: 'NHK NEWS WEB EASY - Google Chrome', type: 'window' },
    { id: 'window:597276:0', name: 'Umineko When They Cry - Question Arcs', type: 'window' },
    { id: 'window:118230:0', name: 'Anki - Mining (Japanese)', type: 'window' },
    { id: 'window:66220:0', name: 'Discord', type: 'window' },
    { id: 'window:984114:0', name: 'OBS 30.2.3 - Profile: Untitled - Scenes: Immersion', type: 'window' },
    { id: 'window:15074:0', name: 'Texthooker UI - Google Chrome', type: 'window' },
    { id: 'window:770318:0', name: 'SPY x FAMILY - Watch on Crunchyroll - Google Chrome', type: 'window' },
    { id: 'window:208872:0', name: 'Danganronpa: Trigger Happy Havoc', type: 'window' },
    { id: 'window:512090:0', name: 'MONSTER HUNTER RISE', type: 'window' },
];

// ------------------------------------------------------------------ screenshots
const W = 1280, H = 720;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const JP = "Hiragino Sans, Hiragino Kaku Gothic ProN, Noto Sans CJK JP, sans-serif";
const JP_SERIF = "Hiragino Mincho ProN, Noto Serif CJK JP, serif";

function textLines(lines, x, y, size, opts = {}) {
    const { fill = '#fff', font = JP, lh = 1.5, weight = 500, stroke } = opts;
    return lines.map((l, i) =>
        `<text x="${x}" y="${y + i * size * lh}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${size / 10}" paint-order="stroke"` : ''}>${esc(l)}</text>`
    ).join('');
}
function scenery(c1, c2, extra = '') {
    return `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>${extra}`;
}
const hills = (c) => `<path d="M0 470 Q 200 380 420 450 T 860 430 T 1280 440 V720 H0Z" fill="${c}"/>`;
const city = (c) => Array.from({ length: 18 }, (_, i) => `<rect x="${i * 72}" y="${300 + ((i * 53) % 140)}" width="60" height="${420 - ((i * 53) % 140)}" fill="${c}"/>`).join('');

const scenes = {
    dq: (lines, speaker) => scenery('#6fb3e8', '#d8efff', hills('#4f8f3a') + `<circle cx="1050" cy="130" r="60" fill="#fff6c8"/>`) +
        `<rect x="140" y="500" width="1000" height="190" rx="10" fill="#000" fill-opacity="0.85" stroke="#fff" stroke-width="5"/>` +
        textLines([`＊「${lines[0]}`, ...lines.slice(1).map(l => `　　${l}`)], 180, 555, 32),
    p5: (lines, speaker) => scenery('#1b0b0b', '#3a0d10', city('#120607')) +
        `<polygon points="90,520 1190,490 1170,690 110,700" fill="#fff"/><polygon points="100,530 1180,500 1160,682 120,690" fill="#000"/>` +
        `<polygon points="110,470 360,455 350,515 120,520" fill="#e3001b"/>` + textLines([speaker], 135, 503, 30, { weight: 800 }) +
        textLines(lines, 160, 570, 31),
    sg: (lines, speaker) => scenery('#2c3440', '#5a6470', `<rect x="80" y="140" width="380" height="300" fill="#3b4655"/><rect x="820" y="90" width="360" height="380" fill="#47505e"/>`) +
        `<rect x="0" y="520" width="${W}" height="200" fill="#0a1220" fill-opacity="0.82"/>` +
        textLines([`【${speaker}】`], 70, 560, 26, { fill: '#9fd4ff' }) + textLines(lines, 90, 605, 30),
    frieren: (lines) => scenery('#7aa6c9', '#cfe2c6', hills('#86a86a') + `<rect x="560" y="260" width="160" height="260" fill="#e9e3d5"/>`) +
        lines.map((l, i) => `<text x="${W / 2}" y="${620 + i * 48}" text-anchor="middle" font-family="${JP}" font-size="38" font-weight="600" fill="#fff" stroke="#000" stroke-width="5" paint-order="stroke">${esc(l)}</text>`).join(''),
    poke: (lines) => scenery('#8fd3ff', '#f5e7b8', hills('#7cc05a')) +
        `<rect x="170" y="540" width="940" height="150" rx="30" fill="#fbfbf7" stroke="#d9d4c3" stroke-width="4"/>` +
        textLines(lines, 220, 600, 32, { fill: '#2b2b2b' }),
    yakuza: (lines, speaker) => scenery('#0d0d1a', '#2a1530', city('#1b1030') + Array.from({ length: 12 }, (_, i) => `<rect x="${40 + i * 100}" y="${200 + (i % 3) * 40}" width="40" height="80" fill="${['#ff3d7f', '#3df2ff', '#ffd23d'][i % 3]}" fill-opacity="0.6"/>`).join('')) +
        textLines([speaker], 160, 590, 26, { fill: '#ffcc66', weight: 700 }) +
        textLines(lines, 160, 635, 32, { stroke: '#000' }),
    manga: (lines) => `<rect width="${W}" height="${H}" fill="#2d2d2d"/><rect x="390" y="10" width="500" height="700" fill="#fdfdfb"/>` +
        `<rect x="410" y="30" width="460" height="330" fill="none" stroke="#111" stroke-width="3"/><rect x="410" y="375" width="460" height="315" fill="none" stroke="#111" stroke-width="3"/>` +
        `<ellipse cx="770" cy="150" rx="70" ry="100" fill="#fff" stroke="#111" stroke-width="2"/>` +
        lines[0].split('').map((ch, i) => `<text x="790" y="${95 + i * 30}" font-family="${JP}" font-size="26" fill="#111">${esc(ch)}</text>`).join('') +
        (lines[1] || '').split('').map((ch, i) => `<text x="752" y="${95 + i * 30}" font-family="${JP}" font-size="26" fill="#111">${esc(ch)}</text>`).join('') +
        `<ellipse cx="520" cy="500" rx="65" ry="90" fill="#fff" stroke="#111" stroke-width="2"/>` +
        (lines[2] || '').split('').map((ch, i) => `<text x="525" y="${450 + i * 30}" font-family="${JP}" font-size="26" fill="#111">${esc(ch)}</text>`).join(''),
    nhk: (lines) => `<rect width="${W}" height="${H}" fill="#f4f4f4"/><rect width="${W}" height="70" fill="#0b4ea2"/>` +
        textLines(['NEWS WEB EASY'], 40, 46, 28, { font: 'Helvetica, Arial, sans-serif', weight: 700 }) +
        `<rect x="190" y="100" width="900" height="600" fill="#fff"/>` +
        textLines([lines[0]], 230, 165, 34, { fill: '#111', weight: 700 }) +
        textLines(['2026年11月14日 18時30分'], 230, 210, 18, { fill: '#777' }) +
        textLines(lines.slice(1), 230, 280, 26, { fill: '#222', lh: 1.9 }),
    umineko: (lines) => scenery('#1d1424', '#3b2235', `<rect x="300" y="120" width="680" height="420" fill="#4b3240"/>`) +
        `<rect x="0" y="0" width="${W}" height="${H}" fill="#000" fill-opacity="0.55"/>` +
        textLines(lines, 120, 140, 30, { font: JP_SERIF, lh: 1.7 }),
    anki: (lines) => `<rect width="${W}" height="${H}" fill="#2f2f31"/><rect width="${W}" height="44" fill="#3a3a3c"/>` +
        textLines(['デッキ　追加　閲覧　統計　同期'], 420, 30, 18, { fill: '#ddd' }) +
        textLines([lines[0]], 560, 260, 72, { weight: 400 }) + textLines(lines.slice(1), 380, 360, 26, { fill: '#cfcfcf' }),
};

async function render(sceneKey, lines, speaker) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${scenes[sceneKey](lines, speaker)}</svg>`;
    return sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
}
async function crop(png, r) {
    const left = Math.round(r.position.left * W), top = Math.round(r.position.top * H);
    const width = Math.min(W - left, Math.round(r.size.width * W)), height = Math.min(H - top, Math.round(r.size.height * H));
    return sharp(png).extract({ left, top, width, height }).png({ palette: true }).toBuffer();
}

// ------------------------------------------------------------------ OCR templates
const R = (left, top, width, height, extra = {}) => ({ position: { left, top }, size: { width, height }, ...extra });
const auto = (sens = 0.5, all = false) => ({ enabled: true, motion_sensitivity: sens, frame_sample_size: 8, refresh_all_regions: all });
const tts = (o) => ({ voice_uri: 'VOICEVOX 四国めたん ノーマル', automatic: false, on_hover: false, on_click: true, volume: 0.8, speed: 1, pitch: 1, ...o });

const templateDefs = [
    { name: 'DQXI S – dialogue box', src: 3, scene: 'dq', created: 201, updated: 3, interval: 1000,
      lines: ['勇者さま、ようやく目を覚まされたのですね。', 'イシの村の長老が　あなたを　お待ちですよ。'],
      regions: [R(0.11, 0.69, 0.78, 0.27, { auto_ocr_options: auto(0.55), text_to_speech_options: tts({ on_click: true }) })] },
    { name: 'Persona 5 Royal – textbox', src: 4, scene: 'p5', speaker: '竜司', created: 176, updated: 9, interval: 800,
      lines: ['マジかよ…　鴨志田のヤツ、', '本気でオレらを退学にするつもりだ。'],
      regions: [R(0.07, 0.67, 0.86, 0.31, { auto_ocr_options: auto(0.4) }), R(0.08, 0.63, 0.2, 0.09)] },
    { name: 'STEINS;GATE (ADV mode)', src: 5, scene: 'sg', speaker: '岡部', created: 158, updated: 41, interval: 1000,
      lines: ['フゥーハハハ！　この鳳凰院凶真の', '頭脳をもってすれば、造作もないことだ！'],
      regions: [R(0.04, 0.74, 0.92, 0.25, { auto_ocr_options: auto(0.5), preprocessing_pipeline: [{ name: 'grayscale', enabled: true }] })] },
    { name: 'Frieren – mpv subs', src: 6, scene: 'frieren', created: 63, updated: 1, interval: 600,
      lines: ['人間の寿命は短いってわかっていたのに…', 'なんでもっと知ろうと思わなかったんだろう'],
      regions: [R(0.12, 0.8, 0.76, 0.18, { auto_ocr_options: auto(0.7, true), text_to_speech_options: tts({ voice_uri: 'VOICEVOX ずんだもん ノーマル', automatic: true, on_click: false, speed: 0.9 }),
        preprocessing_pipeline: [{ name: 'resize', enabled: true, args: { scale_factor: 1.5 } }] })] },
    { name: 'Pokémon Scarlet (Ryujinx)', src: 7, scene: 'poke', created: 132, updated: 27, interval: 1200,
      lines: ['ネモ「ねえねえ！　せっかくだし　いっしょに', 'テーブルシティまで　バトルしながら　いこうよ！」'],
      regions: [R(0.13, 0.75, 0.74, 0.21, { auto_ocr_options: auto(0.45), preprocessing_pipeline: [{ name: 'invert colors', enabled: false }, { name: 'threshold', enabled: true, args: { threshold: 140 } }] })] },
    { name: 'Yakuza 0 – cutscene subtitles', src: 8, scene: 'yakuza', speaker: '桐生', created: 97, updated: 52, interval: 1000,
      lines: ['兄弟…　俺は堂島組を抜けるつもりはねぇ。', 'だが、筋だけは通させてもらう。'],
      regions: [R(0.11, 0.78, 0.78, 0.2), R(0.11, 0.78, 0.2, 0.06, { preprocessing_pipeline: [{ name: 'grayscale', enabled: true }, { name: 'blur', enabled: false }] })] },
    { name: 'Yotsuba&! vol.1 (mokuro)', src: 9, scene: 'manga', created: 84, updated: 84, interval: 2000,
      lines: ['とーちゃん！', 'あれなに？', 'すげーな！'],
      regions: [R(0.565, 0.1, 0.1, 0.38), R(0.35, 0.56, 0.12, 0.33)] },
    { name: 'NHK Easy – article body', src: 10, scene: 'nhk', created: 45, updated: 6, interval: 1500,
      lines: ['東京で今年いちばん寒い朝になりました', '14日の朝、東京の都心では気温が3度まで下がりました。', '気象庁によると、これから１週間は寒い日が続きそうです。', '風邪をひかないように気をつけてください。'],
      regions: [R(0.17, 0.17, 0.7, 0.1), R(0.17, 0.33, 0.7, 0.32, { text_to_speech_options: tts({ on_click: true, speed: 0.85 }) })] },
    { name: 'Umineko – NVL full screen', src: 11, scene: 'umineko', created: 27, updated: 4, interval: 1000,
      lines: ['六軒島には、古くから魔女の伝説がある。', 'その魔女の名は、ベアトリーチェ。', '彼女は黄金の郷を守り、', '島に足を踏み入れた者を見つめ続けているという。'],
      regions: [R(0.07, 0.12, 0.86, 0.5, { auto_ocr_options: auto(0.35, true) })] },
    { name: 'Anki review card (testing)', src: 12, scene: 'anki', created: 12, updated: 12, interval: 1000,
      lines: ['懐かしい', 'なつかしい — nostalgic; dear; longed for', '例文: 子供の頃の写真を見て、懐かしくなった。'],
      regions: [] },
    { name: 'DQXI S – battle log', src: 3, scene: 'dq', created: 189, updated: 150, interval: 1000,
      lines: ['スライムベスが　あらわれた！', 'カミュの　こうげき！　スライムベスに　18の　ダメージ！'],
      regions: [R(0.11, 0.69, 0.78, 0.13)] },
    { name: 'SPY×FAMILY S2 – Crunchyroll subs', src: 16, scene: 'frieren', created: 118, updated: 74, interval: 700,
      lines: ['アーニャ　ちちとははのために', 'ステラ　いっぱいとる！'],
      regions: [R(0.15, 0.81, 0.7, 0.17, { auto_ocr_options: auto(0.65) })] },
    { name: 'Danganronpa – class trial', src: 17, scene: 'p5', speaker: '苗木', created: 109, updated: 88, interval: 1000,
      lines: ['それは違うよ！', 'その証言には、矛盾があるんだ！'],
      regions: [R(0.07, 0.67, 0.86, 0.31, { preprocessing_pipeline: [{ name: 'invert colors', enabled: true }, { name: 'grayscale', enabled: true }] })] },
    { name: 'Monster Hunter Rise – quest info', src: 18, scene: 'yakuza', speaker: 'ギルドマネージャー', created: 141, updated: 139, interval: 1000,
      lines: ['大社跡にオサイズチの群れが現れたゲコ。', '里に被害が出る前に、狩猟してほしいでゲコ！'],
      regions: [R(0.11, 0.78, 0.78, 0.2), R(0.11, 0.78, 0.25, 0.06)] },
    { name: 'ヒカルの碁 vol.3', src: 9, scene: 'manga', created: 52, updated: 31, interval: 2000,
      lines: ['神の一手を', '極めたいんだ', 'ヒカル！'],
      regions: [R(0.565, 0.1, 0.1, 0.38), R(0.35, 0.56, 0.12, 0.33), R(0.39, 0.02, 0.4, 0.5, { auto_ocr_options: { enabled: false, motion_sensitivity: 0.5, frame_sample_size: 8, refresh_all_regions: false } })] },
    { name: 'test', src: 1, scene: 'anki', created: 6, updated: 6, interval: 1000,
      lines: ['日本語', 'にほんご — Japanese (language)'],
      regions: [] },
    { name: 'P5R confidant (old, misaligned)', src: 4, scene: 'p5', speaker: '武見', created: 170, updated: 166, interval: 1000,
      lines: ['あら、また来たの？　モルモット君。', '今日の治験も…覚悟はできてる？'],
      regions: [R(0.05, 0.6, 0.6, 0.2)] },
];

async function buildTemplates() {
    const out = [];
    let id = 1;
    for (const def of templateDefs) {
        const png = await render(def.scene, def.lines, def.speaker);
        const template = new OcrTemplate({
            id, name: def.name, image: png, target_regions: [],
            capture_source_name: capture_sources[def.src].name,
            capturer_options: { interval_between_frames: def.interval },
            created_at: daysAgo(def.created, 7), updated_at: daysAgo(def.updated, 2),
        });
        for (const r of def.regions) {
            const region = OcrTargetRegion.create({ ocr_template_id: id, ...r, image: await crop(png, r) });
            template.addTargetRegion(region);
        }
        const json = template.toJson();
        delete json.image;
        json.target_regions.forEach(r => { delete r.ocr_template; });
        out.push(json);
        id++;
    }
    return out;
}

// ------------------------------------------------------------------ extensions
async function icon(bg, fg, label) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="26" fill="${bg}"/>
      <text x="64" y="86" text-anchor="middle" font-family="${JP}" font-weight="700" font-size="64" fill="${fg}">${esc(label)}</text></svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
}
async function buildExtensions() {
    const defs = [
        { id: 'pnmaklegiibbioifkmfkgpfnmdehpnhk', name: '10ten Japanese Reader (Rikaichamp)', version: '1.22.1', author: 'Brian Birtles',
          description: 'Translate Japanese by hovering over words.', icon: await icon('#ffffff', '#e63946', '10'), optionsUrl: 'chrome-extension://pnmaklegiibbioifkmfkgpfnmdehpnhk/options.html', enabled: true },
        { id: 'likgccmbimhjbgkjambclfkhldnlhbnn', name: 'Yomitan', version: '24.10.21.0', author: 'Yomitan Authors',
          description: 'Popup dictionary for language learning', icon: await icon('#c93c3c', '#ffffff', '読'), optionsUrl: 'chrome-extension://likgccmbimhjbgkjambclfkhldnlhbnn/settings.html', enabled: true },
        { id: 'pcgmedbmchghfgikplcimdmfldfnecec', name: 'Inkah - Chinese & Korean Pop-up Dictionary', version: '3.4.2', author: 'Inkah',
          description: 'Hover over Chinese and Korean words to see definitions, pinyin and hanja.', icon: await icon('#1f2937', '#facc15', '墨'), optionsUrl: 'chrome-extension://pcgmedbmchghfgikplcimdmfldfnecec/options.html', enabled: false },
    ];
    return defs.map(d => {
        const ext = BrowserExtension.create(d);
        const j = ext.toJson();
        delete j.icon;
        return j;
    });
}

// ------------------------------------------------------------------ dictionaries + headwords
const dictionaryDefs = [
    { name: 'Jitendex.org [2026-10-27]', version: '3', source_language: 'ja', target_language: 'en' },
    { name: 'JMdict (English)', version: 'jmdict4yomitan.v1.2026-11-02', source_language: 'ja', target_language: 'en' },
    { name: 'JMnedict', version: '2026-11-02', source_language: 'ja', target_language: 'en' },
    { name: 'KANJIDIC (English)', version: '2026-11-02', source_language: 'ja', target_language: 'en' },
    { name: 'JPDB Frequency v2', version: '2', source_language: 'ja', target_language: 'ja' },
    { name: '大辞林 第四版', version: '4', source_language: 'ja', target_language: 'ja' },
    { name: 'CC-CEDICT', version: '2026-09-18', source_language: 'zh', target_language: 'en' },
];
const dictionaries = dictionaryDefs.map((d, i) => {
    const dict = Dictionary.create({ ...d, order: i, enabled: d.name !== 'CC-CEDICT' });
    dict.id = Dictionary.generateId({ dictionaryId: d.name });
    return { ...dict };
});
const [jitendex] = dictionaries;

const words = [
    ['勇者', 'ゆうしゃ', 'hero; brave person', 'n'], ['目を覚ます', 'めをさます', 'to wake up; to come to one\'s senses', 'exp,v5s'],
    ['長老', 'ちょうろう', 'elder; senior', 'n'], ['待つ', 'まつ', 'to wait; to await; to look forward to', 'v5t'],
    ['退学', 'たいがく', 'dropping out of school; expulsion', 'n,vs'], ['本気', 'ほんき', 'seriousness; earnestness; truth', 'adj-na,n'],
    ['頭脳', 'ずのう', 'brains; head; intelligence', 'n'], ['造作もない', 'ぞうさもない', 'easy; simple; no trouble at all', 'exp,adj-i'],
    ['寿命', 'じゅみょう', 'life span; lifetime', 'n'], ['知る', 'しる', 'to know; to be aware of; to learn', 'v5r'],
    ['筋', 'すじ', 'muscle; line; logic; reason', 'n'], ['抜ける', 'ぬける', 'to come out; to leave (an organization)', 'v1'],
    ['魔女', 'まじょ', 'witch', 'n'], ['伝説', 'でんせつ', 'legend; tradition; folklore', 'n'], ['黄金', 'おうごん', 'gold; golden', 'n'],
    ['足を踏み入れる', 'あしをふみいれる', 'to set foot in; to step into', 'exp,v1'], ['見つめる', 'みつめる', 'to stare at; to gaze at', 'v1'],
    ['気温', 'きおん', 'temperature (air)', 'n'], ['都心', 'としん', 'heart of a city; city centre', 'n'], ['気象庁', 'きしょうちょう', 'Japan Meteorological Agency', 'n'],
    ['風邪', 'かぜ', 'common cold; cold', 'n'], ['懐かしい', 'なつかしい', 'dear; nostalgic; longed for', 'adj-i'],
    ['覚悟', 'かくご', 'resolution; readiness; preparedness', 'n,vs'], ['治験', 'ちけん', 'clinical trial', 'n'],
    ['せっかく', 'せっかく', 'with trouble; at great pains; long-awaited', 'adv'], ['ダメージ', 'ダメージ', 'damage', 'n'],
    ['あらわれる', 'あらわれる', 'to appear; to come in sight', 'v1'], ['こうげき', 'こうげき', 'attack; assault; offensive', 'n,vs'],
];
const headwords = words.map(([term, reading, gloss, pos], i) => {
    const id = 100000 + i;
    const tags = pos.split(',').map((t, k) => ({ id: `${jitendex.id}/${t}`, dictionary_id: jitendex.id, name: t, category: 'partOfSpeech', content: t, order: k, popularity_score: 0 }));
    return {
        id, term, reading, furigana: null, term_length: term.length, reading_length: reading.length, tags,
        definitions: [{ id: id * 10, dictionary_headword_id: id, dictionary_id: jitendex.id, definitions: gloss.split('; '), tags, popularity_score: 100 - i }],
    };
});

// ------------------------------------------------------------------ misc
const google_cookies = [
    { name: 'NID', value: '518=Zx3kP9…', domain: '.google.com', path: '/', secure: true, httpOnly: true, session: false, expirationDate: 1795000000, sameSite: 'no_restriction' },
    { name: 'SOCS', value: 'CAISHAgBEhJnd3NfMjAyNDEx…', domain: '.google.com', path: '/', secure: true, httpOnly: false, session: false, expirationDate: 1797000000, sameSite: 'lax' },
];
const hardware_acceleration_options = [
    { osPlatform: 'win32', backend: 'PyTorch', computePlatform: 'CPU', installCommand: 'pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu', installed: true },
    { osPlatform: 'win32', backend: 'PyTorch', computePlatform: 'CUDA', computePlatformVersion: '12.4', installCommand: 'pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124', installed: false },
    { osPlatform: 'win32', backend: 'PyTorch', computePlatform: 'CUDA', computePlatformVersion: '11.8', installCommand: 'pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118', installed: false },
];

async function main() {
    const ocr_templates = await buildTemplates();
    const blank = await sharp({ create: { width: W, height: H, channels: 3, background: '#000' } }).png().toBuffer();
    const db = {
        generated_at: NOW.toISOString(),
        languages: languages.map(l => l.toJson()),
        engine_languages,
        supported_ocr_engines: ['PpOcrAdapter', 'CloudVisionOcrAdapter', 'GoogleLensOcrAdapter', 'MangaOcrAdapter'],
        settings_presets: [presetJson],
        profile: profileJson,
        capture_sources,
        active_capture_source_name: capture_sources[6].name,
        ocr_templates,
        active_ocr_template_id: 4,
        blank_template_image_base64: blank.toString('base64'),
        extensions: await buildExtensions(),
        dictionaries,
        headwords,
        google_cookies,
        hardware_acceleration_options,
        voicevox_speakers: [
            ['四国めたん', '7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff', [['ノーマル', 2], ['あまあま', 0], ['ツンツン', 6], ['セクシー', 4]]],
            ['ずんだもん', '388f246b-8c41-4ac1-8e2d-5d79f3ff56d9', [['ノーマル', 3], ['あまあま', 1], ['ツンツン', 7], ['セクシー', 5]]],
            ['春日部つむぎ', '35b2c544-660e-401e-b503-0e14c635303a', [['ノーマル', 8]]],
            ['雨晴はう', '3474ee95-c274-47f9-aa1a-8322163d96f1', [['ノーマル', 10]]],
            ['波音リツ', 'b1a81618-b27b-40d2-b0ea-27a9ad408c4b', [['ノーマル', 9]]],
            ['玄野武宏', 'c30dc15a-0992-4f8d-8bb8-ad3b314e6a6f', [['ノーマル', 11]]],
            ['冥鳴ひまり', '0f56c2f2-644c-49c9-8989-94e11f7129d0', [['ノーマル', 14]]],
        ].map(([name, speaker_uuid, styles]) => ({ name, speaker_uuid, styles: styles.map(([n, id]) => ({ name: n, id, type: 'talk' })), version: '0.21.1', supported_features: { permitted_synthesis_morphing: 'SELF_ONLY' } })),
        app_info: {
            update_check: { runningVersion: '0.9.3', latestVersion: '0.9.3', isUpToDate: true, success: true },
            system_info: { platform: 'win32', osVersion: 'Windows 11 Pro', cpuModel: 'AMD Ryzen 7 5800X3D 8-Core Processor', cpuArch: 'x64', appArch: 'x64', httpCliTool: 'curl' },
        },
    };
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'data', 'db.json'), JSON.stringify(db));
    // Preview images for inspection
    const prev = path.join(__dirname, 'data', 'previews');
    fs.mkdirSync(prev, { recursive: true });
    for (const t of ocr_templates) fs.writeFileSync(path.join(prev, `${t.id}.png`), Buffer.from(t.image_base64, 'base64'));
    console.log(`seeded: ${ocr_templates.length} templates, ${db.extensions.length} extensions, ${dictionaries.length} dictionaries, ${headwords.length} headwords`);
}
main().catch(e => { console.error(e); process.exit(1); });
