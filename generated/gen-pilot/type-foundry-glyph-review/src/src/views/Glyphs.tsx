import { useMemo, useState } from 'react';
import { STYLES, styleById, type GlyphStatus, type Script, type StyleId } from '../data/core';
import { countStatuses, GREEK, LATIN, skey, type Glyph } from '../data/glyphs';
import { REVISIONS } from '../data/revisions';
import { lockKey, useGo, useStore, useToast } from '../store';
import { Icon, Seg, Spec, StatusPill } from '../components/ui';
import { GlyphCanvas } from '../components/GlyphCanvas';

type SF = 'all' | GlyphStatus | 'changed';

const SPECIAL_LABEL: Record<string, string> = { ' ': 'space', ' ': 'nbsp', '­': 'shy' };

export function Glyphs() {
  const { s, dispatch } = useStore();
  const go = useGo();
  const toast = useToast();
  const routeStyle = STYLES.find((x) => x.id === s.route.id)?.id;
  const [style, setStyle] = useState<StyleId>(routeStyle ?? 'regular');
  const [script, setScript] = useState<Script>('latin');
  const [status, setStatus] = useState<SF>('all');
  const [sel, setSel] = useState<Glyph | null>(null);

  const glyphs = script === 'latin' ? LATIN : GREEK;
  const counts = countStatuses(s.statuses, style, script);
  const changed = new Set(REVISIONS.filter((r) => r.style === style).map((r) => r.ch));
  const locked = s.locks.includes(lockKey(style, script));
  const list = useMemo(() => glyphs.filter((g) => {
    if (status === 'all') return true;
    if (status === 'changed') return changed.has(g.ch);
    return s.statuses[skey(style, g.id)] === status;
  }), [glyphs, status, style, s.statuses]); // eslint-disable-line react-hooks/exhaustive-deps

  const CAT_ORDER = ['Uppercase', 'Lowercase', 'Ligatures', 'Figures', 'Punctuation', 'Symbols', 'Marks', 'Spaces'];
  const cats = CAT_ORDER.filter((c) => list.some((g) => g.cat === c));
  const threadChars = new Set(s.threads.filter((t) => !t.resolved && t.style === style).map((t) => t.ch));

  const setGlyphStatus = (g: Glyph, st: GlyphStatus) => {
    const prev = s.statuses[skey(style, g.id)];
    dispatch({ type: 'setStatus', style, glyphId: g.id, status: st });
    toast(`${g.name} in ${styleById(style).name} → ${st === 'review' ? 'in review' : st}`, { type: 'setStatus', style, glyphId: g.id, status: prev });
  };
  const rev = sel ? REVISIONS.find((r) => r.ch === sel.ch && r.style === style) : undefined;

  return (
    <div className={`glyphs ${sel ? 'with-drawer' : ''}`}>
      <div className="glyphs-main">
        <div className="page-head compact">
          <div className="eyebrow">Calloway · 612 glyphs per style</div>
          <h1>Glyphs</h1>
          <div className="g-tools">
            <Seg value={style} onChange={(v) => { setStyle(v); setSel(null); }} options={STYLES.map((x) => ({
              value: x.id,
              label: <>{x.name}{s.locks.some((k) => k.startsWith(x.id + ':')) && <> <Icon.lock size={9} /></>}</>,
            }))} />
            <Seg value={script} onChange={(v) => { setScript(v); setSel(null); }} options={[
              { value: 'latin', label: <>Latin <span className="c">408</span></> },
              { value: 'greek', label: <>Greek <span className="c">204</span></> },
            ]} />
          </div>
          <div className="g-tools">
            <Seg small value={status} onChange={setStatus} options={[
              { value: 'all', label: <>All <span className="c">{glyphs.length}</span></> },
              { value: 'approved', label: <>Approved <span className="c">{counts.approved}</span></> },
              { value: 'review', label: <>In review <span className="c">{counts.review}</span></> },
              { value: 'draft', label: <>Draft <span className="c">{counts.draft}</span></> },
              { value: 'changed', label: <>Changed since Tue <span className="c">{glyphs.filter((g) => changed.has(g.ch)).length}</span></> },
            ]} />
            {locked && <span className="pill pill-locked"><Icon.lock size={10} /> {styleById(style).name} {script === 'latin' ? 'Latin' : 'Greek'} is locked as final</span>}
          </div>
        </div>
        <div className="grid-scroll">
          {cats.map((c) => (
            <div key={c} className="g-cat">
              <div className="g-cat-title">{c} <span>{list.filter((g) => g.cat === c).length}</span></div>
              <div className="g-grid">
                {list.filter((g) => g.cat === c).map((g) => {
                  const st = s.statuses[skey(style, g.id)];
                  return (
                    <button key={g.id} className={`g-cell st-${st} ${sel?.id === g.id ? 'on' : ''}`} onClick={() => setSel(g)} title={`${g.name} · ${g.cp} · ${st}`}>
                      {SPECIAL_LABEL[g.ch] ? <span className="g-special">{SPECIAL_LABEL[g.ch]}</span> : <Spec ch={g.ch} style={style} size={26} />}
                      <span className="g-name">{g.name}</span>
                      {changed.has(g.ch) && <span className="g-changed" title="Changed since Tuesday" />}
                      {threadChars.has(g.ch) && <span className="g-thread" title="Open comment"><Icon.bubble size={9} /></span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="empty pad">No glyphs in this filter.</p>}
        </div>
      </div>

      {sel && (
        <aside className="drawer">
          <div className="drawer-head">
            <div>
              <h2>{sel.name}</h2>
              <div className="sub mono">{sel.cp} · {styleById(style).name}</div>
            </div>
            <button className="x" onClick={() => setSel(null)} aria-label="Close">×</button>
          </div>
          {SPECIAL_LABEL[sel.ch] ? <div className="canvas-loading" style={{ height: 300 }}>Whitespace glyph</div> :
            <GlyphCanvas key={style + sel.id} style={style} ch={sel.ch} mode="now" height={300} />}
          <div className="drawer-sec">
            <div className="row-between"><span>Status</span><StatusPill status={s.statuses[skey(style, sel.id)]} /></div>
            {locked ? (
              <p className="small"><Icon.lock size={10} /> Locked as final. Unlock from <button className="link inline" onClick={() => go('release')}>Lock & share</button> to change.</p>
            ) : (
              <div className="status-set">
                {(['approved', 'review', 'draft'] as GlyphStatus[]).map((st) => (
                  <button key={st} className={`btn sm ${s.statuses[skey(style, sel.id)] === st ? 'cur' : ''}`} onClick={() => setGlyphStatus(sel, st)}>
                    {st === 'approved' ? 'Approve' : st === 'review' ? 'Back to review' : 'Mark draft'}
                  </button>
                ))}
              </div>
            )}
          </div>
          {rev && (
            <div className="drawer-sec">
              <p className="small">Revised by {rev.author === 'eleni' ? 'Eleni' : 'Tomás'} since Tuesday.</p>
              <button className="btn block" onClick={() => go('review', rev.id)}>Compare with Tuesday <Icon.arrow /></button>
            </div>
          )}
          {s.threads.filter((t) => t.ch === sel.ch && t.style === style).map((t) => (
            <button key={t.id} className="related" onClick={() => go('comments', t.id)}><Icon.bubble /> <span><b>{t.subject}</b><br /><span className="sub">{t.resolved ? 'resolved' : 'open'}</span></span></button>
          ))}
        </aside>
      )}
    </div>
  );
}
