import { PROFILES, fmtDow, fmtInterval, fmtUplink, type ProfileConfig } from './data'
import { fmtQA, useApp } from './store'
import { Badge, ViewHeader } from './ui'

const ROWS: { label: string; get: (c: ProfileConfig) => string }[] = [
  { label: 'Main Buoy', get: (c) => (c.retrieved.MB ? 'Out of water' : 'In water') },
  { label: 'Under-ice thermistors', get: (c) => fmtInterval(c.sensors['un-tc'].interval) },
  { label: 'Mooring DO sondes', get: (c) => fmtInterval(c.sensors['un-do13'].interval) },
  { label: 'North chlorophyll (Cyclops-7F)', get: (c) => (c.sensors['un-chl'].active ? fmtInterval(c.sensors['un-chl'].interval) : 'Off') },
  { label: 'Shore snow depth', get: (c) => (c.sensors['sm-snow'].active ? fmtInterval(c.sensors['sm-snow'].interval) : 'Off') },
  { label: 'Water temp rate of change', get: (c) => fmtQA('wt-roc', c.qa['wt-roc'], c.units.cond) },
  { label: 'Mooring low-battery cutoff', get: (c) => [...new Set([c.power.UN.cutoff, c.power.US.cutoff])].map((v) => `${v.toFixed(1)} V`).join(' / ') },
  { label: 'Shore Met cutoff', get: (c) => `${c.power.SM.cutoff.toFixed(1)} V` },
  { label: 'Mooring uplink', get: (c) => `every ${fmtUplink(c.power.UN.uplinkH)}` },
  { label: 'Conductivity unit', get: (c) => `${c.units.cond}${c.overrides.reyes?.cond ? ` (Reyes: ${c.overrides.reyes.cond})` : ''}` },
]

export function ProfilesView() {
  const { st, actions } = useApp()
  const cols = [
    { id: 'ow26', name: PROFILES.ow26.name, badge: <Badge tone="ok">Live</Badge>, span: PROFILES.ow26.span, note: PROFILES.ow26.note, c: PROFILES.ow26.config },
    { id: 'w2526', name: PROFILES.w2526.name, badge: <Badge tone="muted">Archived · draft source</Badge>, span: PROFILES.w2526.span, note: PROFILES.w2526.note, c: PROFILES.w2526.config },
    { id: 'draft', name: 'Winter 2026–27', badge: <Badge tone={st.scheduled ? 'accent' : 'edit'}>{st.scheduled ? 'Scheduled' : 'Draft'}</Badge>, span: `From ${fmtDow(st.retrieval.date)}, ${st.retrieval.time}`, note: 'Copied from Winter 2025–26 today.', c: st.draft },
    { id: 'storm', name: PROFILES.storm.name, badge: <Badge tone="muted">Overlay</Badge>, span: PROFILES.storm.span, note: PROFILES.storm.note, c: PROFILES.storm.config },
  ]
  return (
    <div className="view">
      <ViewHeader title="Profiles" sub="Three saved profiles plus the winter draft. A profile sets every sensor, rule and power setting at once; Storm Mode overlays whichever is live." />
      <div className="table-wrap">
        <table className="grid profiles">
          <thead>
            <tr>
              <th />
              {cols.map((col) => (
                <th key={col.id} className={col.id === 'draft' ? 'draft-col' : ''}>
                  <div className="p-name">{col.name} {col.badge}</div>
                  <div className="p-span">{col.span}</div>
                  <div className="p-note">{col.note}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const src = r.get(PROFILES.w2526.config)
              return (
                <tr key={r.label}>
                  <td className="s-var">{r.label}</td>
                  {cols.map((col) => {
                    const v = r.get(col.c)
                    return <td key={col.id} className={`${col.id === 'draft' ? 'draft-col' : ''} ${col.id === 'draft' && v !== src ? 'edited' : ''}`}>{v}</td>
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="note">Highlighted draft cells differ from Winter 2025–26. <button className="link" onClick={() => actions.setView('sensors')}>Edit the draft</button></p>
    </div>
  )
}
