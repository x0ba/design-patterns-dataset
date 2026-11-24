import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ORDERS, STORIES } from './data';
import { EMPTY, filterStories, sortStories } from './filters';
import type { Filters, Sort } from './filters';
import type { Order, Story } from './types';

interface Store {
  stories: Story[];
  byId: (id: string) => Story | undefined;
  filters: Filters;
  setFilters: (f: Filters | ((p: Filters) => Filters)) => void;
  sort: Sort | null;
  setSort: (s: Sort | null) => void;
  effectiveSort: Sort;
  results: Story[];
  compare: string[];
  toggleCompare: (id: string) => void;
  setCompare: (ids: string[]) => void;
  rename: (id: string, title: string) => void;
  addStory: (s: Story) => void;
  orders: Order[];
  addOrder: (o: Order) => void;
}
const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx)!;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stories, setStories] = useState<Story[]>(STORIES);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<Sort | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>(ORDERS);

  const effectiveSort: Sort = sort ?? (filters.q.trim() ? 'match' : 'newest');
  const results = useMemo(() => sortStories(filterStories(stories, filters), effectiveSort, filters.q), [stories, filters, effectiveSort]);
  const map = useMemo(() => new Map(stories.map((s) => [s.id, s])), [stories]);

  const toggleCompare = useCallback((id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? c : [...c, id])), []);
  const rename = useCallback((id: string, title: string) => setStories((l) => l.map((s) => (s.id === id ? { ...s, title } : s))), []);
  const addStory = useCallback((s: Story) => setStories((l) => [...l, s]), []);
  const addOrder = useCallback((o: Order) => setOrders((l) => [...l, o]), []);

  const value: Store = {
    stories, byId: (id) => map.get(id), filters, setFilters, sort, setSort, effectiveSort, results,
    compare, toggleCompare, setCompare, rename, addStory, orders, addOrder,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
