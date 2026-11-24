import raw from './data/stories.json';
import rawOrders from './data/orders.json';
import type { Character, Order, Story } from './types';

export const CHARACTERS = (raw as { characters: Character[] }).characters;
export const STORIES = (raw as unknown as { stories: Story[] }).stories;
export const ORDERS = rawOrders as unknown as Order[];
export const byId = new Map(STORIES.map((s) => [s.id, s]));
export const charById = new Map(CHARACTERS.map((c) => [c.id, c]));
export const charFull = (id: string) => {
  const c = charById.get(id)!;
  return `${c.name} ${c.kind}`;
};
export const ALL_SETTINGS = Array.from(new Set(STORIES.flatMap((s) => s.settings))).sort();
export const MONTHS = Array.from(new Set(STORIES.map((s) => s.createdAt.slice(0, 7)))).sort();
