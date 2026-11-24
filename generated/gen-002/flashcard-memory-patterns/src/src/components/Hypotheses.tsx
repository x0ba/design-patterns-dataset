import { type BatchCheck, type LateCheck, type TopicCheck, lateReading, strengthOf, sampleNote, shortDate } from '../analysis/analyze';
import { pct, pointsWord } from '../format';
import { CompareBars, DailyAdds } from './charts';

interface Props {
  late: LateCheck;
  batch: BatchCheck;
  topic: TopicCheck;
}

const VERDICT: Record<string, { text: string; cls: string }> = {
  strong: { text: 'Strong effect', cls: 'verdict-strong' },
  moderate: { text: 'Some effect', cls: 'verdict-moderate' },
  small: { text: 'Small effect', cls: 'verdict-small' },
  unknown: { text: 'Not enough data', cls: 'verdict-small' },
};

function lateSentence(late: LateCheck) {
  const lr = lateReading(late);
  const a = late.avgDiff;
  if (lr.mixed && lr.olderDiff !== null && lr.newerDiff !== null)
    return (
      <>
        Once you compare cards of the same age, the picture is mixed. Newer cards are about <strong>{pointsWord(lr.newerDiff)}</strong>{' '}
        {lr.newerDiff < 0 ? 'lower' : 'higher'} late at night, while older cards are about <strong>{pointsWord(lr.olderDiff)}</strong>{' '}
        {lr.olderDiff < 0 ? 'lower' : 'higher'}.
      </>
    );
  if (a === null) return 'Not enough late-session reviews to compare.';
  if (a <= -1)
    return (
      <>
        Late sessions do have lower recall: about <strong>{pointsWord(a)}</strong> lower once you compare cards of the same age.
      </>
    );
  if (a >= 1)
    return (
      <>
        Once you compare cards of the same age, late sessions are not worse. They are about <strong>{pointsWord(a)}</strong> better.
      </>
    );
  return <>Once you compare cards of the same age, late sessions are about the same as daytime sessions.</>;
}

export function Hypotheses({ late, batch, topic }: Props) {
  const lateMixed = lateReading(late).mixed;
  const lateStrength = strengthOf(late.avgDiff);
  const batchStrength = strengthOf(batch.likeDiff);
  const topicStrength = strengthOf(topic.newGap);

  const lateGroup = late.groups[0];
  const newLate = late.groups[1];

  return (
    <section aria-labelledby="hyp-title">
      <div className="section-head">
        <h2 id="hyp-title">Three explanations, checked against your history</h2>
        <p>
          Each guess is compared with the same kind of card, so an older card isn&apos;t judged against a brand-new one.
          The last three weeks are used throughout.
        </p>
      </div>

      <div className="hyp-grid">
        {/* 1. Late nights */}
        <article className="card hyp">
          <header>
            <div className="hyp-quote">“I’ve been studying late at night.”</div>
            <span className={`verdict ${lateMixed ? 'verdict-small' : VERDICT[lateStrength].cls}`}>
              {lateMixed ? 'Mixed signal' : VERDICT[lateStrength].text}
            </span>
          </header>
          <p className="hyp-finding">{lateSentence(late)}</p>
          <CompareBars
            groups={[
              {
                title: 'Cards 3+ weeks old',
                items: [
                  { label: 'After 10:30pm', value: lateGroup.late.recall, n: lateGroup.late.n, tone: 'warn' },
                  { label: 'Earlier in the day', value: lateGroup.day.recall, n: lateGroup.day.n, tone: 'muted' },
                ],
              },
              {
                title: 'Cards under 3 weeks old',
                items: [
                  { label: 'After 10:30pm', value: newLate.late.recall, n: newLate.late.n, tone: 'warn' },
                  { label: 'Earlier in the day', value: newLate.day.recall, n: newLate.day.n, tone: 'muted' },
                ],
              },
            ]}
          />
          <div className="hyp-box">
            <strong>Why late looks worse:</strong> {pct(late.lateNewShare)} of late-session reviews were new cards, compared with{' '}
            {pct(late.dayNewShare)} of daytime reviews. Late sessions are where new cards get studied, and new cards are the hard part.
          </div>
          <p className="hyp-caveat">
            This is a pattern, not proof. Being tired late may still cost you a little, which is why the gap is not zero.
          </p>
        </article>

        {/* 2. Too many new cards at once */}
        <article className="card hyp">
          <header>
            <div className="hyp-quote">“I added too many new cards at once.”</div>
            <span className={`verdict ${VERDICT[batchStrength].cls}`}>{VERDICT[batchStrength].text}</span>
          </header>
          <p className="hyp-finding">
            Same kind of card (Krebs or electron transport), recalled <strong>{pct(batch.likeBig.recall)}</strong> of the time after
            a day with 25+ new cards, and <strong>{pct(batch.likeSmall.recall)}</strong> after a day with fewer than 10.
          </p>
          <div className="daily-wrap">
            <div className="daily-title">New Biology cards added per day</div>
            <DailyAdds days={batch.daily} label={shortDate} />
            <div className="daily-legend">
              <span>
                <i className="sw big" /> 25+ in one day ({batch.bigDays} of the last 21 days)
              </span>
              <span>
                <i className="sw" /> Under 25
              </span>
            </div>
          </div>
          <div className="hyp-box">
            <strong>Sample:</strong> {batch.likeSmall.n} small-batch and {batch.likeBig.n} big-batch reviews. {sampleNote(Math.min(batch.likeSmall.n, batch.likeBig.n))}.
          </div>
          <p className="hyp-caveat">
            Batch size and card difficulty overlap: most big-batch days were Krebs and ETC material. The comparison above keeps the
            card type fixed, so the batch effect is the part that is left over.
          </p>
        </article>

        {/* 3. Harder material */}
        <article className="card hyp">
          <header>
            <div className="hyp-quote">“The new cards are just harder.”</div>
            <span className={`verdict ${VERDICT[topicStrength].cls}`}>
              {topicStrength === 'strong' ? 'Strong for new cards' : VERDICT[topicStrength].text}
            </span>
          </header>
          <p className="hyp-finding">
            Krebs and ETC cards under 3 weeks old are recalled <strong>{pct(topic.newHard.recall)}</strong> of the time. Other new
            Biology cards: <strong>{pct(topic.newOther.recall)}</strong>. Once they are older than 3 weeks, the gap shrinks to{' '}
            <strong>{topic.olderGap === null ? '–' : pointsWord(topic.olderGap)}</strong>.
          </p>
          <CompareBars
            groups={[
              {
                title: 'Cards under 3 weeks old',
                items: [
                  { label: 'Krebs & electron transport', value: topic.newHard.recall, n: topic.newHard.n, tone: 'warn' },
                  { label: 'Other Biology', value: topic.newOther.recall, n: topic.newOther.n, tone: 'muted' },
                ],
              },
              {
                title: 'Cards 3+ weeks old',
                items: [
                  { label: 'Krebs & electron transport', value: topic.olderHard.recall, n: topic.olderHard.n, tone: 'accent' },
                  { label: 'Other Biology', value: topic.olderOther.recall, n: topic.olderOther.n, tone: 'muted' },
                ],
              },
            ]}
          />
          <div className="hyp-box">
            <strong>Reading it:</strong> these cards are hard for the first few reviews, which is normal for new material. They get
            easier with repetition, but Krebs and ETC cards still trail the rest once they are older.
          </div>
          <p className="hyp-caveat">Harder is real, and big batches make these new cards worse on top of it (see the middle card).</p>
        </article>
      </div>
    </section>
  );
}
