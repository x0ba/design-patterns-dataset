export type Kid = 'pia' | 'leo' | 'both';
export type Maker = 'Jonah' | 'Hana';

export interface Character { id: string; name: string; kind: string; count: number }
export interface Version {
  id: string;
  kind: 'original' | 'ending' | 'rewrite';
  label: string;
  createdAt: string;
  ending: string;
  readAloud: number;
}
export interface Story {
  id: string;
  title: string;
  createdAt: string; // local time, "YYYY-MM-DDTHH:mm"
  by: Maker;
  for: Kid;
  readingAge: number;
  wordCount: number;
  prompt: string;
  characters: string[];
  settings: string[];
  illustrations: number;
  readAloud: number;
  favoriteBy: 'Pia' | 'Leo' | null;
  opening: string;
  versions: Version[];
}
export type Format = 'softcover' | 'hardcover';
export interface Order {
  id: string;
  storyId: string;
  versionId: string;
  title: string;
  orderedAt: string;
  format: Format;
  qty: number;
  total: number;
  deliveredAt: string;
  by: Maker;
  dedication?: string;
}
