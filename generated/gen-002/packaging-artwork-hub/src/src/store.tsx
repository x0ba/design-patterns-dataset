import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { BRANDS, TODAY, ALL_ENTRIES, pathOf, DIELINES, REG_BLOCKS } from './data';
import { addDays } from './util';

export interface RecentItem { route: string; at: string; time: string }
export interface PrinterPack { id: string; entryRoute: string; printerId: string; version: number; items: string[]; created: string; time: string; link: string; note: string }
interface Toast { id: number; text: string; tone?: 'ok' | 'warn' }

interface Store {
  pins: string[]; togglePin: (route: string) => void;
  recents: RecentItem[]; visit: (route: string) => void;
  lastArtwork: string | null; setLastArtwork: (r: string) => void;
  searchOrigin: string | null; setSearchOrigin: (q: string | null) => void;
  packs: PrinterPack[]; addPack: (p: PrinterPack) => void;
  toast: (text: string, tone?: 'ok' | 'warn') => void; toasts: Toast[];
}
const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

function initialRecents(): RecentItem[] {
  const e = (b: string, l: string, f?: string, m?: string) => {
    const brand = BRANDS.find((x) => x.id === b)!;
    const line = brand.lines.find((x) => x.id === l) || brand.lines[0];
    const fmt = (f && line.formats.find((x) => x.id === f)) || line.formats[0];
    const ent = (m && fmt.markets.find((x) => x.id === m)) || fmt.markets[0];
    return { line, fmt, ent };
  };
  const de = ALL_ENTRIES.find((m) => m.brand.id === 'halvi' && m.country.id === 'de')!;
  const sea = e('crunchwell', 'sea-salt');
  const svn = e('crunchwell', 'salt-and-vinegar');
  const pb = e('pebbleton', 'fruit-drops');
  const mb = e('mornbrook', 'oat-digestive');
  const kp = e('kipfer', 'salted-peanuts');
  const pl40 = e('crunchwell', 'paprika', 'b040', 'pl');
  const regDE = Object.values(REG_BLOCKS).find((r) => r.country.id === 'de' && r.brand.id === 'halvi')!;
  const regPL = Object.values(REG_BLOCKS).find((r) => r.country.id === 'pl' && r.brand.id === 'crunchwell' && r.line.id === 'sea-salt');
  const dl1 = Object.keys(DIELINES).find((k) => k.startsWith('DL-W045'))!;
  const dl2 = Object.keys(DIELINES).find((k) => k.startsWith('DL-B090'))!;
  const list: [string, number, string][] = [
    ['/b/crunchwell/paprika/p150/cz', 0, '10:42'],
    ['/b/crunchwell/paprika/p150/cz/v6', 0, '10:41'],
    ['/b/crunchwell/paprika/p150?focus=archive', 0, '10:38'],
    ['/b/crunchwell/paprika/p150/pl/v5', 0, '10:36'],
    ['/guide/naming', 1, '16:20'],
    [pathOf.entry(pl40.ent), 1, '15:02'],
    ['/assets/recycling/rec-eu-plastic', 1, '14:47'],
    [pathOf.entry(de), 1, '11:15'],
    [`/dielines/${dl1}`, 1, '11:08'],
    [`/reg/de/${regDE.id}`, 2, '17:30'],
    [pathOf.format(sea.fmt), 2, '16:51'],
    ['/guide/structure', 2, '09:12'],
    [pathOf.entry(svn.ent), 3, '15:40'],
    [`/dielines/${dl2}`, 3, '15:22'],
    [regPL ? `/reg/pl/${regPL.id}` : '/reg/pl', 3, '10:05'],
    ['/assets/logos/logo-crunchwell-primary', 6, '14:18'],
    [pathOf.entry(pb.ent), 6, '13:55'],
    ['/guide/versions', 7, '10:30'],
    [pathOf.line(mb.line), 8, '16:12'],
    [pathOf.entry(kp.ent), 9, '11:40'],
    ['/b/crunchwell', 13, '15:00'],
    ['/guide/shared', 14, '10:05'],
    ['/guide/reviewers', 14, '09:40'],
  ];
  return list.map(([route, ago, time]) => ({ route, at: addDays(TODAY, -ago), time }));
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [pins, setPins] = useState<string[]>([]);
  const [recents, setRecents] = useState<RecentItem[]>(initialRecents);
  const [lastArtwork, setLastArtwork] = useState<string | null>('/b/crunchwell/paprika/p150/cz');
  const [searchOrigin, setSearchOrigin] = useState<string | null>('crunchwell paprika 150 central europe');
  const [packs, setPacks] = useState<PrinterPack[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const tid = useRef(1);
  const clock = useRef(44);

  const toast = useCallback((text: string, tone?: 'ok' | 'warn') => {
    const id = tid.current++;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  const togglePin = useCallback((route: string) => setPins((p) => (p.includes(route) ? p.filter((x) => x !== route) : [route, ...p])), []);
  const visit = useCallback((route: string) => {
    setRecents((rs) => {
      if (rs[0]?.route === route) return rs;
      const m = clock.current++;
      const time = `${10 + Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
      return [{ route, at: TODAY, time }, ...rs.filter((r) => r.route !== route)];
    });
  }, []);
  const addPack = useCallback((p: PrinterPack) => setPacks((ps) => [p, ...ps]), []);

  const v = useMemo(
    () => ({ pins, togglePin, recents, visit, lastArtwork, setLastArtwork, searchOrigin, setSearchOrigin, packs, addPack, toast, toasts }),
    [pins, togglePin, recents, visit, lastArtwork, searchOrigin, packs, addPack, toast, toasts],
  );
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
