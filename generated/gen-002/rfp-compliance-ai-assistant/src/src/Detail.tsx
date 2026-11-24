import { useMemo, useState, type ReactNode } from 'react';
import { useApp } from './App';
import {
  DRAFT_OUTLINE, PEOPLE, RFP_SECTIONS, TEAM, INTERNAL_DUE_OPTIONS, DEFAULT_INTERNAL_DUE, DRAFT_PAGE_TEXT, draftSection,
  type Status, type Mand, type PersonId,
} from './data';
import { quoteVerified, srcRef, nameOf, LOW_CONF, type Req, type Panel } from './state';
import { StatusPill, ReviewMark, Avatar, CritTag, Icon, Kbd } from './ui';

// ── Client-side checks on the model's extraction ──
const nums = (s: string) => (s.match(/\$?\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/[$,]/g, ''));
const SOFT = /\b(should|prefers?|encouraged|may)\b/i;
const HARD = /\b(shall|must)\b/i;

interface Check { tone: 'bad' | 'warn' | 'info'; text: ReactNode }

function checksFor(r: Req): Check[] {
  const out: Check[] = [];
  const qv = quoteVerified(r);
  if (!qv) {
    const qn = nums(r.text).filter((n) => !nums(r.sourceText).includes(n));
    const sn = nums(r.sourceText).filter((n) => !nums(r.text).includes(n));
    out.push({
      tone: 'bad',
      text: <>The model’s quote is not on {srcRef(r).replace(' · ', ', ')}. Compare it with the source text below{qn.length ? <>: the quote says <b>{qn.join(', ')}</b>{sn.length ? <>, the source says <b>{sn.join(', ')}</b></> : <>, and the source has no such figure</>}</> : ''}.</>,
    });
  }
  if (r.mand === 'Mandatory' && SOFT.test(r.sourceText) && !HARD.test(r.sourceText)) {
    out.push({ tone: 'bad', text: <>Marked <b>Mandatory</b>, but the source uses “{r.sourceText.match(SOFT)![0]}”. It’s probably desirable.</> });
  }
  if (r.conflict) out.push({ tone: 'bad', text: <>The draft has text on this, but it contradicts the requirement. Fixing it means changing what the draft says.</> });
  if (r.conf > 0 && r.conf < LOW_CONF) out.push({ tone: 'warn', text: <>Model confidence is {Math.round(r.conf * 100)}%. Check that the mapped draft text actually answers the requirement.</> });
  if (r.supersedes) out.push({ tone: 'info', text: <>Replaces {r.supersedes.ref} of the RFP (p.{r.supersedes.page}). The original is not counted.</> });
  return out;
}

function useDraftPage(sec: string | null, page: number | null, exclude?: string | null) {
  const { state } = useApp();
  return useMemo(() => {
    if (!sec || page == null) return [] as string[];
    const out = new Set<string>(DRAFT_PAGE_TEXT[`${sec}:${page}`] ?? []);
    for (const x of state.reqs) if (x.draftSec === sec && x.draftPage === page && x.excerpt && x.status !== 'missing') out.add(x.excerpt);
    for (const x of state.reqs) if (x.ai.draftSec === sec && x.ai.draftPage === page && x.ai.excerpt && x.ai.status !== 'missing') out.add(x.ai.excerpt);
    if (exclude) out.delete(exclude);
    return [...out];
  }, [state.reqs, sec, page, exclude]);
}

export function Detail({ r, panel, onAccept }: { r: Req; panel: Panel; onAccept: () => void }) {
  const { dispatch, act } = useApp();
  const checks = checksFor(r);
  const qv = quoteVerified(r);
  const isGap = r.status !== 'addressed';
  const removed = r.review === 'removed';

  return (
    <div className="detail" key={r.id}>
      <div className="d-head">
        <div className="d-meta">
          <span className="rid big">{r.id}</span>
          <span className="ref">{srcRef(r)}</span>
          <span className={`tag ${r.mand === 'Mandatory' ? 'tag-m' : 'tag-d'}`}>{r.mand}</span>
          <CritTag crit={r.crit} passFail={r.passFail} />
          <span className="spacer" />
          <ReviewMark r={r} withLabel />
          {r.review !== 'unreviewed' && !r.added && (
            <button className="linkbtn" onClick={() => act({ type: 'revert', id: r.id }, `Reverted ${r.id} to the model’s version`)}>Revert to model</button>
          )}
        </div>
        <h2 className="d-title">{r.title}</h2>
        {checks.length > 0 && (
          <ul className="checks">
            {checks.map((c, i) => (
              <li key={i} className={`check check-${c.tone}`}><Icon name={c.tone === 'info' ? 'link' : 'alert'} size={13} /><span>{c.text}</span></li>
            ))}
          </ul>
        )}
        {!removed && (
          <div className="actions">
            <button className={`btn btn-accept ${r.review === 'accepted' ? 'is-on' : ''}`} onClick={onAccept} title={qv ? 'Accept the model’s requirement and mapping' : 'The quote is unverified. Accepting keeps the model’s wording.'}>
              <Icon name="check" /> {r.review === 'accepted' ? 'Accepted' : 'Accept'} <Kbd>A</Kbd>
            </button>
            <button className={`btn ${panel === 'reject' ? 'is-open' : ''}`} onClick={() => dispatch({ type: 'panel', panel: panel === 'reject' ? null : 'reject' })}>
              <Icon name="x" /> Reject mapping <Kbd>R</Kbd>
            </button>
            <button className={`btn ${panel === 'correct' ? 'is-open' : ''}`} onClick={() => dispatch({ type: 'panel', panel: panel === 'correct' ? null : 'correct' })}>
              <Icon name="pen" /> Correct <Kbd>E</Kbd>
            </button>
            <button className={`btn ${panel === 'assign' ? 'is-open' : ''}`} onClick={() => dispatch({ type: 'panel', panel: panel === 'assign' ? null : 'assign' })}>
              <Icon name="send" /> {r.assignee ? `Assigned · ${nameOf(r.assignee)}` : 'Assign'} <Kbd>S</Kbd>
            </button>
            {!qv && r.review === 'unreviewed' && <span className="act-hint">Quote unverified: use Correct to replace it with the source text.</span>}
          </div>
        )}
        {removed && (
          <div className="removed-note">Removed from the matrix: not counted in coverage, gaps, or export. <button className="linkbtn" onClick={() => act({ type: 'revert', id: r.id }, `Restored ${r.id}`)}>Restore</button></div>
        )}
        {panel === 'reject' && <RejectPanel r={r} />}
        {panel === 'correct' && <CorrectPanel r={r} />}
        {panel === 'assign' && <AssignPanel r={r} />}
      </div>

      <div className="compare">
        <SourceColumn r={r} />
        <DraftColumn r={r} />
      </div>

      <div className="assess">
        <div className="assess-h">
          <span className="sect-label">Model’s assessment</span>
          <StatusPill status={r.ai.status} conflict={r.ai.conflict} />
          {r.conf > 0 && <span className="muted small">confidence {Math.round(r.conf * 100)}%</span>}
          {r.status !== r.ai.status && <span className="muted small">· now <StatusPill status={r.status} /> after your review</span>}
        </div>
        <p className="reasoning">{r.reasoning}</p>
      </div>

      {r.assignee && (
        <div className="assigned-box">
          <Avatar id={r.assignee} size={26} />
          <div>
            <div><b>{PEOPLE[r.assignee].name}</b> <span className="muted">· due {r.assignDue}</span></div>
            <div className="muted small">{r.sentAt ? `Sent ${r.sentAt}` : 'Not sent yet. Send from Gaps & routing.'}{r.assignNote ? ` · “${r.assignNote}”` : ''}</div>
          </div>
          <span className="spacer" />
          <button className="linkbtn" onClick={() => dispatch({ type: 'view', view: 'gaps' })}>Open in Gaps & routing →</button>
        </div>
      )}
      {!r.assignee && isGap && !removed && r.suggestedOwner && (
        <div className="assigned-box suggest">
          <Avatar id={r.suggestedOwner} size={26} />
          <div>
            <div>Model suggests <b>{PEOPLE[r.suggestedOwner].name}</b> <span className="muted">· owns {PEOPLE[r.suggestedOwner].owns}</span></div>
            <div className="muted small">Not assigned. Nobody will see this gap until you route it.</div>
          </div>
          <span className="spacer" />
          <button className="btn btn-sm" onClick={() => act({ type: 'assign', id: r.id, to: r.suggestedOwner!, due: DEFAULT_INTERNAL_DUE }, `Assigned ${r.id} to ${nameOf(r.suggestedOwner!)}`)}>Assign to {nameOf(r.suggestedOwner)}</button>
        </div>
      )}

      <div className="activity">
        <div className="sect-label">Activity</div>
        <ol>
          {[...r.history].reverse().map((h, i) => (
            <li key={i}>
              <span className="act-time">{h.at}</span>
              <span className={`act-who ${h.who}`}>{h.who === 'model' ? 'Model' : 'You'}</span>
              <span className="act-text">{h.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function SourceColumn({ r }: { r: Req }) {
  const { state } = useApp();
  const qv = quoteVerified(r);
  const paras = useMemo(() => {
    const seen = new Set<string>();
    return state.reqs
      .filter((x) => x.doc === r.doc && x.page === r.page)
      .sort((a, b) => a.sec.localeCompare(b.sec, undefined, { numeric: true }))
      .filter((x) => (seen.has(x.sourceText) ? false : (seen.add(x.sourceText), true)));
  }, [state.reqs, r.doc, r.page]);

  const docName = r.doc === 'RFP' ? 'RFP No. 2026-114' : r.doc === 'A1' ? 'Addendum No. 1 · Nov 9, 2026' : 'Addendum No. 2 · Nov 13, 2026';
  const secName = r.doc === 'RFP' ? `Section ${r.sec.split('.')[0].replace(/\(.*/, '')} · ${RFP_SECTIONS[r.sec.split('.')[0].replace(/\(.*/, '')]}` : 'Changes to RFP No. 2026-114';

  return (
    <div className="col">
      <div className="col-h">
        <span className="sect-label">Source</span>
        {qv ? <span className="verify ok"><Icon name="check" size={12} /> Quote matches source word for word</span> : <span className="verify bad"><Icon name="alert" size={12} /> Not word for word</span>}
      </div>
      {!qv && (
        <div className="model-quote">
          <div className="mq-label">Model’s quote</div>
          <p className="doc-text">{r.text}</p>
        </div>
      )}
      <div className="doccard">
        <div className="doc-h"><Icon name="doc" size={12} /> {docName} <span className="spacer" /> Page {r.page}</div>
        <div className="doc-sec">{secName}</div>
        <div className="doc-body">
          {paras.map((p) => {
            const target = p.sourceText === r.sourceText;
            const idx = target && qv ? p.sourceText.indexOf(r.text) : -1;
            return (
              <p key={p.id} className={`para ${target ? (qv ? 'para-target' : 'para-target bad') : ''}`}>
                <span className="para-no">{p.doc === 'RFP' ? p.sec : p.sec}</span>
                {target && idx >= 0 ? (
                  <>{p.sourceText.slice(0, idx)}<mark>{r.text}</mark>{p.sourceText.slice(idx + r.text.length)}</>
                ) : target && qv ? <mark>{p.sourceText}</mark> : p.sourceText}
              </p>
            );
          })}
        </div>
      </div>
      {r.supersedes && (
        <div className="superseded">
          <div className="mq-label">Superseded original · RFP {r.supersedes.ref}, p.{r.supersedes.page}</div>
          <p className="doc-text struck">{r.supersedes.text}</p>
        </div>
      )}
    </div>
  );
}

function DraftColumn({ r }: { r: Req }) {
  const ds = draftSection(r.draftSec);
  const missing = r.status === 'missing';
  const pageText = useDraftPage(r.excerpt ? null : r.draftSec, r.draftPage);
  return (
    <div className="col">
      <div className="col-h">
        <span className="sect-label">Draft v6 response</span>
        {ds && <span className="owner-hint"><Avatar id={ds.owner} size={16} /> {PEOPLE[ds.owner].name.split(' ')[0]}’s section</span>}
      </div>
      {r.basis === 'document' && !ds && (
        <div className="doccard draft empty-draft ok">
          <p><b>No single section.</b> The model checked the draft as a whole, for format, page count, or the absence of something.</p>
        </div>
      )}
      {!ds && r.basis !== 'document' && (
        <div className="doccard draft empty-draft">
          {r.added ? (
            <><p><b>Not mapped yet.</b></p><p className="muted small">You added this after the run. Use Reject mapping → Wrong section to point it at a draft page, or assign it as a gap.</p></>
          ) : (
            <><p><b>Nothing in draft v6 answers this.</b></p><p className="muted small">The model searched all 41 pages and the forms index. This needs new content or a submittal.</p></>
          )}
        </div>
      )}
      {ds && (
        <div className={`doccard draft ${missing ? 'nearest' : ''}`}>
          <div className="doc-h"><Icon name="doc" size={12} /> §{ds.id} {ds.title} <span className="spacer" /> Page {r.draftPage}</div>
          {missing && <div className="nearest-label">Closest text found. Does not satisfy the requirement.</div>}
          <div className="doc-body">
            {r.excerpt ? (
              <p className={`para ${missing ? 'para-miss' : r.status === 'partial' ? 'para-partial' : 'para-target'}`}>{missing || r.status === 'partial' ? r.excerpt : <mark>{r.excerpt}</mark>}</p>
            ) : pageText.length ? (
              <>
                <div className="page-note">You mapped this to p.{r.draftPage}. Full text of the page:</div>
                {pageText.map((t) => <p key={t} className="para">{t}</p>)}
              </>
            ) : (
              <p className="para muted">You mapped this to §{ds.id}, p.{r.draftPage}. Section covers: {ds.summary}</p>
            )}
          </div>
        </div>
      )}
      {r.ai.draftSec !== r.draftSec && (
        <div className="was-mapped">
          Model originally mapped to {r.ai.draftSec ? `§${r.ai.draftSec} ${draftSection(r.ai.draftSec)?.title}, p.${r.ai.draftPage}` : 'no section'}
          {r.ai.excerpt && <p className="doc-text struck small">{r.ai.excerpt}</p>}
        </div>
      )}
    </div>
  );
}

// ── Panels ──
function RejectPanel({ r }: { r: Req }) {
  const { act, dispatch } = useApp();
  const [mode, setMode] = useState<'remap' | 'none'>('none');
  const [sec, setSec] = useState(r.draftSec ?? '3.1');
  const [page, setPage] = useState<number>(r.draftPage ?? draftSection(r.draftSec ?? '3.1')!.pages[0]);
  const [st, setSt] = useState<Status>(r.status === 'addressed' ? 'partial' : r.status);
  const [remapSt, setRemapSt] = useState<Status>('addressed');
  const [note, setNote] = useState('');
  const owner = r.suggestedOwner ?? (sec ? draftSection(sec)?.owner ?? null : null);
  const [assign, setAssign] = useState<boolean>(!!owner && owner !== 'leah');
  const ds = draftSection(sec)!;
  const preview = useDraftPage(sec, page);


  const submit = () => {
    if (mode === 'remap') act({ type: 'remap', id: r.id, draftSec: sec, draftPage: page, status: remapSt, note }, `Remapped ${r.id} to §${sec} p.${page}`);
    else act({ type: 'rejectMapping', id: r.id, status: st, note, assignTo: assign && owner && owner !== 'leah' ? owner : null }, `Rejected mapping on ${r.id}`);
  };

  return (
    <div className="panel">
      <div className="panel-h">Reject the model’s mapping{r.draftSec ? ` to §${r.draftSec}, p.${r.draftPage}` : ''}<button className="x" onClick={() => dispatch({ type: 'panel', panel: null })}><Icon name="x" /></button></div>
      <div className="radio-cards">
        <label className={mode === 'none' ? 'on' : ''}>
          <input type="radio" checked={mode === 'none'} onChange={() => setMode('none')} />
          <div><b>The draft doesn’t answer it</b><span>Mark it as a gap and route it to someone</span></div>
        </label>
        <label className={mode === 'remap' ? 'on' : ''}>
          <input type="radio" checked={mode === 'remap'} onChange={() => setMode('remap')} />
          <div><b>Wrong section: remap</b><span>The answer is elsewhere in draft v6</span></div>
        </label>
      </div>
      {mode === 'none' ? (
        <div className="panel-grid">
          <div className="field">
            <span className="field-l">New status</span>
            <div className="seg">
              {(['partial', 'missing'] as Status[]).map((s) => <button key={s} className={st === s ? 'on' : ''} onClick={() => setSt(s)}>{s === 'partial' ? 'Partial' : 'Missing'}</button>)}
            </div>
          </div>
          {owner && owner !== 'leah' && (
            <label className="check-line">
              <input type="checkbox" checked={assign} onChange={(e) => setAssign(e.target.checked)} />
              Assign to {PEOPLE[owner].name} <span className="muted">({PEOPLE[owner].owns})</span>
            </label>
          )}
        </div>
      ) : (
        <div className="panel-grid">
          <div className="field grow">
            <span className="field-l">Draft section</span>
            <select value={sec} onChange={(e) => { setSec(e.target.value); setPage(draftSection(e.target.value)!.pages[0]); }}>
              {DRAFT_OUTLINE.map((s) => <option key={s.id} value={s.id}>§{s.id} {s.title} ({s.pages[1] !== s.pages[0] ? `pp. ${s.pages[0]}–${s.pages[1]}` : `p. ${s.pages[0]}`})</option>)}
            </select>
            <span className="field-help">{ds.summary}</span>
          </div>
          <div className="field">
            <span className="field-l">Page</span>
            <select value={page} onChange={(e) => setPage(Number(e.target.value))}>
              {Array.from({ length: ds.pages[1] - ds.pages[0] + 1 }, (_, i) => ds.pages[0] + i).map((p) => <option key={p} value={p}>p.{p}</option>)}
            </select>
          </div>
          <div className="field">
            <span className="field-l">Status there</span>
            <div className="seg">
              {(['addressed', 'partial'] as Status[]).map((s) => <button key={s} className={remapSt === s ? 'on' : ''} onClick={() => setRemapSt(s)}>{s === 'addressed' ? 'Addressed' : 'Partial'}</button>)}
            </div>
          </div>
        </div>
      )}
      {mode === 'remap' && (
        <div className="remap-preview">
          <div className="mq-label">Draft v6 · §{ds.id} · p.{page}</div>
          {preview.length ? preview.map((t) => <p key={t} className="doc-text">{t}</p>) : <p className="muted small">No text from this page is indexed yet. Section covers: {ds.summary}</p>}
        </div>
      )}
      <textarea placeholder={mode === 'none' ? 'What’s missing? (goes to the assignee)' : 'Note for the record (optional)'} value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      <div className="panel-f">
        <button className="btn btn-ghost" onClick={() => dispatch({ type: 'panel', panel: null })}>Cancel</button>
        <button className="btn btn-primary" onClick={submit}>{mode === 'remap' ? 'Remap' : 'Reject mapping'}</button>
      </div>
    </div>
  );
}

function CorrectPanel({ r }: { r: Req }) {
  const { act, dispatch } = useApp();
  const [text, setText] = useState(r.text);
  const [mand, setMand] = useState<Mand>(r.mand);
  const [status, setStatus] = useState<Status>(r.status);
  const [note, setNote] = useState('');
  const differs = text !== r.sourceText;
  const softSource = SOFT.test(r.sourceText) && !HARD.test(r.sourceText);

  return (
    <div className="panel">
      <div className="panel-h">Correct the requirement<button className="x" onClick={() => dispatch({ type: 'panel', panel: null })}><Icon name="x" /></button></div>
      <div className="field">
        <span className="field-l">Requirement text {differs && <button className="linkbtn" onClick={() => { setText(r.sourceText); if (softSource) setMand('Desirable'); }}>Use exact source text{softSource ? ' (and mark Desirable)' : ''}</button>}</span>
        <textarea className="doc-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="panel-grid">
        <div className="field">
          <span className="field-l">Type</span>
          <div className="seg">
            {(['Mandatory', 'Desirable'] as Mand[]).map((m) => <button key={m} className={mand === m ? 'on' : ''} onClick={() => setMand(m)}>{m}</button>)}
          </div>
        </div>
        <div className="field">
          <span className="field-l">Draft coverage</span>
          <div className="seg">
            {(['addressed', 'partial', 'missing'] as Status[]).map((s) => <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s[0].toUpperCase() + s.slice(1)}</button>)}
          </div>
        </div>
      </div>
      <textarea placeholder="Why the change? (kept in the activity log)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      <div className="panel-f">
        <button className="btn btn-danger-ghost" onClick={() => act({ type: 'remove', id: r.id, note }, `Removed ${r.id} from the matrix`)}>Not a requirement: remove</button>
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={() => dispatch({ type: 'panel', panel: null })}>Cancel</button>
        <button className="btn btn-primary" onClick={() => act({ type: 'correct', id: r.id, text, mand, status, note }, `Saved correction to ${r.id}`)}>Save correction</button>
      </div>
    </div>
  );
}

function AssignPanel({ r }: { r: Req }) {
  const { act, dispatch } = useApp();
  const [to, setTo] = useState<PersonId | null>(r.assignee ?? (r.suggestedOwner && r.suggestedOwner !== 'leah' ? r.suggestedOwner : null));
  const [due, setDue] = useState(r.assignDue || DEFAULT_INTERNAL_DUE);
  const [note, setNote] = useState(r.assignNote);
  return (
    <div className="panel">
      <div className="panel-h">Route to a colleague<button className="x" onClick={() => dispatch({ type: 'panel', panel: null })}><Icon name="x" /></button></div>
      <div className="people">
        {TEAM.map((p) => (
          <button key={p} className={`person ${to === p ? 'on' : ''}`} onClick={() => setTo(p)}>
            <Avatar id={p} size={26} />
            <span className="person-t">
              <b>{PEOPLE[p].name}</b>
              <span>{PEOPLE[p].owns}</span>
            </span>
            {r.suggestedOwner === p && <span className="sugg">suggested</span>}
          </button>
        ))}
      </div>
      <div className="panel-grid">
        <div className="field">
          <span className="field-l">Fix needed by</span>
          <select value={due} onChange={(e) => setDue(e.target.value)}>
            {INTERNAL_DUE_OPTIONS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <textarea placeholder="Instructions for the assignee (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      <div className="panel-f">
        {r.assignee && <button className="btn btn-danger-ghost" onClick={() => act({ type: 'assign', id: r.id, to: null }, `Unassigned ${r.id}`)}>Unassign</button>}
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={() => dispatch({ type: 'panel', panel: null })}>Cancel</button>
        <button className="btn btn-primary" disabled={!to} onClick={() => to && act({ type: 'assign', id: r.id, to, note, due }, `Assigned ${r.id} to ${nameOf(to)}`)}>Assign</button>
      </div>
    </div>
  );
}
