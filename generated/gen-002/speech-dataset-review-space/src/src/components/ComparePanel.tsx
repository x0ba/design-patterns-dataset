import { ReactNode } from 'react';
import { ACCENTS, DATA, ENVS, VENDORS } from '../data/model';
import { RegionStats, DATASET_TRAIN_PER_EVAL } from '../data/stats';
import { A_COLOR, B_COLOR, ENV_COLORS, ACCENT_COLORS } from '../data/colors';
import { ResolvedRegion } from '../regions';
import { fmtDelta, nf, pct } from '../format';

const ALL = (() => {
  let a = 0;
  let b = 0;
  for (let i = 0; i < DATA.ev.n; i++) {
    a += DATA.ev.wer41[i];
    b += DATA.ev.wer42[i];
  }
  let reg = 0;
  for (let i = 0; i < DATA.ev.n; i++) if (DATA.ev.wer42[i] - DATA.ev.wer41[i] >= 0.1) reg++;
  const snr = Float32Array.from(DATA.ev.snr).sort();
  let conf = 0;
  for (let i = 0; i < DATA.tr.n; i++) conf += DATA.tr.conf[i];
  return {
    wer41: a / DATA.ev.n,
    wer42: b / DATA.ev.n,
    regressed: reg / DATA.ev.n,
    medianSnr: snr[snr.length >> 1],
    conf: conf / DATA.tr.n,
  };
})();

interface Props {
  A: ResolvedRegion;
  B: ResolvedRegion | null;
  sA: RegionStats;
  sB: RegionStats | null;
  onSwap: () => void;
  onFly: (key: string) => void;
  onClearB: () => void;
}

export function Badge({ slot, size = 20 }: { slot: 'A' | 'B'; size?: number }) {
  return (
    <span
      className="slot-badge"
      style={{ background: slot === 'A' ? A_COLOR : B_COLOR, width: size, height: size, fontSize: size * 0.56 }}
    >
      {slot}
    </span>
  );
}

function Row({ label, a, b, all, hint }: { label: string; a: ReactNode; b: ReactNode; all?: ReactNode; hint?: string }) {
  return (
    <div className="cmp-row" title={hint}>
      <div className="cmp-label">{label}</div>
      <div className="cmp-val">{a}</div>
      <div className="cmp-val">{b}</div>
      <div className="cmp-all">{all}</div>
    </div>
  );
}

function deltaClass(d: number) {
  return d > 0.02 ? 'bad' : d < -0.005 ? 'good' : 'neutral';
}

function topVendor(s: RegionStats) {
  let k = 0;
  s.vendorMix.forEach((v, i) => {
    if (v > s.vendorMix[k]) k = i;
  });
  return { name: VENDORS[k].split(' ')[0], share: s.vendorMix[k] };
}

function Stack({ parts }: { parts: { share: number; color: string; label: string }[] }) {
  return (
    <div className="stack">
      {parts.map((p, i) =>
        p.share > 0.004 ? (
          <div key={i} className="stack-seg" style={{ flexGrow: p.share, background: p.color }} title={`${p.label}: ${pct(p.share)}`}>
            {p.share > 0.16 && <span>{p.label}</span>}
          </div>
        ) : null,
      )}
    </div>
  );
}

function accentParts(s: RegionStats) {
  const top = s.accentMix.slice(0, 3);
  const rest = 1 - top.reduce((a, b) => a + b.share, 0);
  return [
    ...top.map((t) => ({ share: t.share, color: ACCENT_COLORS[t.accent], label: ACCENTS[t.accent].code })),
    { share: rest, color: '#4a555c', label: 'other' },
  ];
}

export function ComparePanel({ A, B, sA, sB, onSwap, onFly, onClearB }: Props) {
  const maxBand = 0.2;
  const tvA = topVendor(sA);
  const tvB = sB ? topVendor(sB) : null;
  const lowCov = sA.trainPerEval < DATASET_TRAIN_PER_EVAL / 4;
  return (
    <section className="compare">
      <div className="panel-head">
        <h2>Compare</h2>
        <button className="ghost small" onClick={onSwap} disabled={!B} title="Swap A and B">
          ⇄ Swap
        </button>
      </div>
      <div className="cmp-targets">
        <button className="cmp-target" onClick={() => onFly(A.key)} title="Fly to this region">
          <Badge slot="A" />
          <div>
            <div className="cmp-name">{A.name}</div>
            <div className="cmp-sub">{A.sub}</div>
          </div>
        </button>
        {B ? (
          <button className="cmp-target" onClick={() => onFly(B.key)} title="Fly to this region">
            <Badge slot="B" />
            <div>
              <div className="cmp-name">{B.name}</div>
              <div className="cmp-sub">{B.sub}</div>
            </div>
            <span
              className="cmp-x"
              role="button"
              title="Clear B"
              onClick={(e) => {
                e.stopPropagation();
                onClearB();
              }}
            >
              ×
            </span>
          </button>
        ) : (
          <div className="cmp-target empty">
            <Badge slot="B" />
            <div className="cmp-sub">Pick a region or cluster on the left to compare against.</div>
          </div>
        )}
      </div>

      <div className="cmp-table">
        <div className="cmp-row head">
          <div className="cmp-label" />
          <div className="cmp-val">
            <Badge slot="A" size={16} />
          </div>
          <div className="cmp-val">
            <Badge slot="B" size={16} />
          </div>
          <div className="cmp-all">All data</div>
        </div>
        <Row label="Eval clips" a={nf.format(sA.evalCount)} b={sB ? nf.format(sB.evalCount) : '—'} all="64,000" />
        <Row
          label="Training clips"
          a={nf.format(Math.round(sA.trainCount / 10) * 10)}
          b={sB ? nf.format(Math.round(sB.trainCount / 10) * 10) : '—'}
          all="1.8M"
        />
        <Row
          label="Train per eval clip"
          hint="How much training data sits next to each evaluation clip"
          a={<span className={lowCov ? 'bad strong' : ''}>{sA.trainPerEval.toFixed(1)}</span>}
          b={sB ? sB.trainPerEval.toFixed(1) : '—'}
          all={DATASET_TRAIN_PER_EVAL.toFixed(1)}
        />
        <Row
          label="WER v41 → v42"
          a={
            <span className="wer-pair">
              {pct(sA.wer41, 1)} → <b>{pct(sA.wer42, 1)}</b>
            </span>
          }
          b={
            sB ? (
              <span className="wer-pair">
                {pct(sB.wer41, 1)} → <b>{pct(sB.wer42, 1)}</b>
              </span>
            ) : (
              '—'
            )
          }
          all={`${(ALL.wer41 * 100).toFixed(1)}→${pct(ALL.wer42, 1)}`}
        />
        <Row
          label="Change"
          a={<span className={`delta-chip ${deltaClass(sA.delta)}`}>{fmtDelta(sA.delta, 1)}</span>}
          b={sB ? <span className={`delta-chip ${deltaClass(sB.delta)}`}>{fmtDelta(sB.delta, 1)}</span> : '—'}
          all={fmtDelta(ALL.wer42 - ALL.wer41, 1)}
        />
        <Row
          label="Regressed ≥ 10 pts"
          a={pct(sA.regressedShare)}
          b={sB ? pct(sB.regressedShare) : '—'}
          all={pct(ALL.regressed)}
        />
        <Row label="Median SNR" a={`${sA.medianSnr.toFixed(1)} dB`} b={sB ? `${sB.medianSnr.toFixed(1)} dB` : '—'} all={`${ALL.medianSnr.toFixed(1)} dB`} />
        <Row
          label="Train label conf."
          a={<span className={sA.trainConf < 0.8 ? 'bad' : ''}>{sA.trainConf.toFixed(2)}</span>}
          b={sB ? sB.trainConf.toFixed(2) : '—'}
          all={ALL.conf.toFixed(2)}
        />
        <Row
          label="Main train vendor"
          a={
            <span>
              {tvA.name} <span className="dim">{pct(tvA.share)}</span>
            </span>
          }
          b={
            tvB ? (
              <span>
                {tvB.name} <span className="dim">{pct(tvB.share)}</span>
              </span>
            ) : (
              '—'
            )
          }
        />
      </div>

      <div className="cmp-block">
        <div className="block-title">
          WER change by SNR band <span className="dim">· pts, with clip counts</span>
        </div>
        <div className="bands">
          <div className="band head">
            <span />
            <span />
            <span>
              <Badge slot="A" size={14} />
            </span>
            <span>{sB && <Badge slot="B" size={14} />}</span>
          </div>
          {sA.snrBands.map((bd, k) => {
            const dA = bd.n ? bd.wer42 - bd.wer41 : 0;
            const bb = sB?.snrBands[k];
            const dB = bb && bb.n ? bb.wer42 - bb.wer41 : 0;
            return (
              <div className="band" key={bd.label}>
                <div className="band-label">{bd.label}</div>
                <div className="band-bars">
                  <BandBar d={dA} n={bd.n} max={maxBand} color={A_COLOR} />
                  {sB && <BandBar d={dB} n={bb!.n} max={maxBand} color={B_COLOR} />}
                </div>
                <BandVal d={dA} n={bd.n} />
                {sB ? <BandVal d={dB} n={bb!.n} /> : <span />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="cmp-block mix">
        <div className="mix-col">
          <div className="block-title">Environment</div>
          <div className="mix-row">
            <Badge slot="A" size={15} />
            <Stack parts={sA.envMix.map((s, i) => ({ share: s, color: ENV_COLORS[i], label: ENVS[i] }))} />
          </div>
          {sB && (
            <div className="mix-row">
              <Badge slot="B" size={15} />
              <Stack parts={sB.envMix.map((s, i) => ({ share: s, color: ENV_COLORS[i], label: ENVS[i] }))} />
            </div>
          )}
        </div>
        <div className="mix-col">
          <div className="block-title">Accent</div>
          <div className="mix-row">
            <Badge slot="A" size={15} />
            <Stack parts={accentParts(sA)} />
          </div>
          {sB && (
            <div className="mix-row">
              <Badge slot="B" size={15} />
              <Stack parts={accentParts(sB)} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function BandBar({ d, n, max, color }: { d: number; n: number; max: number; color: string }) {
  const w = Math.min(1, Math.abs(d) / max) * 50;
  return (
    <div className="bandbar-track">
      <div className="bandbar-zero" />
      {n > 0 && (
        <div
          className="bandbar-fill"
          style={{ background: color, left: d >= 0 ? '50%' : `${50 - w}%`, width: `${Math.max(0.8, w)}%` }}
        />
      )}
    </div>
  );
}

function BandVal({ d, n }: { d: number; n: number }) {
  return (
    <span
      className="bandbar-val"
      title={n ? `${nf.format(n)} eval clips` : 'No eval clips in this band'}
      style={{ color: n ? (d > 0.02 ? '#ff8f7c' : '#c3ccd1') : '#5d686f' }}
    >
      {n ? fmtDelta(d).replace(' pts', '') : '—'}
      {n > 0 && <small>{n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n}</small>}
    </span>
  );
}
