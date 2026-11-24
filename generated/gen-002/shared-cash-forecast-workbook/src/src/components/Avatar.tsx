import { person } from '../data';

export function Avatar({ id, size = 20, ring, dim }: { id: string; size?: number; ring?: boolean; dim?: boolean }) {
  const p = person[id];
  return (
    <span
      className={'av' + (ring ? ' av-ring' : '') + (dim ? ' av-dim' : '')}
      style={{ width: size, height: size, fontSize: size * 0.4, background: p.color, ['--ring' as string]: p.color }}
      title={p.name}
    >
      {p.initials}
    </span>
  );
}

export function Who({ id, sub }: { id: string; sub?: boolean }) {
  const p = person[id];
  return (
    <span className="who">
      <Avatar id={id} size={18} />
      <span className="who-name">{id === 'helen' ? 'You' : p.name}</span>
      {sub && <span className="who-sub">{p.title.split(' · ')[0]}</span>}
    </span>
  );
}
