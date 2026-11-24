import { useEffect, useState } from 'react';

const STORAGE_KEY = 'recallery-friday-plan-v1';

const STEPS = [
  {
    id: 'cap',
    title: 'Cap new cards at 10 a day until Friday',
    detail: 'Big batches are where the Krebs and ETC drop started. Spread the rest of the unit over the week.',
  },
  {
    id: 'missed',
    title: 'Spend 10 minutes on your most-missed cards each day',
    detail: 'Start with the top of the list above. Most of them are Krebs and electron transport cards.',
  },
  {
    id: 'check',
    title: 'Come back to this page on Thursday',
    detail: 'If the cap is working, recall on cards under 3 weeks old should start to climb.',
  },
];

export function FridayPlan() {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setDone(JSON.parse(saved));
    } catch {
      // Storage can be unavailable (private mode); the checklist still works for this visit.
    }
  }, []);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore: the state still updates in memory.
      }
      return next;
    });
  };

  const finished = STEPS.filter((s) => done[s.id]).length;

  return (
    <section className="card plan" aria-labelledby="plan-title">
      <div className="plan-head">
        <div>
          <div className="eyebrow">Your unit test · Fri, Nov 20 · 4 days away</div>
          <h2 id="plan-title">Plan for cell respiration</h2>
        </div>
        <div className="plan-count">{finished} of {STEPS.length} done</div>
      </div>
      <ol className="plan-steps">
        {STEPS.map((s) => (
          <li key={s.id} className={done[s.id] ? 'done' : ''}>
            <label>
              <input type="checkbox" checked={!!done[s.id]} onChange={() => toggle(s.id)} />
              <span>
                <strong>{s.title}</strong>
                <span className="plan-detail">{s.detail}</span>
              </span>
            </label>
          </li>
        ))}
      </ol>
    </section>
  );
}
