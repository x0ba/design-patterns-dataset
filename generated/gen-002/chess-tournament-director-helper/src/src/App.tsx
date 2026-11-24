import { useCallback, useMemo, useReducer, useState, type Dispatch } from 'react';
import { initialEvent } from './data/mock';
import { clubSettings } from './data/rules';
import { reduce, type Action } from './state/reducer';
import { derive } from './state/derive';
import { Button, Modal, nowStamp } from './components/ui';
import { CorrectResultDialog, LateEntryDialog, WithdrawDialog } from './components/dialogs';
import { Overview } from './pages/Overview';
import { ResultsPage } from './pages/ResultsPage';
import { PlayersPage } from './pages/PlayersPage';
import { PairingsPage } from './pages/PairingsPage';
import { StandingsPage } from './pages/StandingsPage';
import { RulesPage } from './pages/RulesPage';
import type { EventState } from './lib/types';

export type Page = 'overview' | 'results' | 'players' | 'pairings' | 'standings' | 'rules';

export type DialogState =
  | null
  | { kind: 'correct'; gameId: string }
  | { kind: 'late'; playerId: string | null }
  | { kind: 'withdraw'; playerId: string }
  | { kind: 'discard' }
  | { kind: 'post'; round: number };

export interface Nav {
  go: (page: Page) => void;
  dialog: (d: DialogState) => void;
}

export function App() {
  const [state, dispatch] = useReducer(reduce, undefined, () => structuredClone(initialEvent));
  const [page, setPage] = useState<Page>('overview');
  const [dialog, setDialog] = useState<DialogState>(null);
  const closeDialog = useCallback(() => setDialog(null), []);

  const d = useMemo(() => derive(state), [state]);
  const openItems = d.disputes.length + d.waiting.length + d.leavingNow.length;
  const changesToday = state.log.length - initialEvent.log.length;
  const nav: Nav = { go: setPage, dialog: setDialog };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ♞
          </span>
          <span className="brand-name">Pairwise Club</span>
        </div>
        <div className="event-title">
          <strong>{state.name}</strong>
          <span className="muted">
            {state.totalRounds} rounds · {clubSettings.timeControl} · club-rated
          </span>
        </div>
        <div className="status-line" aria-live="polite">
          <span className={`status-dot ${d.pairRound ? 'ok' : 'busy'}`} />
          {d.pairRound !== null
            ? `Round ${d.currentRound} complete · Round ${d.pairRound} not yet posted`
            : `Round ${d.currentRound} in progress · results still coming in`}
        </div>
        <div className="topbar-actions">
          <span className="muted small">{changesToday === 0 ? 'No changes yet today' : `${changesToday} change${changesToday === 1 ? '' : 's'} today`}</span>
          <Button size="sm" variant="ghost" disabled={changesToday === 0} onClick={() => setDialog({ kind: 'discard' })}>
            Discard today’s changes
          </Button>
        </div>
      </header>

      <div className="body">
        <nav className="sidenav" aria-label="Main">
          <NavItem label="Before round 3" active={page === 'overview'} badge={openItems} onClick={() => setPage('overview')} />
          <NavItem
            label="Round results"
            active={page === 'results'}
            badge={d.disputes.length}
            badgeTone="warn"
            onClick={() => setPage('results')}
          />
          <NavItem
            label="Players"
            active={page === 'players'}
            badge={d.waiting.length + d.leavingNow.length}
            badgeTone="warn"
            onClick={() => setPage('players')}
          />
          <NavItem
            label={d.pairRound ? `Round ${d.pairRound} pairings` : 'Pairings'}
            active={page === 'pairings'}
            onClick={() => setPage('pairings')}
          />
          <NavItem label="Standings" active={page === 'standings'} onClick={() => setPage('standings')} />
          <NavItem label="Rules and glossary" active={page === 'rules'} onClick={() => setPage('rules')} />
          <div className="sidenav-foot">
            <p className="muted small">
              Pairwise Club is free software for volunteer-run chess clubs. Changes are kept in this browser
              tab only until you discard them.
            </p>
          </div>
        </nav>

        <main className="main">
          {page === 'overview' && <Overview state={state} d={d} dispatch={dispatch} nav={nav} />}
          {page === 'results' && <ResultsPage state={state} dispatch={dispatch} nav={nav} />}
          {page === 'players' && <PlayersPage state={state} nav={nav} />}
          {page === 'pairings' && <PairingsPage state={state} d={d} dispatch={dispatch} nav={nav} />}
          {page === 'standings' && <StandingsPage state={state} />}
          {page === 'rules' && <RulesPage />}
        </main>
      </div>

      {dialog?.kind === 'correct' && (
        <CorrectResultDialog state={state} gameId={dialog.gameId} dispatch={dispatch} onClose={closeDialog} />
      )}
      {dialog?.kind === 'late' && (
        <LateEntryDialog state={state} playerId={dialog.playerId} dispatch={dispatch} onClose={closeDialog} />
      )}
      {dialog?.kind === 'withdraw' && (
        <WithdrawDialog state={state} playerId={dialog.playerId} dispatch={dispatch} onClose={closeDialog} />
      )}
      {dialog?.kind === 'post' && (
        <PostDialog
          state={state}
          round={dialog.round}
          dispatch={dispatch}
          onClose={closeDialog}
          onPosted={() => {
            closeDialog();
            setPage('pairings');
          }}
        />
      )}
      {dialog?.kind === 'discard' && (
        <Modal
          title="Discard today’s changes?"
          subtitle="Go back to the event as it was before anything was changed today."
          onClose={closeDialog}
          footer={
            <>
              <Button onClick={closeDialog}>Keep changes</Button>
              <Button
                variant="danger"
                onClick={() => {
                  dispatch({ type: 'reset' });
                  setPage('overview');
                  closeDialog();
                }}
              >
                Discard {changesToday} change{changesToday === 1 ? '' : 's'}
              </Button>
            </>
          }
        >
          <p>
            Every result correction, late entry and withdrawal made in this session is removed. Nothing has been
            posted to the hall, so nobody outside this laptop has seen any of it.
          </p>
        </Modal>
      )}
    </div>
  );
}

function NavItem({
  label,
  active,
  badge,
  badgeTone = 'neutral',
  onClick,
}: {
  label: string;
  active: boolean;
  badge?: number;
  badgeTone?: 'neutral' | 'warn';
  onClick: () => void;
}) {
  return (
    <button type="button" className={`navitem ${active ? 'navitem-on' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
      <span>{label}</span>
      {badge !== undefined && badge > 0 && <span className={`navbadge navbadge-${badgeTone}`}>{badge}</span>}
    </button>
  );
}

function PostDialog({
  state,
  round,
  dispatch,
  onClose,
  onPosted,
}: {
  state: EventState;
  round: number;
  dispatch: Dispatch<Action>;
  onClose: () => void;
  onPosted: () => void;
}) {
  const d = derive(state);
  const preview = d.preview!;
  const post = () => {
    dispatch({ type: 'postRound', round, at: nowStamp() });
    onPosted();
  };
  return (
    <Modal
      title={`Post round ${round} pairings?`}
      subtitle="Once posted, these boards are fixed and go on the hall board."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Not yet</Button>
          <Button variant="primary" onClick={post} disabled={!d.canPost}>
            Post round {round}
          </Button>
        </>
      }
    >
      <ul className="bullets">
        <li>
          <strong>{preview.boards.length} boards</strong>
          {preview.bye ? ` and one bye.` : ', no bye.'}
        </li>
        <li>Results can still be entered after posting. Changing a result later does not re-pair anyone.</li>
        <li>Withdrawals after posting need the directors to handle that player’s board by hand.</li>
      </ul>
    </Modal>
  );
}
