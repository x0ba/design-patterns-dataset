import { createContext, useContext } from 'react';
import type { Env, RepoMeta, Tag } from './data/types';

export interface AppState {
  /** All tags with any label overrides applied. */
  tags: Tag[];
  byId: Map<string, Tag>;
  repos: RepoMeta[];
  setEnv: (id: string, env: Env) => void;
  notify: (msg: string) => void;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppContext');
  return value;
}
