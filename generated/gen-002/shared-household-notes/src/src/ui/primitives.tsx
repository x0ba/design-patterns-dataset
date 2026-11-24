import type { CSSProperties } from 'react';
import type { CommentAnchor, PersonId, Task } from '../types';
import { useApp, type AppCtx } from '../state/context';
import { SECTION_META } from '../constants';

const PATHS: Record<string, string> = {
  comment: 'M4 5h16v11H9l-5 4z',
  history: 'M3 12a9 9 0 1 0 2.6-6.4L3 8M3 3v5h5M12 7v5l3 2',
  share: 'M12 15V3M7 8l5-5 5 5M5 13v7h14v-7',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  restore: 'M3 12a9 9 0 1 0 2.6-6.4L3 8M3 3v5h5',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  chevron: 'M6 9l6 6 6-6',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 4l9 16H3zM12 10v4M12 17.5v.5',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
};

export function Icon({ name, size = 16, className }: { name: keyof typeof PATHS | 'dots'; size?: number; className?: string }) {
  if (name === 'dots') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="5" cy="12" r="1.8" fill="currentColor" />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" />
        <circle cx="19" cy="12" r="1.8" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Avatar({ id, size = 24, ring = false, title }: { id: PersonId; size?: number; ring?: boolean; title?: string }) {
  const { s } = useApp();
  const p = s.people[id];
  if (!p) return null;
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.38),
    background: `hsl(${p.hue} 50% 42%)`,
  };
  return (
    <span className={`avatar${ring ? ' ring' : ''}${p.landlord ? ' landlord' : ''}`} style={style} title={title ?? p.name}>
      {p.initials}
    </span>
  );
}

// Human-readable label for where a comment is attached.
export function anchorLabel(ctx: AppCtx, anchor: CommentAnchor): string {
  const section = SECTION_META[anchor.section].title;
  if (!anchor.itemId) return section;
  return `${section} · ${itemTitle(ctx, anchor.itemId)}`;
}

export function itemTitle(ctx: AppCtx, id: string): string {
  const { s } = ctx;
  const task: Task | undefined = [...s.cleaning, ...s.utilities].find((t) => t.id === id);
  if (task) return task.title;
  const f = s.furniture.find((x) => x.id === id);
  if (f) return f.name;
  const d = s.deposit.find((x) => x.id === id);
  if (d) return d.text;
  const trashed = s.trash.find((x) => x.item.id === id);
  if (trashed) return trashed.item.title;
  return 'Deleted item';
}

export function CommentButton({ anchor }: { anchor: CommentAnchor }) {
  const ctx = useApp();
  const count = ctx.s.threads.filter((t) => !t.resolved && t.anchor.section === anchor.section && t.anchor.itemId === anchor.itemId).length;
  return (
    <button
      type="button"
      className={`iconBtn commentBtn${count ? ' has' : ''}`}
      title={count ? `${count} open comment${count === 1 ? '' : 's'}` : 'Comment'}
      onClick={() => ctx.setUi({ rightTab: 'comments', composer: anchor, anchorFilter: anchor, threadView: 'open' })}
    >
      <Icon name="comment" size={15} />
      {count > 0 && <span className="badge">{count}</span>}
    </button>
  );
}
