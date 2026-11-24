import { formatShortDate } from '../lib/format';
import { getGuide, href } from '../lib/model';
import { NotFound, SaveButton } from '../components/common';

export function GuidePage({ id, section }: { id: string; section: number }) {
  const guide = getGuide(id);
  if (!guide) return <NotFound />;

  const total = guide.sections.length;
  const current = section > 0 ? guide.sections[section - 1] : undefined;
  const prevHref = section > 1 ? href.guide(guide.id, section - 1) : href.guide(guide.id);
  const nextHref = section < total ? href.guide(guide.id, section + 1) : undefined;

  return (
    <div className="guide">
      <aside className="guide-toc" aria-label="Guide sections">
        <p className="toc-title">{guide.title}</p>
        <ol>
          <li>
            <a href={href.guide(guide.id)} aria-current={section === 0 ? 'page' : undefined}>
              Start here
            </a>
          </li>
          {guide.sections.map((s, i) => (
            <li key={s.title}>
              <a href={href.guide(guide.id, i + 1)} aria-current={section === i + 1 ? 'page' : undefined}>
                <span className="toc-num">{i + 1}</span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </aside>

      <article className="guide-body">
        <div className="guide-head">
          <div>
            <p className="eyebrow">Pinned guide · {guide.byline}</p>
            <h1>{current ? current.title : guide.title}</h1>
          </div>
          <SaveButton saveKey={`guide:${guide.id}`} />
        </div>

        {current ? (
          <>
            <p className="hint">
              Section {section} of {total}
            </p>
            {current.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="guide-p">
                {p}
              </p>
            ))}
            {current.bullets && (
              <ul className="bullets">
                {current.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
            <nav className="pager" aria-label="Guide pages">
              <a className="btn" href={prevHref}>
                ← {section > 1 ? `Section ${section - 1}` : 'Start here'}
              </a>
              {nextHref ? (
                <a className="btn btn-primary" href={nextHref}>
                  Section {section + 1}: {guide.sections[section]?.title} →
                </a>
              ) : (
                <a className="btn" href={href.community(guide.communityId)}>
                  Back to the community
                </a>
              )}
            </nav>
          </>
        ) : (
          <>
            <p className="lede">{guide.intro}</p>
            <p className="hint">
              Updated {formatShortDate(guide.updatedAt)} · {total} sections
            </p>
            <ol className="section-index">
              {guide.sections.map((s, i) => (
                <li key={s.title}>
                  <a href={href.guide(guide.id, i + 1)}>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </>
        )}
      </article>
    </div>
  );
}
