import { useEffect, useState } from 'react';

export interface Note {
  id: string;
  kind: 'finding' | 'question';
  title: string;
  body: string;
  source: string;
  context: string;
  added: string;
  key?: string;
}
export interface Brief { headline: string; notes: Note[] }

const KEY = 'retention-lens.brief.v1';

export const SEED_BRIEF: Brief = {
  headline:
    'Roughly half of the extra Sep–Oct cancellations are sponsors choosing to leave after the price letters; the other half are lapses from card charges that failed after the August processor migration.',
  notes: [
    {
      id: 'seed-1',
      key: 'season',
      kind: 'finding',
      title: 'Not a seasonal pattern',
      body: 'Sep and Oct 2025 had 2,190 and 2,120 cancellations, in line with the 2,150 monthly average. The 2026 jump to 3,480 and 3,910 is new.',
      source: 'Drivers',
      context: 'All sponsors · vs Sep–Oct 2025',
      added: 'Fri Nov 13, 4:42 pm',
    },
    {
      id: 'seed-2',
      key: 'overlap',
      kind: 'question',
      title: 'Which bucket do the 385 overlap sponsors go in?',
      body: 'Their card failed after Aug 18, and when outreach reached them they gave a reason like PRICE-INCREASE or FIN-HARDSHIP. Counting them as payment lapses moves deliberate from 52% to 39% of the excess. Agree the rule with the director before Friday.',
      source: 'Drivers',
      context: 'All sponsors · vs pre-change avg',
      added: 'Fri Nov 13, 5:10 pm',
    },
  ],
};

function load(): Brief {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Brief;
  } catch { /* ignore */ }
  return SEED_BRIEF;
}

export function useBrief() {
  const [brief, setBrief] = useState<Brief>(load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(brief)); } catch { /* ignore */ }
  }, [brief]);
  return [brief, setBrief] as const;
}

export function stamp() {
  const d = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let h = d.getHours();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${days[d.getDay()]} ${mon[d.getMonth()]} ${d.getDate()}, ${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`;
}
