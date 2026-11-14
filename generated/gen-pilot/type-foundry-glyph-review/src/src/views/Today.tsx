import { clock, PEOPLE, rel, styleById } from '../data/core';
import { REVISIONS } from '../data/revisions';
import { INITIAL_PRESENCE } from '../data/access';
import { useGo, useStore } from '../store';
import { kernStats, lockReadiness, openThreads, revisionStats, threadsForMe } from '../derive';
import { Avatar, Bar, Icon, Spec } from '../components/ui';
import { PathText } from '../components/GlyphCanvas';

function RevTile({ id }: { id: string }) {
  const { s } = useStore();
  const go = useGo();
  const r = REVISIONS.find((x) => x.id === id)!;
  const d = s.decisions[id].decision;
  return (
    <button className={`rev-tile d-${d}`} onClick={() => go('review', id)} title={`${r.ch} · ${styleById(r.style).name} — ${d === 'pending' ? 'to review' : d}`}>
      <Spec ch={r.ch} style={r.style} size={30} />
      {d === 'approved' && <span className="rt-mark ok"><Icon.check size={9} /></span>}
      {d === 'sent-back' && <span className="rt-mark back"><Icon.cross size={9} /></span>}
    </button>
  );
}

export function Today() {
  const { s } = useStore();
  const go = useGo();
  const el = revisionStats(s, 'eleni');
  const tr = revisionStats(s, 'tomas');
  const ks = kernStats(s);
  const mine = threadsForMe(s).slice().sort((a, b) => a.messages[0].at - b.messages[0].at);
  const lr = lockReadiness(s, 'regular', 'latin');
  const kernMap = new Map(s.kernPairs.map((p) => [p.id, p]));
  const unsure = s.kernPairs.filter((p) => p.unsure).slice(0, 6);
  const lastJonas = Math.max(...s.kernPairs.map((p) => p.at));
  const eleniSeen = INITIAL_PRESENCE.eleni.kind === 'away' ? INITIAL_PRESENCE.eleni.lastSeen : 0;
  const reg = REVISIONS.filter((r) => r.author === 'eleni' && r.style === 'regular');
  const bold = REVISIONS.filter((r) => r.author === 'eleni' && r.style === 'bold');

  return (
    <div className="page today">
      <header className="page-head">
        <div className="eyebrow">Since your last review · Tue 11 Nov, 16:40</div>
        <h1>Three people worked on Calloway while you were away</h1>
        <p className="lede">
          {el.total} Greek glyphs revised · {ks.total} kerning pairs changed in Bold · {tr.total} Latin glyphs touched in Light ·{' '}
          {mine.length} comments waiting on you
        </p>
      </header>

      <div className="today-grid">
        <div className="col">
          {/* LIVE */}
          <section className="card live-card">
            <div className="card-head">
              <Avatar id="jonas" size={36} live />
              <div>
                <h2>Jonas Brandt is kerning Bold right now</h2>
                <div className="sub">Online since 07:52 ({clock(s.now + 60)} in Hamburg) · last edit {rel(lastJonas, s.now)} · nobody else is in the family</div>
              </div>
              <button className="btn" onClick={() => go('kerning')}>Watch the pairs <Icon.arrow /></button>
            </div>
            <div className="live-body">
              <div className="live-pair">
                <div className="lp-label">Working on</div>
                <PathText style="bold" text={s.jonasCursor.left + s.jonasCursor.right} size={64}
                  kern={(a, b) => (a === s.jonasCursor.left && b === s.jonasCursor.right ? s.jonasCursor.value : 0)} />
                <div className="mono lp-val">{s.jonasCursor.left}{s.jonasCursor.right} {s.jonasCursor.value}</div>
              </div>
              <div className="live-access">
                <div className="la-title">What Jonas can change</div>
                <ul className="checks">
                  <li className={s.access.jonas.kerning ? 'yes' : 'no'}>{s.access.jonas.kerning ? <Icon.check /> : <Icon.cross />} Kerning, all styles</li>
                  <li className={s.access.jonas.spacing ? 'yes' : 'no'}>{s.access.jonas.spacing ? <Icon.check /> : <Icon.cross />} Spacing (sidebearings, widths)</li>
                  <li className={s.access.jonas.outlines === 'none' ? 'no' : 'warn'}>
                    {s.access.jonas.outlines === 'none' ? <Icon.cross /> : <Icon.flag />} Outlines{' '}
                    {s.access.jonas.outlines === 'none' ? '— no access' : s.access.jonas.outlines === 'all' ? '— FULL ACCESS' : '— Greek'}
                  </li>
                  <li className="no"><Icon.cross /> Approving glyphs</li>
                </ul>
                <div className="la-audit">Since Tue: {ks.total} kerning edits · 0 spacing edits · 0 outline edits</div>
                <button className="link" onClick={() => go('people', 'jonas')}>Review Jonas’s access <Icon.arrow /></button>
              </div>
            </div>
          </section>

          {/* ELENI */}
          <section className="card">
            <div className="card-head">
              <Avatar id="eleni" size={36} />
              <div>
                <h2>Eleni revised {el.total} Greek glyphs overnight</h2>
                <div className="sub">Wed 23:46 – Thu 02:30 · Regular {reg.length}, Bold {bold.length} · last active {rel(eleniSeen, s.now)} ({clock(s.now + 120)} in Athens)</div>
              </div>
              <button className="btn primary" onClick={() => go('review', REVISIONS.find((r) => s.decisions[r.id].decision === 'pending' && r.author === 'eleni')?.id)}>
                {el.pending === el.total ? 'Start review' : el.pending ? `Continue · ${el.pending} left` : 'Open review'} <Icon.arrow />
              </button>
            </div>
            <div className="rev-progress">
              <Bar approved={el.approved} review={el.pending} draft={el.sentBack} height={5} />
              <span>{el.approved} approved · {el.sentBack} sent back · {el.pending} to review</span>
            </div>
            <div className="tile-row-label">Regular</div>
            <div className="tiles">{reg.map((r) => <RevTile key={r.id} id={r.id} />)}</div>
            <div className="tile-row-label">Bold</div>
            <div className="tiles">{bold.map((r) => <RevTile key={r.id} id={r.id} />)}</div>
          </section>

          {/* JONAS KERNING */}
          <section className="card">
            <div className="card-head">
              <Avatar id="jonas" size={36} />
              <div>
                <h2>Jonas changed {ks.total} kerning pairs in Bold</h2>
                <div className="sub">{ks.added} new pairs · {ks.unsure} flagged “unsure” by Jonas · Wed 09:05 onwards{s.liveNew ? ` · ${s.liveNew} more since you opened this` : ''}</div>
              </div>
              <button className="btn" onClick={() => go('kerning')}>
                {ks.unsurePending ? `Check ${ks.unsurePending} unsure` : 'Open kerning'} <Icon.arrow />
              </button>
            </div>
            <div className="kern-strip">
              {unsure.map((p) => {
                const cur = kernMap.get(p.id)!;
                const dec = s.kern[p.id];
                return (
                  <button key={p.id} className={`kern-chip k-${dec}`} onClick={() => go('kerning', p.id)}>
                    <PathText style="bold" text={p.left + p.right} size={30} kern={() => (dec === 'reverted' ? cur.before ?? 0 : cur.after)} />
                    <span className="mono">{p.before ?? '—'} → {cur.after}</span>
                    <span className="kc-flag"><Icon.flag size={9} /></span>
                  </button>
                );
              })}
              <button className="kern-chip more" onClick={() => go('kerning')}>+{ks.unsure - unsure.length} more<br />unsure</button>
            </div>
          </section>

          {/* TOMÁS */}
          <section className="card">
            <div className="card-head">
              <Avatar id="tomas" size={36} />
              <div>
                <h2>Tomás adjusted the ampersand and g in Light</h2>
                <div className="sub">Tue 18:05 and 18:19 · last active {rel(INITIAL_PRESENCE.tomas.kind === 'away' ? INITIAL_PRESENCE.tomas.lastSeen : 0, s.now)}</div>
              </div>
              <button className="btn" onClick={() => go('review', 'light-&')}>Review {tr.pending ? `${tr.pending}` : ''} <Icon.arrow /></button>
            </div>
            <div className="tiles">
              <RevTile id="light-&" />
              <RevTile id="light-g" />
              <p className="tile-note">“Opened the lower counter and lifted the crossing… clotting at 8 pt in the caption style.”</p>
            </div>
          </section>
        </div>

        <aside className="col side">
          <section className="card">
            <h3 className="card-title">Waiting on you <span className="count">{mine.length}</span></h3>
            {mine.length === 0 && <p className="empty">Nothing addressed to you is open.</p>}
            <ul className="thread-list">
              {mine.map((t) => {
                const age = s.now - t.messages[0].at;
                const last = t.messages[t.messages.length - 1];
                return (
                  <li key={t.id}>
                    <button onClick={() => go('comments', t.id)} className="thread-mini">
                      {t.ch && <Spec ch={t.ch} style={t.style} size={26} className="tm-glyph" />}
                      <span className="tm-body">
                        <span className="tm-subject">{t.subject}</span>
                        <span className="tm-meta">
                          {PEOPLE[t.messages[0].author].first} · {styleById(t.style).name}
                          <span className={`age ${age > 3 * 1440 ? 'old' : ''}`}>{rel(t.messages[0].at, s.now)}</span>
                        </span>
                        <span className="tm-snippet">{PEOPLE[last.author].first}: {last.text}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button className="link" onClick={() => go('comments')}>All {openThreads(s).length} open threads <Icon.arrow /></button>
          </section>

          <section className="card decision">
            <h3 className="card-title">Lock Regular Latin as final?</h3>
            <p className="small">Before Marieke de Wit gets a read-only look. Locking freezes outlines, spacing and kerning for these 408 glyphs for everyone but you.</p>
            <div className="lock-stat">
              <span className="big">{lr.counts.approved}</span><span className="of">/ {lr.total} approved</span>
              {lr.locked && <span className="pill pill-locked"><Icon.lock size={10} /> Locked</span>}
            </div>
            <Bar approved={lr.counts.approved} review={lr.counts.review} draft={lr.counts.draft} />
            <ul className="checks compact">
              <li className={lr.counts.review === 0 ? 'yes' : 'no'}>{lr.counts.review === 0 ? <Icon.check /> : <Icon.cross />}
                {lr.counts.review === 0 ? 'Every glyph approved' : <>{lr.counts.review} still in review: <span className="spec inline">{lr.inReview.map((g) => g.ch).join(' ')}</span></>}
              </li>
              <li className={lr.threads.length === 0 ? 'yes' : 'no'}>{lr.threads.length === 0 ? <Icon.check /> : <Icon.cross />}
                {lr.threads.length === 0 ? 'No open threads on Regular Latin' : `${lr.threads.length} open thread (${lr.threads.map((t) => t.ch).join(', ')})`}
              </li>
              <li className="yes"><Icon.check /> Nobody is editing Regular</li>
            </ul>
            <button className="btn primary block" onClick={() => go('release')}>
              {lr.locked ? 'Manage lock & sharing' : 'Open lock checklist'} <Icon.arrow />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
