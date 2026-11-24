import { ACCENTS, DATA, ENV_SHORT, FLAG_POLYGON, hullForClusters, RegionStatus, SavedRegion, STATUS_COLORS } from './data/model';
import { Polygon } from './data/geometry';

export interface ResolvedRegion {
  key: string;
  kind: 'flag' | 'draft' | 'saved' | 'cluster';
  name: string;
  short: string;
  sub: string;
  polygon: Polygon;
  color: string;
  status?: RegionStatus;
  owner?: string;
}

export const FLAG_META = {
  id: 'RF-0042',
  name: 'Flagged: RF-0042',
  detected: 'Auto-flagged Fri 13 Nov, 06:40 by the v42 regression scan',
};

const clusterPolys = new Map<number, Polygon>();
export function clusterPolygon(id: number) {
  let p = clusterPolys.get(id);
  if (!p) {
    p = hullForClusters([id], 2);
    clusterPolys.set(id, p);
  }
  return p;
}

export function resolveRegion(
  key: string,
  saved: SavedRegion[],
  draft: Polygon | null,
  draftName: string,
): ResolvedRegion | null {
  if (key === 'flag') {
    return {
      key,
      kind: 'flag',
      name: FLAG_META.name,
      short: 'RF-0042',
      sub: 'en-NG / en-GH · street noise',
      polygon: FLAG_POLYGON,
      color: '#f0883e',
    };
  }
  if (key === 'draft') {
    if (!draft) return null;
    return {
      key,
      kind: 'draft',
      name: draftName.trim() || 'Draft region',
      short: 'Draft',
      sub: 'Drawn in this session · not saved',
      polygon: draft,
      color: '#ffe08a',
    };
  }
  if (key.startsWith('saved:')) {
    const r = saved.find((s) => s.id === key.slice(6));
    if (!r) return null;
    return {
      key,
      kind: 'saved',
      name: r.name,
      short: r.id,
      sub: `${r.status} · ${r.owner}`,
      polygon: r.polygon,
      color: STATUS_COLORS[r.status],
      status: r.status,
      owner: r.owner,
    };
  }
  if (key.startsWith('cluster:')) {
    const c = DATA.clusterById.get(Number(key.slice(8)));
    if (!c) return null;
    return {
      key,
      kind: 'cluster',
      name: `${c.name} ${ACCENTS[c.accent].code} · ${ENV_SHORT[c.env]}`,
      short: c.name,
      sub: `${ACCENTS[c.accent].label} · ${ENV_SHORT[c.env]} · ${c.long ? 'long-form' : 'short'} utterances`,
      polygon: clusterPolygon(c.id),
      color: '#cfd8dc',
    };
  }
  return null;
}
