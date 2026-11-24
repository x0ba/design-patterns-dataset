export type EntryType = 'person' | 'place' | 'ship' | 'concept';

/** A page locator: single page p, range p–e, or note p n<n>. */
export interface Loc {
  p: number;
  e?: number;
  n?: number;
  /** note locator that only cites a source (no substantive discussion) */
  cite?: boolean;
}

export interface Sub {
  heading: string;
  locs: Loc[];
}

export interface Entry {
  id: number;
  heading: string;
  type: EntryType;
  direct: Loc[];
  subs: Sub[];
  see: string[];
  seeAlso: string[];
  /** person named only once, in a printed crew list */
  crew?: boolean;
}

export interface IndexData {
  entries: Entry[];
}
