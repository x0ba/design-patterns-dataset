import { useEffect, useMemo } from 'react';
import type { Dataset, Review } from '../data/types';
import { DECK_SHORT, TOPIC_LABELS, cardDetail, shortDate } from '../analysis/analyze';
import { pct, secs } from '../format';
import { RATING_COLORS, RATING_NAMES, ReviewTimeline } from './charts';

interface Props {
  ds: Dataset;
  cardId: string;
  reviews: Review[];
  onClose: () => void;
}

export function CardDrawer({ ds, cardId, reviews, onClose }: Props) {
  const card = ds.cardById.get(cardId)!;
  const detail = useMemo(() => cardDetail(reviews), [reviews]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ageDays = Math.max(0, -card.addDay);
  const late = detail.reviews.filter((r) => r.lateSession).length;
  const last = detail.reviews.slice(-1)[0];
  const lastThreeAnswers = detail.lastThree.map((r) => r.rating);
  const lastThreeAllRight = lastThreeAnswers.length === 3 && lastThreeAnswers.every((r) => r !== 1);

  let advice: string;
  if (detail.rtHit !== null && detail.rtMiss !== null && detail.rtMiss > detail.rtHit * 1.8) {
    advice = `When you miss this card you take about ${secs(detail.rtMiss)} to answer, compared with ${secs(detail.rtHit)} when you get it right. You are stuck partway through recall. Try saying the answer out loud before you flip.`;
  } else if (lastThreeAllRight) {
    advice = 'Your last three answers were right, so it may be starting to stick. Keep the daily review going.';
  } else {
    advice = 'You still miss this one often. Read the answer, then explain it in your own words, and check it again tomorrow.';
  }

  return (
    <div className="drawer-root" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer">
        <header className="drawer-head">
          <div>
            <div className="eyebrow">
              {TOPIC_LABELS[card.topic]} · {DECK_SHORT[card.deck]}
            </div>
            <h2 id="drawer-title">{card.front}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close card details">
            ×
          </button>
        </header>

        <div className="answer-box">
          <div className="answer-label">Answer</div>
          <div>{card.back}</div>
        </div>

        <dl className="facts">
          <div>
            <dt>Missed</dt>
            <dd>
              {detail.misses} of {detail.total} reviews
            </dd>
          </div>
          <div>
            <dt>Recall, last 3 weeks</dt>
            <dd>{pct(detail.recentRate.recall)}</dd>
          </div>
          <div>
            <dt>Recall, first 3 weeks</dt>
            <dd>{pct(detail.beforeRate.recall)}</dd>
          </div>
          <div>
            <dt>Added</dt>
            <dd>
              {shortDate(card.addDay)} ({ageDays} days ago)
            </dd>
          </div>
          <div>
            <dt>Answer time, right</dt>
            <dd>{secs(detail.rtHit)}</dd>
          </div>
          <div>
            <dt>Answer time, missed</dt>
            <dd>{secs(detail.rtMiss)}</dd>
          </div>
        </dl>

        <div className="advice">{advice}</div>

        <div className="timeline-head">
          <h3>Every review, six weeks</h3>
          <div className="legend-inline">
            {[1, 2, 3, 4].map((r) => (
              <span key={r}>
                <i style={{ background: RATING_COLORS[r] }} /> {RATING_NAMES[r]}
              </span>
            ))}
          </div>
        </div>
        <div className="timeline-wrap">
          <ReviewTimeline reviews={detail.reviews} dayLabel={(d) => shortDate(d)} />
        </div>
        <p className="footnote">
          {late} of {detail.total} reviews were in sessions after 10:30pm.
          {last ? ` Last seen ${shortDate(last.day)}.` : ''} Hover a dot for the exact time.
        </p>
      </aside>
    </div>
  );
}

