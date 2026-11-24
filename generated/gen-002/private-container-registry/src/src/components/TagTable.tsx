import type { Tag } from '../data/types';
import { CVE_ID, matchesCve } from '../data/cve';
import { fmtShort, relTime } from '../lib/time';
import { fmtSize, shortDigest } from '../lib/format';
import { EnvBadge, AdvisoryChip, CritHigh } from './Badges';

export type TagSortKey = 'image' | 'pushed' | 'pulled' | 'size' | 'critical';
export interface TagSort {
  key: TagSortKey;
  dir: 1 | -1;
}

export function compareTags(a: Tag, b: Tag, s: TagSort): number {
  let c = 0;
  switch (s.key) {
    case 'image':
      c = a.id.localeCompare(b.id);
      break;
    case 'pushed':
      c = Date.parse(a.pushedAt) - Date.parse(b.pushedAt);
      break;
    case 'pulled':
      c = (a.lastPulledAt ? Date.parse(a.lastPulledAt) : 0) - (b.lastPulledAt ? Date.parse(b.lastPulledAt) : 0);
      break;
    case 'size':
      c = a.sizeMB - b.sizeMB;
      break;
    case 'critical':
      c = a.scan.critical - b.scan.critical || a.scan.high - b.scan.high;
      break;
  }
  return c * s.dir;
}

interface Props {
  rows: Tag[];
  showRepo: boolean;
  sort: TagSort;
  onSort: (key: TagSortKey) => void;
  onOpen: (id: string) => void;
}

export function TagTable({ rows, showRepo, sort, onSort, onOpen }: Props) {
  const sortTh = (key: TagSortKey, label: string, cls = '') => {
    const active = sort.key === key;
    const arrow = active ? (sort.dir === 1 ? ' ▲' : ' ▼') : '';
    return (
      <th className={cls} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
        <button type="button" className={`th-btn${active ? ' th-active' : ''}`} onClick={() => onSort(key)}>
          {label}
          {arrow}
        </button>
      </th>
    );
  };

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {sortTh('image', showRepo ? 'Image' : 'Tag')}
            <th>Env</th>
            <th>Base image</th>
            {sortTh('pushed', 'Pushed')}
            {sortTh('pulled', 'Last pulled')}
            <th className="num">Pulls 30d</th>
            {sortTh('size', 'Size', 'num')}
            {sortTh('critical', 'Crit / High', 'num')}
            <th>Advisory</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const affected = matchesCve(t.base, t.pushedAt);
            return (
              <tr key={t.id} className="clickable" onClick={() => onOpen(t.id)}>
                <td>
                  <button
                    type="button"
                    className="img-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(t.id);
                    }}
                  >
                    <span className="img-name">
                      {showRepo && (
                        <>
                          <span className="repo">{t.repo}</span>
                          <span className="colon">:</span>
                        </>
                      )}
                      <span className="tagname">{t.name}</span>
                    </span>
                  </button>
                  <div className="digest mono">{shortDigest(t.digest)}</div>
                </td>
                <td>
                  <EnvBadge env={t.env} />
                </td>
                <td className="mono small nowrap">{t.base}</td>
                <td className="nowrap">
                  <div>{fmtShort(t.pushedAt)}</div>
                  <div className="sub">{t.pushedBy}</div>
                </td>
                <td className="nowrap">
                  <div>{relTime(t.lastPulledAt)}</div>
                  {t.lastPulledAt && <div className="sub">{fmtShort(t.lastPulledAt)}</div>}
                </td>
                <td className="num">{t.pulls30d}</td>
                <td className="num">{fmtSize(t.sizeMB)}</td>
                <td className="num">
                  <CritHigh scan={t.scan} />
                </td>
                <td>{affected && <AdvisoryChip id={CVE_ID} />}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
