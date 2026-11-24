import { useState, type KeyboardEvent } from 'react';
import { Card, Field, Pill, PageHeader, Toggle } from '../components/ui';
import { escalationReason, greetingClaimsOwner } from '../lib/engine';
import { go } from '../lib/route';
import { updateDraft, useAppState } from '../lib/store';
import type { Settings, Voice } from '../types';

const TONE_LABELS = ['Very formal', 'Formal', 'Neutral', 'Friendly', 'Casual'];
const TONE_SAMPLES = [
  'Thank you for calling. How may I assist you today?',
  'Thanks for calling. How can I help you?',
  'Hi there, thanks for calling. How can I help?',
  'Hey, thanks for calling! What can I do for you?',
  'Hey! What’s going on? Tell me what you need.',
];

const VOICES: Array<{ value: Voice; name: string; desc: string }> = [
  { value: 'warm', name: 'Warm', desc: 'Unhurried and friendly. Suits callers who are stressed or locked out.' },
  { value: 'steady', name: 'Steady', desc: 'Even and low. Sounds like a working tradesperson.' },
  { value: 'bright', name: 'Bright', desc: 'Quicker and more upbeat. Good for short, simple calls.' },
];

export function Assistant() {
  const draft = useAppState((s) => s.draft);
  const live = useAppState((s) => s.live);
  const set = (patch: Partial<Settings>) => updateDraft((d) => ({ ...d, ...patch }));

  const claims = greetingClaimsOwner(draft.greeting);
  const alertText = draft.profile.alertNumber;

  return (
    <>
      <PageHeader
        title="Assistant"
        lede="What callers hear, how it sounds, and when it texts you. Changes stay in the draft until you save them."
      />

      <div className="two-col">
        <Card
          title="Opening line"
          subtitle="The first thing a caller hears on every call."
          actions={<Pill tone={live.disclosureOn ? 'ok' : 'warn'}>{live.disclosureOn ? 'Live: discloses' : 'Live: no disclosure'}</Pill>}
        >
          <div className="stack">
            <div className="disclosure-row">
              <Toggle
                label="Say at the start of every call that this is an AI assistant"
                checked={draft.disclosureOn}
                onChange={(v) => set({ disclosureOn: v })}
              />
              <div>
                <div className="strong">Say upfront that it's an assistant</div>
                <div className="muted small">Callers hear this before anything else.</div>
              </div>
            </div>

            <Field label="Disclosure line" wide>
              <textarea
                rows={2}
                value={draft.disclosureLine}
                disabled={!draft.disclosureOn}
                onChange={(e) => set({ disclosureLine: e.target.value })}
              />
            </Field>

            <Field label="Greeting" wide hint="Said after the disclosure line, if it is on.">
              <textarea rows={2} value={draft.greeting} onChange={(e) => set({ greeting: e.target.value })} />
            </Field>

            {claims && (
              <div className={`callout ${draft.disclosureOn ? 'bad' : 'warn'}`}>
                <strong>
                  {draft.disclosureOn ? 'This greeting contradicts the disclosure.' : 'Callers will hear you, not an assistant.'}
                </strong>{' '}
                The greeting says "this is Rafa." Change it to something like "Thanks for calling Domínguez Lock &amp; Key" so
                the disclosure is true.
              </div>
            )}

            <div className="preview">
              <div className="preview-label">What a caller hears first</div>
              <div className="bubble-assistant">
                {draft.disclosureOn && <p>{draft.disclosureLine}</p>}
                <p>{draft.greeting}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="How it sounds" subtitle="Tone applies to everything it says after the greeting.">
          <div className="stack">
            <div className="tone">
              <div className="tone-head">
                <span className="strong">Formality</span>
                <Pill tone="neutral">{TONE_LABELS[draft.formality]}</Pill>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={draft.formality}
                aria-label="Formality"
                onChange={(e) => set({ formality: Number(e.target.value) })}
                className="slider"
              />
              <div className="slider-labels">
                {TONE_LABELS.map((l, i) => (
                  <span key={l} className={i === draft.formality ? 'on' : ''}>
                    {l}
                  </span>
                ))}
              </div>
              <div className="sample">
                <span className="muted small">Sample</span>
                <p>{TONE_SAMPLES[draft.formality]}</p>
              </div>
            </div>

            <div>
              <div className="strong">Voice</div>
              <div className="voice-grid" role="radiogroup" aria-label="Voice">
                {VOICES.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    role="radio"
                    aria-checked={draft.voice === v.value}
                    className={`voice${draft.voice === v.value ? ' active' : ''}`}
                    onClick={() => set({ voice: v.value })}
                  >
                    <span className="strong">{v.name}</span>
                    <span className="muted small">{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="lang-row">
              <div>
                <div className="strong">Languages</div>
                <div className="muted small">English is always on. Spanish answers when a caller speaks Spanish.</div>
              </div>
              <div className="lang-controls">
                <Pill tone="ok">English</Pill>
                <label className="inline-toggle">
                  <Toggle label="Answer in Spanish" checked={draft.spanishOn} onChange={(v) => set({ spanishOn: v })} />
                  <span>Spanish</span>
                </label>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card
        id="alerts"
        title="Text Rafa right away"
        subtitle="If any of these come up, the assistant texts you immediately, even mid-call."
        actions={<span className="muted small">Texts go to {alertText}. <button type="button" className="link-btn" onClick={() => go('#/business')}>Change number</button></span>}
      >
        <div className="alerts-grid">
          <div className="stack">
            <div className="disclosure-row">
              <Toggle
                label="Any child or pet locked in a vehicle"
                checked={draft.alertIntent}
                onChange={(v) => set({ alertIntent: v })}
              />
              <div>
                <div className="strong">Any child or pet locked in a vehicle</div>
                <div className="muted small">
                  Matches the meaning, not just exact phrases. "My son's locked in the van" and "the dog is in the car" both trigger it.
                  Recommended.
                </div>
              </div>
            </div>

            <div>
              <div className="strong">Exact phrases</div>
              <div className="muted small">Callers' words that trigger a text. Matching ignores capitals.</div>
              <PhraseList
                phrases={draft.alertPhrases}
                onChange={(next) => set({ alertPhrases: next })}
              />
            </div>
          </div>

          <AlertTester draft={draft} />
        </div>
      </Card>

      <Card title="Rules it must follow" subtitle="Plain language. The assistant reads these on every call.">
        <RuleList rules={draft.rules} onChange={(next) => set({ rules: next })} />
      </Card>
    </>
  );
}

function PhraseList({ phrases, onChange }: { phrases: string[]; onChange: (next: string[]) => void }) {
  const [value, setValue] = useState('');
  const add = () => {
    const v = value.trim();
    if (!v || phrases.some((p) => p.toLowerCase() === v.toLowerCase())) return setValue('');
    onChange([...phrases, v]);
    setValue('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  };
  return (
    <div className="phrases">
      <ul className="chips">
        {phrases.map((p) => (
          <li key={p} className="chip">
            <span>{p}</span>
            <button type="button" aria-label={`Remove ${p}`} onClick={() => onChange(phrases.filter((x) => x !== p))}>
              ×
            </button>
          </li>
        ))}
        {phrases.length === 0 && <li className="muted small">No phrases yet.</li>}
      </ul>
      <div className="add-row">
        <input
          value={value}
          placeholder="Add a phrase, e.g. niño en el carro"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          aria-label="New phrase"
        />
        <button type="button" className="btn" onClick={add} disabled={!value.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}

function AlertTester({ draft }: { draft: Settings }) {
  const [text, setText] = useState("My son's locked in the van. He's four.");
  const reason = text.trim() ? escalationReason(draft, text) : null;
  return (
    <div className="tester">
      <div className="strong">Test a caller's words</div>
      <div className="muted small">Uses your draft settings. Nothing is sent.</div>
      <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} aria-label="Caller words to test" />
      {text.trim() === '' ? (
        <div className="callout neutral">Type what a caller says.</div>
      ) : reason ? (
        <div className="callout ok">
          <strong>Texts {draft.profile.alertNumber} right away.</strong> Matched {reason}.
        </div>
      ) : (
        <div className="callout bad">
          <strong>No text.</strong> The call is handled as a normal call.
        </div>
      )}
    </div>
  );
}

function RuleList({ rules, onChange }: { rules: string[]; onChange: (next: string[]) => void }) {
  const [value, setValue] = useState('');
  const add = () => {
    const v = value.trim();
    if (!v) return;
    onChange([...rules, v]);
    setValue('');
  };
  return (
    <div className="stack">
      <ol className="rules">
        {rules.map((r, i) => (
          <li key={`${i}-${r}`}>
            <span className="rule-text">{r}</span>
            <button type="button" className="link-btn" onClick={() => onChange(rules.filter((_, j) => j !== i))}>
              Remove
            </button>
          </li>
        ))}
      </ol>
      <div className="add-row">
        <input
          value={value}
          placeholder="Add a rule, e.g. Don't give a price for a commercial rekey"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          aria-label="New rule"
        />
        <button type="button" className="btn" onClick={add} disabled={!value.trim()}>
          Add rule
        </button>
      </div>
    </div>
  );
}
