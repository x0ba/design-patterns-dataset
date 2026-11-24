import type { EventState } from './data';
import { addDays, eventIssues, fmtFull, fmtLong, parseISO, parseLoose } from './logic';
import { NAME_MAX } from './logic';
import { Counter, Icon } from './ui';

type Props = {
  e: EventState;
  setE: (patch: Partial<EventState>) => void;
  onPreview: (t: 'invite' | 'rsvp') => void;
};

export function EventPanel({ e, setE, onPreview }: Props) {
  const issues = eventIssues(e);
  const err = (f: keyof EventState) => issues.find((i) => i.field === f);
  const wedding = parseISO(e.date);
  const rsvpErr = err('rsvpBy');
  const namesErr = err('names');
  const suggestions = wedding
    ? [42, 28, 21].map((n) => ({ d: addDays(wedding, -n), weeks: n / 7 }))
    : [];
  const current = parseLoose(e.rsvpBy);

  return (
    <div className="panel event-panel" id="panel-event" role="tabpanel" aria-labelledby="tab-event">
      <section className="fgroup g-couple">
        <h2>The couple</h2>
        <div className="field">
          <div className="label-row">
            <label htmlFor="names">Names as they should print</label>
            <Counter value={e.names.length} max={NAME_MAX} />
          </div>
          <input id="names" value={e.names} onChange={(ev) => setE({ names: ev.target.value })} onFocus={() => onPreview('invite')}
            aria-invalid={!!namesErr} aria-describedby={namesErr ? 'names-err' : undefined} />
          {namesErr && <p className="err" id="names-err"><Icon name="alert" size={15} />{namesErr.message}</p>}
        </div>
        <div className="field">
          <label htmlFor="host">Host line</label>
          <input id="host" value={e.host} onChange={(ev) => setE({ host: ev.target.value })} onFocus={() => onPreview('invite')} />
          <p className="hint">Printed above your names, for example "together with their families".</p>
        </div>
      </section>

      <section className="fgroup g-day">
        <h2>The day</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="date">Wedding date</label>
            <input id="date" type="date" value={e.date} onChange={(ev) => setE({ date: ev.target.value })} onFocus={() => onPreview('invite')}
              aria-invalid={!!err('date')} />
            <p className="hint">{wedding ? fmtFull(wedding) : ''}</p>
          </div>
          <div className="field">
            <label htmlFor="ctime">Ceremony time</label>
            <input id="ctime" type="time" value={e.ceremonyTime} onChange={(ev) => setE({ ceremonyTime: ev.target.value })} onFocus={() => onPreview('invite')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="cvenue">Ceremony venue</label>
          <input id="cvenue" value={e.ceremonyVenue} onChange={(ev) => setE({ ceremonyVenue: ev.target.value })} onFocus={() => onPreview('invite')} />
        </div>
        <div className="field">
          <label htmlFor="caddr">Ceremony address</label>
          <input id="caddr" value={e.ceremonyAddress} onChange={(ev) => setE({ ceremonyAddress: ev.target.value })} onFocus={() => onPreview('invite')} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="rtime">Reception time</label>
            <input id="rtime" type="time" value={e.receptionTime} onChange={(ev) => setE({ receptionTime: ev.target.value })} onFocus={() => onPreview('invite')} />
          </div>
          <div className="field">
            <label htmlFor="rvenue">Reception venue</label>
            <input id="rvenue" value={e.receptionVenue} onChange={(ev) => setE({ receptionVenue: ev.target.value })} onFocus={() => onPreview('invite')} />
          </div>
        </div>
      </section>

      <section className={'fgroup g-reply reply' + (rsvpErr ? ' has-err' : '')}>
        <h2>Replies</h2>
        <div className="field">
          <label htmlFor="rsvp">RSVP-by date</label>
          <input id="rsvp" value={e.rsvpBy} onChange={(ev) => setE({ rsvpBy: ev.target.value })} onFocus={() => onPreview('rsvp')}
            placeholder="April 3, 2027" aria-invalid={!!rsvpErr} aria-describedby="rsvp-msg" className="rsvp-input" />
          <div id="rsvp-msg" aria-live="polite">
            {rsvpErr ? (
              <div className="callout red">
                <Icon name="alert" />
                <div>
                  <strong>{rsvpErr.message}</strong>
                  {rsvpErr.detail && <p>{rsvpErr.detail}</p>}
                </div>
              </div>
            ) : (
              <p className="ok"><Icon name="check" size={15} />Guests reply by {current ? fmtLong(current) : ''}.</p>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="chips" role="group" aria-label="Suggested RSVP dates">
              <span className="chips-label">Pick a date</span>
              {suggestions.map(({ d, weeks }) => (
                <button key={weeks} type="button" className={'chip' + (current && current.getTime() === d.getTime() ? ' on' : '')}
                  onClick={() => { setE({ rsvpBy: fmtLong(d) }); onPreview('rsvp'); }}>
                  {fmtLong(d)} <small>{weeks} weeks before</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="field">
          <label htmlFor="web">Wedding website</label>
          <input id="web" value={e.website} onChange={(ev) => setE({ website: ev.target.value })} onFocus={() => onPreview('rsvp')} />
        </div>
      </section>

      <section className="fgroup g-return">
        <h2>Return address <small>printed on the envelope flap</small></h2>
        <div className="grid-3">
          <div className="field">
            <label htmlFor="rn">Name</label>
            <input id="rn" value={e.returnName} onChange={(ev) => setE({ returnName: ev.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="r1">Street</label>
            <input id="r1" value={e.returnLine1} onChange={(ev) => setE({ returnLine1: ev.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="rc">City, state ZIP</label>
            <input id="rc" value={e.returnCity} onChange={(ev) => setE({ returnCity: ev.target.value })} />
          </div>
        </div>
      </section>
    </div>
  );
}
