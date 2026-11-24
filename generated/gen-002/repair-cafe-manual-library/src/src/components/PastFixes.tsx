import { useState } from 'react';
import { RepairLog, OUTCOME_LABEL } from '../data/types';
import { volunteerToday, ME } from '../data/people';
import { fmtDayDate, firstName, plural } from '../lib/format';
import { LogGroups } from '../lib/search';
import { IconPin, IconWrench } from './icons';
import { RichText } from './ScanPage';

export interface PageRefTarget {
  docId: string;
  maxPage: number;
}

interface CardProps {
  log: RepairLog;
  emphasis?: boolean;
  defaultOpen?: boolean;
  refTarget?: (log: RepairLog) => PageRefTarget | undefined;
  onOpenPage?: (docId: string, page: number) => void;
}

export function LogCard({ log, emphasis, defaultOpen, refTarget, onOpenPage }: CardProps) {
  const [open, setOpen] = useState(!!defaultOpen);
  const where = volunteerToday(log.fixer);
  const target = refTarget?.(log);
  return (
    <article className={`log ${emphasis ? 'log-em' : ''}`}>
      <header className="log-head">
        <span className={`outcome outcome-${log.outcome}`}>{OUTCOME_LABEL[log.outcome]}</span>
        <span className="log-date">{fmtDayDate(log.date)}</span>
      </header>
      <div className="log-item">{log.item}</div>
      <p className="log-fault">“{log.fault}”</p>
      {open ? (
        <div className="log-notes">
          <div className="log-notes-label">What {log.fixer === ME ? 'you' : firstName(log.fixer)} found</div>
          <p>
            <RichText
              text={log.notes}
              ctx={{ terms: [], maxPage: target?.maxPage ?? 0, onPage: target && onOpenPage ? (n) => onOpenPage(target.docId, n) : undefined }}
            />
          </p>
          {log.parts && (
            <p className="log-parts">
              <b>Parts used:</b> {log.parts}
            </p>
          )}
          <p className="log-time">Took about {log.minutes} min</p>
        </div>
      ) : null}
      <footer className="log-foot">
        <span className="log-fixer">
          <IconWrench size={15} /> {log.fixer === ME ? 'You' : log.fixer}
          {where && log.fixer !== ME && (
            <span className="here-today" title={`${log.fixer} is volunteering today`}>
              <IconPin size={13} /> Here today · {where}
            </span>
          )}
        </span>
        <button className="link-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Hide notes' : 'Show notes'}
        </button>
      </footer>
    </article>
  );
}

interface Props {
  groups: LogGroups;
  itemLabel: string;
  faultLabel: string;
  totalLogs: number;
  recent: RepairLog[];
  refTarget: (log: RepairLog) => PageRefTarget | undefined;
  onOpenPage: (docId: string, page: number) => void;
  onFocusFault: () => void;
}

export function PastFixes({ groups, itemLabel, faultLabel, totalLogs, recent, refTarget, onOpenPage, onFocusFault }: Props) {
  const [showAllFault, setShowAllFault] = useState(false);
  const [showAllItem, setShowAllItem] = useState(false);
  const hasItem = !!itemLabel;
  const hasFault = !!faultLabel;
  const nothingTyped = !hasItem && !hasFault;
  const fixedCount = groups.sameBoth.filter((l) => l.outcome === 'fixed').length;

  return (
    <aside className="fixes" aria-label="Past repairs">
      <div className="fixes-head">
        <h2>Fixed before?</h2>
        <p className="muted">Searching {plural(totalLogs, 'repair log')} from past sessions</p>
      </div>

      {nothingTyped && (
        <div className="fixes-empty">
          <p>
            Type the item and what’s wrong with it above. Repairs other volunteers have logged for the same thing will show up here.
          </p>
          <h3 className="group-title">Logged at the last session</h3>
          {recent.map((l) => (
            <LogCard key={l.id} log={l} />
          ))}
        </div>
      )}

      {!nothingTyped && (
        <div className="fixes-body">
          {hasItem && hasFault && (
            <section>
              <h3 className="group-title">
                Same item, same fault <span className="count">{groups.sameBoth.length}</span>
              </h3>
              {groups.sameBoth.length ? (
                <>
                  <p className="group-summary">
                    {fixedCount > 0
                      ? `${plural(groups.sameBoth.length, 'repair')} like this one — ${fixedCount} fixed.`
                      : `${plural(groups.sameBoth.length, 'repair')} like this one, none fully fixed.`}
                  </p>
                  {groups.sameBoth.map((l, i) => (
                    <LogCard key={l.id} log={l} emphasis defaultOpen={i < 2} refTarget={refTarget} onOpenPage={onOpenPage} />
                  ))}
                </>
              ) : (
                <p className="group-none">Nobody has logged this exact fault on this item yet.</p>
              )}
            </section>
          )}

          {hasItem && !hasFault && (
            <div className="nudge">
              <p>What’s wrong with it? Add the fault to see if anyone has fixed the same problem.</p>
              <button className="btn btn-quiet" onClick={onFocusFault}>
                Add the fault
              </button>
            </div>
          )}

          {hasItem && groups.sameItem.length > 0 && (
            <section>
              <h3 className="group-title">
                {hasFault ? 'Same item, other problems' : 'Repairs on this item'} <span className="count">{groups.sameItem.length}</span>
              </h3>
              {(showAllItem ? groups.sameItem : groups.sameItem.slice(0, 3)).map((l) => (
                <LogCard key={l.id} log={l} refTarget={refTarget} onOpenPage={onOpenPage} defaultOpen={!hasFault} />
              ))}
              {groups.sameItem.length > 3 && (
                <button className="link-btn more" onClick={() => setShowAllItem(!showAllItem)}>
                  {showAllItem ? 'Show fewer' : `Show all ${groups.sameItem.length}`}
                </button>
              )}
            </section>
          )}

          {hasItem && !hasFault && groups.sameItem.length === 0 && (
            <p className="group-none">No repairs logged for “{itemLabel}” yet.</p>
          )}

          {hasFault && (
            <section>
              <h3 className="group-title">
                {hasItem ? 'Same fault on other items' : `“${faultLabel}”`} <span className="count">{groups.sameFault.length}</span>
              </h3>
              {groups.sameFault.length === 0 && <p className="group-none">No other repairs logged with this fault.</p>}
              {(showAllFault ? groups.sameFault : groups.sameFault.slice(0, hasItem ? 2 : 5)).map((l) => (
                <LogCard key={l.id} log={l} />
              ))}
              {groups.sameFault.length > (hasItem ? 2 : 5) && (
                <button className="link-btn more" onClick={() => setShowAllFault(!showAllFault)}>
                  {showAllFault ? 'Show fewer' : `Show all ${groups.sameFault.length}`}
                </button>
              )}
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
