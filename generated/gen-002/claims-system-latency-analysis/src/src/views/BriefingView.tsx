// Working draft for the written explanation. Every number in the draft is computed from the loaded
// traces when the tab opens. The notes box is saved in this browser only.

import { useEffect, useMemo, useState } from 'react';
import type { Dataset, Req } from '../data/generate.ts';
import { CONNECTORS, ENDPOINT_INDEX, M_BATCH_END, M_BATCH_START, M_HOTFIX, M_IDV_DEPLOY, M_POOL_CHANGE, M_WINDOW_END, M_WINDOW_START, POOL_BEFORE } from '../data/scenario.ts';
import { rangeConnector, rangeEndpoint } from '../data/stats.ts';
import { recordRange, summarizeFailures } from '../data/series.ts';
import { fmtInt, fmtMs, fmtPct, fmtX, hhmm } from '../lib/format.ts';

const NOTES_KEY = 'pathspan.briefing-notes.v1';

export function BriefingView({ ds, failures, samples }: { ds: Dataset; failures: Req[]; samples: Req[] }) {
  const paragraphs = useMemo(() => buildDraft(ds, failures, samples), [ds, failures, samples]);
  const [notes, setNotes] = useState<string>(() => {
    try {
      return window.localStorage.getItem(NOTES_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(NOTES_KEY, notes);
    } catch {
      /* storage unavailable: notes stay in memory */
    }
  }, [notes]);

  const copy = async () => {
    const text = [...paragraphs.map((p) => p.text), '', notes.trim()].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="view briefing">
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Draft findings, computed from the loaded traces</h2>
            <p className="card-sub">Statements here are what the data shows. The causal reading is for you to confirm before it goes to the deputy commissioner.</p>
          </div>
          <button className="btn" onClick={copy}>{copied ? 'Copied' : 'Copy draft and notes'}</button>
        </div>
        <div className="draft">
          {paragraphs.map((p) => (
            <div key={p.key} className="draft-block">
              <div className="draft-label">{p.label}</div>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Your notes</h2>
            <p className="card-sub">Saved in this browser. Included in the copy above.</p>
          </div>
        </div>
        <textarea
          className="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          spellCheck
          rows={10}
          aria-label="Investigation notes"
        />
      </section>
    </div>
  );
}

interface Para {
  key: string;
  label: string;
  text: string;
}

function buildDraft(ds: Dataset, failures: Req[], samples: Req[]): Para[] {
  const cert = ENDPOINT_INDEX.cert;
  const idv = ENDPOINT_INDEX.idv;
  const win = rangeEndpoint(ds, cert, M_WINDOW_START, M_WINDOW_END);
  const winAll = rangeEndpoint(ds, -1, M_WINDOW_START, M_WINDOW_END);
  const all = rangeEndpoint(ds, -1, 0, ds.minutes);
  const [flo, fhi] = recordRange(failures, 0, ds.minutes);
  const allSum = summarizeFailures(failures, flo, fhi);
  const bShare = allSum.count ? allSum.byConnector[1] / allSum.count : 0;
  const bWin = rangeConnector(ds, 1, M_WINDOW_START, M_WINDOW_END);
  const aWin = rangeConnector(ds, 0, M_WINDOW_START, M_WINDOW_END);
  const cWin = rangeConnector(ds, 2, M_WINDOW_START, M_WINDOW_END);
  const baseCert = rangeEndpoint(ds, cert, 0, M_IDV_DEPLOY);
  const quietPre = rangeEndpoint(ds, cert, 1440 * 0, 360);
  const quietPost = rangeEndpoint(ds, cert, 2880, 3240);
  const idvPre = rangeEndpoint(ds, idv, 0, 360);
  const idvPost = rangeEndpoint(ds, idv, 2880, 3240);

  // mainframe hops per cert submission, from sampled traces
  const hops = (pred: (m: number) => boolean) => {
    let n = 0;
    let h = 0;
    for (const s of samples) {
      if (s.endpoint !== cert || !pred(s.m)) continue;
      n++;
      h += s.spans.filter((sp) => sp.kind === 'mf').length;
    }
    return n ? h / n : 0;
  };
  const hopsPre = hops((m) => m < M_IDV_DEPLOY);
  const hopsPost = hops((m) => m >= M_IDV_DEPLOY);

  // Pool-full connector-minutes before and after the change, counted over the surge window.
  let fullBefore = 0;
  let fullAfter = 0;
  for (let m = M_WINDOW_START; m < M_WINDOW_END; m++) {
    for (let c = 0; c < CONNECTORS.length; c++) {
      if (ds.concC[m * 3 + c] / ds.pool[m] >= 1) {
        if (m < M_POOL_CHANGE) fullBefore++;
        else fullAfter++;
      }
    }
  }
  const peakNoDeploy = counterfactualPeak(ds);

  const [l1, h1] = recordRange(failures, M_BATCH_END, M_HOTFIX);
  const [l2, h2] = recordRange(failures, M_HOTFIX, M_POOL_CHANGE);
  const r1 = summarizeFailures(failures, l1, h1);
  const r2 = summarizeFailures(failures, l2, h2);

  const postPool = rangeEndpoint(ds, cert, M_POOL_CHANGE, M_WINDOW_END);

  const peakB = bWin.peakUtil;
  return [
    {
      key: 'what',
      label: 'What happened',
      text: `Between ${hhmm(M_WINDOW_START)} and ${hhmm(M_WINDOW_END)} on Monday 16 November, ${fmtInt(win.failed)} of ${fmtInt(win.total)} weekly certification submissions failed (${fmtPct(win.failRate, 1)}), almost all as 504 gateway timeouts. Cert-submit p95 peaked at ${fmtMs(maxP95(ds))}, against a baseline of ${fmtMs(baseCert.p95)}. Across the 72 hours, ${fmtInt(all.failed)} requests failed; ${fmtInt(winAll.failed)} of them (${fmtPct(winAll.failed / Math.max(1, all.failed), 0)}) fell inside that window.`,
    },
    {
      key: 'where',
      label: 'Where it concentrated',
      text: `${fmtPct(bShare, 0)} of all failed requests passed through mf-conn-b. Inside the window, ${fmtPct(winAll.failed ? bWin.failed / winAll.failed : 0, 0)} of failures were on mf-conn-b, against ${fmtInt(aWin.failed)} on mf-conn-a and ${fmtInt(cWin.failed)} on mf-conn-c. mf-conn-b's implied session count peaked at ${Math.round(bWin.peakConc)} against a pool limit of ${POOL_BEFORE} (${fmtX(peakB)}). The other two instances peaked at ${fmtX(aWin.peakUtil)} and ${fmtX(cWin.peakUtil)} of their limits.`,
    },
    {
      key: 'deploy',
      label: 'identity-verify v4.12 (Sun 23:05)',
      text: `The deploy changed the work each certification does on the mainframe. Sampled cert-submit traces show ${hopsPre.toFixed(1)} mainframe hops per submission before the deploy and ${hopsPost.toFixed(1)} after. In quiet hours, identity-verify p95 went from ${fmtMs(idvPre.p95)} (Saturday 00:00–06:00) to ${fmtMs(idvPost.p95)} (Monday 00:00–06:00), and cert-submit p95 from ${fmtMs(quietPre.p95)} to ${fmtMs(quietPost.p95)}. At normal volume the failure rate barely moved (${fmtPct(quietPre.failRate, 2)} to ${fmtPct(quietPost.failRate, 2)}).`,
    },
    {
      key: 'pool',
      label: 'Pool limit (40 per instance, raised to 80 at 10:38)',
      text: `When the surge arrived, implied demand on mf-conn-b exceeded its 40-session pool for ${fmtInt(fullBefore)} connector-minutes before the change. The pool was raised to 80 at ${hhmm(M_POOL_CHANGE)}. After that, cert-submit failures fell to ${fmtPct(postPool.failRate, 2)} for the rest of the window. ${fullAfter === 0 ? 'No connector-minute reached the pool limit again.' : `${fmtInt(fullAfter)} connector-minutes still reached the pool limit.`} Demand was still at its plateau when the change landed.`,
    },
    {
      key: 'both',
      label: 'Deploy or pool, or both',
      text: `A first-order check removes the deploy's extra mainframe transactions and holds hold time fixed. At the busiest minute mf-conn-b ran at ${fmtX(peakB)} of its pool as recorded; without the extra transactions it would have run at about ${fmtX(peakNoDeploy)}. ${
        peakNoDeploy >= 1
          ? `The surge and the pool limit alone would have overrun the pool, so the pool is the binding constraint. The deploy took the peak from about ${fmtX(peakNoDeploy)} to ${fmtX(peakB)} of the pool, and moved the first timeouts earlier. That is the "both" answer. This is a rough estimate, not a model fit.`
          : `The surge alone would have stayed under the pool limit, so the deploy was needed to exhaust it at this volume. This is a rough estimate, not a model fit.`
      }`,
    },
    {
      key: 'retries',
      label: 'claims-web hotfix (09:20)',
      text: `After the hotfix, ${fmtPct(r2.count ? r2.retried / r2.count : 0, 0)} of failed requests were retried by users, up from ${fmtPct(r1.count ? r1.retried / r1.count : 0, 0)}. The hotfix changed the error panel to offer Try again after 30 seconds. Retries add requests to an already saturated connector, so this is a secondary effect on load.`,
    },
    {
      key: 'limits',
      label: 'What these traces cannot show',
      text: `Connector session counts are inferred from transaction rate and hold time, not read from the mainframe. Queue wait inside mf-conn is not separated from the hop time seen at the edge. The traces are a 1-in-400 sample of successful requests. Batch was active from ${hhmm(M_BATCH_START)} to ${hhmm(M_BATCH_END)} and may have held sessions on mf-conn-b into the window; that needs mainframe operations data.`,
    },
  ];
}

function maxP95(ds: Dataset): number {
  const cert = ENDPOINT_INDEX.cert;
  let best = 0;
  for (let m = M_WINDOW_START; m < M_WINDOW_END; m++) {
    const r = rangeEndpoint(ds, cert, m, m + 1);
    best = Math.max(best, r.p95);
  }
  return best;
}

/**
 * First-order counterfactual, same method as the Changes tab: remove the two extra mainframe
 * transactions per cert and per identity check, scale mf-conn-b utilisation down by the removed
 * share, and hold hold time fixed.
 */
function counterfactualPeak(ds: Dataset): number {
  const cert = ENDPOINT_INDEX.cert;
  const idv = ENDPOINT_INDEX.idv;
  const E = ds.endpoints.length;
  let peak = 0;
  for (let m = M_WINDOW_START; m < M_WINDOW_END; m++) {
    let calls = 0;
    for (let c = 0; c < CONNECTORS.length; c++) calls += ds.callsC[m * 3 + c];
    if (!calls) continue;
    const extra = 2 * (ds.totalMe[m * E + cert] + ds.totalMe[m * E + idv]);
    const uCf = (ds.concC[m * 3 + 1] / ds.pool[m]) * (1 - extra / calls);
    peak = Math.max(peak, uCf);
  }
  return peak;
}
