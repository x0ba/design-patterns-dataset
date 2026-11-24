export type PersonId = 'hollis' | 'jun' | 'teodora' | 'sam' | 'aditi';
export type DeckId = 'ships' | 'harbor' | 'market' | 'events' | 'contracts';
export type View = 'cards' | 'rulebook' | 'changes' | 'comments' | 'playtests';

export interface Person {
  id: PersonId;
  name: string;
  short: string;
  role: 'Owner' | 'Co-designer' | 'Playtester';
  canEdit: boolean;
  color: string;
}

export interface Card {
  id: string;
  name: string;
  cost: number | null;
  effect: string;
  flavor: string;
  deck: DeckId;
  version: number;
  editor: PersonId;
  edited: Date;
  /** someone else is typing in this card right now */
  live?: { by: PersonId; effect: string; since: Date };
}
export type CardFields = Pick<Card, 'name' | 'cost' | 'effect' | 'flavor'>;

export interface Section {
  num: number;
  title: string;
  rules: string[];
}
export interface Rule {
  id: string;
  section: number;
  title: string;
  text: string;
}

export interface Change {
  id: string;
  at: Date;
  by: PersonId;
  kind: 'card' | 'rule';
  target: string;
  field: 'cost' | 'effect' | 'flavor' | 'text';
  before: string;
  after: string;
  vFrom?: number;
  vTo?: number;
  seen: boolean;
  reverted?: boolean;
  note?: string;
}

export interface Reply {
  by: PersonId;
  at: Date;
  text: string;
}
export interface Comment {
  id: string;
  author: PersonId;
  at: Date;
  anchor: { kind: 'card' | 'rule'; id: string };
  text: string;
  status: 'open' | 'resolved';
  replies: Reply[];
}

export interface Suggestion {
  id: string;
  ruleId: string;
  by: PersonId;
  at: Date;
  rationale: string;
  proposed: string;
  status: 'pending' | 'accepted' | 'rejected';
  note?: string;
}

export interface SessionNote {
  by: PersonId | string;
  at: Date;
  text: string;
  tags: string[];
}
export interface Session {
  id: string;
  date: Date;
  version: string;
  players: string[];
  minutes: number;
  target: number;
  headline: string;
  notes: SessionNote[];
  rounds?: number[];
  gold?: { name: string; series: number[] }[];
}
