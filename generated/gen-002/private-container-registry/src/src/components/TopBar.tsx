import { useState } from 'react';
import { go } from '../lib/router';

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [q, setQ] = useState('');
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h2>{title}</h2>
        {subtitle && <span className="topbar-sub">{subtitle}</span>}
      </div>
      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(['tags'], { q: q.trim() || undefined });
          setQ('');
        }}
      >
        <input
          type="search"
          placeholder="Find a repo or tag, press Enter"
          aria-label="Find a repository or tag"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
    </header>
  );
}
