import React from 'react';
import { ChildId, HOLD_EXPIRES, HOLD_ID, INITIAL_COMPARE_ID, NOW_AT_LOAD, OFFICES, OPENINGS } from './data';
import { Attendance, evaluate, Evaluation, fmtShort, parse, timeRange } from './logic';
import type { FlowState, ProcChoice, Reservation } from './types';
import { Header, StatusBanner } from './Banner';
import { PlanPanel } from './PlanPanel';
import { Finder } from './Finder';
import { Compare } from './Compare';
import { BookingFlow, CancelDialog, DeleMessage, ReleaseDialog } from './Modals';

const LOAD_REAL = Date.now();
const LOAD_MOCK = NOW_AT_LOAD.h * 3600 + NOW_AT_LOAD.m * 60 + NOW_AT_LOAD.s;
export const mockNow = () => LOAD_MOCK + (Date.now() - LOAD_REAL) / 1000;
export const fmtClock = (sec: number) => {
  const h = Math.floor(sec / 3600) % 24;
  const m = Math.floor((sec % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
};

function useTick() {
  const [now, setNow] = React.useState(mockNow());
  React.useEffect(() => {
    const t = setInterval(() => setNow(mockNow()), 500);
    return () => clearInterval(t);
  }, []);
  return now;
}

export interface Toast {
  id: number;
  text: string;
}

export default function App() {
  const now = useTick();
  const [attendance, setAttendance] = React.useState<Attendance>('both');
  const [reservation, setReservation] = React.useState<Reservation>({
    kind: 'hold',
    openingId: HOLD_ID,
    expiresAt: HOLD_EXPIRES.h * 3600 + HOLD_EXPIRES.m * 60 + HOLD_EXPIRES.s,
  });
  const [aId, setAId] = React.useState<string>(HOLD_ID);
  const [bId, setBId] = React.useState<string | null>(INITIAL_COMPARE_ID);
  const [flow, setFlow] = React.useState<FlowState>(null);
  const [showMsg, setShowMsg] = React.useState(false);
  const [showCancel, setShowCancel] = React.useState(false);
  const [showRelease, setShowRelease] = React.useState(false);
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [flashId, setFlashId] = React.useState<string | null>(null);

  const toast = React.useCallback((text: string) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  // Hold expiry
  React.useEffect(() => {
    if (reservation.kind === 'hold' && now >= reservation.expiresAt) {
      setReservation({ kind: 'expired', openingId: reservation.openingId, expiredAt: reservation.expiresAt });
    }
  }, [now, reservation]);

  const evals = React.useMemo(() => {
    const m = new Map<string, Evaluation>();
    OPENINGS.forEach((o) => m.set(o.id, evaluate(o, attendance)));
    return m;
  }, [attendance]);

  const reservedId = reservation.kind === 'hold' || reservation.kind === 'booked' ? reservation.openingId : null;

  const select = (id: string) => {
    if (id === aId) {
      setFlashId(id);
      setTimeout(() => setFlashId(null), 900);
      return;
    }
    setBId(id);
  };

  const pinB = () => {
    if (!bId) return;
    const prevA = aId;
    setAId(bId);
    setBId(prevA === reservedId ? null : prevA);
  };

  const startBooking = (openingId: string) => {
    setFlow({ openingId, mode: reservation.kind === 'booked' ? 'move' : 'book' });
  };

  const confirmBooking = (openingId: string, processing: ProcChoice, order: [ChildId, ChildId]) => {
    const prev = reservation;
    const ref = prev.kind === 'booked' ? prev.ref : 'CT-4K7-2M9Q';
    setReservation({ kind: 'booked', openingId, ref, processing, order, moved: prev.kind === 'booked' });
    setAId(openingId);
    setBId(null);
  };

  const release = () => {
    if (reservation.kind !== 'hold' && reservation.kind !== 'expired') return;
    const o = OPENINGS.find((x) => x.id === reservation.openingId)!;
    setReservation({ kind: 'none', releasedId: reservation.openingId });
    setShowRelease(false);
    toast(`Hold released. ${fmtShort(parse(o.date))} ${timeRange(o)} is open to others again.`);
  };

  const rehold = () => {
    if (reservation.kind !== 'expired') return;
    setReservation({ kind: 'hold', openingId: reservation.openingId, expiresAt: mockNow() + 15 * 60 });
    toast('Held again for 15 minutes.');
  };

  const holdThis = (id: string) => {
    if (reservation.kind === 'booked') return;
    setReservation({ kind: 'hold', openingId: id, expiresAt: mockNow() + 15 * 60 });
    if (aId !== id) {
      setBId(aId);
      setAId(id);
    }
    const o = OPENINGS.find((x) => x.id === id)!;
    toast(`Held ${fmtShort(parse(o.date))}, ${timeRange(o)} at ${OFFICES[o.office].name} for 15 minutes.`);
  };

  const cancel = () => {
    if (reservation.kind !== 'booked') return;
    setReservation({ kind: 'cancelled', openingId: reservation.openingId, ref: reservation.ref });
    setShowCancel(false);
    toast('Visit cancelled. A cancellation receipt was emailed to you.');
  };

  return (
    <div className="app">
      <Header
        onNav={(k) => {
          if (k === 'appointments')
            toast(
              reservation.kind === 'booked'
                ? `1 upcoming visit: ${fmtShort(parse(OPENINGS.find((o) => o.id === reservation.openingId)!.date))} (${reservation.ref}).`
                : 'No booked visits yet. Your Northgate hold isn’t a booking until you confirm it.',
            );
          else if (k === 'applications') toast('Ayo (PA-26-118 40Q) and Temi (PA-26-118 41R): forms complete, waiting for the in-person visit.');
          else toast('Photo rules, consent form PC-3 and the document checklist are in the booking steps.');
        }}
      />
      <StatusBanner
        reservation={reservation}
        now={now}
        evals={evals}
        onReview={(id) => startBooking(id)}
        onRelease={() => setShowRelease(true)}
        onRehold={rehold}
        onMove={() => {
          document.getElementById('finder')?.scrollIntoView({ behavior: 'smooth' });
          toast('Pick a new time. Your current visit stays booked until you confirm the new one.');
        }}
        onCancel={() => setShowCancel(true)}
      />
      <main className="layout">
        <aside className="rail rail-left" aria-label="Your plan">
          <PlanPanel attendance={attendance} setAttendance={setAttendance} toast={toast} />
        </aside>
        <section className="center" id="finder" aria-label="Find a time">
          <Finder
            evals={evals}
            reservation={reservation}
            aId={aId}
            bId={bId}
            flashId={flashId}
            onSelect={select}
            attendance={attendance}
          />
        </section>
        <aside className="rail rail-right" aria-label="Compare">
          <Compare
            evals={evals}
            aId={aId}
            bId={bId}
            reservation={reservation}
            attendance={attendance}
            now={now}
            onBook={startBooking}
            onHold={holdThis}
            onPin={pinB}
            onClearB={() => setBId(null)}
            onMessage={() => setShowMsg(true)}
          />
        </aside>
      </main>

      {flow && (
        <BookingFlow
          flow={flow}
          ev={evals.get(flow.openingId)!}
          attendance={attendance}
          reservation={reservation}
          onClose={() => setFlow(null)}
          onConfirm={confirmBooking}
          onMessage={() => {
            setFlow(null);
            setShowMsg(true);
          }}
          toast={toast}
        />
      )}
      {showMsg && (
        <DeleMessage
          a={evals.get(aId)!}
          b={bId ? evals.get(bId)! : null}
          reservation={reservation}
          attendance={attendance}
          onClose={() => setShowMsg(false)}
          toast={toast}
        />
      )}
      {showCancel && reservation.kind === 'booked' && (
        <CancelDialog ev={evals.get(reservation.openingId)!} onClose={() => setShowCancel(false)} onCancel={cancel} />
      )}
      {showRelease && (reservation.kind === 'hold' || reservation.kind === 'expired') && (
        <ReleaseDialog ev={evals.get(reservation.openingId)!} onClose={() => setShowRelease(false)} onRelease={release} />
      )}

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
