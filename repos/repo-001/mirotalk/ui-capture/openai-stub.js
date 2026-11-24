// Local stand-in for the OpenAI Chat Completions API (used by MiroTalk's ChatGPT chat tab and chat translation).
// Listens on 127.0.0.1:4450, answers POST /v1/chat/completions with realistic, context-aware replies.
'use strict';
const http = require('http');
const PORT = parseInt(process.env.OPENAI_STUB_PORT || '4450', 10);

const translations = {
    Spanish: {
        'sounds good': 'Me parece bien',
        'thanks': 'Gracias',
        default: (t) => `[ES] ${t}`,
    },
};

function translate(text, lang) {
    const dict = {
        Spanish: [
            [/^sounds good.*$/i, 'Me parece bien, lo revisamos el jueves.'],
            [/thank/i, '¡Gracias a todos! Buen trabajo hoy.'],
        ],
        German: [[/thank/i, 'Danke euch allen! Gute Arbeit heute.']],
        French: [[/thank/i, 'Merci à tous ! Excellent travail aujourd’hui.']],
        Italian: [[/thank/i, 'Grazie a tutti! Ottimo lavoro oggi.']],
    };
    for (const [re, out] of dict[lang] || []) if (re.test(text)) return out;
    const prefix = { Spanish: 'ES', German: 'DE', French: 'FR', Italian: 'IT', Portuguese: 'PT', Japanese: 'JA' }[lang];
    return prefix ? `${text}` : text;
}

function answer(prompt) {
    const p = prompt.toLowerCase();
    if (/agenda|meeting notes|summar/.test(p))
        return [
            "Here's a concise summary of the sprint review:",
            '',
            '**Decisions**',
            '- Ship the new onboarding checklist behind a feature flag on **Nov 24**.',
            '- Keep the legacy billing page for one more release; migrate EU customers first.',
            '',
            '**Action items**',
            '1. Priya — finalize the empty-state copy and send to localization (due Wed).',
            '2. Marco — fix the flaky `checkout.spec.ts` test before the release branch is cut.',
            '3. Hannah — schedule a 30-min usability session with three pilot customers.',
            '',
            '**Open questions**',
            '- Do we need a separate rollout plan for mobile web?',
        ].join('\n');
    if (/regex|email/.test(p))
        return 'A practical (not RFC-complete) pattern for validating emails:\n\n```js\nconst EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/;\nEMAIL_RE.test("ana.lopez@northwind.io"); // true\n```\n\nFor anything security-relevant, send a confirmation link instead of relying on the regex alone.';
    if (/sql|query|postgres/.test(p))
        return 'You can get weekly active users with a date bucket:\n\n```sql\nSELECT date_trunc(\'week\', created_at) AS week,\n       count(DISTINCT user_id)          AS wau\nFROM   events\nWHERE  created_at >= now() - interval \'12 weeks\'\nGROUP  BY 1\nORDER  BY 1;\n```\n\nAdd an index on `(created_at, user_id)` if the table is large.';
    if (/icebreaker|retro|retrospective/.test(p))
        return 'Three quick retro prompts that work well remotely:\n\n1. **One word** to describe this sprint — and why.\n2. What is one thing we should *stop* doing next sprint?\n3. Who helped you unblock something this week? Give them a shout-out.\n\nTimebox each to ~3 minutes and use the chat for people who prefer writing.';
    if (/translate/.test(p)) return 'Sure — paste the text and tell me the target language, and I will keep the tone and formatting.';
    return `Good question. In short: ${prompt.replace(/\?$/, '')} depends mostly on your constraints (team size, deadline and who owns the follow-up). A reasonable default is to agree on one owner, write the decision in the meeting notes, and revisit it at the next weekly sync. Want me to draft that note?`;
}

http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
        if (req.method === 'GET' && /\/v1\/models/.test(req.url)) {
            res.writeHead(200, { 'content-type': 'application/json' });
            return res.end(JSON.stringify({ object: 'list', data: [{ id: 'gpt-6-luna', object: 'model', owned_by: 'openai' }] }));
        }
        if (req.method !== 'POST' || !/chat\/completions/.test(req.url)) {
            res.writeHead(404, { 'content-type': 'application/json' });
            return res.end(JSON.stringify({ error: { message: 'Not found', type: 'invalid_request_error' } }));
        }
        let json = {};
        try {
            json = JSON.parse(body || '{}');
        } catch (_) {}
        const msgs = json.messages || [];
        const sys = msgs.find((m) => m.role === 'system')?.content || '';
        const last = [...msgs].reverse().find((m) => m.role === 'user')?.content || '';
        let content;
        const langMatch = /translat\w*[^.]*?\b(?:into|to)\s+([A-Z][a-z]+)/.exec(sys + ' ' + last);
        if (langMatch && /translat/i.test(sys)) content = translate(String(last), langMatch[1]);
        else content = answer(String(last));
        const prompt_tokens = Math.ceil(JSON.stringify(msgs).length / 4);
        const completion_tokens = Math.ceil(content.length / 4);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
            JSON.stringify({
                id: 'chatcmpl-' + Math.random().toString(36).slice(2, 14),
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: json.model || 'gpt-6-luna',
                choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
                usage: { prompt_tokens, completion_tokens, total_tokens: prompt_tokens + completion_tokens },
            })
        );
    });
}).listen(PORT, '127.0.0.1', () => console.log(`[openai-stub] http://127.0.0.1:${PORT}/v1`));
