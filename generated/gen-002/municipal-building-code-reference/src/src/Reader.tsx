import { useState } from 'react'
import { ChevronRight, Info, WifiOff, BookOpen, History, AlertTriangle } from 'lucide-react'
import { AudienceId, AudienceSettings, Decision, Edition, MEMOS, SECTIONS, TODAY, EFFECTIVE_2024, Lang } from './data'
import { fkGrade, fmtDate } from './logic'

interface Props {
  audience: AudienceId
  settings: AudienceSettings
  edition: '2021' | '2024'
  decisions: Record<string, Decision>
  historicalPublic: boolean
  bundle?: Edition[]
}

const LANG_NAME: Record<Lang, string> = { en: 'English', es: 'Español', vi: 'Tiếng Việt' }

export default function Reader({ audience, settings, edition: initial, decisions, historicalPublic, bundle }: Props) {
  const [override, setOverride] = useState<'2021' | '2024' | null>(null)
  const [lang, setLangState] = useState<Lang>('en')
  const [secId, setSecId] = useState('105.2')
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const edition = override ?? initial
  const offline = audience === 'inspectors'
  const inBundle = (e: Edition) => !offline || (bundle ?? []).includes(e)
  const langs: Lang[] = ['en', ...(settings.es ? (['es'] as Lang[]) : []), ...(settings.vi ? (['vi'] as Lang[]) : [])]
  const activeLang: Lang = langs.includes(lang) ? lang : 'en'
  const sec = SECTIONS.find((s) => s.id === secId)!
  const showNotice = settings.notice && TODAY <= settings.noticeUntil
  const summary = sec.summary[edition]
  const summaryText = settings.summaries ? summary[activeLang] ?? null : null
  const viMissing = settings.summaries && activeLang === 'vi' && !summary.vi
  const grade = fkGrade(summary.en)

  const memos = MEMOS.filter((m) => {
    if (m.section !== sec.id) return false
    const d = decisions[m.id]
    if (d === 'retire') return false
    if (d === 'historical' && audience === 'public' && !historicalPublic) return false
    return true
  })

  const amend = sec.amend[edition]
  const changed = true // every sample section differs between editions

  return (
    <div className={`reader ${offline ? 'reader-tablet' : ''}`}>
      <div className="reader-bar">
        <div className="reader-brand"><BookOpen size={14} /> Codeshelf Municipal</div>
        <div className="ed-tabs" role="tablist" aria-label="Edition">
          {(['2021', '2024'] as const).map((e) => (
            <button
              key={e}
              role="tab"
              aria-selected={edition === e}
              disabled={!inBundle(e)}
              className={`ed-tab ${edition === e ? 'on' : ''} ${e === '2024' ? 'e24' : 'e21'}`}
              onClick={() => setOverride(e)}
              title={!inBundle(e) ? 'Not in the offline bundle' : undefined}
            >
              {e}
              {e === initial && <span className="ed-default">default</span>}
            </button>
          ))}
        </div>
        <div className="reader-right">
          {offline && <span className="pill pill-offline"><WifiOff size={12} /> Offline · synced Nov 3</span>}
          {langs.length > 1 && (
            <div className="lang" role="group" aria-label="Summary language">
              {langs.map((l) => (
                <button key={l} className={activeLang === l ? 'on' : ''} onClick={() => setLangState(l)}>{l.toUpperCase()}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showNotice && (
        <div className="notice" role="note">
          <Info size={16} />
          <div>
            <strong>Code transition</strong>
            <p>{settings.noticeText}</p>
          </div>
        </div>
      )}

      {!inBundle(edition) ? (
        <div className="reader-empty">
          <AlertTriangle size={22} />
          <h4>The {edition} edition is not in this bundle</h4>
          <p>Inspectors would see this on site with no signal. Add {edition} to the offline bundle.</p>
        </div>
      ) : (
        <div className="reader-body">
          <nav className="reader-toc" aria-label="Sections">
            {SECTIONS.map((s) => (
              <button key={s.id} className={s.id === secId ? 'on' : ''} onClick={() => setSecId(s.id)}>
                <span className="toc-num">§{s.num}</span>
                <span className="toc-title">{s.title}</span>
              </button>
            ))}
          </nav>
          <article className="reader-article">
            <div className="art-chapter">{sec.chapter} · {edition} edition</div>
            <h3 className="art-title"><span>§{sec.num}</span> {sec.title}</h3>

            {edition === '2024' && (
              <div className="chg chg-new"><History size={13} /> Changed from 2021: {sec.changeNote}</div>
            )}
            {edition === '2021' && changed && (
              <div className="chg chg-old"><History size={13} /> Revised in the 2024 edition, effective {fmtDate(EFFECTIVE_2024)}. This text governs applications filed before that date.</div>
            )}

            {settings.summaries && (
              <section className="summary" aria-label="Plain-language summary">
                <header>
                  <span>Plain-language summary</span>
                  {activeLang === 'en' && (
                    <span className={`grade ${grade > settings.grade ? 'over' : ''}`}>
                      Grade {grade.toFixed(1)}{grade > settings.grade ? ` · above target ${settings.grade}` : ''}
                    </span>
                  )}
                  {activeLang !== 'en' && !viMissing && <span className="grade">{LANG_NAME[activeLang]}</span>}
                </header>
                {viMissing ? (
                  <>
                    <p className="summary-fallback">Bản tóm tắt tiếng Việt cho điều này chưa có. Vietnamese summary not available yet. Showing English.</p>
                    <p>{summary.en}</p>
                  </>
                ) : (
                  <p lang={activeLang}>{summaryText ?? summary.en}</p>
                )}
                <footer>Summary only. The code text below is what governs.</footer>
              </section>
            )}

            <div className={`code-wrap ${amend && settings.amendments === 'margin' ? 'with-margin' : ''}`}>
              <div className="code-text">
                {sec.text[edition].map((p, i) => <p key={i}>{p}</p>)}
                {settings.amendments === 'inline' && (
                  <div className="amend amend-inline">
                    <div className="amend-h"><span className="amend-tag">Local amendment</span> {amend.id}</div>
                    <p>{amend.text}</p>
                  </div>
                )}
                {settings.amendments === 'collapsed' && (
                  <div className="amend amend-collapsed">
                    <button
                      className="amend-toggle"
                      aria-expanded={!!open[sec.id + edition]}
                      onClick={() => setOpen({ ...open, [sec.id + edition]: !open[sec.id + edition] })}
                    >
                      <ChevronRight size={14} className={open[sec.id + edition] ? 'rot' : ''} />
                      <span className="amend-tag">Local amendment</span> {amend.id}
                    </button>
                    {open[sec.id + edition] && <p>{amend.text}</p>}
                  </div>
                )}
              </div>
              {settings.amendments === 'margin' && (
                <aside className="amend amend-margin">
                  <div className="amend-h"><span className="amend-tag">Local amendment</span> {amend.id}</div>
                  <p>{amend.text}</p>
                </aside>
              )}
            </div>

            <div className="memos">
              <h4>Interpretation memos</h4>
              {edition === '2024' ? (
                <p className="memo-empty">No interpretation memos have been issued for the 2024 edition yet.{' '}
                  {memos.length > 0 && <button className="linklike" onClick={() => setOverride('2021')}>{memos.length} memo{memos.length === 1 ? '' : 's'} on 2021 §{sec.num}</button>}
                </p>
              ) : memos.length === 0 ? (
                <p className="memo-empty">No memos on this section.</p>
              ) : (
                <ul>
                  {memos.map((m) => (
                    <li key={m.id}>
                      <span className="memo-id">{m.id}</span>
                      <span className="memo-title">{m.title}</span>
                      {decisions[m.id] === 'historical' && <span className="tag tag-hist">Historical</span>}
                      <span className="memo-date">{fmtDate(m.issued)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        </div>
      )}
    </div>
  )
}
