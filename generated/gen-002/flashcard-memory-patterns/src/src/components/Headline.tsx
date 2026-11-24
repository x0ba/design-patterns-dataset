import type { Dataset } from '../data/types';
import {
  BEFORE,
  LAST_WEEK,
  RECENT,
  type Decomposition,
  type ScopeId,
  type WeekPoint,
  cardsAddedIn,
  olderByDeck,
  lateSessionShareIn,
  rate,
  scopedReviews,
} from '../analysis/analyze';
import { pct, pointsWord, count } from '../format';
import { WeeklyChart } from './charts';

interface Props {
  ds: Dataset;
  scope: ScopeId;
  scopeLabel: string;
  decomp: Decomposition;
  weeks: WeekPoint[];
}

export function Headline({ ds, scope, scopeLabel, decomp, weeks }: Props) {
  const scoped = scopedReviews(ds, scope);
  const lastWeek = rate(scoped.filter((r) => r.day >= LAST_WEEK.from && r.day <= LAST_WEEK.to)).recall;
  const before = decomp.before;
  const recent = decomp.recent;
  const total = decomp.total;

  const lateBefore = lateSessionShareIn(scoped, BEFORE);
  const lateRecent = lateSessionShareIn(scoped, RECENT);
  const addedBefore = cardsAddedIn(ds, scope, BEFORE);
  const addedRecent = cardsAddedIn(ds, scope, RECENT);
  const older = olderByDeck(scoped);
  const olderHint = older.bio3 && older.bio12
    ? `Unit 3 ${pct(older.bio3.before)} → ${pct(older.bio3.recent)}; Units 1–2 ${pct(older.bio12.before)} → ${pct(older.bio12.recent)}`
    : 'Cards in this selection that are over 3 weeks old';
  const rateDrop = decomp.rateEffect ?? 0;
  const unit3Drives = !!(older.bio3 && older.bio12 && older.bio3.recent - older.bio3.before < older.bio12.recent - older.bio12.before);

  let lede: string;
  if (before === null || recent === null || total === null) {
    lede = 'Not enough reviews in this selection to compare the two periods.';
  } else if (total > -3) {
    lede = `Recall has held steady over the last three weeks (${pct(before)} → ${pct(recent)}).`;
  } else {
    lede =
      `Over the last three weeks, recall went from ${pct(before)} to ${pct(recent)}. ` +
      `About ${pointsWord(decomp.mixEffect ?? 0)} of that comes from the mix of cards you studied: ` +
      `${pct(decomp.newShareRecent)} of your reviews were cards under 3 weeks old, up from ${pct(decomp.newShareBefore)}, ` +
      `and those are recalled ${pct(decomp.newRecallRecent)} of the time.` +
      (rateDrop < -1
        ? ` Cards over 3 weeks old account for the other ${pointsWord(rateDrop)}${unit3Drives ? ', mostly in Unit 3' : ''}.`
        : '');
  }

  return (
    <section className="card hero" aria-labelledby="hero-title">
      <div className="hero-main">
        <div className="eyebrow">Recall · {scopeLabel}</div>
        <h2 id="hero-title" className="hero-title">
          Your recall dropped from <span className="num">{pct(before)}</span> to{' '}
          <span className="num warn">{pct(lastWeek)}</span> this week
        </h2>
        <div className="hero-caption">
          <span>Oct 6–26 (first three weeks)</span>
          <span>Nov 10–16 (last 7 days)</span>
        </div>
        <p className="lede">{lede}</p>
        <WeeklyChart weeks={weeks} />
        <p className="footnote">
          Recall means you answered Hard, Good or Easy. Again means you missed the card. Bars show the share of each week&apos;s
          reviews by how old the card was.
        </p>
      </div>

      <aside className="hero-side" aria-label="What changed">
        <h3>What changed</h3>
        <Tile
          label="Study sessions that started after 10:30pm"
          before={pct(lateBefore)}
          recent={pct(lateRecent)}
          hint="Late sessions were mostly for new cards."
        />
        <Tile
          label="New cards added"
          before={count(addedBefore)}
          recent={count(addedRecent)}
          hint="Most arrived in four big batches."
        />
        <Tile
          label="Reviews on cards under 3 weeks old"
          before={pct(decomp.newShareBefore)}
          recent={pct(decomp.newShareRecent)}
          hint="These are the cards you miss most at first."
        />
        <Tile
          label="Recall on cards over 3 weeks old"
          before={pct(decomp.olderRecallBefore)}
          recent={pct(decomp.olderRecallRecent)}
          hint={olderHint}
        />
      </aside>
    </section>
  );
}

function Tile({ label, before, recent, hint }: { label: string; before: string; recent: string; hint: string }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-values">
        <span className="tile-before">{before}</span>
        <span className="tile-arrow" aria-hidden="true">→</span>
        <span className="tile-recent">{recent}</span>
      </div>
      <div className="tile-hint">{hint}</div>
    </div>
  );
}
