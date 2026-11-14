import { PEOPLE, STYLES, clock, fullStamp, rel, styleById, type PersonId, type StyleId } from '../data/core';
import { AUDIT_SINCE_TUE, INITIAL_PRESENCE, type Access, type OutlineScope } from '../data/access';
import { useGo, useStore, useToast } from '../store';
import { Avatar, Icon, Seg, Toggle } from '../components/ui';

const ORDER: PersonId[] = ['ines', 'jonas', 'eleni', 'tomas', 'marieke'];

const outlineLabel = (o: OutlineScope) => (o === 'all' ? 'All glyphs' : o === 'greek' ? 'Greek only' : 'No');

function stylesLabel(a: Access) {
  if (a.styles === 'all') return 'All 6';
  return a.styles.map((id) => styleById(id).name).join(', ');
}

function summary(a: Access, first: string): string[] {
  const where = a.styles === 'all' ? 'in all six styles' : `in ${a.styles.map((id) => styleById(id).name).join(', ')}`;
  const out: string[] = [];
  if (a.owner) return [`${first} owns Calloway and can change anything, including locks and access.`];
  if (a.outlines === 'all') out.push(`Can draw and edit outlines of every glyph ${where}.`);
  else if (a.outlines === 'greek') out.push(`Can draw and edit outlines only in the Greek range (U+0370–03FF, U+1F00–1FFF) ${where}. Latin outlines are read-only.`);
  else out.push(`Cannot move, add or delete points in any glyph.`);
  const metrics = [a.spacing && 'spacing (sidebearings and widths)', a.kerning && 'kerning'].filter(Boolean);
  if (metrics.length) out.push(`Can change ${metrics.join(' and ')} ${where}.`);
  else out.push('Cannot change spacing or kerning.');
  out.push(a.approve ? 'Can approve glyphs and lock sets.' : 'Cannot approve glyphs.');
  out.push(a.comment ? 'Can comment.' : 'Cannot comment.');
  return out;
}

export function People() {
  const { s, dispatch } = useStore();
  const go = useGo();
  const toast = useToast();
  const selId = (ORDER.includes(s.route.id as PersonId) ? s.route.id : 'jonas') as PersonId;
  const p = PEOPLE[selId];
  const a = s.access[selId];
  const pres = INITIAL_PRESENCE[selId];
  const audit = AUDIT_SINCE_TUE[selId];
  const auditKern = selId === 'jonas' ? s.kernPairs.length : audit.kerning;

  const patch = (change: Partial<Access>, label: string) => {
    const prev: Partial<Access> = {};
    (Object.keys(change) as Array<keyof Access>).forEach((k) => { (prev as Record<string, unknown>)[k] = a[k]; });
    dispatch({ type: 'access', person: selId, patch: change });
    toast(`${p.first}: ${label}`, { type: 'access', person: selId, patch: prev });
  };

  const toggleStyle = (id: StyleId) => {
    const cur = a.styles === 'all' ? STYLES.map((x) => x.id) : a.styles;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    if (!next.length) return;
    patch({ styles: next.length === STYLES.length ? 'all' : STYLES.map((x) => x.id).filter((x) => next.includes(x)) }, `styles → ${next.length === 6 ? 'all' : next.map((x) => styleById(x).name).join(', ')}`);
  };

  const lockedSets = s.locks.map((k) => { const [st, sc] = k.split(':'); return `${styleById(st as StyleId).name} ${sc === 'latin' ? 'Latin' : 'Greek'}`; });
  const presenceText = (id: PersonId) => {
    const pr = INITIAL_PRESENCE[id];
    if (pr.kind === 'active') return id === 'ines' ? 'Online · you' : `Online · ${styleById(pr.style).name} · ${pr.doing.toLowerCase()}`;
    if (pr.kind === 'away') return `Last active ${rel(pr.lastSeen, s.now)}`;
    return `Invited ${rel(pr.invitedAt, s.now)} · not joined`;
  };

  return (
    <div className="people">
      <div className="page-head compact">
        <div className="eyebrow">Calloway</div>
        <h1>People & access</h1>
        <p className="lede">Who can touch what. Changes apply immediately. Locked sets stay read-only for everyone but you, whatever is set here.</p>
      </div>
      <div className="people-body">
        <table className="ptable">
          <thead>
            <tr><th>Person</th><th>Now</th><th>Styles</th><th>Outlines</th><th>Spacing</th><th>Kerning</th><th>Approve</th><th>Comment</th></tr>
          </thead>
          <tbody>
            {ORDER.map((id) => {
              const ac = s.access[id];
              const pr = INITIAL_PRESENCE[id];
              return (
                <tr key={id} className={id === selId ? 'on' : ''} onClick={() => dispatch({ type: 'go', route: { view: 'people', id } })}>
                  <td className="pt-person">
                    <Avatar id={id} size={28} live={pr.kind === 'active'} dim={pr.kind === 'invited'} />
                    <span><b>{PEOPLE[id].name}</b><span className="sub">{PEOPLE[id].role}</span></span>
                  </td>
                  <td className={`pt-now ${pr.kind}`}>{presenceText(id)}</td>
                  <td>{stylesLabel(ac)}</td>
                  <td className={ac.outlines === 'none' ? 'no' : 'yes'}>{outlineLabel(ac.outlines)}</td>
                  <td className={ac.spacing ? 'yes' : 'no'}>{ac.spacing ? <Icon.check /> : '—'}</td>
                  <td className={ac.kerning ? 'yes' : 'no'}>{ac.kerning ? <Icon.check /> : '—'}</td>
                  <td className={ac.approve ? 'yes' : 'no'}>{ac.approve ? <Icon.check /> : '—'}</td>
                  <td className={ac.comment ? 'yes' : 'no'}>{ac.comment ? <Icon.check /> : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <section className="person-panel">
          <div className="pp-head">
            <Avatar id={selId} size={44} live={pres.kind === 'active'} dim={pres.kind === 'invited'} />
            <div>
              <h2>{p.name}</h2>
              <div className="sub">{p.role} · {p.org} · {p.city}, {clock(s.now + p.tzOffsetFromLisbon * 60)} local</div>
              <div className={`pp-presence ${pres.kind}`}>{presenceText(selId)}{pres.kind === 'away' && ` · ${pres.where}`}</div>
            </div>
          </div>

          <div className="pp-grid">
            <div className="pp-edit">
              <h3>Access</h3>
              {a.owner ? <p className="small">Owner access can’t be reduced.</p> : (
                <>
                  <div className="field">
                    <label>Styles</label>
                    <div className="chips">
                      {STYLES.map((st) => {
                        const on = a.styles === 'all' || a.styles.includes(st.id);
                        return <button key={st.id} className={`chip ${on ? 'on' : ''}`} onClick={() => toggleStyle(st.id)}>{st.name}</button>;
                      })}
                    </div>
                  </div>
                  <div className="field">
                    <label>Outlines</label>
                    <Seg small value={a.outlines} onChange={(v) => patch({ outlines: v }, `outlines → ${outlineLabel(v).toLowerCase()}`)} options={[
                      { value: 'none', label: 'No access' },
                      { value: 'greek', label: 'Greek range' },
                      { value: 'all', label: 'All glyphs' },
                    ]} />
                    {selId === 'jonas' && a.outlines !== 'none' && (
                      <div className="warnbox"><Icon.flag /> Jonas is contracted for spacing and kerning only. With this setting Jonas could move points in {a.outlines === 'all' ? 'every glyph, including approved Latin' : 'Eleni’s Greek'}.</div>
                    )}
                    {selId === 'eleni' && a.outlines === 'all' && (
                      <div className="warnbox"><Icon.flag /> Eleni would be able to edit Latin outlines too.</div>
                    )}
                  </div>
                  <div className="field toggles">
                    <Toggle on={a.spacing} onChange={(v) => patch({ spacing: v }, v ? 'spacing on' : 'spacing off')} label="Spacing (sidebearings, widths)" />
                    <Toggle on={a.kerning} onChange={(v) => patch({ kerning: v }, v ? 'kerning on' : 'kerning off')} label="Kerning" />
                    <Toggle on={a.approve} onChange={(v) => patch({ approve: v }, v ? 'can approve' : 'cannot approve')} label="Approve glyphs" />
                    <Toggle on={a.comment} onChange={(v) => patch({ comment: v }, v ? 'can comment' : 'cannot comment')} label="Comment" />
                  </div>
                </>
              )}
            </div>

            <div className="pp-effective">
              <h3>In plain words</h3>
              <ul className="effective">
                {summary(a, p.first).map((line) => <li key={line}>{line}</li>)}
                {!a.owner && lockedSets.length > 0 && <li><Icon.lock size={10} /> Read-only in locked sets: {lockedSets.join(', ')}.</li>}
              </ul>

              {selId !== 'marieke' && (
                <>
                  <h3>Edits since Tue 16:40</h3>
                  <div className="audit">
                    <div className={audit.outlines ? '' : 'zero'}><b>{audit.outlines}</b><span>outline</span></div>
                    <div className={audit.spacing ? '' : 'zero'}><b>{audit.spacing}</b><span>spacing</span></div>
                    <div className={auditKern ? '' : 'zero'}><b>{auditKern}</b><span>kerning</span></div>
                  </div>
                  {selId === 'jonas' && (
                    <p className="small ok-line"><Icon.check /> Every one of Jonas’s {auditKern} edits is a kerning value in Bold. No outline or spacing edits.</p>
                  )}
                  {selId === 'eleni' && (
                    <p className="small ok-line"><Icon.check /> All 31 outline edits are inside the Greek range (Regular and Bold).</p>
                  )}
                </>
              )}
              {selId === 'marieke' && (
                <div className="invite-box">
                  <p className="small">Invited {fullStamp(INITIAL_PRESENCE.marieke.kind === 'invited' ? INITIAL_PRESENCE.marieke.invitedAt : 0)}. Hasn’t opened the invitation yet.{s.share.marieke.resentAt ? ` Re-sent at ${clock(s.share.marieke.resentAt)}.` : ''}</p>
                  <button className="btn" onClick={() => go('release')}>Set up Marieke’s read-only look <Icon.arrow /></button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
