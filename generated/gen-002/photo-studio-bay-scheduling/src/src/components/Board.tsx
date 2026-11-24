import { BAYS } from '../data/mock';
import { bayBookings, bayStatus, statusOf, type Ghost, type Relocation } from '../lib/engine';
import { NOW, TURNAROUND, DAY_END, fmtRange, fmtShort, pct } from '../lib/time';
import type { Booking, KitUnit } from '../types';

interface Props {
  bookings: Booking[];
  units: KitUnit[];
  ghosts: Ghost[];
  relocs: Relocation[];
  staleIds: string[]; // bookings the previewed option moves; drawn faded under the ghost
  selectedId: string;
  onSelect: (id: string) => void;
}

const HOURS = Array.from({ length: 15 }, (_, i) => 8 + i); // 8 AM … 10 PM

const PAPER_SWATCH: Record<string, string> = {
  'Arctic White': '#f5f5f2',
  'Stone Grey': '#9ba2ac',
  'Midnight Black': '#1d2026',
  'Sage Green': '#9fb59b',
};

const KIT_GROUPS: { title: string; kind: KitUnit['kind'] }[] = [
  { title: 'Large softbox kits · 2', kind: 'softbox' },
  { title: 'Strobe kits · 3', kind: 'strobe' },
  { title: 'Backdrop paper · 4 colours', kind: 'paper' },
];

const posStyle = (start: number, end: number) => ({
  left: `${pct(start)}%`,
  width: `${pct(end) - pct(start)}%`,
});

export function Board({ bookings, units, ghosts, relocs, staleIds, selectedId, onSelect }: Props) {
  return (
    <section className="board" aria-label="Today's bays and kit reservations">
      <div className="row axis-row">
        <div className="rowlabel rowlabel-axis">Today</div>
        <div className="track axis-track">
          {HOURS.map((h) => (
            <span key={h} className="tick" style={{ left: `${pct(h * 60)}%` }}>
              {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
            </span>
          ))}
          <span className="now-tag" style={{ left: `${pct(NOW)}%` }}>
            Now {fmtShort(NOW)} PM
          </span>
        </div>
      </div>

      {BAYS.map((bay) => {
        const list = bayBookings(bookings, bay.id);
        const status = bayStatus(bookings, bay);
        return (
          <div className="row bay-row" key={bay.id}>
            <div className="rowlabel">
              <div className="bay-name">{bay.name}</div>
              <div className="bay-spec">
                {bay.surface} · {bay.sqm} m²
              </div>
              <div className={`bay-status tone-${status.tone}`}>
                <b>{status.headline}</b>
                <span>{status.sub}</span>
              </div>
            </div>

            <div className="track">
              {HOURS.slice(0, -1).map((h) => (
                <span key={h} className="hour-line" style={{ left: `${pct(h * 60)}%` }} />
              ))}

              {list.map((b) => {
                const cleanEnd = Math.min(b.end + TURNAROUND, DAY_END);
                return (
                  <div key={`clean-${b.id}`} className="clean" style={posStyle(b.end, cleanEnd)} title={`${TURNAROUND}-min clean-down after ${b.client}`}>
                    <span>clean</span>
                  </div>
                );
              })}

              {list.map((b) => {
                const st = statusOf(b);
                const moved = !!b.movedFrom;
                return (
                  <button
                    type="button"
                    key={b.id}
                    className={[
                      'blk',
                      `blk-${st}`,
                      b.id === selectedId ? 'is-selected' : '',
                      staleIds.includes(b.id) ? 'is-stale' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={posStyle(b.start, b.end)}
                    onClick={() => onSelect(b.id)}
                    title={`${b.client} · ${fmtRange(b.start, b.end)}`}
                  >
                    <span className="blk-name">{b.client}</span>
                    <span className="blk-time">
                      {fmtRange(b.start, b.end)}
                      {moved ? ` · moved from ${BAYS.find((x) => x.id === b.movedFrom)!.name}` : ''}
                    </span>
                    <span className="blk-meta">
                      {b.offered ? 'Offered · awaiting yes' : `${b.crew} crew · ${b.deposit === 'Paid' ? 'deposit paid' : 'deposit pending'}`}
                    </span>
                  </button>
                );
              })}

              {ghosts
                .filter((g) => g.bayId === bay.id)
                .map((g, i) => (
                  <div key={`ghost-${i}`} className={`ghost ${g.ok ? 'ghost-ok' : 'ghost-bad'}`} style={posStyle(g.start, g.end)}>
                    <span>{g.label}</span>
                    <em>{fmtRange(g.start, g.end)}</em>
                  </div>
                ))}

              <div className="now-line" style={{ left: `${pct(NOW)}%` }} />
            </div>
          </div>
        );
      })}

      <div className="kit-head">
        <span>Kit reservations · 9 today</span>
      </div>

      {KIT_GROUPS.map((group) => (
        <div key={group.kind} className="kit-group">
          <div className="kit-group-title">{group.title}</div>
          {units
            .filter((u) => u.kind === group.kind)
            .map((u) => {
              const uses = bookings.filter((b) => b.kit.includes(u.id)).sort((a, b) => a.start - b.start);
              const reloc = relocs.find((r) => r.unitId === u.id);
              const storedBay = u.homeBay ? BAYS.find((x) => x.id === u.homeBay)!.name : null;
              return (
                <div className="row kit-row" key={u.id}>
                  <div className="rowlabel rowlabel-kit">
                    <div className="kit-id">
                      {u.kind === 'paper' && (
                        <span className="swatch" style={{ background: PAPER_SWATCH[u.label] }} aria-hidden="true" />
                      )}
                      <b>{u.label}</b>
                      <span className="kit-note">
                        {u.kind === 'softbox'
                          ? reloc
                            ? `→ ${BAYS.find((x) => x.id === reloc.to)!.name} by ${fmtShort(reloc.byTime)}`
                            : `stored ${storedBay}`
                          : u.kind === 'strobe'
                            ? 'portable'
                            : ''}
                      </span>
                    </div>
                  </div>
                  <div className="track kit-track">
                    {HOURS.slice(0, -1).map((h) => (
                      <span key={h} className="hour-line" style={{ left: `${pct(h * 60)}%` }} />
                    ))}
                    {uses.map((b) => {
                      const st = statusOf(b);
                      return (
                        <button
                          type="button"
                          key={`${u.id}-${b.id}`}
                          className={[
                            'kblk',
                            `kblk-${st}`,
                            b.id === selectedId ? 'is-selected' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          style={posStyle(b.start, b.end)}
                          onClick={() => onSelect(b.id)}
                          title={`${u.name} · ${b.client} · ${fmtRange(b.start, b.end)}`}
                        >
                          {b.client}
                        </button>
                      );
                    })}
                    <div className="now-line" style={{ left: `${pct(NOW)}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      ))}
    </section>
  );
}
