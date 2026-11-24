import { useMemo, useState } from 'react';
import { EMPTY_FILTERS, Settings, overview, baselineShort } from '../model';
import { M_OCT26, M_SEP26, FUNNEL } from '../data';
import { fmt, pct } from '../format';
import { Brief, Note, SEED_BRIEF } from '../notes';
import { SplitBar } from '../components/charts';
import { Finding, driversFinding, overlapFinding, paymentFinding, seasonFinding, segmentFinding, splitShares, waveFinding } from '../findings';

interface Props { brief: Brief; setBrief: (f: (b: Brief) => Brief) => void; s: Settings; addNote: (f: Finding) => void }

export default function BriefView({ brief, setBrief, s, addNote }: Props) {
  const all: Settings = useMemo(() => ({ ...s, filters: EMPTY_FILTERS }), [s]);
  const ov = useMemo(() => overview(all), [all]);
  const sh = splitShares(ov);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const suggestions = useMemo<Finding[]>(() => [
    driversFinding(all, ov),
    segmentFinding(all, 't'),
    waveFinding(all),
    paymentFinding(),
    segmentFinding(all, 'c'),
    seasonFinding(ov, { ...all, baseline: 'yoy' }),
    overlapFinding(ov, all),
  ], [all, ov]);
  const have = new Set(brief.notes.flatMap((n) => [n.title, n.key ?? '']));

  const update = (id: string, patch: Partial<Note>) => setBrief((b) => ({ ...b, notes: b.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  const remove = (id: string) => setBrief((b) => ({ ...b, notes: b.notes.filter((n) => n.id !== id) }));
  const move = (id: string, dir: -1 | 1) => setBrief((b) => {
    const i = b.notes.findIndex((n) => n.id === id);
    const j = i + dir;
    if (j < 0 || j >= b.notes.length) return b;
    const notes = [...b.notes];
    [notes[i], notes[j]] = [notes[j], notes[i]];
    return { ...b, notes };
  });

  const keyNumbers = [
    { k: 'Cancellations, Sep / Oct', v: `${fmt(ov.total[M_SEP26])} / ${fmt(ov.total[M_OCT26])}` },
    { k: `Baseline (${baselineShort(s.baseline)})`, v: `${fmt((ov.expG(0, M_SEP26) + ov.expG(1, M_SEP26) + ov.expG(2, M_SEP26)))} / mo` },
    { k: 'Extra cancellations, Sep–Oct', v: fmt(ov.excessTotal) },
    { k: 'Deliberate / payment / admin', v: `${pct(sh[0])} / ${pct(sh[1])} / ${pct(sh[2])}` },
    { k: 'Sponsorships still at risk', v: fmt(FUNNEL.open) },
  ];

  const asText = () => {
    const lines = [
      'Sep–Oct 2026 cancellation spike: briefing note for the executive team (Fri Nov 20)',
      '',
      brief.headline,
      '',
      'Key numbers',
      ...keyNumbers.map((x) => `- ${x.k}: ${x.v}`),
      `- Counting rule: failed-card sponsors who gave a reason are counted as ${s.attribution === 'stated' ? 'their stated reason' : 'payment lapses'}.`,
      '',
      ...brief.notes.flatMap((n, i) => [`${i + 1}. ${n.kind === 'question' ? '[Open question] ' : ''}${n.title}`, `   ${n.body}`, '']),
      'Source: Retention Lens · cancellations through Oct 31, failed charges through Nov 15.',
    ];
    return lines.join('\n');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(asText()); } catch {
      const ta = document.createElement('textarea'); ta.value = asText(); document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="view brief-layout">
      <article className="card doc">
        <div className="doc-head">
          <div>
            <div className="eyebrow">Briefing note · Executive team · Fri Nov 20</div>
            <h1>Why did cancellations jump in September and October?</h1>
            <p className="muted">For the Director of Supporter Care · prepared by Hana Lindqvist, Supporter Insights</p>
          </div>
          <div className="doc-actions">
            <button className="btn" onClick={copy}>{copied ? 'Copied' : 'Copy as text'}</button>
            <button className="link small" onClick={() => { if (window.confirm('Replace the brief with Friday’s draft? Your edits will be lost.')) setBrief(() => SEED_BRIEF); }}>Restore Friday’s draft</button>
          </div>
        </div>

        <label className="field-label" htmlFor="headline">The answer, in one or two sentences</label>
        <textarea id="headline" className="headline" rows={3} value={brief.headline} onChange={(e) => { const v = e.target.value; setBrief((b) => ({ ...b, headline: v })); }} />

        <div className="keynums">
          {keyNumbers.map((x) => (
            <div key={x.k}><span className="muted small">{x.k}</span><b>{x.v}</b></div>
          ))}
        </div>
        <SplitBar values={ov.excessG} height={10} />
        <p className="muted small rule">
          Live from the full sponsor base. Counting rule: failed-card sponsors who gave a reason are counted as <b>{s.attribution === 'stated' ? 'their stated reason' : 'payment lapses'}</b>. Change it in the toolbar.
        </p>

        <h3 className="mini-h">Findings ({brief.notes.length})</h3>
        {brief.notes.length === 0 && <div className="empty">No findings yet. Add them from any view or from the suggestions on the right.</div>}
        <ol className="notes">
          {brief.notes.map((n, i) => (
            <li key={n.id} className={`note ${n.kind}`}>
              <div className="note-num">{i + 1}</div>
              <div className="note-main">
                {editing === n.id ? (
                  <>
                    <input className="note-title-in" value={n.title} onChange={(e) => update(n.id, { title: e.target.value })} />
                    <textarea className="note-body-in" rows={4} value={n.body} onChange={(e) => update(n.id, { body: e.target.value })} />
                  </>
                ) : (
                  <>
                    <div className="note-title">{n.kind === 'question' && <span className="q-tag">Open question</span>}{n.title}</div>
                    <p className="note-body">{n.body}</p>
                  </>
                )}
                <div className="note-meta">{n.source} · {n.context} · added {n.added}</div>
              </div>
              <div className="note-tools">
                <button onClick={() => setEditing(editing === n.id ? null : n.id)}>{editing === n.id ? 'Done' : 'Edit'}</button>
                <button onClick={() => update(n.id, { kind: n.kind === 'question' ? 'finding' : 'question' })}>{n.kind === 'question' ? 'Mark resolved' : 'Mark as question'}</button>
                <button onClick={() => move(n.id, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button onClick={() => move(n.id, 1)} disabled={i === brief.notes.length - 1} aria-label="Move down">↓</button>
                <button className="danger" onClick={() => remove(n.id)} aria-label="Remove">Remove</button>
              </div>
            </li>
          ))}
        </ol>
      </article>

      <aside className="card suggest">
        <h2>Suggested from the data</h2>
        <p className="sub">Generated from the full sponsor base with the current baseline and counting rule.</p>
        {suggestions.map((f) => (
          <div className={`sugg ${f.kind}`} key={f.title}>
            <div className="sugg-head">
              <b>{f.title}</b>
              {have.has(f.title) || (f.key && have.has(f.key)) ? <span className="muted small">In brief</span> : <button className="pin" onClick={() => addNote(f)}>+ Add</button>}
            </div>
            <p>{f.body}</p>
            <div className="note-meta">{f.source}</div>
          </div>
        ))}
      </aside>
    </div>
  );
}
