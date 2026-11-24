import { useEffect, useState } from 'react';
import { generate, type Dataset } from './data/generate.ts';
import { M_ANNOUNCE, M_WINDOW_END, M_WINDOW_START, MINUTES, M_BATCH_START } from './data/scenario.ts';
import { fmtInt, hhmm } from './lib/format.ts';
import { OverviewView } from './views/OverviewView.tsx';
import { ConnectorsView } from './views/ConnectorsView.tsx';
import { ChangesView } from './views/ChangesView.tsx';
import { RequestsView } from './views/RequestsView.tsx';
import { VolumeView } from './views/VolumeView.tsx';
import { BriefingView } from './views/BriefingView.tsx';

type TabId = 'overview' | 'connectors' | 'changes' | 'requests' | 'volume' | 'briefing';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'connectors', label: 'Connectors' },
  { id: 'changes', label: 'Changes & checks' },
  { id: 'requests', label: 'Failed requests' },
  { id: 'volume', label: 'Volume vs last year' },
  { id: 'briefing', label: 'Briefing draft' },
];

const PRESETS: { label: string; sel: [number, number] }[] = [
  { label: 'Incident 08:10–10:45', sel: [M_WINDOW_START, M_WINDOW_END] },
  { label: 'Surge 07:35–14:00', sel: [M_ANNOUNCE, 2880 + 840] },
  { label: 'Batch and peak 06–12', sel: [2880 + 360, 2880 + 720] },
  { label: 'Deploy to Mon 06:00', sel: [2825, 2880 + 360] },
  { label: 'All 72 h', sel: [0, MINUTES] },
];

function useDataset(): Dataset | null {
  const [ds, setDs] = useState<Dataset | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => setDs(generate()), 0);
    return () => window.clearTimeout(id);
  }, []);
  return ds;
}

export default function App() {
  const ds = useDataset();
  const [tab, setTab] = useState<TabId>('overview');
  const [sel, setSel] = useState<[number, number]>([M_WINDOW_START, M_WINDOW_END]);

  const applySel = (m0: number, m1: number) => {
    const lo = Math.max(0, Math.min(m0, m1));
    const hi = Math.min(MINUTES, Math.max(m0, m1));
    setSel([lo, Math.max(hi, lo + 1)]);
  };

  if (!ds) {
    return (
      <div className="splash">
        <div className="splash-mark" />
        <div>Loading 72 hours of request traces…</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <circle cx="5" cy="13" r="3.2" fill="#1f5fbf" />
            <circle cx="13" cy="6" r="3.2" fill="#2a9d8f" />
            <circle cx="21" cy="13" r="3.2" fill="#d9622b" />
            <circle cx="13" cy="20" r="3.2" fill="#4a6fa5" />
            <path d="M8 12 L10 8 M16 8 L18.5 11 M8.5 15 L10.5 18 M15.5 18 L18 15" stroke="#7a8494" strokeWidth="1.4" fill="none" />
          </svg>
          <div>
            <div className="brand-name">Pathspan</div>
            <div className="brand-sub">Request tracing and performance analysis</div>
          </div>
        </div>
        <div className="scope">
          <span>Traces Sat 14 Nov 00:00 – Mon 16 Nov 23:59</span>
          <span className="dot" />
          <span>{fmtInt(ds.totalRequests)} requests</span>
          <span className="dot" />
          <span>14 services</span>
        </div>
        <div className="user">
          <div className="avatar">MD</div>
          <div>
            <div className="user-name">Marcus Delgado</div>
            <div className="user-role">Site reliability engineer</div>
          </div>
        </div>
      </header>

      <div className="demo-banner" role="note">
        Demo dataset: synthetic traces built to match the incident brief. Replace the generator with the production trace export before using any figure.
      </div>

      <section className="investigation">
        <div className="inv-title">
          <div className="inv-kicker">Open investigation</div>
          <h1>Cert-submit timeouts after Monday's claim surge</h1>
          <div className="inv-meta">
            Deputy commissioner's written explanation due <b>Wed 18 Nov</b>. Question: identity-verify v4.12, the mf-conn pool limit, or both?
          </div>
        </div>
        <div className="presets" role="group" aria-label="Quick ranges">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className={`preset ${p.sel[0] === sel[0] && p.sel[1] === sel[1] ? 'preset-on' : ''}`}
              onClick={() => applySel(p.sel[0], p.sel[1])}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'tab-on' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === 'overview' && <OverviewView ds={ds} failures={ds.failures} sel={sel} onSelect={applySel} />}
        {tab === 'connectors' && <ConnectorsView ds={ds} sel={sel} />}
        {tab === 'changes' && <ChangesView ds={ds} failures={ds.failures} samples={ds.samples} />}
        {tab === 'requests' && <RequestsView ds={ds} failures={ds.failures} samples={ds.samples} sel={sel} />}
        {tab === 'volume' && <VolumeView ds={ds} />}
        {tab === 'briefing' && <BriefingView ds={ds} failures={ds.failures} samples={ds.samples} />}
      </main>

      <footer className="footer">
        Times are local. Latency is measured at the claims-web edge. Connector use is estimated from traces, not read from the mainframe.
        <span className="footer-batch"> Batch window {hhmm(M_BATCH_START)}–08:30 Monday.</span>
      </footer>
    </div>
  );
}
