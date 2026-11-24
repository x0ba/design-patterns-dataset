import { useEffect, useRef, useState } from 'react';
import { CHARACTERS } from '../data';
import { go } from '../router';
import { useStore } from '../store';
import type { Kid, Story } from '../types';
import { IconClose, IconSparkle } from '../icons';

const ADJ = ['Sleepy', 'Gentle', 'Moonlit', 'Little', 'Cozy', 'Starry'];
const NOUN = ['Lantern', 'Adventure', 'Surprise', 'Dream', 'Journey', 'Wish'];

export function NewStory({ onClose }: { onClose: () => void }) {
  const { addStory, stories } = useStore();
  const [prompt, setPrompt] = useState('');
  const [kid, setKid] = useState<Kid>('pia');
  const [age, setAge] = useState(6);
  const [chars, setChars] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ta.current?.focus(); const on = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose(); window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on); }, [busy, onClose]);

  const make = () => {
    if (!prompt.trim()) return;
    setBusy('Writing the story…');
    setTimeout(() => setBusy('Painting the illustrations…'), 900);
    setTimeout(() => {
      const n = stories.length + 1;
      const who = kid === 'pia' ? 'Pia' : kid === 'leo' ? 'Leo' : 'both of you';
      const words = 400 + age * 60;
      const s: Story = {
        id: 's' + String(n).padStart(3, '0'), title: `The ${ADJ[n % ADJ.length]} ${NOUN[(n * 3) % NOUN.length]}`,
        createdAt: '2026-11-16T21:40', by: 'Jonah', for: kid, readingAge: age, wordCount: words, prompt: prompt.trim(),
        characters: chars, settings: ['moon'], illustrations: 4, readAloud: 0, favoriteBy: null,
        opening: `The night was quiet and the lamps were low, and this is the story you asked for, ${who}: ${prompt.trim().replace(/\.$/, '')}.`,
        versions: [{ id: 's' + String(n).padStart(3, '0') + '-v1', kind: 'original', label: 'Original', createdAt: '2026-11-16T21:40', readAloud: 0, ending: 'And when the very last page was turned, everything was exactly as it should be: warm, and quiet, and ready for sleep.' }],
      };
      addStory(s); onClose(); go(`story/${s.id}`);
    }, 2200);
  };

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ns-h">
        <div className="modal-h"><h2 id="ns-h"><IconSparkle size={20} /> Make a new story</h2><button className="icon-btn" onClick={onClose} aria-label="Close" disabled={!!busy}><IconClose size={18} /></button></div>
        <label className="field">What should it be about?
          <textarea ref={ta} rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Captain Biscuit finds a map under the couch. Gentle, short, sleepy ending." disabled={!!busy} />
        </label>
        <div className="mrow">
          <div className="field">Made for
            <div className="pills">{(['pia', 'leo', 'both'] as Kid[]).map((k) => <button key={k} className={'pill' + (kid === k ? ' on' : '')} onClick={() => setKid(k)} disabled={!!busy}>{k === 'pia' ? 'Pia' : k === 'leo' ? 'Leo' : 'Pia & Leo'}</button>)}</div>
          </div>
          <label className="field">Reading age
            <select value={age} onChange={(e) => setAge(+e.target.value)} disabled={!!busy}>{[4, 5, 6, 7, 8, 9, 10].map((a) => <option key={a}>{a}</option>)}</select>
          </label>
        </div>
        <div className="field">Characters to include
          <div className="pills">{CHARACTERS.map((c) => <button key={c.id} className={'pill' + (chars.includes(c.id) ? ' on' : '')} onClick={() => setChars(chars.includes(c.id) ? chars.filter((x) => x !== c.id) : [...chars, c.id])} disabled={!!busy}>{c.name}</button>)}</div>
        </div>
        <div className="modal-f">
          {busy ? <span className="busy"><i />{busy}</span> : <span className="dim">Saved to the family archive when it’s done.</span>}
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose} disabled={!!busy}>Cancel</button>
          <button className="btn primary" onClick={make} disabled={!prompt.trim() || !!busy}>Make the story</button>
        </div>
      </div>
    </div>
  );
}
