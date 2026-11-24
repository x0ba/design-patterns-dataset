export type DeckId = 'bio3' | 'bio12' | 'spvocab' | 'spverb' | 'pt';

export type Topic = 'krebs' | 'etc' | 'glyc' | 'bio-other' | 'none';

/** 1 = Again (missed), 2 = Hard, 3 = Good, 4 = Easy */
export type Rating = 1 | 2 | 3 | 4;

export interface Deck {
  id: DeckId;
  name: string;
  cardCount: number;
  group: 'bio' | 'other';
}

export interface Card {
  id: string;
  deck: DeckId;
  topic: Topic;
  /** Day offset from today (0 = Mon 16 Nov 2026). Negative = in the past. */
  addDay: number;
  /** How many cards were added to this deck on the same day (Unit 3 only). */
  batch: number;
  /** Full text, only for the cards that were written out for this build. */
  front?: string;
  back?: string;
  /** Sampling weight: how often this card tends to come up. */
  weight: number;
  /** Extra difficulty applied to every review (negative = harder). */
  difficulty: number;
}

export interface Review {
  cardId: string;
  deck: DeckId;
  topic: Topic;
  /** Day offset (-41 .. 0). */
  day: number;
  /** Epoch milliseconds in the viewer's local time zone. */
  ts: number;
  /** Minutes after midnight, local time. */
  minute: number;
  rating: Rating;
  success: boolean;
  /** Seconds to answer. */
  responseSec: number;
  /** Card age in days when reviewed. */
  age: number;
  /** Scheduled interval (days) after this review. */
  intervalDays: number;
  /** Study session identifier (unique per day session). */
  sessionId: number;
  /** True if the session started after 10:30pm. */
  lateSession: boolean;
  batch: number;
}

export interface Dataset {
  decks: Record<DeckId, Deck>;
  cards: Card[];
  cardById: Map<string, Card>;
  reviews: Review[];
  sessionCount: number;
}

export const FIRST_DAY = -41;
export const TODAY = 0;
