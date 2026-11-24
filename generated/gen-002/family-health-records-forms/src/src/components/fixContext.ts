import { createContext, useContext } from 'react';
import type { FixAction } from '../lib/formModel';

/** Lets any screen open a fix dialog without owning dialog state. */
export const FixContext = createContext<(kind: FixAction) => void>(() => {});

export function useOpenFix(): (kind: FixAction) => void {
  return useContext(FixContext);
}
