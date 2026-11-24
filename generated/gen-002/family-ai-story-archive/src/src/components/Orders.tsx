import { fmtDate, fmtDay, money, TODAY, parse } from '../format';
import { go, href } from '../router';
import { StoryArt } from '../art';
import { useStore } from '../store';
import { IconBox, IconChevronL } from '../icons';

export function Orders() {
  const { orders, byId } = useStore();
  const sorted = orders.slice().sort((a, b) => (a.orderedAt < b.orderedAt ? 1 : -1));
  const books = orders.reduce((n, o) => n + o.qty, 0);
  return (
    <div className="page orders">
      <nav className="crumbs"><a href={href('')} className="back"><IconChevronL size={16} /> Back to the archive</a></nav>
      <h1 className="ptitle">Printed books</h1>
      <p className="lead">{orders.length} {orders.length === 1 ? 'order' : 'orders'}, {books} {books === 1 ? 'book' : 'books'} printed. The most recent was {fmtDate(sorted[0].orderedAt)}.</p>
      <div className="olist">
        {sorted.map((o) => {
          const s = byId(o.storyId);
          const v = s?.versions.find((x) => x.id === o.versionId);
          const delivered = parse(o.deliveredAt + 'T00:00') <= TODAY;
          return (
            <article key={o.id} className="ocard">
              <span className="oth">{s && <StoryArt story={s} />}</span>
              <div className="obody">
                <h2>{o.title}</h2>
                {s && s.title !== o.title && <small className="dim">Story: {s.title}</small>}
                <div className="ometa">
                  {o.qty} × {o.format} · {money(o.total)} · ordered by {o.by} on {fmtDay(o.orderedAt)}
                </div>
                {v && s && s.versions.length > 1 && <div className="ometa">Ending printed: {v.label}</div>}
                {o.dedication && <div className="ometa">Dedication: <i>{o.dedication}</i></div>}
              </div>
              <div className="ostat">
                <span className={'status' + (delivered ? ' ok' : '')}>{delivered ? `Delivered ${fmtDate(o.deliveredAt + 'T00:00')}` : `Arriving by ${fmtDate(o.deliveredAt + 'T00:00')}`}</span>
                <small>Order {o.id}</small>
                {s && <button className="btn ghost sm" onClick={() => go(`print/${s.id}${v ? `?v=${v.id}` : ''}`)}><IconBox size={15} /> Order again</button>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
