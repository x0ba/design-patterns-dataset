import { useEffect, useMemo, useRef, useState } from 'react';
import { BUILDINGS, type Lang } from '../data/campus';
import type { Cat } from '../data/destinations';
import { STRINGS, fmt } from '../lib/i18n';
import { searchDestinations } from '../lib/search';
import { titleCase } from '../lib/format';
import { Icon } from './Icon';

interface Props {
  lang: Lang;
  onPick: (id: string) => void;
  onNearest: (kind: string) => void;
  onClose: () => void;
}

const KINDS = [
  ['restroom', 'restroom'],
  ['cafe', 'cafe'],
  ['pharmacy', 'pharmacy'],
  ['wheelchair', 'wheelchair'],
  ['chapel', 'chapel'],
] as const;

const ROWS = ['1234567890'.split(''), 'qwertyuiop'.split(''), 'asdfghjkl'.split(''), 'zxcvbnm'.split('')];
const CATS: (Cat | 'all')[] = ['all', 'dept', 'clinic', 'service', 'amenity', 'parking'];

export function SearchOverlay({ lang, onPick, onNearest, onClose }: Props) {
  const T = STRINGS[lang];
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Cat | 'all'>('all');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hits = useMemo(() => searchDestinations(q, cat), [q, cat]);
  const press = (k: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setQ((v) => v + k);
    input.current?.focus();
  };
  const back = (e: React.MouseEvent) => {
    e.preventDefault();
    setQ((v) => v.slice(0, -1));
    input.current?.focus();
  };

  return (
    <div className="search-sheet" role="dialog" aria-modal="true" aria-label={T.searchTitle}>
      <div className="s-head">
        <label className="s-input">
          <Icon name="search" size={34} />
          <span className="sr">{T.searchTitle}</span>
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={T.searchPlaceholder}
            inputMode="none"
            autoComplete="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hits[0]) onPick(hits[0].d.id);
            }}
          />
          {q && (
            <button className="xbtn" style={{ width: 52, height: 52 }} onClick={() => setQ('')} aria-label={T.clear}>
              <Icon name="close" />
            </button>
          )}
        </label>
        <button className="btn" onClick={onClose}>
          <Icon name="back" /> {T.cancel}
        </button>
      </div>

      <div className="nearest">
        <span className="h-label">{T.nearestTitle}</span>
        {KINDS.map(([k, icon]) => (
          <button key={k} className="nbtn" onClick={() => onNearest(k)}>
            <Icon name={icon} /> {T.kind[k]}
          </button>
        ))}
      </div>

      <div className="cats" role="group" aria-label="Categories">
        {CATS.map((c) => (
          <button key={c} className="cat" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {T.cat[c]}
          </button>
        ))}
        <span className="count">{fmt(T.results, { n: hits.length })}</span>
      </div>

      <div className="results">
        {hits.length === 0 && <div className="empty">{T.noResults}</div>}
        {hits.map((h) => (
          <button key={h.d.id} className="res" onClick={() => onPick(h.d.id)}>
            <b>{h.d.name}</b>
            <span>
              {BUILDINGS[h.d.b].name[lang]} · {fmt(T.level, { n: h.d.level })}
            </span>
            {h.alias && <em>{fmt(T.matchedAs, { q: titleCase(h.alias) })}</em>}
          </button>
        ))}
      </div>

      <div className="kb" aria-label="On-screen keyboard">
        {ROWS.map((r, i) => (
          <div className="kb-row" key={i}>
            {r.map((k) => (
              <button key={k} className="key" onMouseDown={press(k)} tabIndex={-1}>
                {k}
              </button>
            ))}
            {i === 3 && (
              <button className="key wide dark" onMouseDown={back} tabIndex={-1} aria-label={T.delete}>
                <Icon name="delete" size={30} />
              </button>
            )}
          </div>
        ))}
        <div className="kb-row">
          <button className="key wide" onMouseDown={press('-')} tabIndex={-1}>-</button>
          <button className="key space" onMouseDown={press(' ')} tabIndex={-1}>{T.space}</button>
          <button className="key wide" onMouseDown={press("'")} tabIndex={-1}>'</button>
          <button className="key wide dark" onMouseDown={(e) => { e.preventDefault(); setQ(''); }} tabIndex={-1}>{T.clear}</button>
        </div>
      </div>
    </div>
  );
}
