export default function Kpis({ kpis }) {
  const pct = kpis.total ? Math.round((kpis.placed / kpis.total) * 100) : 0;
  const cards = [
    {
      label: 'Placed',
      value: kpis.placed,
      sub: `of ${kpis.total} students · ${pct}%`,
      tone: 'neutral',
    },
    {
      label: 'Unplaced',
      value: kpis.unplaced,
      sub: 'still need a site before Friday',
      tone: 'neutral',
    },
    {
      label: 'Weekday-evening only',
      value: kpis.evening,
      sub: 'of the unplaced can only attend weekday evenings',
      tone: 'neutral',
    },
    {
      label: 'Evening seats open',
      value: kpis.eveningSeats,
      sub: `across ${kpis.eveningSitesWithSeats} sites that offer weekday evenings`,
      tone: kpis.eveningSeats < kpis.evening ? 'danger' : 'ok',
    },
    {
      label: 'Open seats, all sites',
      value: kpis.openSeats,
      sub: `of ${kpis.seatTotal} seats · ${kpis.sitesWithSeats} sites have room`,
      tone: 'neutral',
    },
    {
      label: 'No option under limit',
      value: kpis.noOption,
      sub: kpis.noOption === 1 ? 'unplaced student has no match' : 'unplaced students have no match',
      tone: kpis.noOption > 0 ? 'danger' : 'ok',
    },
  ];
  return (
    <section className="kpis" aria-label="Placement summary">
      {cards.map((c) => (
        <div key={c.label} className={`kpi tone-${c.tone}`}>
          <div className="kpi-label">{c.label}</div>
          <div className="kpi-value">{c.value}</div>
          <div className="kpi-sub">{c.sub}</div>
        </div>
      ))}
    </section>
  );
}
