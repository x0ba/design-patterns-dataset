import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { FLOOR, WEEKS, person, type Thread } from './data';
import { balances, breachWeeks, delta, fmtM, fmtMoneyK, fmtWhen, fmtTime, sum, unexplained, weekRange } from './model';
import { initialState, reducer } from './state';
import { newMsg, useClock, useCollaborators } from './sim';
import { AppCtx, type Check, type Ctx } from './ctx';
import { TopBar } from './components/TopBar';
import { Summary } from './components/Summary';
import { GridView } from './components/Grid';
import { Panel } from './components/Panel';
import { LockPopover } from './components/LockPopover';
import { SignoffModal } from './components/SignoffModal';
import { Toast } from './components/Toast';

export default function App() {
  const [s, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(s);
  stateRef.current = s;
  const now = useClock();
  const { onHelenPost } = useCollaborators(dispatch, stateRef, now);
  const [lockOpen, setLockOpen] = useState(false);
  const [signoffOpen, setSignoffOpen] = useState(false);

  const bal = useMemo(() => balances(s.values), [s.values]);

  const post = useCallback(
    (thread: Thread, text: string, action?: string) => {
      if (!text.trim()) return;
      dispatch({ type: 'message', threadId: thread.id, msg: newMsg('helen', text.trim(), now()) });
      dispatch({ type: 'draft', threadId: thread.id, text: '' });
      onHelenPost(thread, action);
    },
    [now, onHelenPost],
  );

  const askEditor = useCallback(
    (by: string) => {
      const st = stateRef.current;
      const id = by === 'aisha' ? 't-aisha' : 't-ask-' + by;
      if (st.threads.some((t) => t.id === id)) {
        dispatch({ type: 'openThread', id });
        return;
      }
      const eds = unexplained(st.edits).filter((e) => e.by === by);
      if (!eds.length) return;
      const p = person[by];
      const tot = sum(eds.map(delta));
      const first = eds[0];
      const wk = weekRange(eds.map((e) => e.week));
      const end5 = balances(st.values).end[4];
      const thread: Thread = {
        id,
        anchor: { kind: 'cell', lineId: first.lineId, week: Math.min(...eds.map((e) => e.week)) },
        title: `${fmtWhen(first.at, now())} change to ${by === 'aisha' ? 'Mercy Ridge collections' : 'line'}, no note`,
        status: 'open',
        messages: [],
      };
      dispatch({ type: 'createThread', thread });
      dispatch({
        type: 'draft', threadId: id,
        text: `@${p.first}, your ${fmtWhen(first.at, now()).replace('Today ', '')} edit took ${fmtMoneyK(Math.abs(tot))} out of Mercy Ridge patient collections in ${wk} with no note. That puts wk 5 at ${fmtM(end5)} against the $25.0M floor. What's driving it, and is the cash delayed or gone for good? I need it before the 3:00 lock.`,
      });
    },
    [now],
  );

  // ---- pre-lock checklist ----
  const checks: Check[] = useMemo(() => {
    const out: Check[] = [];
    const br = breachWeeks(bal.end);
    const low = Math.min(...bal.end);
    const lowW = bal.end.indexOf(low);
    if (!br.length) {
      out.push({ id: 'floor', level: 'ok', title: 'No week below the $25.0M floor', detail: `low ${fmtM(low)} in wk ${lowW + 1}`, actions: [] });
    } else {
      const worst = br.reduce((a, w) => (bal.end[w] < bal.end[a] ? w : a), br[0]);
      const t = br.length === 1
        ? `Wk ${br[0] + 1} at ${fmtM(bal.end[br[0]])}, ${fmtM(FLOOR - bal.end[br[0]])} under floor`
        : `Wks ${br.map((w) => w + 1).join(', ')} under the floor (low ${fmtM(bal.end[worst])})`;
      out.push({
        id: 'floor',
        level: s.floorNote.trim() ? 'warn' : 'block',
        title: t,
        detail: s.floorNote.trim() ? 'mitigation note written' : 'Kathleen needs cause + mitigation',
        actions: [
          { label: 'What moved it', run: () => dispatch({ type: 'select', sel: { kind: 'balance', week: worst }, tab: 'inspector' }) },
          ...(s.floorNote.trim() ? [] : [{ label: 'Write mitigation', run: () => dispatch({ type: 'focusMitigation' }) }]),
        ],
      });
    }
    const un = unexplained(s.edits);
    if (un.length) {
      const by = un[0].by;
      const mine = un.filter((e) => e.by === by);
      const asked = s.threads.find((t) => t.id === (by === 'aisha' ? 't-aisha' : 't-ask-' + by));
      const askedAt = asked?.messages.find((m) => m.by === 'helen')?.at;
      out.push({
        id: 'notes',
        level: 'block',
        title: `${un.length} edit${un.length > 1 ? 's' : ''}, no note: ${fmtMoneyK(sum(un.map(delta)), true)} ${by === 'aisha' ? 'Mercy Ridge collections' : ''}`,
        detail: askedAt
          ? `asked ${person[by].first} at ${fmtTime(askedAt)}`
          : `${person[by].name}, ${fmtWhen(mine[0].at, now())}, ${weekRange(mine.map((e) => e.week))}`,
        actions: [
          { label: asked ? 'Open thread' : `Ask ${person[by].first}`, run: () => askEditor(by) },
          { label: 'Show edits', run: () => dispatch({ type: 'select', sel: { kind: 'cell', lineId: un[0].lineId, week: un[0].week }, tab: 'inspector' }) },
        ],
      });
    } else {
      out.push({ id: 'notes', level: 'ok', title: 'Every change over $500K has a note', actions: [] });
    }
    const mri = s.threads.find((t) => t.id === 't-mri')!;
    const tomasAnswered = mri.messages.some((m) => m.by === 'helen');
    out.push({
      id: 'mri',
      level: mri.status === 'resolved' ? 'ok' : 'block',
      title: mri.status === 'resolved' ? 'MRI payment timing decided' : 'Tomás needs an answer: MRI final payment timing',
      detail: mri.status === 'resolved' ? undefined : tomasAnswered ? 'answered, resolve the thread to clear' : '$3.1M Siemens, wk 5 or wk 7',
      actions: mri.status === 'resolved' ? [] : [{ label: 'Open thread', run: () => dispatch({ type: 'openThread', id: 't-mri' }) }],
    });
    const lk = s.payrollLock;
    out.push(
      lk.holder
        ? {
            id: 'lock', level: 'block',
            title: `${person[lk.holder].first} is still in the payroll lines`,
            detail: `locked since ${fmtTime(lk.since)}${lk.hold ? `, held until ${person[lk.holder].first} releases` : ''}`,
            actions: [{ label: 'Lock details', run: () => setLockOpen(true) }],
          }
        : { id: 'lock', level: 'ok', title: 'Payroll lines released', detail: lk.releasedAt ? `by Raj at ${fmtTime(lk.releasedAt)}` : undefined, actions: [] },
    );
    const other = s.threads.filter((t) => t.status === 'open' && t.id !== 't-mri');
    if (other.length)
      out.push({
        id: 'threads', level: 'info',
        title: `${other.length} other open thread${other.length > 1 ? 's' : ''}`,
        detail: 'not blocking',
        actions: [{ label: 'View', run: () => dispatch({ type: 'openThread', id: null }) }, ],
      });
    return out;
  }, [bal, s.edits, s.threads, s.payrollLock, s.floorNote, askEditor, now]);

  // auto-dismiss toasts
  useEffect(() => {
    if (!s.toast) return;
    const t = setTimeout(() => dispatch({ type: 'toast', text: null }), 3800);
    return () => clearTimeout(t);
  }, [s.toast]);

  const ctx: Ctx = {
    s, dispatch, now, bal, checks, post, askEditor,
    openLock: () => setLockOpen(true),
    openSignoff: () => setSignoffOpen(true),
  };

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app" data-weeks={WEEKS.length}>
        <TopBar />
        <div className="body">
          <main className="main">
            <Summary />
            <GridView />
          </main>
          <Panel />
        </div>
        {lockOpen && <LockPopover onClose={() => setLockOpen(false)} />}
        {signoffOpen && <SignoffModal onClose={() => setSignoffOpen(false)} />}
        <Toast />
      </div>
    </AppCtx.Provider>
  );
}
