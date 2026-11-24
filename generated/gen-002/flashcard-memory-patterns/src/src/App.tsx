import { useCallback, useMemo, useState } from 'react';
import { generateDataset } from './data/generate';
import {
  SCOPES,
  type ScopeId,
  batchCheck,
  decompose,
  groupReviewsByCard,
  lateCheck,
  missedCards,
  olderByDeck,
  scopedReviews,
  topicCheck,
  weeklySeries,
} from './analysis/analyze';
import { count } from './format';
import { Sidebar } from './components/Sidebar';
import { Headline } from './components/Headline';
import { Hypotheses } from './components/Hypotheses';
import { Takeaway } from './components/Takeaway';
import { Explorer } from './components/Explorer';
import { CardTable } from './components/CardTable';
import { CardDrawer } from './components/CardDrawer';
import { FridayPlan } from './components/FridayPlan';

export default function App() {
  const ds = useMemo(() => generateDataset(), []);
  const reviewsByCard = useMemo(() => groupReviewsByCard(ds.reviews), [ds]);

  const [scope, setScope] = useState<ScopeId>('bio');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const scopeInfo = SCOPES.find((s) => s.id === scope)!;
  const scoped = useMemo(() => scopedReviews(ds, scope), [ds, scope]);
  const decomp = useMemo(() => decompose(scoped), [scoped]);
  const weeks = useMemo(() => weeklySeries(ds, scope), [ds, scope]);
  const late = useMemo(() => lateCheck(scoped), [scoped]);
  const batch = useMemo(() => batchCheck(ds, scoped), [ds, scoped]);
  const topic = useMemo(() => topicCheck(scoped), [scoped]);
  const older = useMemo(() => olderByDeck(scoped), [scoped]);
  const cards = useMemo(() => missedCards(ds, reviewsByCard, scope), [ds, reviewsByCard, scope]);

  const closeCard = useCallback(() => setSelectedCard(null), []);
  const openCard = useCallback((id: string) => setSelectedCard(id), []);

  const selectedReviews = selectedCard ? reviewsByCard.get(selectedCard) ?? [] : [];

  return (
    <div className="app">
      <Sidebar />

      <main className="main" id="main">
        <header className="page-head">
          <div>
            <h1>Insights</h1>
            <p className="muted">
              Your last 42 days · {count(ds.reviews.length)} reviews across {count(ds.cards.length)} cards in 5 decks. Recall is
              the share of reviews you answered Hard, Good or Easy.
            </p>
          </div>
          <label className="scope">
            <span>Showing</span>
            <select value={scope} onChange={(e) => setScope(e.target.value as ScopeId)}>
              {SCOPES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </header>

        <Headline ds={ds} scope={scope} scopeLabel={scopeInfo.label} decomp={decomp} weeks={weeks} />

        <Hypotheses late={late} batch={batch} topic={topic} />

        <Takeaway decomp={decomp} late={late} batch={batch} topic={topic} older={older} />

        <div className="two-col">
          <Explorer ds={ds} scoped={scoped} />
          <CardTable cards={cards} scopeLabel={scopeInfo.label} onOpen={openCard} selectedId={selectedCard} />
        </div>

        <FridayPlan />

        <p className="footnote center">
          Comparisons put Oct 27–Nov 16 (the last three weeks) against Oct 6–26 (the three weeks before that).
        </p>
      </main>

      {selectedCard && <CardDrawer ds={ds} cardId={selectedCard} reviews={selectedReviews} onClose={closeCard} />}
    </div>
  );
}
