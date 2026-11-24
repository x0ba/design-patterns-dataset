import { useMemo, useState, type Dispatch } from 'react';
import { Button, Callout, Field, Modal, fmtPts, nowStamp } from './ui';
import { computeStandings, fmtScore, placeLabel, playerById, resultLabel } from '../lib/swiss';
import type { EventState, Result } from '../lib/types';
import { reduce, RESULT_TEXT, type Action } from '../state/reducer';
import { derive } from '../state/derive';

type Dispatcher = Dispatch<Action>;

/* ------------------------------------------------------------------ *
 * Correct a result (used for disputed boards and typing errors)
 * ------------------------------------------------------------------ */

const REASONS = [
  'Scoresheet shows a different result',
  'Typing error when the result was entered',
  'Both players confirmed a different result',
  'Scoresheet confirms the recorded result',
];

export function CorrectResultDialog({
  state,
  gameId,
  dispatch,
  onClose,
}: {
  state: EventState;
  gameId: string;
  dispatch: Dispatcher;
  onClose: () => void;
}) {
  const game = state.games.find((g) => g.id === gameId)!;
  const white = playerById(state, game.white);
  const black = playerById(state, game.black);
  const [to, setTo] = useState<Result | ''>('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);

  const valid = to !== '' && reason !== '' && checked;
  const keepsRecorded = to !== '' && to === game.result;

  const preview = useMemo(() => {
    if (to === '') return null;
    const after = reduce(state, { type: 'correctResult', gameId, to, reason, note, at: '' });
    const before = computeStandings(state, game.round);
    const next = computeStandings(after, game.round);
    const ids = [game.white, game.black];
    return ids.map((id) => {
      const b = before.find((r) => r.playerId === id)!;
      const a = next.find((r) => r.playerId === id)!;
      return {
        id,
        name: playerById(state, id).name,
        beforePts: b.points,
        afterPts: a.points,
        beforeRank: placeLabel(b),
        afterRank: placeLabel(a),
      };
    });
  }, [state, gameId, to, reason, note, game]);

  const save = () => {
    if (!valid || !to) return;
    dispatch({ type: 'correctResult', gameId, to, reason, note: note.trim(), at: nowStamp() });
    onClose();
  };

  return (
    <Modal
      title={`Round ${game.round}, board ${game.board}`}
      subtitle={`${white.name} (white) vs ${black.name} (black)`}
      onClose={onClose}
      width={680}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid} onClick={save}>
            {keepsRecorded ? 'Close dispute, keep result' : 'Save correction'}
          </Button>
        </>
      }
    >
      <div className="dialog-grid">
        <div className="kv">
          <span>Recorded now</span>
          <strong>{resultLabel(game.result)}</strong>
        </div>
        {game.dispute && (
          <div className="kv">
            <span>Players report</span>
            <strong>{RESULT_TEXT[game.dispute.reportedResult]}</strong>
          </div>
        )}
      </div>

      <Callout tone="info" title="How to check">
        Look at the paper scoresheet for this board. Both players should have signed it. If the sheet
        and the players disagree, ask both players to point at the sheet together. The sheet is the
        record; the software only copies what you enter here.
      </Callout>

      <fieldset className="choice-group">
        <legend>What does the scoresheet say?</legend>
        {(['0-1', '1/2', '1-0'] as Result[]).map((r) => {
          const who = r === '1-0' ? white.name : r === '0-1' ? black.name : null;
          return (
            <label key={r} className={`choice ${to === r ? 'choice-on' : ''}`}>
              <input type="radio" name="to" checked={to === r} onChange={() => setTo(r)} />
              <span>
                <strong>{RESULT_TEXT[r]}</strong>
                {who && <span className="muted"> · {who} wins</span>}
                {r === '1/2' && <span className="muted"> · keep the draw</span>}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="form-row">
        <Field label="Reason (saved in the log)">
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Choose a reason…</option>
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Note (optional)">
        <input
          type="text"
          value={note}
          placeholder="For example: scoresheet signed by both players"
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      <label className="check">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>I have looked at the paper scoresheet for this board.</span>
      </label>

      {preview && (
        <div className="preview">
          <div className="preview-title">Effect on the standings after round {game.round}</div>
          <table className="table compact">
            <thead>
              <tr>
                <th>Player</th>
                <th className="num">Points now</th>
                <th className="num">Points after</th>
                <th className="num">Place now</th>
                <th className="num">Place after</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="num">{fmtPts(p.beforePts)}</td>
                  <td className="num">
                    <strong className={p.afterPts !== p.beforePts ? 'changed' : ''}>{fmtPts(p.afterPts)}</strong>
                  </td>
                  <td className="num">{p.beforeRank}</td>
                  <td className="num">{p.afterRank}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">
            {keepsRecorded
              ? 'Keeping the recorded result changes no scores. The dispute is closed and the reason is logged.'
              : 'Round 3 will be paired from these corrected scores. Nothing is re-paired for a round that has already been posted.'}
          </p>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ *
 * Late entry (waiting list or a brand-new arrival)
 * ------------------------------------------------------------------ */

export function LateEntryDialog({
  state,
  playerId,
  dispatch,
  onClose,
}: {
  state: EventState;
  playerId: string | null;
  dispatch: Dispatcher;
  onClose: () => void;
}) {
  const existing = playerId ? playerById(state, playerId) : null;
  const pairRound = derive(state).pairRound ?? state.postedRounds.length + 1;
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [rating, setRating] = useState('1000');
  const [r1, setR1] = useState(false);
  const [r2, setR2] = useState(false);

  const halfByeRounds = [r1 ? 1 : null, r2 ? 2 : null].filter((x): x is number => x !== null);
  const newPlayer =
    existing === null
      ? { name: name.trim(), age: Number(age), rating: Number(rating) }
      : undefined;
  const newValid =
    existing !== null ||
    (name.trim().length > 1 && Number(age) >= 5 && Number(age) <= 18 && Number(rating) >= 0 && Number(rating) <= 2400);

  const effect = useMemo(() => {
    if (!newValid) return null;
    const after = reduce(state, {
      type: 'addLateEntry',
      playerId: existing ? existing.id : null,
      newPlayer,
      halfByeRounds,
      joinRound: pairRound,
      at: '',
    });
    const d = derive(after);
    const leaving = derive(state).leavingNow;
    return {
      activeCount: d.activeForPairRound,
      bye: d.preview?.bye ?? null,
      byeName: d.preview?.bye ? playerById(after, d.preview.bye.playerId).name : null,
      startPoints: halfByeRounds.length * 0.5,
      problems: d.preview?.problems ?? [],
      // Someone who has gone home but is not yet withdrawn is still counted here.
      stillCounted: leaving.map((p) => p.name),
    };
    // newPlayer is derived from the fields above; the field values are the real dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, existing?.id, newValid, name, age, rating, r1, r2]);

  const canAdd = newValid;
  const add = () => {
    if (!canAdd) return;
    dispatch({
      type: 'addLateEntry',
      playerId: existing ? existing.id : null,
      newPlayer,
      halfByeRounds,
      joinRound: pairRound,
      at: nowStamp(),
    });
    onClose();
  };
  const decline = () => {
    if (!existing) return;
    dispatch({ type: 'declineLateEntry', playerId: existing.id, at: nowStamp() });
    onClose();
  };

  return (
    <Modal
      title={existing ? `Add ${existing.name} to round ${pairRound}?` : 'Add a late entry'}
      subtitle={
        existing
          ? `Age ${existing.age} · rating ${existing.rating} · from the club rating list`
          : `Joins from round ${pairRound}`
      }
      onClose={onClose}
      width={680}
      footer={
        <>
          {existing && (
            <Button variant="ghost" onClick={decline}>
              Not joining today
            </Button>
          )}
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!canAdd} onClick={add}>
            {existing ? `Add ${existing.name.split(' ')[0]} to round ${pairRound}` : `Add to round ${pairRound}`}
          </Button>
        </>
      }
    >
      {existing ? (
        <p>
          {existing.name} arrived at {existing.arrivedAt ?? 'the hall'} and asked to join. They will be paired from
          round {pairRound}.
        </p>
      ) : (
        <div className="form-row three">
          <Field label="Full name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" />
          </Field>
          <Field label="Age">
            <input type="number" min={5} max={18} value={age} onChange={(e) => setAge(e.target.value)} />
          </Field>
          <Field label="Club rating">
            <input type="number" min={0} max={2400} value={rating} onChange={(e) => setRating(e.target.value)} />
          </Field>
        </div>
      )}

      <Callout tone="info" title="Points for rounds they missed">
        The club allows a <strong>half-point credit for round 1 and for round 2</strong>, and nothing for later
        rounds. Credit is optional. Leave both unticked unless the family asks and you are sure of the rule.
      </Callout>
      <div className="check-stack">
        <label className="check">
          <input type="checkbox" checked={r1} onChange={(e) => setR1(e.target.checked)} />
          <span>Credit ½ for round 1 (missed)</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={r2} onChange={(e) => setR2(e.target.checked)} />
          <span>Credit ½ for round 2 (missed)</span>
        </label>
      </div>
      <p className="muted small">
        Starting points: <strong>{fmtScore(halfByeRounds.length * 0.5)}</strong>
      </p>

      {effect ? (
        <div className="preview">
          <div className="preview-title">What happens if you add {existing ? existing.name.split(' ')[0] : 'this player'}</div>
          <ul className="bullets">
            <li>
              Round {pairRound} will have <strong>{effect.activeCount} active players</strong>.{' '}
              {effect.activeCount % 2 === 0 ? 'An even number, so no bye is needed.' : 'An odd number, so a bye is needed.'}
            </li>
            <li>
              Starting on {fmtScore(effect.startPoints)} points, they are paired in the {fmtScore(effect.startPoints)}-point
              group for round {pairRound}.
            </li>
            {effect.bye && effect.byeName && (
              <li>
                Bye: <strong>{effect.byeName}</strong>. {effect.bye.reason}
              </li>
            )}
            {effect.stillCounted.length > 0 && (
              <li className="muted">
                {effect.stillCounted.join(', ')} is still counted because they have not been withdrawn yet. Withdrawing
                them first gives {effect.activeCount - effect.stillCounted.length} active players.
              </li>
            )}
            {effect.problems.map((p) => (
              <li key={p} className="warn-text">
                {p}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="muted small">Enter a name, age and rating to see what adding this player does.</p>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ *
 * Withdrawal
 * ------------------------------------------------------------------ */

export function WithdrawDialog({
  state,
  playerId,
  dispatch,
  onClose,
}: {
  state: EventState;
  playerId: string;
  dispatch: Dispatcher;
  onClose: () => void;
}) {
  const p = playerById(state, playerId);
  const d = derive(state);
  const fromRound = d.pairRound ?? d.currentRound + 1;
  const pointsNow = computeStandings(state, d.currentRound).find((r) => r.playerId === playerId)?.points ?? 0;

  const after = reduce(state, { type: 'withdraw', playerId, fromRound, at: '' });
  const afterDerived = derive(after);
  const activeBefore = d.activeForPairRound;
  const activeAfter = afterDerived.activeForPairRound;

  const confirm = () => {
    dispatch({ type: 'withdraw', playerId, fromRound, at: nowStamp() });
    onClose();
  };

  return (
    <Modal
      title={`Withdraw ${p.name}?`}
      subtitle={`From round ${fromRound} onward`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={confirm}>
            Withdraw {p.name.split(' ')[0]}
          </Button>
        </>
      }
    >
      <ul className="bullets">
        <li>
          {p.name} will <strong>not be paired</strong> from round {fromRound} onward.
        </li>
        <li>
          Their <strong>{fmtPts(pointsNow)} points</strong> stay in the standings. Opponents who played them keep
          the points they scored against them.
        </li>
        <li>
          Round {fromRound} will have <strong>{activeAfter} active players</strong> (was {activeBefore}).{' '}
          {activeAfter % 2 === 1
            ? 'That is odd, so a bye will be needed unless another player joins.'
            : 'That is even, so no bye is needed.'}
        </li>
      </ul>
      <Callout tone="warn" title="This cannot be undone once the round is posted">
        Withdrawal is decided before you post the round. If {p.name.split(' ')[0]} comes back after the pairings
        are posted, you will need to tell the directors and handle their board by hand.
      </Callout>
    </Modal>
  );
}
