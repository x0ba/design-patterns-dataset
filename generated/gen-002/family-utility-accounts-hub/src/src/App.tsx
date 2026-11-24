import { useCallback, useEffect, useRef, useState } from 'react';
import { KIND_LABEL, PROPERTIES, accountById, accountsFor, propertyById } from './data';
import { NoticeCtx, NoticeModal, SearchBox } from './components';
import { IconCheck, IconChevron, IconFlame, IconList, KindIcon, PropertyGlyph } from './icons';
import { Route, hrefFor, useRoute, useStore } from './store';
import { AccountPage, OpenItemsPage, PropertyPage, sortItems } from './pages';
import { daysFromNow, fmtDate, fmtNow, last4 } from './util';

export default function App() {
  const route = useRoute();
  const [notice, setNotice] = useState<string | null>(null);
  const openNotice = useCallback((id: string) => setNotice(id), []);
  const closeNotice = useCallback(() => setNotice(null), []);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [route.name, route.name !== 'items' ? route.propertyId : '', route.name === 'account' ? route.accountId : '']);

  const propertyId = route.name === 'items' ? null : route.name === 'account' ? accountById(route.accountId)?.propertyId ?? route.propertyId : route.propertyId;
  const prop = propertyId ? PROPERTIES.find((p) => p.id === propertyId) : undefined;

  return (
    <NoticeCtx.Provider value={openNotice}>
      <div className="shell">
        <Sidebar route={route} />
        <div className="right" style={prop ? { ['--pc' as string]: prop.color, ['--pt' as string]: prop.tint } : undefined}>
          <TopBar route={route} />
          <main className={`main ${prop ? 'in-prop' : ''}`} ref={mainRef}>
            {route.name === 'property' && <PropertyPage propertyId={route.propertyId} />}
            {route.name === 'account' && <AccountPage accountId={route.accountId} />}
            {route.name === 'items' && <OpenItemsPage />}
          </main>
        </div>
        {notice && <NoticeModal id={notice} onClose={closeNotice} />}
        <Toast />
      </div>
    </NoticeCtx.Provider>
  );
}

function Toast() {
  const { toast } = useStore();
  return (
    <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
      <IconCheck size={16} /> {toast}
    </div>
  );
}

function Sidebar({ route }: { route: Route }) {
  const { items } = useStore();
  const activeProp = route.name === 'items' ? null : route.name === 'account' ? accountById(route.accountId)?.propertyId : route.propertyId;
  const activeAcct = route.name === 'account' ? route.accountId : null;
  const open = items.filter((i) => i.status !== 'done').sort(sortItems);

  return (
    <nav className="side">
      <a className="brand" href="#/p/home">
        <span className="brand-mark"><IconFlame size={18} /></span>
        <span className="brand-name">Pilotlight</span>
      </a>

      <div className="side-h">Properties</div>
      <ul className="props">
        {PROPERTIES.map((p) => {
          const active = p.id === activeProp;
          const pOpen = open.filter((i) => i.propertyId === p.id);
          const needs = pOpen.filter((i) => i.status === 'action').length;
          return (
            <li key={p.id} className={active ? 'active' : ''} style={{ ['--pc' as string]: p.color, ['--pt' as string]: p.tint }}>
              <a className="prop-link" href={hrefFor({ name: 'property', propertyId: p.id })} aria-current={active && !activeAcct ? 'page' : undefined}>
                <span className="prop-ic"><PropertyGlyph glyph={p.glyph} size={18} /></span>
                <span className="prop-txt">
                  <span className="prop-n">{p.name}</span>
                  <span className="prop-a">{p.street}, {p.cityLine.split(',')[0]}</span>
                </span>
                {pOpen.length > 0 && <span className={`badge ${needs ? 'badge-hot' : ''}`} title={`${pOpen.length} open item(s)`}>{pOpen.length}</span>}
              </a>
              {active && (
                <ul className="side-accts">
                  {accountsFor(p.id).map((a) => {
                    const hot = open.some((i) => i.accountId === a.id && i.status === 'action');
                    const wait = open.some((i) => i.accountId === a.id && i.status === 'waiting');
                    return (
                      <li key={a.id}>
                        <a href={hrefFor({ name: 'account', propertyId: p.id, accountId: a.id })} className={a.id === activeAcct ? 'on' : ''} aria-current={a.id === activeAcct ? 'page' : undefined}>
                          <KindIcon kind={a.kind} size={15} />
                          <span className="sa-n">{shortProvider(a.provider)}</span>
                          <span className="sa-k">{SHORT_KIND[a.kind]}</span>
                          {hot && <span className="sa-dot hot" title="Needs you" />}
                          {!hot && wait && <span className="sa-dot wait" title="Waiting on provider" />}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <a className={`side-items-link ${route.name === 'items' ? 'on' : ''}`} href="#/open-items">
        <IconList size={17} /> Open items <span className="badge">{open.length}</span>
      </a>
      <ul className="side-items">
        {open.map((it) => {
          const p = propertyById(it.propertyId);
          const a = accountById(it.accountId)!;
          const n = it.due ? daysFromNow(it.due) : null;
          return (
            <li key={it.id} style={{ ['--pc' as string]: p.color }}>
              <a href={hrefFor({ name: 'account', propertyId: p.id, accountId: a.id })} className={activeAcct === a.id ? 'on' : ''}>
                <span className="si-bar" />
                <span className="si-txt">
                  <span className="si-t">{it.title}</span>
                  <span className="si-s">{p.name} · {shortProvider(a.provider)}</span>
                </span>
                {n !== null ? <span className={`si-due ${n <= 7 ? 'hot' : ''}`}>{fmtDate(it.due!)}</span> : it.status === 'waiting' ? <span className="si-due wait">Waiting</span> : null}
              </a>
            </li>
          );
        })}
      </ul>

      <div className="side-foot">
        <span className="avatar">DO</span>
        <span className="who"><b>Danielle Okafor</b><span>3 homes · 12 accounts</span></span>
      </div>
    </nav>
  );
}

const SHORT_KIND: Record<string, string> = { electric: 'Electric', gas: 'Gas', water: 'Water', trash: 'Trash', internet: 'Internet', propane: 'Propane' };

function shortProvider(p: string) {
  return p.replace(' of Ohio', '').replace(' — Public Utilities', '').replace(' — Water & Sewer', '').replace(' — Water', '').replace(' Waste & Recycling', '').replace('The ', '').replace(' Internet', '');
}

function TopBar({ route }: { route: Route }) {
  let crumbs: { label: string; href?: string; glyph?: 'home' | 'sale' | 'cabin' }[] = [];
  let prop = null as null | ReturnType<typeof propertyById>;
  if (route.name === 'items') crumbs = [{ label: 'Open items · all properties' }];
  else {
    const a = route.name === 'account' ? accountById(route.accountId) : undefined;
    prop = PROPERTIES.find((p) => p.id === (a?.propertyId ?? route.propertyId)) ?? null;
    if (prop) {
      crumbs.push({ label: prop.name, href: a ? hrefFor({ name: 'property', propertyId: prop.id }) : undefined, glyph: prop.glyph });
      if (a) crumbs.push({ label: `${a.provider} · ${KIND_LABEL[a.kind]} ••${last4(a.accountNumber)}` });
    }
  }
  return (
    <header className={`top ${prop ? 'in-prop' : ''}`}>
      <div className="crumbs">
        {prop && <span className="you-are">You’re in</span>}
        {crumbs.map((c, i) => (
          <span key={i} className={`crumb ${i === 0 ? 'crumb-first' : ''}`}>
            {i > 0 && <IconChevron size={14} className="crumb-sep" />}
            {c.href ? (
              <a href={c.href} className="crumb-prop">{c.glyph && <PropertyGlyph glyph={c.glyph} size={15} />}{c.label}</a>
            ) : (
              <span className={c.glyph ? 'crumb-prop' : 'crumb-cur'}>{c.glyph && <PropertyGlyph glyph={c.glyph} size={15} />}{c.label}</span>
            )}
          </span>
        ))}
        {prop && <span className="crumb-addr">{prop.street}, {prop.cityLine.split(',')[0]}</span>}
      </div>
      <SearchBox />
      <div className="now">{fmtNow()}</div>
    </header>
  );
}
