import type { BBox } from '@/lib/data';

export interface Shot { screenshot: string | null; lfs?: boolean; width?: number; height?: number; title: string }

/**
 * An SVG crop of a full-page screenshot around `bbox`, with the box outlined.
 * Children draw on top, in screenshot coordinates.
 */
export function Crop({ shot, bbox, size = 'sm', children }: { shot: Shot; bbox: BBox | null; size?: 'sm' | 'lg'; children?: React.ReactNode }) {
  if (shot.lfs) {
    return <div className="crop crop-empty" data-size={size}>Screenshot not pulled. Run <code>git lfs pull</code></div>;
  }
  if (!shot.screenshot || !shot.width || !shot.height) return <div className="crop crop-empty" data-size={size}>No screenshot</div>;
  if (!bbox) return <div className="crop crop-empty" data-size={size}>No box</div>;
  const pad = Math.max(8, 0.06 * Math.max(bbox.width, bbox.height));
  const x = Math.max(0, bbox.x - pad);
  const y = Math.max(0, bbox.y - pad);
  const w = Math.min(shot.width, bbox.x + bbox.width + pad) - x;
  const h = Math.min(shot.height, bbox.y + bbox.height + pad) - y;
  const sw = Math.max(1.5, Math.max(w, h) / 220);
  return (
    <svg className="crop" data-size={size} viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Crop of ${shot.title}`} style={{ '--sw': sw } as React.CSSProperties}>
      <image href={shot.screenshot} width={shot.width} height={shot.height} />
      <rect className="crop-box" x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} strokeWidth={sw} />
      {children}
    </svg>
  );
}
