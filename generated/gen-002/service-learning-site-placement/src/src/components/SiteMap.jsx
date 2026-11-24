import { SITES } from '../data/sites.js';
import { NEIGHBORHOODS, LINES, STATIONS, CAMPUS } from '../data/network.js';

// SVG coordinates are kilometres east (x) and north (-y), so north is up.
const VIEW = { x: -7, y: -8.8, w: 14, h: 15 };

const px = (x, y) => [x, -y];

export default function SiteMap({
  markers = {},
  origin = null,
  selectedSiteId = null,
  onSelectSite,
  full = false,
  caption,
}) {
  const siteNumber = Object.fromEntries(SITES.map((s, i) => [s.id, i + 1]));

  return (
    <figure className={`sitemap-wrap${full ? ' full' : ''}`}>
      <svg
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        className="sitemap"
        role="img"
        aria-label="Schematic map of partner sites, bus routes, Blue Line stations, and the campus"
      >
        <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} className="map-bg" />

        {LINES.map((line) => (
          <polyline
            key={line.id}
            className={`line ${line.kind}`}
            points={line.points.map(([x, y]) => px(x, y).join(',')).join(' ')}
          />
        ))}

        {full &&
          LINES.filter((l) => l.kind === 'bus').map((line) => {
            const [x, y] = px(...line.points[1]);
            return (
              <text key={`lbl-${line.id}`} x={x + 0.12} y={y - 0.12} className="route-label">
                {line.id}
              </text>
            );
          })}

        {full &&
          NEIGHBORHOODS.map((n) => (
            <text key={n.id} x={n.x} y={-n.y - 0.55} textAnchor="middle" className="nb-label">
              {n.id}
            </text>
          ))}

        {STATIONS.map((s) => (
          <circle
            key={s.name}
            cx={s.x}
            cy={-s.y}
            r={s.extension ? 0.16 : 0.13}
            className={`station${s.extension ? ' ext' : ''}`}
          >
            <title>{s.name}{s.extension ? ' (opened Sep 2026)' : ''}</title>
          </circle>
        ))}



        <g>
          <rect
            x={CAMPUS.x - 0.2}
            y={-CAMPUS.y - 0.2}
            width={0.4}
            height={0.4}
            className="campus"
            transform={`rotate(45 ${CAMPUS.x} ${-CAMPUS.y})`}
          >
            <title>{CAMPUS.name}</title>
          </rect>
          {full && (
            <text x={CAMPUS.x - 0.32} y={-CAMPUS.y + 0.62} textAnchor="end" className="campus-label">
              Campus
            </text>
          )}
        </g>

        {SITES.map((site) => {
          const m = markers[site.id] ?? {};
          const selected = site.id === selectedSiteId;
          const r = (m.r ?? (full ? 0.3 : 0.26)) + (selected ? 0.1 : 0);
          return (
            <g
              key={site.id}
              className={`site-marker${selected ? ' selected' : ''}${onSelectSite ? ' clickable' : ''}`}
              onClick={onSelectSite ? () => onSelectSite(site.id) : undefined}
              role={onSelectSite ? 'button' : undefined}
              tabIndex={onSelectSite ? 0 : undefined}
              onKeyDown={
                onSelectSite
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectSite(site.id);
                      }
                    }
                  : undefined
              }
              aria-label={site.name}
            >
              <circle cx={site.x} cy={-site.y} r={r} fill={m.fill ?? '#94a3b8'} className="site-dot">
                <title>{`${site.name} · ${site.neighborhood}`}</title>
              </circle>
              {full && (
                <text x={site.x} y={-site.y + 0.1} className="site-num" textAnchor="middle">
                  {siteNumber[site.id]}
                </text>
              )}
            </g>
          );
        })}

        {origin && (
          <g className="origin">
            {(() => {
              const [x, y] = px(origin.x, origin.y);
              const d = 0.24;
              return (
                <>
                  <polygon points={`${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`} />
                  <text x={x + 0.34} y={y + 0.1}>{origin.id}</text>
                </>
              );
            })()}
          </g>
        )}
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
