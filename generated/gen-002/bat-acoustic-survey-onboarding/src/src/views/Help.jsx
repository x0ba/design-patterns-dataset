import React, { useEffect, useMemo, useState } from 'react';
import { TERMS, TOPICS, TOPIC_CATEGORIES } from '../helpTopics.js';
import { Icon } from '../ui.jsx';

export default function Help({ ctx }) {
  const { helpOpen, setHelpOpen, go, applied } = ctx;
  const tab = helpOpen.tab;
  return (
    <div className="page">
      <div className="page-h">
        <div><h1>Help and terms</h1><p className="muted">Echolog’s vocabulary next to what older bat-ID programs call the same things, and {TOPICS.length} help topics.</p></div>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'terms'} className={tab === 'terms' ? 'on' : ''} onClick={() => setHelpOpen({ ...helpOpen, tab: 'terms' })}>Terms compared</button>
        <button role="tab" aria-selected={tab === 'topics'} className={tab === 'topics' ? 'on' : ''} onClick={() => setHelpOpen({ ...helpOpen, tab: 'topics' })}>Help topics <em>{TOPICS.length}</em></button>
      </div>
      {tab === 'terms' ? <Terms go={go} setHelpOpen={setHelpOpen} applied={applied} /> : <Topics helpOpen={helpOpen} setHelpOpen={setHelpOpen} />}
    </div>
  );
}

function Terms({ go, setHelpOpen, applied }) {
  const fill = (s) => s.replace('{thr}', applied.thr).replace('{minCalls}', applied.minCalls).replace('{minFreq}', applied.minFreq);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');
  const groups = ['Files and counts', 'Filtering', 'Classification', 'Review'];
  const rows = TERMS.filter((t) => {
    if (group !== 'all' && t.group !== group) return false;
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (t.term + ' ' + fill(t.meaning) + ' ' + t.older.join(' ')).toLowerCase().includes(s);
  });
  const dest = { guide: 'Open the noise review', settings: 'Open Settings', vetting: 'Open Vetting' };
  return (
    <>
      <div className="callout">
        <Icon name="info" size={16} />
        <p>Programs differ, so the “also called” column lists names commonly used elsewhere, not exact equivalents. The last column is where behaviour tends to differ, which matters when you compare a percentage from your old software with one from Echolog.</p>
      </div>
      <div className="filters flat">
        <label className="search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms, for example “NoID” or “trigger”" aria-label="Search terms" /></label>
        <div className="seg">
          {['all', ...groups].map((g) => <button key={g} className={group === g ? 'on' : ''} onClick={() => setGroup(g)}>{g === 'all' ? 'All' : g}</button>)}
        </div>
      </div>
      <section className="card flush">
        <table className="data terms">
          <thead><tr><th>In Echolog</th><th>What it means here</th><th>Also called</th><th>Where it differs</th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.term}>
                <td><b>{t.term}</b><small>{t.group}</small></td>
                <td>{fill(t.meaning)}</td>
                <td><ul className="alias">{t.older.map((o) => <li key={o}>{o}</li>)}</ul></td>
                <td>{t.watch}{t.to && <><br /><button className="link" onClick={() => go(t.to, t.to === 'vetting' ? { vet: { queue: 'qa' } } : t.to === 'guide' ? { step: 5 } : {})}>{dest[t.to]}</button></>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="empty">No terms match. Try another word, or <button className="link" onClick={() => { setQ(''); setGroup('all'); }}>clear the search</button>.</td></tr>}
          </tbody>
        </table>
      </section>
      <p className="muted small">Need the longer explanation? <button className="link" onClick={() => setHelpOpen({ tab: 'topics', topic: 'nf-1' })}>Noise filter vs. classifier confidence</button></p>
    </>
  );
}

function Topics({ helpOpen, setHelpOpen }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return TOPICS.filter((t) => (cat === 'all' || t.cat === cat) && (!s || (t.title + ' ' + t.summary).toLowerCase().includes(s)));
  }, [q, cat]);
  const cur = TOPICS.find((t) => t.id === helpOpen.topic) || null;
  useEffect(() => {
    const el = document.querySelector('.tlist button.on');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [helpOpen.topic]);
  return (
    <div className="topics">
      <aside>
        <label className="search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${TOPICS.length} topics`} aria-label="Search help topics" /></label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="all">All categories ({TOPICS.length})</option>
          {TOPIC_CATEGORIES.map((c) => <option key={c} value={c}>{c} ({TOPICS.filter((t) => t.cat === c).length})</option>)}
        </select>
        <ul className="tlist">
          {list.map((t) => (
            <li key={t.id}><button className={cur?.id === t.id ? 'on' : ''} onClick={() => setHelpOpen({ tab: 'topics', topic: t.id })}><span>{t.title}</span><small>{t.cat}</small></button></li>
          ))}
          {!list.length && <li className="empty">No topics match “{q}”.</li>}
        </ul>
      </aside>
      <article className="card tart">
        {cur ? (
          <>
            <p className="eyebrow">{cur.cat}</p>
            <h2>{cur.title}</h2>
            {cur.body ? cur.body.map((p, i) => <p key={i}>{p}</p>) : (
              <p>{cur.summary}</p>
            )}
          </>
        ) : (
          <>
            <p className="eyebrow">Suggested for you</p>
            <h2>Start here</h2>
            <ul className="sugg">
              {['nf-1', 'im-1', 'mv-1', 'rp-3'].map((id) => { const t = TOPICS.find((x) => x.id === id); return <li key={id}><button onClick={() => setHelpOpen({ tab: 'topics', topic: id })}><b>{t.title}</b><span>{t.summary}</span></button></li>; })}
            </ul>
          </>
        )}
      </article>
    </div>
  );
}
