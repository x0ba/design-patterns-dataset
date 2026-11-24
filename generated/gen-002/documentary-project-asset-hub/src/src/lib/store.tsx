import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DATA } from '../data';
import type { LogEntry } from '../data/types';
import { describe, type Desc } from './describe';
import { L, parseView, useHash, type View } from './router';

export interface Recent extends Desc { when: string }
export interface Shortcut { key: string; href: string; label: string; pid: string; kind: Desc['kind'] }

interface Store {
  hash: string;
  view: View;
  desc: Desc | null;
  recents: Recent[];
  shortcuts: Shortcut[];
  trail: Desc[];
  notes: Record<string, LogEntry[]>;
  toast: string | null;
  isPinned: boolean;
  togglePin: () => void;
  removeShortcut: (key: string) => void;
  addNote: (itemId: string, text: string) => void;
  say: (msg: string) => void;
  lastByProject: Record<string, string>;
}

const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

function seedRecents(): Recent[] {
  const sr = DATA['salt-road'];
  const nf = DATA['night-ferry'];
  const lp = DATA['last-pilot'];
  const mk = (h: string, when: string): Recent => ({ ...(describe(parseView(h)) as Desc), when });
  const sc6 = sr.scenes.find((s) => s.n === 6)!;
  const item6 = sr.items.find((i) => i.sourceId === 'cchs' && i.usages.length > 0)!.id;
  const nfScene = nf.scenes.find((s) => s.kind === 'interview')!;
  const lpScene = lp.scenes.find((s) => s.kind === 'interview')!;
  return [
    mk(L.reel('salt-road', 3), 'Now'),
    mk(L.scene('salt-road', 6), 'Yesterday'),
    mk(L.item('salt-road', item6), 'Yesterday'),
    mk(L.scene('night-ferry', nfScene.n), '2 days ago'),
    mk(L.transcript('salt-road', 'zhao'), '3 days ago'),
    mk(L.scene('last-pilot', lpScene.n), 'Last week'),
  ];
}

const SEED_SHORTCUTS: Shortcut[] = [
  { key: L.archive('salt-road', { status: 'pending' }), href: L.archive('salt-road', { status: 'pending' }), label: 'Pending clearances', pid: 'salt-road', kind: 'filter' },
  { key: L.reel('night-ferry', 2), href: L.reel('night-ferry', 2), label: 'Episode 2 · The Galley', pid: 'night-ferry', kind: 'reel' },
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const hash = useHash();
  const view = useMemo(() => parseView(hash), [hash]);
  const desc = useMemo(() => describe(view), [view]);
  const [recents, setRecents] = useState<Recent[]>(seedRecents);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(SEED_SHORTCUTS);
  const [trail, setTrail] = useState<Desc[]>([]);
  const [notes, setNotes] = useState<Record<string, LogEntry[]>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [lastByProject, setLast] = useState<Record<string, string>>({});
  const timer = useRef<number>(0);

  const say = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    if (!desc) return;
    setTrail((t) => {
      const i = t.findIndex((x) => x.key === desc.key);
      if (i >= 0) return t.slice(0, i + 1);
      return [...t, desc].slice(-7);
    });
    if (desc.recordable) {
      setRecents((r) => [{ ...desc, when: 'Now' }, ...r.filter((x) => x.key !== desc.key).map((x) => (x.when === 'Now' ? { ...x, when: 'Just now' } : x))].slice(0, 8));
    }
    setLast((m) => ({ ...m, [desc.pid]: desc.href }));
    const d = DATA[desc.pid];
    document.title = `Reelhouse — ${d.project.title} · ${desc.label}`;
  }, [desc]);

  const isPinned = !!desc && shortcuts.some((s) => s.key === desc.key);
  const togglePin = useCallback(() => {
    if (!desc) return;
    setShortcuts((s) => {
      if (s.some((x) => x.key === desc.key)) return s.filter((x) => x.key !== desc.key);
      return [...s, { key: desc.key, href: desc.href, label: desc.label, pid: desc.pid, kind: desc.kind }];
    });
    say(isPinned ? 'Removed from shortcuts' : 'Saved to shortcuts');
  }, [desc, isPinned, say]);
  const removeShortcut = useCallback((key: string) => setShortcuts((s) => s.filter((x) => x.key !== key)), []);
  const addNote = useCallback((itemId: string, text: string) => {
    setNotes((n) => ({ ...n, [itemId]: [...(n[itemId] || []), { date: '2026-11-16', who: 'Ama Boateng', text }] }));
    say('Note added to the clearance log');
  }, [say]);

  const value: Store = { hash, view, desc, recents, shortcuts, trail, notes, toast, isPinned, togglePin, removeShortcut, addNote, say, lastByProject };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
