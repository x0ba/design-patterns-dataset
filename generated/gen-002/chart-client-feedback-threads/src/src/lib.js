import { MONTHS, SERIES, VERSIONS, TODAY } from './data.js';

export const N_MONTHS = SERIES.length; // 94 (Jan 2019 – Oct 2026)
export const OCT26 = N_MONTHS - 1;
export const PRELIM_OCT = 81.4;
export const CORRECTED_OCT = 79.8;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function indexLabel(i) {
  return `${MONTHS[i % 12]} ${2019 + Math.floor(i / 12)}`;
}

export function fmtTime(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export function fmtStamp(d) {
  if (d.toDateString() === TODAY.toDateString()) return `Today, ${fmtTime(d)}`;
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}, ${fmtTime(d)}`;
}

export function seriesFor(versionId, oct = 'prelim') {
  const last = VERSIONS[versionId].lastIndex;
  return SERIES.slice(0, last + 1).map((v, i) => (i === OCT26 && oct === 'corrected' ? CORRECTED_OCT : v));
}

export function seriesCsv({ last = OCT26, oct = 'prelim' } = {}) {
  const rows = ['month,ridership_index_pct_2019,status'];
  for (let i = 0; i <= last; i++) {
    const ym = `${2019 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
    let val = SERIES[i];
    let status = 'final';
    if (i === OCT26) {
      val = oct === 'corrected' ? CORRECTED_OCT : PRELIM_OCT;
      status = oct === 'corrected' ? 'reconciled' : 'preliminary';
    }
    rows.push(`${ym},${val.toFixed(1)},${status}`);
  }
  return rows.join('\n') + '\n';
}

export function download(filename, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Words that must never reach a client-facing thread.
const LEAK_TERMS = ['kofi', 'mensah', 'internal', 'studio only', 'truncat', 'debate', 'in-house', 'our designer'];

export function leakTerms(text) {
  const t = text.toLowerCase();
  return LEAK_TERMS.filter((w) => t.includes(w));
}

export function emptyComposer() {
  return { text: '', pin: null, files: [] };
}

// Pinned point label for a month and its value, e.g. "Apr 2020 · 24.6%".
export function pointLabel(index, value) {
  return `${indexLabel(index)} · ${value.toFixed(1)}%`;
}

export function clientDraft(opt, date) {
  return [
    'Renée, thanks for the close read on v3 and for the overnight note.',
    opt.opening,
    'On the 2020 dip, v4 does what your note is after. The 2020 span moves to a lighter line so the recovery reads as the headline, and the April low gets one direct label with its value in place of the current callout.',
    'We’re also carrying two of Sam’s points into v4. October 2026 becomes 79.8% of the 2019 average, per the reconciled series he sent on Sunday, and the axis label adds “weekday-adjusted.”',
    `v4 goes to you ${date.sentence}. If you can sign off by Monday, Nov 23, we stay on track for the board packet, which closes Tue Nov 24. Happy to walk through it on a call Tuesday if that’s easier.`,
  ].join('\n\n');
}

export function kofiBrief(opt, date) {
  return [
    'Kofi, Sam’s correction is in (Data & methodology, Sunday 4:40 PM). October 2026 on v3 should read 79.8% of the 2019 average, not 81.4%. Nothing else in the series moves. The revised file is attached.',
    opt
      ? `Axis for v4: ${opt.title.toLowerCase()}. ${opt.summary}`
      : 'The axis position is still open with Renée. I’ll confirm it today.',
    date ? `v4 goes to Renée on ${date.sentence}.` : 'I’ll confirm the v4 date once it’s set.',
  ].join('\n\n');
}
