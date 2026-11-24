import { type BatchCheck, type Decomposition, type LateCheck, type TopicCheck, lateReading } from '../analysis/analyze';
import { pct, pointsWord } from '../format';

interface Props {
  decomp: Decomposition;
  late: LateCheck;
  batch: BatchCheck;
  topic: TopicCheck;
  older: { bio3: { before: number; recent: number } | null; bio12: { before: number; recent: number } | null };
}

export function Takeaway({ decomp, late, batch, topic, older }: Props) {
  return (
    <section className="card takeaway" aria-labelledby="takeaway-title">
      <h2 id="takeaway-title">What the data supports</h2>
      <ul>
        <li>
          <strong>The biggest factor is the new material.</strong> Krebs and ETC cards under 3 weeks old are recalled{' '}
          {pct(topic.newHard.recall)} of the time, against {pct(topic.newOther.recall)} for other new Biology cards. Once they are
          older, the gap shrinks to {topic.olderGap === null ? '–' : pointsWord(topic.olderGap)}.
        </li>
        <li>
          <strong>Big batches made it worse.</strong> Among Krebs and ETC cards, the ones added on days with 25+ new cards were
          recalled {pct(batch.likeBig.recall)} of the time, against {pct(batch.likeSmall.recall)} from days with fewer than 10.
        </li>
        <li>
          <strong>Late nights are a mixed signal.</strong>{' '}
          {lateReading(late).mixed
            ? `For newer cards, late sessions were about ${pointsWord(late.groups[1].diff ?? 0)} lower; for older cards, about ${pointsWord(late.groups[0].diff ?? 0)} higher.`
            : `For the same age of card, late sessions were ${late.avgDiff === null ? 'not comparable' : Math.abs(late.avgDiff) < 1 ? 'about the same' : `about ${pointsWord(late.avgDiff)} ${late.avgDiff < 0 ? 'lower' : 'higher'}`}.`}{' '}
          Late sessions look worse overall because {pct(late.lateNewShare)} of their reviews were new cards.
        </li>
        <li>
          <strong>Older material is slipping a little, mostly in Unit 3.</strong>{' '}
          {older.bio3 && older.bio12
            ? `Unit 3 cards over 3 weeks old went from ${pct(older.bio3.before)} to ${pct(older.bio3.recent)}; Units 1–2 went from ${pct(older.bio12.before)} to ${pct(older.bio12.recent)}.`
            : `Cards over 3 weeks old went from ${pct(decomp.olderRecallBefore)} to ${pct(decomp.olderRecallRecent)}.`}
        </li>
      </ul>
      <p className="footnote">
        This is three weeks of data from one student. It shows which patterns fit, not what caused them for certain. The plan
        below is a short test of the batch idea.
      </p>
    </section>
  );
}
