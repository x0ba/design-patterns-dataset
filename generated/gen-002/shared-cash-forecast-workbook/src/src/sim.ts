// Scripted colleagues: Raj and Tomás are live in the workbook; Aisha and Tomás respond to Helen's threads.
import { useCallback, useEffect, useRef } from 'react';
import { NOW_START, type Message, type Thread } from './data';
import type { Action, State } from './state';

type Dispatch = (a: Action) => void;

let msgSeq = 100;
export const newMsg = (by: string, text: string, at: Date): Message => ({ id: 'm' + ++msgSeq, by, text, at });

export function useClock() {
  const mount = useRef(Date.now());
  return useCallback(() => new Date(NOW_START.getTime() + (Date.now() - mount.current)), []);
}

export function useCollaborators(dispatch: Dispatch, stateRef: React.RefObject<State>, now: () => Date) {
  const timers = useRef<number[]>([]);
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const liveEdit = useCallback(
    (by: string, lineId: string, week: number, deltaK: number, note: string) => {
      const s = stateRef.current!;
      dispatch({ type: 'presence', who: by, p: { ...(s.presence[by] ?? { status: '' }), lineId, week } });
      dispatch({ type: 'edit', by, lineId, week, value: s.values[lineId][week] + deltaK, note, at: now(), live: true });
    },
    [dispatch, stateRef, now],
  );

  const say = useCallback(
    (threadId: string, by: string, text: string, typeMs: number, then?: () => void) => {
      later(Math.max(400, typeMs - 4000), () => dispatch({ type: 'typing', value: { threadId, by } }));
      later(typeMs, () => {
        dispatch({ type: 'message', threadId, msg: newMsg(by, text, now()) });
        then?.();
      });
    },
    [dispatch, later, now],
  );

  // background script: what Raj and Tomás do over the next few minutes
  useEffect(() => {
    const raj = 'Editing payroll — RN contract retro';
    const tom = 'Revising vendor disbursements';
    const steps: [number, () => void][] = [
      [5000, () => dispatch({ type: 'presence', who: 'tomas', p: { lineId: 'D5', week: 7, status: tom } })],
      [9000, () => dispatch({ type: 'presence', who: 'raj', p: { lineId: 'D2', week: 6, status: raj } })],
      [16000, () => liveEdit('raj', 'D2', 6, -730, 'RN contract retro (eff. 7/1) — Lakeshore share, paid 12/31')],
      [24000, () => dispatch({ type: 'presence', who: 'raj', p: { lineId: 'D4', week: 6, status: raj } })],
      [34000, () => liveEdit('tomas', 'D5', 7, -240, 'GPO tier price increase eff. 1/1')],
      [41000, () => dispatch({ type: 'presence', who: 'tomas', p: { lineId: 'D8', week: 6, status: tom } })],
      [58000, () => liveEdit('raj', 'D4', 6, -60, 'Employer FICA on retro — Lakeshore')],
      [76000, () => liveEdit('tomas', 'D8', 6, -120, 'Year-end locum tenens invoices')],
      [84000, () => dispatch({ type: 'presence', who: 'tomas', p: { lineId: 'F2', week: 4, status: 'Waiting on your answer — MRI timing' } })],
      [100000, () => dispatch({ type: 'presence', who: 'raj', p: { lineId: 'D3', week: 6, status: 'Reconciling retro to HR file' } })],
      [
        144000,
        () =>
          say('t-retro', 'raj', 'Retro is fully loaded and ties to HR\'s file: $2.33M gross across Mercy Ridge and Lakeshore, plus $180K employer taxes, all in the Dec 31 cycle. Releasing the payroll lines now.', 6000, () => {
            dispatch({ type: 'releaseLock', at: now() });
            dispatch({ type: 'presence', who: 'raj', p: null });
            dispatch({ type: 'toast', text: 'Raj released the payroll lines' });
          }),
      ],
    ];
    steps.forEach(([ms, fn]) => later(ms, fn));
    const t = timers.current;
    return () => {
      t.forEach(clearTimeout);
      timers.current = [];
    };
  }, [dispatch, later, liveEdit, say, now]);

  /** Called after Helen posts in a thread. `action` comes from quick-reply chips. */
  const onHelenPost = useCallback(
    (thread: Thread, action?: string) => {
      const s = stateRef.current!;
      const aishaIds = s.edits.filter((e) => e.by === 'aisha' && e.lineId === 'R1' && !e.note).map((e) => e.id);
      switch (thread.id) {
        case 't-aisha': {
          const answered = thread.messages.some((m) => m.by === 'aisha');
          if (!answered) {
            say(
              't-aisha', 'aisha',
              'Sorry Helen, I should have left a note. Epic\'s claim scrubber was down Fri 11/13 through Sunday after the payer-rules update, and about 1,900 Mercy Ridge commercial claims didn\'t drop until Monday. I pulled the cash out of wks 3–5 using the usual 18–21 day payment lag. It\'s delayed, not lost, but I didn\'t add it back in wks 6–8. Want me to re-spread it?',
              9000,
              () =>
                dispatch({
                  type: 'setQuickReplies', threadId: 't-aisha',
                  quickReplies: [
                    { label: 'Yes, re-spread it to wks 6–8 and add notes', action: 'aisha-respread' },
                    { label: 'Leave wks 6–8 alone, just add the notes', action: 'aisha-note' },
                  ],
                }),
            );
            return;
          }
          const respread = action === 'aisha-respread';
          dispatch({ type: 'setQuickReplies', threadId: 't-aisha', quickReplies: undefined });
          say(
            't-aisha', 'aisha',
            respread
              ? 'Done. Notes are on Monday\'s three edits and the $4.2M is back in wks 6–8. Heads up: wk 5 doesn\'t change. None of those claims will pay before Dec 18.'
              : 'Done, notes are on Monday\'s three edits. I\'ll revisit wks 6–8 once the first remits from the held batch post.',
            8000,
            () => {
              const at = now();
              dispatch({
                type: 'addNote', editIds: aishaIds, by: 'aisha', at,
                note: 'Epic claim scrubber outage 11/13–11/15 held ~1,900 Mercy Ridge commercial claims; cash delayed ~3 wks (18–21 day lag)',
              });
              if (respread) {
                const n = 'Re-spread of claims held by the Epic scrubber outage 11/13–11/15 (see thread)';
                liveEdit('aisha', 'R1', 5, 1200, n);
                later(900, () => liveEdit('aisha', 'R1', 6, 1500, n));
                later(1800, () => {
                  liveEdit('aisha', 'R1', 7, 1500, n);
                  dispatch({ type: 'presence', who: 'aisha', p: null });
                });
              }
            },
          );
          return;
        }
        case 't-mri': {
          if (action === 'mri-move') {
            dispatch({ type: 'setQuickReplies', threadId: 't-mri', quickReplies: undefined });
            say('t-mri', 'tomas', 'Moved to the Dec 31 run. My note on the cells says the amendment isn\'t countersigned yet, so Kathleen will see it. Watch wk 7: it\'s a payroll week with the retro in it.', 7000, () => {
              const n = 'Siemens MRI final milestone moved to Dec 31 run — net 45 per Oct amendment, Siemens countersignature pending';
              liveEdit('tomas', 'F2', 4, 3100, n);
              later(700, () => liveEdit('tomas', 'F2', 6, -3100, n));
              later(2000, () => {
                dispatch({ type: 'resolve', threadId: 't-mri', resolved: true });
                dispatch({ type: 'toast', text: 'Tomás moved the MRI payment to wk 7 and resolved the thread' });
              });
            });
          } else if (action === 'mri-keep') {
            dispatch({ type: 'setQuickReplies', threadId: 't-mri', quickReplies: undefined });
            say('t-mri', 'tomas', 'Works for me. Leaving it in wk 5. If Siemens countersigns before next Wednesday I\'ll move it in v13. Resolving this.', 6000, () => {
              later(1200, () => {
                dispatch({ type: 'resolve', threadId: 't-mri', resolved: true });
                dispatch({ type: 'toast', text: 'Tomás resolved “Siemens MRI final milestone”' });
              });
            });
          } else {
            say('t-mri', 'tomas', 'Got it. Just tell me which way you want it and I\'ll make the change. I\'m in the vendor lines until about 2:30.', 6000);
          }
          return;
        }
        case 't-retro': {
          if (s.payrollLock.holder === 'raj') {
            say('t-retro', 'raj', 'Almost there: Lakeshore taxes and a check on the PG register. I\'ll release payroll as soon as it ties, a couple of minutes.', 6000);
          }
          return;
        }
      }
    },
    [dispatch, later, liveEdit, say, stateRef, now],
  );

  return { onHelenPost };
}
