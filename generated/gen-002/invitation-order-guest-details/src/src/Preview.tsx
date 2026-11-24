import { useMemo } from 'react';
import type { EventState, Guest } from './data';
import { addressLines, fmtFull, fmtLong, fmtTime, parseISO, parseLoose, eventIssues } from './logic';

// ---- botanical arch (deterministic) ----
function useArt() {
  return useMemo(() => {
    const R = 86, CX = 110, CY = 124, H = 170;
    const L = H + Math.PI * R + H;
    const at = (t: number) => {
      const d = t * L;
      if (d < H) return { x: CX - R, y: CY + H - d, a: -90 };
      if (d < H + Math.PI * R) {
        const th = Math.PI - (d - H) / R;
        return { x: CX + R * Math.cos(th), y: CY - R * Math.sin(th), a: (Math.atan2(Math.cos(th), Math.sin(th)) * 180) / Math.PI };
      }
      return { x: CX + R, y: CY + (d - H - Math.PI * R), a: 90 };
    };
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const greens = ['#7C9A86', '#8FAE98', '#6A8C77', '#A7BFAE'];
    const leaves: { x: number; y: number; r: number; l: number; c: string }[] = [];
    const flowers: { x: number; y: number; s: number; c: string }[] = [];
    // heavier garland at lower-left and top-right
    const weight = (t: number) => 0.25 + 0.75 * Math.max(Math.exp(-Math.pow((t - 0.04) / 0.16, 2)), Math.exp(-Math.pow((t - 0.62) / 0.14, 2)));
    for (let i = 0; i < 150; i++) {
      const t = rnd();
      if (rnd() > weight(t)) continue;
      const p = at(t);
      const side = rnd() > 0.5 ? 1 : -1;
      const spread = (rnd() * 12 + 2) * side;
      const rad = (p.a * Math.PI) / 180;
      const nx = -Math.sin(rad), ny = Math.cos(rad);
      leaves.push({
        x: p.x + nx * spread, y: p.y + ny * spread,
        r: p.a + side * (28 + rnd() * 34), l: 5 + rnd() * 5, c: greens[Math.floor(rnd() * greens.length)],
      });
    }
    for (const t of [0.03, 0.09, 0.15, 0.55, 0.61, 0.67]) {
      const p = at(t);
      flowers.push({ x: p.x + (rnd() - 0.5) * 10, y: p.y + (rnd() - 0.5) * 10, s: 3.4 + rnd() * 1.6, c: rnd() > 0.5 ? '#E8BFB4' : '#F1D5CC' });
    }
    return { leaves, flowers, d: `M ${CX - R} ${CY + H} V ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY} V ${CY + H}` };
  }, []);
}

function Arch() {
  const art = useArt();
  return (
    <svg className="arch" viewBox="0 0 220 308" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <path d={art.d} fill="none" stroke="#9DB4A3" strokeWidth="0.9" />
      <path d={art.d} fill="none" stroke="#C9D8CD" strokeWidth="0.5" transform="translate(0 0) scale(1)" strokeDasharray="1 3" />
      {art.leaves.map((l, i) => (
        <ellipse key={i} cx={l.x} cy={l.y} rx={l.l} ry={l.l * 0.38} fill={l.c} opacity="0.9" transform={`rotate(${l.r} ${l.x} ${l.y})`} />
      ))}
      {art.flowers.map((f, i) => (
        <g key={i}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={f.x + Math.cos((a * Math.PI) / 180) * f.s * 0.8} cy={f.y + Math.sin((a * Math.PI) / 180) * f.s * 0.8} r={f.s * 0.7} fill={f.c} />
          ))}
          <circle cx={f.x} cy={f.y} r={f.s * 0.45} fill="#D9A79A" />
        </g>
      ))}
    </svg>
  );
}

const splitNames = (n: string) => {
  const parts = n.split(/\s+&\s+|\s+and\s+/i);
  return parts.length === 2 ? parts : [n];
};

export function InvitationCard({ e, size }: { e: EventState; size: number }) {
  const d = parseISO(e.date);
  const [a, b] = splitNames(e.names);
  return (
    <div className="card invite" style={{ fontSize: size }} role="img" aria-label={`Invitation preview: ${e.names}`}>
      <Arch />
      <div className="invite-text">
        <p className="host">{e.host}</p>
        <p className="lead">invite you to celebrate the marriage of</p>
        <h3 className="names">
          <span>{a || ' '}</span>
          {b && <><em className="amp">&amp;</em><span>{b}</span></>}
        </h3>
        <p className="date">{d ? fmtFull(d).replace(',', '') : 'Date'}</p>
        <div className="rule" />
        <p className="evt"><strong>Ceremony</strong> {fmtTime(e.ceremonyTime)}</p>
        <p className="venue">{e.ceremonyVenue}</p>
        <p className="addr">{e.ceremonyAddress}</p>
        <p className="evt second"><strong>Reception</strong> {fmtTime(e.receptionTime)}</p>
        <p className="venue">{e.receptionVenue}</p>
        <p className="web">{e.website}</p>
      </div>
    </div>
  );
}

export function RsvpCard({ e, size }: { e: EventState; size: number }) {
  const bad = eventIssues(e).some((i) => i.field === 'rsvpBy');
  const parsed = parseLoose(e.rsvpBy);
  const text = parsed ? fmtLong(parsed) : e.rsvpBy || 'Date';
  return (
    <div className="card rsvp" style={{ fontSize: size }} role="img" aria-label={`RSVP card preview, reply by ${text}`}>
      <p className="r-kicker">The favor of a reply is requested by</p>
      <p className={'r-date' + (bad ? ' bad' : '')}>{text}</p>
      {bad && <p className="r-flag">This date needs fixing</p>}
      <div className="r-line"><span>Name(s)</span></div>
      <div className="r-boxes">
        <span><i /> Joyfully accepts</span>
        <span><i /> Regretfully declines</span>
      </div>
      <div className="r-line short"><span>Number attending</span></div>
      <p className="r-web">{e.website}</p>
    </div>
  );
}

export function Envelope({ g, e, size }: { g: Guest | undefined; e: EventState; size: number }) {
  const lines = g ? addressLines(g) : [];
  return (
    <div className="card envelope" style={{ fontSize: size }} role="img" aria-label="Envelope preview">
      <svg className="flap" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0 L50 36 L100 0" fill="none" stroke="#D8CFBD" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="ret">
        <span>{e.returnName}</span>
        <span>{e.returnLine1}</span>
        <span>{e.returnCity}</span>
      </div>
      <div className="stamp" aria-hidden="true">Stamp</div>
      <div className="to">
        {g ? lines.map((l, i) => <span key={i} className={i === 0 ? 'to-name' : ''}>{l}</span>) : <span className="muted">Select a guest to preview their envelope</span>}
      </div>
    </div>
  );
}
