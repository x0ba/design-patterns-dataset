import { useMemo, useState } from 'react';
import { ACCENTS, DATA, ENV_SHORT, FLAG_POLYGON, SavedRegion, STATUS_COLORS, TEAM } from '../data/model';
import { regionStats, RegionStats, DATASET_TRAIN_PER_EVAL } from '../data/stats';
import { A_COLOR, B_COLOR } from '../data/colors';
import { FLAG_META } from '../regions';
import { compact, fmtDelta, nf, pct, roundTo } from '../format';
import { Polygon } from '../data/geometry';

interface Props {
  tab: 'regions' | 'clusters';
  setTab: (t: 'regions' | 'clusters') => void;
  saved: SavedRegion[];
  aKey: string;
  bKey: string | null;
  setSlot: (slot: 'A' | 'B', key: string) => void;
  onFly: (key: string) => void;
  draft: Polygon | null;
  draftStats: RegionStats | null;
  bStats: RegionStats | null;
  bName: string | null;
  draftName: string;
  setDraftName: (s: string) => void;
  onStartDraw: () => void;
  onStartFromFlag: () => void;
  onDiscardDraft: () => void;
  onSaveDraft: (d: { name: string; owner: string; relabel: boolean; collect: boolean; note: string; relabelN: number; collectN: number }) => void;
}

function SlotButtons({ k, aKey, bKey, setSlot }: { k: string; aKey: string; bKey: string | null; setSlot: Props['setSlot'] }) {
  return (
    <div className="slot-btns" onClick={(e) => e.stopPropagation()}>
      {(['A', 'B'] as const).map((s) => {
        const on = (s === 'A' ? aKey : bKey) === k;
        return (
          <button
            key={s}
            className={`slot-btn${on ? ' on' : ''}`}
            style={on ? { background: s === 'A' ? A_COLOR : B_COLOR, borderColor: 'transparent' } : undefined}
            onClick={() => setSlot(s, k)}
            title={`Compare as ${s}`}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

export function LeftRail(p: Props) {
  return (
    <aside className="leftrail">
      <div className="tabs">
        <button className={p.tab === 'regions' ? 'on' : ''} onClick={() => p.setTab('regions')}>
          Regions
        </button>
        <button className={p.tab === 'clusters' ? 'on' : ''} onClick={() => p.setTab('clusters')}>
          Clusters <span className="count">212</span>
        </button>
      </div>
      <div className="rail-scroll">{p.tab === 'regions' ? <RegionsTab {...p} /> : <ClustersTab {...p} />}</div>
    </aside>
  );
}

function RegionsTab(p: Props) {
  const fs = regionStats(FLAG_POLYGON);
  const active = p.saved.filter((r) => r.status !== 'Closed');
  const closed = p.saved.filter((r) => r.status === 'Closed');
  return (
    <>
      <div className="rail-section-title">Flagged this week</div>
      <div className={`flag-card${p.aKey === 'flag' || p.bKey === 'flag' ? ' active' : ''}`} onClick={() => p.onFly('flag')}>
        <div className="flag-top">
          <span className="flag-icon">⚑</span>
          <div className="flag-name">
            {FLAG_META.id} <span className="dim">· v42 regression</span>
          </div>
          <SlotButtons k="flag" aKey={p.aKey} bKey={p.bKey} setSlot={p.setSlot} />
        </div>
        <div className="flag-desc">Nigerian & Ghanaian English, street noise</div>
        <div className="flag-stats">
          <div>
            <b>{nf.format(fs.evalCount)}</b>
            <span>eval</span>
          </div>
          <div>
            <b>{nf.format(fs.trainCount)}</b>
            <span>train</span>
          </div>
          <div>
            <b>
              {pct(fs.wer41)}→{pct(fs.wer42)}
            </b>
            <span>WER</span>
          </div>
        </div>
        <div className="flag-meta dim">{FLAG_META.detected}</div>
      </div>

      <div className="rail-section-title">Outcome of this review</div>
      <DraftCard {...p} />

      <div className="rail-section-title">
        Saved regions <span className="count">{p.saved.length}</span>
      </div>
      <div className="saved-list">
        {[...active, ...closed].map((r) => (
          <SavedRow key={r.id} r={r} {...p} />
        ))}
      </div>
    </>
  );
}

function SavedRow({ r, ...p }: { r: SavedRegion } & Props) {
  const k = 'saved:' + r.id;
  const on = p.aKey === k || p.bKey === k;
  return (
    <div className={`saved-row${on ? ' active' : ''}${r.isNew ? ' fresh' : ''}`} onClick={() => p.onFly(k)} title={r.note}>
      <span className="status-dot" style={{ background: STATUS_COLORS[r.status] }} />
      <div className="saved-main">
        <div className="saved-name">{r.name}</div>
        <div className="saved-meta">
          <span className="status-text" style={{ color: STATUS_COLORS[r.status] }}>
            {r.status}
          </span>{' '}
          · {r.owner.split(' ')[0]} · {r.ticket}
        </div>
        {(on || r.isNew) && <div className="saved-note">{r.note}</div>}
      </div>
      <SlotButtons k={k} aKey={p.aKey} bKey={p.bKey} setSlot={p.setSlot} />
    </div>
  );
}

function suggestName(s: RegionStats) {
  const top = s.accentMix.slice(0, 2).filter((a) => a.share > 0.15);
  let env = 0;
  s.envMix.forEach((v, i) => v > s.envMix[env] && (env = i));
  const labels = top.map((t) => ACCENTS[t.accent].label.replace(' English', ''));
  if (!labels.length) return '';
  const english = top.every((t) => ACCENTS[t.accent].language === 'English');
  return `${labels.join(' & ')}${english ? ' English' : ''} in ${ENV_SHORT[env]} noise`;
}

function DraftCard(p: Props) {
  const [owner, setOwner] = useState('Ama Owusu');
  const [relabel, setRelabel] = useState(true);
  const [collect, setCollect] = useState(true);
  const [note, setNote] = useState('');
  const s = p.draftStats;

  const sent = p.saved.filter((r) => r.isNew);
  if ((!p.draft || !s) && sent.length) {
    return (
      <div className="draft-done">
        {sent.map((r) => (
          <div key={r.id} className="done-row" onClick={() => p.onFly('saved:' + r.id)}>
            <span className="done-check">✓</span>
            <div>
              <div className="done-name">{r.name}</div>
              <div className="done-meta">
                {r.id} · {r.ticket} · {r.owner} · {r.status}
              </div>
            </div>
          </div>
        ))}
        <button className="ghost small" onClick={p.onStartDraw}>
          ✎ Draw another region
        </button>
      </div>
    );
  }

  if (!p.draft || !s) {
    return (
      <div className="draft-empty">
        <div className="draft-empty-title">No region drawn yet</div>
        <p>
          Outline the area to send for relabeling and targeted collection. The numbers update as you adjust the
          outline.
        </p>
        <div className="draft-empty-actions">
          <button className="primary" onClick={p.onStartDraw}>
            ✎ Draw region <kbd>D</kbd>
          </button>
          <button className="ghost" onClick={p.onStartFromFlag}>
            Start from RF-0042 outline
          </button>
        </div>
      </div>
    );
  }

  const targetRatio = p.bStats && p.bStats.trainPerEval > s.trainPerEval ? p.bStats.trainPerEval : DATASET_TRAIN_PER_EVAL;
  const ratioSource = p.bStats && p.bStats.trainPerEval > s.trainPerEval ? `B (${p.bName})` : 'the dataset average';
  const collectN = Math.max(0, roundTo(targetRatio * s.evalCount - s.trainCount, 500));
  const hours = (collectN * Math.max(2, s.evalMeanDur)) / 3600;
  const relabelN = roundTo(s.lowConfTrain, 100);
  const suggestion = suggestName(s);
  const canSave = p.draftName.trim().length > 2 && (relabel || collect);

  return (
    <div className="draft-card">
      <div className="draft-head">
        <span className="draft-swatch" />
        <span>Draft region</span>
        <span className="dim small-text">unsaved</span>
      </div>
      <div className="draft-stats">
        <div>
          <b>{nf.format(s.evalCount)}</b>
          <span>eval clips</span>
        </div>
        <div>
          <b>{nf.format(roundTo(s.trainCount, 10))}</b>
          <span>train clips</span>
        </div>
        <div>
          <b className={s.delta > 0.02 ? 'bad' : ''}>{fmtDelta(s.delta, 1)}</b>
          <span>
            {pct(s.wer41, 1)}→{pct(s.wer42, 1)}
          </span>
        </div>
      </div>
      <label className="field">
        <span>Name</span>
        <input
          value={p.draftName}
          onChange={(e) => p.setDraftName(e.target.value)}
          placeholder={suggestion || 'Name this region'}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && !p.draftName && suggestion) {
              e.preventDefault();
              p.setDraftName(suggestion);
            }
          }}
        />
      </label>
      {!p.draftName && suggestion && (
        <button className="suggest" onClick={() => p.setDraftName(suggestion)}>
          Use “{suggestion}”
        </button>
      )}
      <label className="field">
        <span>Owner</span>
        <select value={owner} onChange={(e) => setOwner(e.target.value)}>
          {TEAM.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} — {t.role}
            </option>
          ))}
        </select>
      </label>
      <div className="field">
        <span>Send for</span>
        <label className="check">
          <input type="checkbox" checked={relabel} onChange={(e) => setRelabel(e.target.checked)} />
          <div>
            <b>Relabeling</b> {nf.format(relabelN)} training clips with label confidence under 0.80
          </div>
        </label>
        <label className="check">
          <input type="checkbox" checked={collect} onChange={(e) => setCollect(e.target.checked)} />
          <div>
            <b>Targeted collection</b> ≈ {compact(collectN)} clips (~{nf.format(Math.round(hours))} h) to reach{' '}
            {targetRatio.toFixed(1)} train clips per eval clip, matching {ratioSource}
          </div>
        </label>
      </div>
      <label className="field">
        <span>Notes from the room</span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did the room hear in these clips?" />
      </label>
      <div className="draft-actions">
        <button
          className="primary"
          disabled={!canSave}
          onClick={() => p.onSaveDraft({ name: p.draftName.trim(), owner, relabel, collect, note, relabelN, collectN })}
        >
          Save & send
        </button>
        <button className="ghost" onClick={p.onStartDraw}>
          Redraw
        </button>
        <button className="ghost danger" onClick={p.onDiscardDraft}>
          Discard
        </button>
      </div>
      <div className="draft-hint dim">Drag the corner handles on the map to adjust the outline.</div>
    </div>
  );
}

type CSort = 'delta' | 'coverage' | 'size';

function ClustersTab(p: Props) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<CSort>('delta');
  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const list = DATA.clusters.filter((c) => {
      if (!qq) return true;
      const a = ACCENTS[c.accent];
      return (
        c.name.toLowerCase().includes(qq) ||
        a.code.toLowerCase().includes(qq) ||
        a.label.toLowerCase().includes(qq) ||
        ENV_SHORT[c.env].includes(qq)
      );
    });
    const key = (c: (typeof list)[number]) =>
      sort === 'delta' ? -(c.wer42 - c.wer41) : sort === 'coverage' ? c.trainCount / c.evalCount : -c.evalCount;
    return list.sort((a, b) => key(a) - key(b));
  }, [q, sort]);
  return (
    <>
      <div className="cl-tools">
        <input className="search" placeholder="Filter: en-NG, street, C-141…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg small full">
          <button className={sort === 'delta' ? 'on' : ''} onClick={() => setSort('delta')}>
            Regression
          </button>
          <button className={sort === 'coverage' ? 'on' : ''} onClick={() => setSort('coverage')}>
            Thin coverage
          </button>
          <button className={sort === 'size' ? 'on' : ''} onClick={() => setSort('size')}>
            Eval size
          </button>
        </div>
      </div>
      <div className="cl-list">
        {rows.map((c) => {
          const k = 'cluster:' + c.id;
          const d = c.wer42 - c.wer41;
          const ratio = c.trainCount / c.evalCount;
          return (
            <div key={c.id} className={`cl-row${p.aKey === k || p.bKey === k ? ' active' : ''}`} onClick={() => p.onFly(k)}>
              <div className="cl-main">
                <div className="cl-name">
                  <span className="mono dim">{c.name}</span> {ACCENTS[c.accent].code} · {ENV_SHORT[c.env]}
                  {c.long && <span className="dim"> · long</span>}
                  {c.flagged && <span className="flag-mini">⚑</span>}
                </div>
                <div className="cl-stats">
                  <span className={`mono ${d > 0.02 ? 'bad' : d < -0.005 ? 'good' : 'dim'}`}>{fmtDelta(d, 1)}</span>
                  <span>{nf.format(c.evalCount)} eval</span>
                  <span className={ratio < 5 ? 'bad' : ''}>{ratio.toFixed(1)} train/eval</span>
                </div>
              </div>
              <SlotButtons k={k} aKey={p.aKey} bKey={p.bKey} setSlot={p.setSlot} />
            </div>
          );
        })}
      </div>
    </>
  );
}
