import { useState } from 'react';
import { CABINS } from '../data/seed';
import { BOAT, COURSE } from '../config';
import { ConfirmDialog, Impact, Modal, Pill, Term, GuideBox, coverImpact, type Tone } from '../components/ui';
import { previewAction, useStore, type Action } from '../state/store';
import {
  bunkById,
  bunkLabel,
  cabinById,
  cabinOfBunk,
  checkPlacement,
  arrivalCovers,
  DESIGNATION_LABEL,
  LODGING_LABEL,
  personById,
  personInBunk,
  rangeText,
  restrictionFor,
  summary,
} from '../logic';
import type { AppState, Bunk, Lodging, Person, Role } from '../types';

type ModalState =
  | { kind: 'move'; personId: string }
  | { kind: 'name'; bunkId: string }
  | { kind: 'confirm'; personId: string }
  | { kind: 'release'; personId: string }
  | { kind: 'releaseSlot'; bunkId: string }
  | null;

type BunkKind = 'resident' | 'confirmed' | 'tentative' | 'empty' | 'free';

function kindOf(state: AppState, bunk: Bunk): { kind: BunkKind; person?: Person } {
  const person = personInBunk(state, bunk.id);
  if (person?.isResident) return { kind: 'resident', person };
  if (person) return { kind: person.booking === 'confirmed' ? 'confirmed' : 'tentative', person };
  if (bunk.held) return { kind: 'empty' };
  return { kind: 'free' };
}

const TILE_TONE: Record<BunkKind, Tone> = {
  resident: 'resident',
  confirmed: 'confirmed',
  tentative: 'tentative',
  empty: 'empty',
  free: 'free',
};

const KIND_LABEL: Record<BunkKind, string> = {
  resident: 'Resident',
  confirmed: 'Confirmed',
  tentative: 'Tentative',
  empty: 'Unnamed hold',
  free: 'Free',
};

function surname(name: string): string {
  const parts = name.replace(/^Dr\.\s*/, '').split(' ');
  return parts[parts.length - 1];
}

export function BunksView({ selectedBunkId }: { selectedBunkId?: string }) {
  const { state, dispatch } = useStore();
  const [modal, setModal] = useState<ModalState>(null);
  const s = summary(state);
  const selected = selectedBunkId ? bunkById(state, selectedBunkId) : undefined;

  const select = (id: string | null) => {
    location.hash = id ? `#/bunks/${id}` : '#/bunks';
  };

  const run = (action: Action, after?: (next: AppState) => void) => {
    dispatch(action);
    if (after) after(previewAction(state, action));
    setModal(null);
  };

  const firstConflict = s.conflicts[0];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Bunks</h1>
          <p className="subtle">
            Six cabins, 58 bunks. {s.heldCount} are <Term k="block-hold">held</Term> for {COURSE.code}; the rest are free stock or residents.
          </p>
        </div>
        <div className="legend">
          <span className="legend-item"><i className="sw sw-resident" />Resident</span>
          <span className="legend-item"><i className="sw sw-confirmed" />Confirmed</span>
          <span className="legend-item"><i className="sw sw-tentative" />Tentative</span>
          <span className="legend-item"><i className="sw sw-empty" />Unnamed hold</span>
          <span className="legend-item"><i className="sw sw-free" />Free</span>
          <span className="legend-item"><i className="sw sw-conflict" />Conflict</span>
        </div>
      </div>

      <div className="summary-strip">
        <div><strong>{s.heldCount}</strong> held for BIO 377</div>
        <div><strong>{s.confirmed}</strong> confirmed</div>
        <div><strong>{s.tentative}</strong> tentative</div>
        <div><strong>{s.emptyCount}</strong> unnamed</div>
        <div><strong>{s.freeCount}</strong> free</div>
        <div><strong>{s.residentCount}</strong> residents</div>
      </div>

      {firstConflict && (
        <div className="alert">
          <div>
            <strong>
              {s.conflicts.length} course {s.conflicts.length === 1 ? 'member is' : 'members are'} in a restricted cabin.
            </strong>{' '}
            {firstConflict.name} is in {bunkLabel(firstConflict.bunkId ?? '')}. That cabin is "Restricted – permit housing" for MINAE permit inspectors, {rangeText('2026-11-25', '2026-11-27')}.
            Move {s.conflicts.length === 1 ? 'them' : 'each of them'} to a free bunk outside the hold, which keeps the hold at {s.heldCount}.
          </div>
          <button className="btn small" onClick={() => select(firstConflict.bunkId)}>
            Show {firstConflict.name.split(' ')[0]}
          </button>
        </div>
      )}

      <GuideBox id="bunks" title="How the bunk board works">
        <ul>
          <li>
            Each tile is a bunk. Click one to see who is in it and what you can do with it. Held bunks are the course's; <Term k="block-hold">held</Term> does not mean named.
          </li>
          <li>
            Cabins have a <Term k="designation">gender designation</Term>. A person can only be placed in a cabin that matches their lodging group, or a mixed cabin. The system blocks anything else and says why.
          </li>
          <li>
            Some cabins are <Term k="restricted">restricted</Term> on certain nights. Those show a red note on the cabin card.
          </li>
        </ul>
      </GuideBox>

      <div className="bunks-layout">
        <div className="cabin-grid">
          {CABINS.map((cabin) => {
            const bunks = state.bunks.filter((b) => b.cabinId === cabin.id).sort((a, b) => a.number - b.number);
            const held = bunks.filter((b) => b.held).length;
            const empty = bunks.filter((b) => b.held && !personInBunk(state, b.id)).length;
            const free = bunks.filter((b) => !b.held && !personInBunk(state, b.id)).length;
            const resident = bunks.filter((b) => personInBunk(state, b.id)?.isResident).length;
            return (
              <section key={cabin.id} className="cabin">
                <header className="cabin-head">
                  <div>
                    <h3>{cabin.name}</h3>
                    <span className="cabin-code">{cabin.id}</span>
                  </div>
                  <Pill tone="neutral">
                    {DESIGNATION_LABEL[cabin.designation]}
                  </Pill>
                </header>
                <div className="cabin-meta">
                  Sleeps {bunks.length} · {cabin.bathroom}
                </div>
                {cabin.restrictions.map((r) => (
                  <div className="restriction" key={r.label}>
                    <strong>
                      <Term k="restricted">{r.label}</Term>
                    </strong>{' '}
                    {rangeText(r.from, r.to)}. Course stays covering these nights cannot use it.
                  </div>
                ))}
                <div className="bunk-grid">
                  {bunks.map((bunk) => {
                    const { kind, person } = kindOf(state, bunk);
                    const conflict = person ? restrictionFor(state, person) : undefined;
                    const isSel = selected?.id === bunk.id;
                    const text =
                      kind === 'empty' ? <Term k="unnamed">unnamed</Term> : kind === 'free' ? 'free' : person ? surname(person.name) : '';
                    return (
                      <button
                        key={bunk.id}
                        className={`bunk bunk-${TILE_TONE[kind]} ${conflict ? 'bunk-conflict' : ''} ${isSel ? 'bunk-selected' : ''}`}
                        onClick={() => select(bunk.id)}
                        aria-label={`${bunkLabel(bunk.id)}: ${KIND_LABEL[kind]}${person ? `, ${person.name}` : ''}${conflict ? ', restricted cabin' : ''}`}
                      >
                        <span className="bunk-num">{bunk.number}</span>
                        <span className="bunk-who">{text}</span>
                      </button>
                    );
                  })}
                </div>
                <footer className="cabin-foot">
                  {held > 0 ? `${held} held · ${empty} unnamed · ` : ''}
                  {free} free{resident > 0 ? ` · ${resident} resident` : ''}
                </footer>
              </section>
            );
          })}
        </div>

        <aside className="detail">
          {!selected && (
            <div className="detail-empty">
              <h2>Select a bunk</h2>
              <p className="subtle">Pick any tile to see who is in it, and what you can change.</p>
              <div className="cheat">
                <div>
                  <strong>Confirmed:</strong> the course has confirmed this person. They count as a confirmed cover.
                </div>
                <div>
                  <strong>Tentative:</strong> named, but not yet confirmed. A pending cover; released at 17:00 unless settled.
                </div>
                <div>
                  <strong>Unnamed hold:</strong> held for the course with no person yet. A pending cover.
                </div>
                <div>
                  <strong>Free:</strong> not held. Anyone can be booked here, but it is not part of the BIO 377 hold.
                </div>
              </div>
              <p className="note">
                The boat for {COURSE.code} leaves {BOAT.origin} at {BOAT.times[1]} on {BOAT.date.slice(8)} Nov, so bunk changes are most useful before the manifest is sent.
              </p>
            </div>
          )}
          {selected && (
            <BunkDetail
              state={state}
              bunk={selected}
              onMove={(personId) => setModal({ kind: 'move', personId })}
              onName={() => setModal({ kind: 'name', bunkId: selected.id })}
              onConfirm={(personId) => setModal({ kind: 'confirm', personId })}
              onRelease={(personId) => setModal({ kind: 'release', personId })}
              onReleaseSlot={() => setModal({ kind: 'releaseSlot', bunkId: selected.id })}
              onClose={() => select(null)}
            />
          )}
        </aside>
      </div>

      {modal?.kind === 'move' && (
        <MoveDialog
          state={state}
          personId={modal.personId}
          onClose={() => setModal(null)}
          onMove={(toBunkId) => {
            const person = personById(state, modal.personId);
            dispatch({ type: 'move', personId: modal.personId, toBunkId });
            setModal(null);
            if (person) select(toBunkId);
          }}
        />
      )}

      {modal?.kind === 'name' && (
        <NameDialog
          state={state}
          bunkId={modal.bunkId}
          onClose={() => setModal(null)}
          onSubmit={(data) => {
            dispatch({ type: 'nameSlot', bunkId: modal.bunkId, ...data });
            setModal(null);
          }}
        />
      )}

      {modal?.kind === 'confirm' && (() => {
        const p = personById(state, modal.personId);
        if (!p) return null;
        return (
          <ConfirmDialog
            title={`Confirm ${p.name}?`}
            confirmLabel="Confirm booking"
            onClose={() => setModal(null)}
            onConfirm={() => run({ type: 'confirm', personId: p.id })}
            impact={<Impact title="What changes" rows={coverImpact(state, previewAction(state, { type: 'confirm', personId: p.id }))} note="Confirmed people keep their bunk at the release." />}
          >
            <p>
              Only confirm after the course has confirmed {p.name} in writing. Confirming moves them from pending to confirmed for the kitchen, and keeps the bunk past 17:00.
            </p>
          </ConfirmDialog>
        );
      })()}

      {modal?.kind === 'release' && (() => {
        const p = personById(state, modal.personId);
        if (!p) return null;
        return (
          <ConfirmDialog
            title={`Release ${p.name} from the hold?`}
            confirmLabel="Release bunk"
            tone="danger"
            onClose={() => setModal(null)}
            onConfirm={() => run({ type: 'releasePerson', personId: p.id })}
            impact={<Impact title="What changes" rows={coverImpact(state, previewAction(state, { type: 'releasePerson', personId: p.id }))} />}
          >
            <p>
              Use this only when the course has told you {p.name} is not coming. The bunk goes back to free stock, and {p.name} is marked released.
            </p>
          </ConfirmDialog>
        );
      })()}

      {modal?.kind === 'releaseSlot' && (() => {
        const bunk = bunkById(state, modal.bunkId);
        if (!bunk) return null;
        const action: Action = { type: 'releaseSlot', bunkId: bunk.id };
        return (
          <ConfirmDialog
            title={`Release ${bunkLabel(bunk.id)} from the hold?`}
            confirmLabel="Release bunk"
            tone="danger"
            onClose={() => setModal(null)}
            onConfirm={() => run(action)}
            impact={<Impact title="What changes" rows={coverImpact(state, previewAction(state, action))} />}
          >
            <p>Use this when the course will not fill the unnamed bunk. It goes back to free stock now, instead of at 17:00.</p>
          </ConfirmDialog>
        );
      })()}
    </div>
  );
}

function BunkDetail({
  state,
  bunk,
  onMove,
  onName,
  onConfirm,
  onRelease,
  onReleaseSlot,
  onClose,
}: {
  state: AppState;
  bunk: Bunk;
  onMove: (personId: string) => void;
  onName: () => void;
  onConfirm: (personId: string) => void;
  onRelease: (personId: string) => void;
  onReleaseSlot: () => void;
  onClose: () => void;
}) {
  const cabin = cabinOfBunk(bunk);
  const { kind, person } = kindOf(state, bunk);
  const conflict = person ? restrictionFor(state, person) : undefined;

  return (
    <div className="detail-card">
      <div className="detail-top">
        <div>
          <span className="cabin-code">{cabin.name}</span>
          <h2>{bunkLabel(bunk.id)}</h2>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Clear selection">×</button>
      </div>

      <dl className="facts">
        <dt>Designation</dt>
        <dd>{DESIGNATION_LABEL[cabin.designation]}</dd>
        <dt>Bathroom</dt>
        <dd>{cabin.bathroom}</dd>
        <dt>Hold</dt>
        <dd>{bunk.held ? <>In the BIO 377 <Term k="block-hold">block hold</Term></> : 'Free stock (not held)'}</dd>
      </dl>

      {conflict && (
        <div className="alert small-alert">
          <strong>{conflict.label}</strong> {rangeText(conflict.from, conflict.to)}. {conflict.detail}
        </div>
      )}

      {person ? (
        <div className="occupant">
          <div className="occupant-name">{person.name}</div>
          <div className="occupant-role">{person.role}</div>
          <div className="pill-row">
            {person.isResident ? (
              <Pill tone="resident">Resident</Pill>
            ) : person.booking === 'confirmed' ? (
              <Pill tone="confirmed">Confirmed</Pill>
            ) : (
              <Pill tone="tentative">
                <Term k="tentative">Tentative</Term>
              </Pill>
            )}
            <Pill tone="neutral">{LODGING_LABEL[person.lodging]} lodging</Pill>
            {!person.isResident && (
              person.waiver === 'complete' ? <Pill tone="ok">Waiver on file</Pill> : <Pill tone="alert">Waiver incomplete</Pill>
            )}
          </div>
          {person.diet && <div className="diet">Diet: {person.diet}</div>}
          <div className="subtle small-text">
            Stay {rangeText(person.from, person.to)}
            {!person.isResident && ` · Boat: ${person.trip ? `trip ${person.trip}` : 'not on manifest'}`}
          </div>
        </div>
      ) : (
        <div className="occupant empty-occupant">
          {bunk.held ? (
            <>
              <div className="occupant-name">Unnamed hold bunk</div>
              <p className="subtle">
                Held for {COURSE.code} with no person yet. It is a pending cover until someone is named or the bunk is released at 17:00.
              </p>
            </>
          ) : (
            <>
              <div className="occupant-name">Free</div>
              <p className="subtle">Not part of the BIO 377 hold. Changing it does not affect the course's count.</p>
            </>
          )}
        </div>
      )}

      <div className="actions">
        {kind === 'tentative' && person && (
          <>
            <button className="btn primary" onClick={() => onConfirm(person.id)}>
              Confirm booking…
            </button>
            <button className="btn" onClick={() => onMove(person.id)}>
              Move to another bunk…
            </button>
            <button className="btn danger-outline" onClick={() => onRelease(person.id)}>
              Release from hold…
            </button>
          </>
        )}
        {kind === 'confirmed' && person && (
          <button className="btn" onClick={() => onMove(person.id)}>
            Move to another bunk…
          </button>
        )}
        {kind === 'empty' && (
          <>
            <button className="btn primary" onClick={onName}>
              Name this slot…
            </button>
            <button className="btn danger-outline" onClick={onReleaseSlot}>
              Release from hold…
            </button>
          </>
        )}
        {kind === 'resident' && <p className="subtle small-text">Residents are not part of the course hold and cannot be moved from here.</p>}
      </div>
      {conflict && person && (
        <p className="note">
          Move {person.name.split(' ')[0]} to a free bunk outside the hold. The move dialog shows which bunks are allowed, and what happens to the hold.
        </p>
      )}
    </div>
  );
}

function MoveDialog({
  state,
  personId,
  onClose,
  onMove,
}: {
  state: AppState;
  personId: string;
  onClose: () => void;
  onMove: (toBunkId: string) => void;
}) {
  const person = personById(state, personId);
  const [chosen, setChosen] = useState<string | null>(null);
  if (!person || !person.bunkId) return null;
  const currentBunk = person.bunkId;

  const candidates = state.bunks
    .filter((b) => b.id !== currentBunk)
    .map((b) => {
      const check = checkPlacement(state, { id: person.id, lodging: person.lodging, from: person.from, to: person.to }, b.id);
      return { bunk: b, check, occupied: Boolean(personInBunk(state, b.id)) };
    })
    .sort((a, b) => {
      if (a.check.ok !== b.check.ok) return a.check.ok ? -1 : 1;
      if (a.bunk.held !== b.bunk.held) return a.bunk.held ? 1 : -1;
      return state.bunks.indexOf(a.bunk) - state.bunks.indexOf(b.bunk);
    });

  const picked = candidates.find((c) => c.bunk.id === chosen);
  const after = picked && picked.check.ok ? previewAction(state, { type: 'move', personId, toBunkId: picked.bunk.id }) : null;
  const holdBefore = summary(state).heldCount;
  const holdAfter = after ? summary(after).heldCount : holdBefore;

  return (
    <Modal
      title={`Move ${person.name}`}
      onClose={onClose}
      width={640}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!picked || !picked.check.ok} onClick={() => chosen && onMove(chosen)}>
            Move here
          </button>
        </>
      }
    >
      <p className="subtle">
        Currently in {bunkLabel(currentBunk)}. A move does not change how many covers the kitchen expects for {person.name.split(' ')[0]}.
        Bunks that are blocked show the reason. Free bunks outside the hold keep the hold at {holdBefore}.
      </p>
      <div className="candidate-list" role="listbox" aria-label="Candidate bunks">
        {candidates.map((c) => {
          const cabin = cabinById(c.bunk.cabinId);
          const isChosen = chosen === c.bunk.id;
          return (
            <button
              key={c.bunk.id}
              role="option"
              aria-selected={isChosen}
              disabled={!c.check.ok}
              className={`candidate ${c.check.ok ? '' : 'blocked'} ${isChosen ? 'chosen' : ''}`}
              onClick={() => setChosen(c.bunk.id)}
            >
              <div className="candidate-main">
                <strong>{bunkLabel(c.bunk.id)}</strong>
                <span className="subtle">{DESIGNATION_LABEL[cabin.designation]} · {c.bunk.held ? 'in the hold' : 'free stock'}</span>
              </div>
              <div className="candidate-why">{c.check.reason}</div>
            </button>
          );
        })}
      </div>
      {picked && picked.check.ok && (
        <Impact
          title={`If you move ${person.name.split(' ')[0]} to ${bunkLabel(picked.bunk.id)}`}
          rows={[
            { label: 'Bunks held for BIO 377', before: holdBefore, after: holdAfter },
            { label: 'Dinner covers, confirmed', before: arrivalCovers(state).D.confirmedTotal, after: after ? arrivalCovers(after).D.confirmedTotal : arrivalCovers(state).D.confirmedTotal },
          ]}
          note={holdAfter < holdBefore ? 'The bunk being left is restricted, so it leaves the hold. Covers are unchanged.' : 'Covers are unchanged. Only which bunks are held changes.'}
        />
      )}
    </Modal>
  );
}

function NameDialog({
  state,
  bunkId,
  onClose,
  onSubmit,
}: {
  state: AppState;
  bunkId: string;
  onClose: () => void;
  onSubmit: (data: { name: string; role: Role; lodging: Lodging; diet: string | null }) => void;
}) {
  const bunk = bunkById(state, bunkId);
  const cabin = bunk ? cabinOfBunk(bunk) : undefined;
  const defaultLodging: Lodging = cabin?.designation === 'men' ? 'men' : 'women';
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('Student');
  const [lodging, setLodging] = useState<Lodging>(defaultLodging);
  const [diet, setDiet] = useState('');

  if (!bunk) return null;
  const check = checkPlacement(state, { lodging, from: COURSE.from, to: COURSE.to }, bunkId);
  const valid = name.trim().length > 1 && check.ok;
  const after = valid ? previewAction(state, { type: 'nameSlot', bunkId, name, role, lodging, diet: diet.trim() || null }) : null;

  return (
    <Modal
      title={`Name the slot in ${bunkLabel(bunkId)}`}
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={!valid}
            onClick={() => onSubmit({ name: name.trim(), role, lodging, diet: diet.trim() || null })}
          >
            Name as tentative
          </button>
        </>
      }
    >
      <p className="subtle">
        Use the name exactly as the course has sent it. Named bookings start as <Term k="tentative">tentative</Term> and a waiver that is still outstanding.
      </p>
      <div className="form">
        <label>
          Full name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="As on the course roster" autoFocus />
        </label>
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option>Student</option>
            <option>Instructor</option>
          </select>
        </label>
        <label>
          Lodging group
          <select value={lodging} onChange={(e) => setLodging(e.target.value as Lodging)}>
            <option value="women">Women's</option>
            <option value="men">Men's</option>
          </select>
        </label>
        <label>
          Dietary note <span className="subtle">(optional)</span>
          <input value={diet} onChange={(e) => setDiet(e.target.value)} placeholder="e.g. Celiac (gluten-free)" />
        </label>
      </div>
      <div className={`check ${check.ok ? 'check-ok' : 'check-bad'}`}>
        {check.ok ? (
          <>
            <strong>{cabin?.name} accepts this lodging group.</strong> {check.notes[0]}
          </>
        ) : (
          check.problems.map((p) => <div key={p}>{p}</div>)
        )}
      </div>
      {after && (
        <Impact
          title="What changes"
          rows={coverImpact(state, after)}
          note="A named tentative person counts as pending, not confirmed, until the course confirms them."
        />
      )}
    </Modal>
  );
}
