import React from 'react';
import { CHILDREN, OFFICES } from './data';
import { Evaluation, fmtDayLong, fmtMin, slotTimes } from './logic';
import type { Reservation } from './types';
import * as I from './icons';
import { fmtClock } from './App';

export function Header({ onNav }: { onNav: (k: string) => void }) {
  return (
    <header className="topbar">
      <div className="brand">
        <I.Logo />
        <div>
          <div className="brand-name">Countertime</div>
          <div className="brand-sub">National Passport &amp; Civil-ID Registry</div>
        </div>
      </div>
      <nav className="topnav" aria-label="Main">
        <a href="#finder" className="active" aria-current="page">Book a visit</a>
        <button onClick={() => onNav('appointments')}>My appointments</button>
        <button onClick={() => onNav('applications')}>Applications</button>
        <button onClick={() => onNav('help')}>Help &amp; documents</button>
      </nav>
      <div className="me">
        <div className="me-linked" title="Dele shares his work rota with this household">
          <span className="dot-linked" /> Household: Dele linked
        </div>
        <div className="avatar" aria-hidden>MO</div>
        <div className="me-name">Marisol Okafor</div>
      </div>
    </header>
  );
}

function slotLine(ev: Evaluation, order: [string, string] = ['ayo', 'temi']) {
  const { first, second } = slotTimes(ev.opening);
  const n = (id: string) => CHILDREN.find((c) => c.id === id)!.name;
  return `${n(order[0])} ${fmtMin(first)} · ${n(order[1])} ${fmtMin(second)}`;
}

export function StatusBanner({
  reservation,
  now,
  evals,
  onReview,
  onRelease,
  onRehold,
  onMove,
  onCancel,
}: {
  reservation: Reservation;
  now: number;
  evals: Map<string, Evaluation>;
  onReview: (id: string) => void;
  onRelease: () => void;
  onRehold: () => void;
  onMove: () => void;
  onCancel: () => void;
}) {
  if (reservation.kind === 'none') {
    return (
      <div className="banner banner-none">
        <div className="banner-inner">
          <I.Calendar size={18} />
          <div className="banner-text">
            <strong>No time held right now.</strong> Pick a family opening below — holding or booking one keeps it for you.
          </div>
        </div>
      </div>
    );
  }
  const ev = evals.get(reservation.openingId)!;
  const office = OFFICES[ev.opening.office];

  if (reservation.kind === 'hold') {
    const left = Math.max(0, reservation.expiresAt - now);
    const mm = Math.floor(left / 60);
    const ss = Math.floor(left % 60);
    const urgent = left < 180;
    return (
      <div className={`banner banner-hold ${urgent ? 'urgent' : ''}`}>
        <div className="banner-inner">
          <div className="hold-timer" aria-live="off">
            <I.Clock size={18} />
            <span className="mono">
              {mm}:{String(ss).padStart(2, '0')}
            </span>
          </div>
          <div className="banner-text">
            <div className="banner-title">
              Held for you: {office.name} · {fmtDayLong(ev.dateObj)} · {slotLine(ev)}
            </div>
            <div className="banner-sub">
              Tentative hold — released automatically at {fmtClock(reservation.expiresAt)}. Nobody else can take these two slots until then.
            </div>
            <div className="hold-bar" aria-hidden>
              <span style={{ width: `${(left / (15 * 60)) * 100}%` }} />
            </div>
          </div>
          <div className="banner-actions">
            <button className="btn btn-ghost-light" onClick={onRelease}>
              Release hold
            </button>
            <button className="btn btn-light" onClick={() => onReview(reservation.openingId)}>
              Review &amp; book this time
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (reservation.kind === 'expired') {
    return (
      <div className="banner banner-expired">
        <div className="banner-inner">
          <I.Alert size={18} />
          <div className="banner-text">
            <div className="banner-title">Your hold expired at {fmtClock(reservation.expiredAt)}.</div>
            <div className="banner-sub">
              {office.name}, {fmtDayLong(ev.dateObj)} ({slotLine(ev)}) is still open right now, but anyone can book it.
            </div>
          </div>
          <div className="banner-actions">
            <button className="btn btn-ghost" onClick={onRelease}>
              Let it go
            </button>
            <button className="btn btn-secondary" onClick={onRehold}>
              Hold again (15 min)
            </button>
            <button className="btn btn-primary" onClick={() => onReview(reservation.openingId)}>
              Book it now
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (reservation.kind === 'booked') {
    return (
      <div className="banner banner-booked">
        <div className="banner-inner">
          <span className="booked-tick">
            <I.Check size={16} />
          </span>
          <div className="banner-text">
            <div className="banner-title">
              {reservation.moved ? 'Moved & booked' : 'Booked'}: {office.name} · {fmtDayLong(ev.dateObj)} · {slotLine(ev, reservation.order)}
            </div>
            <div className="banner-sub">
              Reference <span className="mono">{reservation.ref}</span> · confirmation sent to your email and to Dele · arrive by{' '}
              {fmtMin(slotTimes(ev.opening).first - 10)}
            </div>
          </div>
          <div className="banner-actions">
            <button className="btn btn-ghost" onClick={onCancel}>
              Cancel visit
            </button>
            <button className="btn btn-secondary" onClick={onMove}>
              Move to another time
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="banner banner-none">
      <div className="banner-inner">
        <I.Calendar size={18} />
        <div className="banner-text">
          <strong>Visit {reservation.ref} cancelled.</strong> Ayo’s and Temi’s applications are saved — pick a new family time below.
        </div>
      </div>
    </div>
  );
}
