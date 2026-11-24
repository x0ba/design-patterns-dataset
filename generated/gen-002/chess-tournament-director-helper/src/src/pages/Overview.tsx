import type { Dispatch, ReactNode } from 'react';
import { Button, Callout, Pill, fmtPts, type Tone } from '../components/ui';
import { computeStandings, placeLabel, playerById, resultLabel } from '../lib/swiss';
import type { EventState, Game, Result } from '../lib/types';
import { reduce, RESULT_TEXT, type Action } from '../state/reducer';
import { derive, eligibleCount, type Derived } from '../state/derive';
import type { Nav } from '../App';
import { rulesNote } from '../data/rules';

interface Props {
  state: EventState;
  d: Derived;
  dispatch: Dispatch<Action>;
  nav: Nav;
}

export function Overview({ state, d, nav }: Props) {
  const pr = d.pairRound;
  const openCount = d.disputes.length + d.waiting.length + d.leavingNow.length;

  return (
    <div className="overview-grid">
      <div className="overview-main">
        <header className="page-head">
          <div>
            <p className="eyebrow">Round {d.currentRound} complete</p>
            <h1>Before you post round {pr ?? '—'}</h1>
            <p className="lead">
              Every result from round {d.currentRound} is in. Three things need a decision before the next pairings can
              go up. Work through them top to bottom. Each card says what the software will do and why, and the notes
              on the right quote the club rule behind it.
            </p>
          </div>
          <div className="progress-box" aria-label="Progress">
            <div className="progress-num">{openCount === 0 ? 'Ready' : `${openCount} to do`}</div>
            <div className="muted small">{openCount === 0 ? 'Nothing is waiting on you' : 'Open items are marked below'}</div>
          </div>
        </header>

        {pr === null ? (
          <Callout tone="info" title="Nothing to pair yet">
            The current round still has results to enter. Open Round results to finish it.
          </Callout>
        ) : (
          <>
            <DisputeStep state={state} d={d} nav={nav} />
            <LateEntryStep d={d} nav={nav} />
            <WithdrawalStep state={state} d={d} nav={nav} />
            <ByeStep state={state} d={d} />
            <PostStep d={d} nav={nav} />
          </>
        )}
      </div>

      <aside className="rail" aria-label="Club rules that apply today">
        <div className="rail-title">Club rules for today</div>
        <RuleCard id="results" />
        <RuleCard id="late" />
        <RuleCard id="withdraw" />
        <RuleCard id="byes" />
        <button type="button" className="link-btn" onClick={() => nav.go('rules')}>
          Full rules note and glossary →
        </button>
      </aside>
    </div>
  );
}

function RuleCard({ id }: { id: string }) {
  const s = rulesNote.sections.find((x) => x.id === id);
  if (!s) return null;
  return (
    <div className="rule-card">
      <div className="rule-title">{s.title}</div>
      {s.body.map((b) => (
        <p key={b}>{b}</p>
      ))}
    </div>
  );
}

function ruleText(id: string, index: number): string {
  return rulesNote.sections.find((x) => x.id === id)!.body[index];
}

/* ------------------------------------------------------------------ *
 * Shared step frame
 * ------------------------------------------------------------------ */

function Step({
  n,
  title,
  tone,
  status,
  children,
}: {
  n: number;
  title: string;
  tone: Tone;
  status: string;
  children: ReactNode;
}) {
  return (
    <section className={`step step-${tone}`}>
      <header className="step-head">
        <span className="step-num">{n}</span>
        <h2>{title}</h2>
        <Pill tone={tone}>{status}</Pill>
      </header>
      <div className="step-body">{children}</div>
    </section>
  );
}

function DoneStep({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <section className="step step-done">
      <header className="step-head">
        <span className="step-num">{n}</span>
        <h2>{title}</h2>
        <Pill tone="ok">Done</Pill>
      </header>
      <div className="step-body">
        <p className="muted">{text}</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 1. Disputed result
 * ------------------------------------------------------------------ */

function correctionEffect(state: EventState, game: Game, to: Result) {
  const after = reduce(state, { type: 'correctResult', gameId: game.id, to, reason: '', note: '', at: '' });
  const before = computeStandings(state, game.round);
  const next = computeStandings(after, game.round);
  return [game.white, game.black].map((id) => {
    const b = before.find((r) => r.playerId === id)!;
    const a = next.find((r) => r.playerId === id)!;
    return {
      name: playerById(state, id).name,
      from: b.points,
      to: a.points,
      rankFrom: placeLabel(b),
      rankTo: placeLabel(a),
    };
  });
}

function DisputeStep({ state, d, nav }: { state: EventState; d: Derived; nav: Nav }) {
  const game = d.disputes[0];
  if (!game) {
    const closed = state.games.filter((g) => g.dispute?.resolved);
    const text =
      closed.length === 0
        ? 'No result is in dispute.'
        : closed
            .map((g) => {
              const w = playerById(state, g.white).name;
              const k = playerById(state, g.black).name;
              return `Round ${g.round} board ${g.board} (${w} vs ${k}) was checked against the sheet and is now ${resultLabel(g.result)}.`;
            })
            .join(' ');
    return <DoneStep n={1} title="Disputed results are closed" text={text} />;
  }
  const white = playerById(state, game.white).name;
  const black = playerById(state, game.black).name;
  const reported = game.dispute!.reportedResult;
  const effect = correctionEffect(state, game, reported);

  return (
    <Step n={1} title={`Board ${game.board}: the sheet and the players disagree`} tone="warn" status="Needs you">
      <div className="fact-grid">
        <div className="fact">
          <span className="fact-label">Recorded in the software</span>
          <strong>{resultLabel(game.result)}</strong>
          <span className="muted small">
            Round {game.round}, board {game.board}: {white} (white) vs {black} (black)
          </span>
        </div>
        <div className="fact fact-warn">
          <span className="fact-label">Players say</span>
          <strong>{RESULT_TEXT[reported]}</strong>
          <span className="muted small">Both players, after the game. Not yet checked against the sheet.</span>
        </div>
      </div>

      <p>
        <strong>Why it matters:</strong> round {d.pairRound} is paired from the scores in the software. A wrong result
        moves two players into the wrong score group, and their pairings change with it.
      </p>

      <div className="what-box">
        <div className="what-title">What the software will do</div>
        <p>
          Save the result you choose, log the reason, and close the dispute. It does not decide the result for you.
          If the sheet says black won, the standings after round {game.round} change like this:
        </p>
        <ul className="bullets">
          {effect.map((e) => (
            <li key={e.name}>
              <strong>{e.name}</strong>: {fmtPts(e.from)} → {fmtPts(e.to)} {e.to === 1 ? 'point' : 'points'}, place{' '}
              {e.rankFrom} → {e.rankTo}
            </li>
          ))}
        </ul>
      </div>

      <div className="step-actions">
        <Button variant="primary" onClick={() => nav.dialog({ kind: 'correct', gameId: game.id })}>
          Check the sheet and correct the result…
        </Button>
        <Button variant="ghost" onClick={() => nav.go('results')}>
          Open round {game.round} results
        </Button>
      </div>
    </Step>
  );
}

/* ------------------------------------------------------------------ *
 * 2. Late entry
 * ------------------------------------------------------------------ */

function LateEntryStep({ d, nav }: { d: Derived; nav: Nav }) {
  const p = d.waiting[0];
  if (!p) {
    const added = d.added;
    const declined = d.declined;
    const parts = [
      ...added.map((x) => `${x.name} is added from round ${x.joinedRound}.`),
      ...declined.map((x) => `${x.name} is not joining today.`),
    ];
    return (
      <DoneStep
        n={2}
        title="Late entries are decided"
        text={parts.length ? parts.join(' ') : 'Nobody is waiting to join.'}
      />
    );
  }
  const first = p.name.split(' ')[0];
  return (
    <Step n={2} title={`${p.name} wants to join now`} tone="warn" status="Needs you">
      <div className="fact-grid">
        <div className="fact">
          <span className="fact-label">Arrived</span>
          <strong>{p.arrivedAt ?? 'Today'}</strong>
          <span className="muted small">
            Age {p.age} · rating {p.rating}
          </span>
        </div>
        <div className="fact">
          <span className="fact-label">Rounds missed</span>
          <strong>Rounds 1 and 2</strong>
          <span className="muted small">First paired in round {d.pairRound}</span>
        </div>
      </div>

      <p>
        <strong>The rule:</strong> {ruleText('late', 1)}
      </p>

      <div className="what-box">
        <div className="what-title">What the software will do</div>
        <p>
          Add {first} as an active player from round {d.pairRound}. The half-point credit is optional. If you tick
          none, {first} starts on 0 points and is paired in the 0-point group, and the count of players for the round
          goes up by one.
        </p>
      </div>

      <div className="step-actions">
        <Button variant="primary" onClick={() => nav.dialog({ kind: 'late', playerId: p.id })}>
          Add {first} to round {d.pairRound}…
        </Button>
        <Button variant="ghost" onClick={() => nav.dialog({ kind: 'late', playerId: p.id })}>
          Not joining today
        </Button>
      </div>
    </Step>
  );
}

/* ------------------------------------------------------------------ *
 * 3. Withdrawal
 * ------------------------------------------------------------------ */

function WithdrawalStep({ state, d, nav }: { state: EventState; d: Derived; nav: Nav }) {
  const p = d.leavingNow[0];
  if (!p) {
    const withdrawn = state.players.filter((x) => x.withdrawnFromRound === d.pairRound);
    const text = withdrawn.length
      ? withdrawn.map((x) => `${x.name} is withdrawn from round ${d.pairRound} onward.`).join(' ')
      : 'Nobody has left the event.';
    return <DoneStep n={3} title="Players who have gone home are withdrawn" text={text} />;
  }
  const pts = computeStandings(state, d.currentRound).find((r) => r.playerId === p.id)?.points ?? 0;
  const afterWithdraw = derive(reduce(state, { type: 'withdraw', playerId: p.id, fromRound: d.pairRound!, at: '' }));
  const first = p.name.split(' ')[0];

  return (
    <Step n={3} title={`${p.name} has gone home unwell`} tone="warn" status="Needs you">
      <p>
        {p.note ?? 'Left after round 2.'} {first} will not play round {d.pairRound}, so the withdrawal has to be recorded
        before the pairings are posted. Otherwise the software would give {first} a board.
      </p>

      <div className="what-box">
        <div className="what-title">What the software will do</div>
        <ul className="bullets">
          <li>
            {first} is <strong>not paired</strong> from round {d.pairRound} onward.
          </li>
          <li>
            Their <strong>{fmtPts(pts)} point{pts === 1 ? '' : 's'}</strong> stay in the standings, and their opponents keep
            the results they already played against them.
          </li>
          <li>
            On its own this leaves <strong>{afterWithdraw.activeForPairRound} active players</strong> for round {d.pairRound}.
            That is odd, which is where the bye question comes from. Step 2 changes the count again.
          </li>
        </ul>
      </div>

      <div className="step-actions">
        <Button variant="danger" onClick={() => nav.dialog({ kind: 'withdraw', playerId: p.id })}>
          Withdraw {first}…
        </Button>
      </div>
    </Step>
  );
}

/* ------------------------------------------------------------------ *
 * 4. Byes
 * ------------------------------------------------------------------ */

function scenario(state: EventState, actions: Action[]) {
  let s = state;
  for (const a of actions) s = reduce(s, a);
  const d = derive(s);
  const bye = d.preview?.bye;
  return {
    active: d.activeForPairRound,
    byeName: bye ? playerById(s, bye.playerId).name : null,
    byeReason: bye?.reason ?? null,
  };
}

function ByeStep({ state, d }: { state: EventState; d: Derived }) {
  const pr = d.pairRound!;
  const leaver = d.leavingNow[0];
  const theo = d.waiting[0];
  const eligibleNow = eligibleCount(state, pr);

  // The two open decisions decide whether a bye is needed at all.
  const withdrawActions: Action[] = leaver
    ? [{ type: 'withdraw', playerId: leaver.id, fromRound: pr, at: '' }]
    : [];
  const joinScenario = scenario(state, [
    ...withdrawActions,
    ...(theo ? [{ type: 'addLateEntry' as const, playerId: theo.id, halfByeRounds: [], joinRound: pr, at: '' }] : []),
  ]);
  const declineScenario = theo
    ? scenario(state, [...withdrawActions, { type: 'declineLateEntry', playerId: theo.id, at: '' }])
    : null;

  const joinedEven = joinScenario.active % 2 === 0;
  const needsBye = joinScenario.byeName !== null || (declineScenario?.byeName ?? null) !== null;
  const tone: Tone = joinedEven && !needsBye ? 'ok' : 'info';
  const first = (name: string) => name.split(' ')[0];

  if (!leaver && !theo) {
    return (
      <Step n={4} title="Do we need a bye?" tone={tone} status={joinScenario.byeName ? 'Bye needed' : 'No bye needed'}>
        <p>
          <strong>The rule:</strong> {ruleText('byes', 0)}
        </p>
        <div className="what-box">
          <div className="what-title">What the software will do</div>
          {joinScenario.byeName ? (
            <p>
              {eligibleNow} players are eligible for round {pr}, an odd number. The bye goes to{' '}
              <strong>{joinScenario.byeName}</strong>. {joinScenario.byeReason} They get 1 point and are not paired.
            </p>
          ) : (
            <p>
              {eligibleNow} players are eligible for round {pr}, an even number. Nobody needs a bye, so every player
              gets a board.
            </p>
          )}
        </div>
      </Step>
    );
  }

  return (
    <Step n={4} title="Do we need a bye?" tone={tone} status={joinScenario.byeName ? 'Bye needed' : 'No bye needed'}>
      <p>
        <strong>The rule:</strong> {ruleText('byes', 0)}
      </p>
      <p className="muted small">
        Right now {eligibleNow} players are eligible for round {pr}. That number still includes
        {leaver ? ` ${leaver.name}` : ' everyone on the list'}
        {theo ? ` and leaves out ${theo.name}` : ''}. A bye is a full point for a round nobody plays. It does not count
        as a game.
      </p>

      <table className="table scenario">
        <thead>
          <tr>
            <th>Depends on the two open decisions</th>
            <th className="num">Active players</th>
            <th>Bye</th>
          </tr>
        </thead>
        <tbody>
          <tr className="scenario-main">
            <td>
              {leaver ? `${first(leaver.name)} withdrawn` : 'No withdrawals'}
              {theo ? `, ${first(theo.name)} joins` : ''}
            </td>
            <td className="num">
              <strong>{joinScenario.active}</strong> ({joinedEven ? 'even' : 'odd'})
            </td>
            <td>{joinScenario.byeName ? <strong>{joinScenario.byeName}</strong> : 'None'}</td>
          </tr>
          {theo && declineScenario && (
            <tr>
              <td>
                {leaver ? `${first(leaver.name)} withdrawn` : 'No withdrawals'}, {first(theo.name)} does not join
              </td>
              <td className="num">
                <strong>{declineScenario.active}</strong> ({declineScenario.active % 2 === 0 ? 'even' : 'odd'})
              </td>
              <td>{declineScenario.byeName ? <strong>{declineScenario.byeName}</strong> : 'None'}</td>
            </tr>
          )}
        </tbody>
      </table>

      {joinScenario.byeName === null && (
        <div className="what-box">
          <div className="what-title">What the software will do</div>
          <p>
            Nobody is given a bye. With {theo ? `${first(theo.name)} joining` : 'the list as it is'}, round {pr} has{' '}
            {joinScenario.active} players, so every player gets a board.
          </p>
        </div>
      )}
      {declineScenario?.byeName && declineScenario.byeReason && (
        <div className="what-box">
          <div className="what-title">If {first(theo!.name)} does not join: who gets the bye, and why</div>
          <p>
            The bye goes to <strong>{declineScenario.byeName}</strong>. {declineScenario.byeReason} They get 1 point for
            round {pr} and are not paired that round.
          </p>
        </div>
      )}
    </Step>
  );
}

/* ------------------------------------------------------------------ *
 * 5. Check and post
 * ------------------------------------------------------------------ */

function PostStep({ d, nav }: { d: Derived; nav: Nav }) {
  const pr = d.pairRound!;
  return (
    <Step n={5} title={`Check and post round ${pr}`} tone={d.canPost ? 'ok' : 'neutral'} status={d.canPost ? 'Ready' : 'Not yet'}>
      <ul className="checks">
        {d.checks.map((c) => (
          <li key={c.id} className={c.ok ? 'check-ok' : 'check-bad'}>
            <span className="check-icon" aria-hidden="true">
              {c.ok ? '✓' : '!'}
            </span>
            <div>
              <div className="check-label">{c.label}</div>
              <div className="muted small">{c.detail}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="step-actions">
        <Button onClick={() => nav.go('pairings')}>See round {pr} pairings</Button>
        <Button variant="primary" disabled={!d.canPost} onClick={() => nav.dialog({ kind: 'post', round: pr })}>
          Post round {pr} pairings…
        </Button>
      </div>
      {!d.canPost && <p className="muted small">Posting unlocks when every check is ticked.</p>}
    </Step>
  );
}
