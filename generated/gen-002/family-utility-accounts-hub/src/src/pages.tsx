import { useState } from 'react';
import { ACCOUNTS, Account, ItemStatus, KIND_LABEL, NOTICES, OpenItem, PROPERTIES, Reading, accountById, accountsFor, propertyById } from './data';
import {
  BillsChart, Collapse, ContactRow, CopyButton, DueChip, ItemCard, KindTile, NoticeList, NotesPanel, PropertyChip, STATUS_LABEL, Section, billStatusText,
} from './components';
import { IconAlert, IconCheck, IconChevron, IconGauge, IconKey, IconList, IconMail, IconNote, IconPhone, IconReceipt, IconRepeat, IconUser, KindIcon, PropertyGlyph } from './icons';
import { hrefFor, useStore } from './store';
import { daysBetween, daysFromNow, fmtDate, fmtMonth, hoursStatus, iso, last4, money, NOW, plural } from './util';

const pvars = (color: string, tint: string) => ({ ['--pc' as string]: color, ['--pt' as string]: tint });

// =====================================================================
// Property page
// =====================================================================
export function PropertyPage({ propertyId }: { propertyId: string }) {
  const p = PROPERTIES.find((x) => x.id === propertyId);
  const { items } = useStore();
  if (!p) return <NotFound />;
  const accts = accountsFor(p.id);
  const openItems = items.filter((i) => i.propertyId === p.id && i.status !== 'done');
  const yearTotal = accts.reduce((s, a) => s + a.bills.filter((b) => daysBetween(b.issued, iso(NOW)) <= 365).reduce((t, b) => t + b.amount, 0), 0);

  return (
    <div className="page" style={pvars(p.color, p.tint)}>
      <header className="prop-head">
        <span className="prop-glyph"><PropertyGlyph glyph={p.glyph} size={30} /></span>
        <div className="prop-title">
          <div className="eyebrow">Property</div>
          <h1>{p.name}</h1>
          <div className="prop-addr">{p.street}, {p.cityLine}</div>
        </div>
        <span className="spacer" />
        <div className="prop-stats">
          <div><b>{accts.length}</b><span>accounts</span></div>
          <div><b className={openItems.some((i) => i.status === 'action') ? 'warn' : ''}>{openItems.length}</b><span>open items</span></div>
          <div><b>{money(Math.round(yearTotal))}</b><span>billed, last 12 mo</span></div>
        </div>
      </header>
      <div className="prop-status"><span className="pdot" /> {p.status}</div>

      <div className="grid-main">
        <div className="col">
          <Section title={`Accounts at ${p.name}`} icon={<IconReceipt size={18} />} right={<span className="muted small">{p.street}, {p.cityLine.split(',')[0]}</span>}>
            <div className="acct-grid">
              {accts.map((a) => <AccountCard key={a.id} account={a} items={items.filter((i) => i.accountId === a.id && i.status !== 'done')} />)}
            </div>
          </Section>

          {openItems.length > 0 && (
            <Section title={`Open items at ${p.name}`} icon={<IconList size={18} />} right={<a className="linkbtn" href="#/open-items">All properties →</a>}>
              <div className="items-stack">
                {openItems.sort(sortItems).map((it) => <ItemCard key={it.id} item={it} showProperty={false} />)}
              </div>
            </Section>
          )}
        </div>

        <aside className="col">
          <Section title="About this property" icon={<PropertyGlyph glyph={p.glyph} size={18} />}>
            <dl className="facts">
              {p.facts.map((f) => (<div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>))}
            </dl>
          </Section>
          {p.access && (
            <Section title="Getting into the house" icon={<IconKey size={18} />}>
              <ul className="access">{p.access.map((x) => <li key={x}>{x}</li>)}</ul>
            </Section>
          )}
          {p.people.length > 0 && (
            <Section title="People" icon={<IconUser size={18} />}>
              <ul className="people">
                {p.people.map((x) => (
                  <li key={x.name}>
                    <div className="person-n">{x.name}</div>
                    <div className="person-r">{x.role}</div>
                    {x.phone && <div className="person-p"><a href={`tel:${x.phone.replace(/\D/g, '')}`}><IconPhone size={14} /> {x.phone}</a>{x.note && <span className="muted"> · {x.note}</span>}</div>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <Section title={`Notes for ${p.name}`} icon={<IconNote size={18} />}>
            <NotesPanel propertyId={p.id} showAccount compact />
          </Section>
        </aside>
      </div>
    </div>
  );
}

function AccountCard({ account: a, items }: { account: Account; items: OpenItem[] }) {
  const latest = a.bills[0];
  const st = billStatusText(latest);
  const notDanielle = a.holder !== 'Danielle Okafor';
  return (
    <a className="acct-card" href={hrefFor({ name: 'account', propertyId: a.propertyId, accountId: a.id })}>
      <div className="acct-card-top">
        <KindTile account={a} size={38} />
        <div className="acct-card-name">
          <div className="acct-prov">{a.provider}</div>
          <div className="acct-kind">{KIND_LABEL[a.kind]}</div>
        </div>
        <span className="acct-last4">••{last4(a.accountNumber)}</span>
      </div>
      <div className="acct-card-body">
        <div className="kv"><span>Holder</span><b className={notDanielle ? 'holder-other' : ''}>{a.holder}</b></div>
        <div className="kv"><span>{a.kind === 'propane' ? 'Last charge' : 'Last bill'}</span><b>{money(latest.amount)}</b></div>
        <div className="kv"><span>Status</span><b className={`tone-${st.tone}`}>{st.text}</b></div>
        <div className="kv"><span>Autopay</span><b>{a.autopay.on ? 'On' : 'Off'}</b></div>
      </div>
      {(a.flags.length > 0 || items.length > 0) && (
        <div className="acct-card-flags">
          {items.map((i) => (
            <span key={i.id} className={`flag flag-${i.status}`}>
              {i.status === 'action' ? <IconAlert size={13} /> : <IconRepeat size={13} />}
              {i.title}{i.due ? ` · by ${fmtDate(i.due)}` : i.ref ? ` · ${i.ref}` : ''}
            </span>
          ))}
          {a.flags.filter((f) => !(f.includes('pending') && items.length) && !(f.includes('shutoff') && items.length)).map((f) => <span key={f} className="flag">{f}</span>)}
        </div>
      )}
      <span className="acct-open">Open account <IconChevron size={14} /></span>
    </a>
  );
}

export function sortItems(a: OpenItem, b: OpenItem) {
  const rank: Record<ItemStatus, number> = { action: 0, waiting: 1, todo: 2, done: 3 };
  if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
  const ad = a.due ? daysFromNow(a.due) : 999, bd = b.due ? daysFromNow(b.due) : 999;
  if (ad !== bd) return ad - bd;
  return a.opened < b.opened ? -1 : 1;
}

// =====================================================================
// Account page
// =====================================================================
export function AccountPage({ accountId }: { accountId: string }) {
  const a = accountById(accountId);
  const { items } = useStore();
  if (!a) return <NotFound />;
  const p = propertyById(a.propertyId);
  const accItems = items.filter((i) => i.accountId === a.id);
  const open = accItems.filter((i) => i.status !== 'done').sort(sortItems);
  const done = accItems.filter((i) => i.status === 'done');
  const notices = NOTICES.filter((n) => n.accountId === a.id).sort((x, y) => (x.received < y.received ? 1 : -1));
  const twins = ACCOUNTS.filter((x) => x.provider === a.provider && x.id !== a.id);
  const isMine = a.holder === 'Danielle Okafor';

  return (
    <div className="page" style={pvars(p.color, p.tint)}>
      <header className="acct-head">
        <KindTile account={a} size={56} />
        <div className="acct-head-main">
          <div className="eyebrow"><PropertyGlyph glyph={p.glyph} size={14} /> {p.name} · {KIND_LABEL[a.kind]}</div>
          <h1>{a.provider}</h1>
          <div className="acct-head-sub">
            Service address <b>{a.serviceAddress}</b>
          </div>
        </div>
        <span className="spacer" />
        <div className="acct-num-box">
          <div className="acct-num-label">Account number</div>
          <div className="acct-num">{a.accountNumber}</div>
          <div className="acct-num-holder">In the name of <b>{a.holder}</b></div>
          <CopyButton text={a.accountNumber} label="Copy number" what="account number" />
        </div>
      </header>

      <div className="identity">
        <IconCheck size={17} />
        <span>
          You’re looking at <b>{isMine ? 'your' : p.id === 'dad' ? 'Dad’s' : `${a.holder.split(' ')[0]}’s`} {KIND_LABEL[a.kind].toLowerCase()} account at {p.street}</b>
          {!isMine && a.authorized.includes('Danielle Okafor') && <> — you’re listed as the authorized contact</>}
          {isMine && a.authorized.length > 0 && <> — {a.authorized.join(', ')} is also authorized</>}.
        </span>
        {twins.map((t) => {
          const tp = propertyById(t.propertyId);
          return (
            <a key={t.id} className="twin" href={hrefFor({ name: 'account', propertyId: tp.id, accountId: t.id })} style={pvars(tp.color, tp.tint)}>
              {tp.id === 'home' ? 'Your own' : `${tp.name}’s`} {t.provider.replace(' of Ohio', '')} account is ••{last4(t.accountNumber)} <IconChevron size={13} />
            </a>
          );
        })}
      </div>

      <div className="grid-main">
        <div className="col">
          {open.length > 0 && (
            <section className="attention">
              <h2 className="attention-h"><IconAlert size={18} /> Needs attention on this account</h2>
              {open.map((it) => (
                <div key={it.id} className="attention-pair">
                  <ItemCard item={it} showProperty={false} showAccount={false} emphasize />
                  <CallPrep account={a} item={it} />
                </div>
              ))}
            </section>
          )}

          {a.meter && a.readings.length > 0 && <ReadingsCard account={a} />}

          <Section title={a.kind === 'propane' ? 'Deliveries & charges' : 'Last 12 bills'} icon={<IconReceipt size={18} />} right={<span className="muted small">{a.billingCycle}</span>}>
            {a.kind !== 'propane' && <BillsChart account={a} />}
            <BillsTable account={a} defaultOpen={a.kind === 'propane'} />
          </Section>

          {done.length > 0 && (
            <Section title="Past requests" icon={<IconRepeat size={18} />}>
              <div className="items-stack">{done.map((it) => <ItemCard key={it.id} item={it} showProperty={false} showAccount={false} />)}</div>
            </Section>
          )}
        </div>

        <aside className="col">
          <Section title="Phone numbers & hours" icon={<IconPhone size={18} />}>
            <div className="contacts">{a.contacts.map((c) => <ContactRow key={c.id} c={c} />)}</div>
          </Section>
          <Section title="Saved notices" icon={<IconMail size={18} />} right={<span className="muted small">{notices.length}</span>}>
            <NoticeList notices={notices} />
          </Section>
          <Section title="My notes" icon={<IconNote size={18} />}>
            <NotesPanel propertyId={p.id} accountId={a.id} />
          </Section>
          <Section title="Account details" icon={<IconList size={18} />}>
            <dl className="facts">
              <div><dt>Account holder</dt><dd>{a.holder}</dd></div>
              <div><dt>Authorized</dt><dd>{a.authorized.length ? a.authorized.join(', ') : '—'}</dd></div>
              <div><dt>Autopay</dt><dd>{a.autopay.on ? 'On' : 'Off'} · {a.autopay.detail}</dd></div>
              <div><dt>Paperless</dt><dd>{a.paperless}</dd></div>
              <div><dt>Plan</dt><dd>{a.plan}</dd></div>
              <div><dt>Billing</dt><dd>{a.billingCycle}</dd></div>
              <div><dt>Customer since</dt><dd>{a.since}</dd></div>
              {a.meter && <div><dt>Meter</dt><dd>{a.meter.number} · {a.meter.kind}</dd></div>}
              {a.meter && <div><dt>Meter location</dt><dd>{a.meter.location}</dd></div>}
            </dl>
          </Section>
        </aside>
      </div>
    </div>
  );
}

function CallPrep({ account: a, item }: { account: Account; item: OpenItem }) {
  const p = propertyById(a.propertyId);
  const c = a.contacts.find((x) => x.source) ?? a.contacts.find((x) => x.phone && x.hours !== '24/7') ?? a.contacts[0];
  if (!c?.phone || item.status === 'done') return null;
  const st = hoursStatus(c.hours);
  const showAccess = item.kind === 'Notice' && p.access;
  return (
    <div className="callprep">
      <div className="callprep-h">For the call</div>
      <div className="cp-row">
        <span className="cp-k">Call</span>
        <span className="cp-v">
          <span className="cp-label">{c.label}</span>
          <span className="cp-phone"><a href={`tel:${c.phone.replace(/\D/g, '')}`}>{c.phone}</a> <CopyButton text={c.phone} what="phone number" iconOnly /></span>
          <span className={`hours ${st.open ? 'is-open' : 'is-closed'}`}><span className="dot" /> <b>{st.label}</b></span>
        </span>
      </div>
      <div className="cp-row">
        <span className="cp-k">Account #</span>
        <span className="cp-v"><span className="cp-acct">{a.accountNumber}</span> <CopyButton text={a.accountNumber} what="account number" iconOnly /></span>
      </div>
      {item.ref && item.kind === 'Service request' && (
        <div className="cp-row"><span className="cp-k">Request #</span><span className="cp-v"><span className="cp-acct">{item.ref}</span></span></div>
      )}
      <div className="cp-row">
        <span className="cp-k">Name on it</span>
        <span className="cp-v">{a.holder}{a.holder !== 'Danielle Okafor' && <span className="muted"> — say you’re the authorized contact</span>}</span>
      </div>
      {showAccess && (
        <div className="cp-row">
          <span className="cp-k">Access</span>
          <span className="cp-v"><ul className="access tight">{p.access!.map((x) => <li key={x}>{x}</li>)}</ul></span>
        </div>
      )}
    </div>
  );
}

function ReadingsCard({ account: a }: { account: Account }) {
  const m = a.meter!;
  const { items } = useStore();
  const [all, setAll] = useState(false);
  const isTank = m.unit === '%';
  const rs = a.readings;
  const lastActual = rs.find((r) => r.type !== 'estimated');
  let streak = 0;
  while (streak < rs.length && rs[streak].type === 'estimated') streak++;
  const streakMonths = rs.slice(0, streak).reverse().map((r) => fmtMonth(r.date).split(' ')[0]);
  const shown = all ? rs : rs.slice(0, 6);
  const shutoff = items.find((i) => i.accountId === a.id && i.status !== 'done' && /shutoff/i.test(i.title));
  const fmtVal = (r: Reading) => (isTank ? `${r.value}%` : r.value.toLocaleString(undefined, { maximumFractionDigits: 1 }));

  return (
    <Section title={isTank ? 'Tank gauge readings' : 'Meter readings'} icon={<IconGauge size={18} />} right={<span className="muted small">{m.number} · {m.location}</span>}>
      {!isTank && (
        <div className="read-summary">
          <div className={`rs-tile ${streak >= 2 ? 'warn' : ''}`}>
            <span className="rs-k">Last actual reading</span>
            <span className="rs-v">{lastActual ? fmtDate(lastActual.date, { weekday: true, year: true }) : '—'}</span>
            {lastActual && <span className="rs-s">{plural(daysBetween(lastActual.date, iso(NOW)), 'day')} ago · {fmtVal(lastActual)} {m.readingLabel}</span>}
          </div>
          <div className={`rs-tile ${streak >= 2 ? 'warn' : streak === 0 ? 'ok' : ''}`}>
            <span className="rs-k">Estimated in a row</span>
            <span className="rs-v">{streak === 0 ? 'None' : streak}</span>
            <span className="rs-s">{streak === 0 ? 'Latest reading was actual' : `${streakMonths.join(', ')} readings were estimated`}</span>
          </div>
          <div className="rs-tile">
            <span className="rs-k">How it’s read</span>
            <span className="rs-v small-v">{m.kind}</span>
            <span className="rs-s">{m.location}</span>
          </div>
        </div>
      )}
      {streak >= 2 && (
        <p className="callout warn"><IconAlert size={16} /> The provider has estimated {streak} readings in a row. When they get an actual reading, the next bill may include a catch-up adjustment.</p>
      )}
      {shutoff && <ShutoffEvidence account={a} openedIso={shutoff.opened} />}
      <table className="tbl">
        <thead>
          <tr>
            <th>Date</th>
            <th className="num">{isTank ? 'Tank level' : `Reading (${m.readingLabel})`}</th>
            {!isTank && <th className="num">{m.usageLabel}</th>}
            <th>How it was read</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={r.date + i} className={r.type === 'estimated' ? 'row-est' : ''}>
              <td>{fmtDate(r.date, { year: true })}</td>
              <td className="num mono">{isTank ? <TankBar v={r.value} /> : fmtVal(r)}</td>
              {!isTank && <td className="num mono">{r.usage.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>}
              <td>
                <span className={`rbadge rb-${r.type}`}>{r.type === 'actual' ? 'Actual' : r.type === 'estimated' ? 'Estimated' : 'Read by family'}</span>
                {r.note && <span className="muted small"> {r.note}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rs.length > 6 && <button className="linkbtn tbl-more" onClick={() => setAll((v) => !v)}>{all ? 'Show fewer' : `Show all ${rs.length} readings`}</button>}
    </Section>
  );
}

function ShutoffEvidence({ account: a, openedIso }: { account: Account; openedIso: string }) {
  const after = a.readings.filter((r) => r.date > openedIso);
  const latest = after[0];
  const zeroMonths = a.readings.filter((r) => r.usage === 0);
  if (!latest) return null;
  const stillUsing = latest.usage > 0;
  return (
    <div className={`callout ${stillUsing ? 'warn' : 'ok'}`}>
      {stillUsing ? <IconAlert size={16} /> : <IconCheck size={16} />}
      <div>
        <b>{stillUsing ? 'No sign the water has been shut off yet.' : 'Usage has dropped to zero.'}</b>{' '}
        The {fmtDate(latest.date)} reading (after your {fmtDate(openedIso)} request) shows {latest.usage.toLocaleString()} gal used.
        {zeroMonths.length > 0 && <> Last winter, after the shutoff was completed, readings were 0 gal ({fmtMonth(zeroMonths[zeroMonths.length - 1].date)} – {fmtMonth(zeroMonths[0].date)}).</>}
      </div>
    </div>
  );
}

function TankBar({ v }: { v: number }) {
  return (
    <span className="tankbar"><span className="tb-fill" style={{ width: `${v}%`, background: v < 30 ? '#c2410c' : 'var(--pc)' }} /><span className="tb-v">{v}%</span></span>
  );
}

function BillsTable({ account: a, defaultOpen }: { account: Account; defaultOpen?: boolean }) {
  const table = (
    <table className="tbl">
      <thead><tr><th>{a.kind === 'propane' ? 'Charge' : 'Bill'}</th><th className="num">Amount</th>{a.bills.some((b) => b.usage) && <th className="num">Usage</th>}<th>Due</th><th>Status</th></tr></thead>
      <tbody>
        {a.bills.map((b) => {
          const st = billStatusText(b);
          return (
            <tr key={b.id} className={b.estimated ? 'row-est' : ''}>
              <td>{b.label}{b.estimated && <span className="rbadge rb-estimated sm">Est.</span>}</td>
              <td className="num mono">{money(b.amount)}</td>
              {a.bills.some((x) => x.usage) && <td className="num mono">{b.usage ?? '—'}</td>}
              <td>{fmtDate(b.due, { year: true })}</td>
              <td className={`tone-${st.tone}`}>{st.text}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
  if (defaultOpen) return table;
  return <Collapse label={`Show all ${a.bills.length} bills as a table`}>{table}</Collapse>;
}

// =====================================================================
// Open items (all properties)
// =====================================================================
export function OpenItemsPage() {
  const { items } = useStore();
  const [filter, setFilter] = useState<'open' | ItemStatus>('open');
  const counts = {
    open: items.filter((i) => i.status !== 'done').length,
    action: items.filter((i) => i.status === 'action').length,
    waiting: items.filter((i) => i.status === 'waiting').length,
    todo: items.filter((i) => i.status === 'todo').length,
    done: items.filter((i) => i.status === 'done').length,
  };
  const list = items.filter((i) => (filter === 'open' ? i.status !== 'done' : i.status === filter)).sort(sortItems);
  const tabs: { k: 'open' | ItemStatus; l: string }[] = [
    { k: 'open', l: 'All open' },
    { k: 'action', l: STATUS_LABEL.action },
    { k: 'waiting', l: STATUS_LABEL.waiting },
    { k: 'todo', l: STATUS_LABEL.todo },
    { k: 'done', l: STATUS_LABEL.done },
  ];
  return (
    <div className="page page-neutral">
      <header className="prop-head">
        <span className="prop-glyph neutral"><IconList size={28} /></span>
        <div className="prop-title">
          <div className="eyebrow">All properties</div>
          <h1>Open items</h1>
          <div className="prop-addr">Notices that need a response, service requests you’re waiting on, and to-dos.</div>
        </div>
      </header>
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.k} className={`tab ${filter === t.k ? 'on' : ''}`} onClick={() => setFilter(t.k)}>{t.l} <span className="tab-n">{counts[t.k]}</span></button>
        ))}
      </div>
      {list.length === 0 && <p className="muted pad-t">Nothing here.</p>}
      <div className="items-grid">
        {list.map((it) => <ItemCard key={it.id} item={it} />)}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="page"><h1>Not found</h1><p><a href="#/p/home">Back to My house</a></p></div>
  );
}

// re-exports for sidebar
export { DueChip, PropertyChip, KindIcon };
