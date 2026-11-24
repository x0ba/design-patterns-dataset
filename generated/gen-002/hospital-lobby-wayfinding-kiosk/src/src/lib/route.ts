import {
  ADJ,
  BUILDINGS,
  CLOSURES,
  EDGES,
  NODES,
  edgeSeconds,
  type Edge,
  type Lang,
  type Pace,
} from '../data/campus';
import type { Destination } from '../data/destinations';
import { STEP_T, fmt, type Turn } from './i18n';

export interface Prefs {
  stepFree: boolean;
  pace: Pace;
  closed: Set<string>; // active closure ids to avoid
}

export interface Leg {
  edge: Edge | null; // null = final walk to the door of the destination
  from: string;
  to: string; // node id (or attach node for the final leg)
  m: number;
  secs: number;
}

export interface Route {
  legs: Leg[];
  secs: number;
  walkM: number;
  levels: number[];
  nodes: string[]; // node ids along the route (start → attach node)
  closuresUsed: string[];
}

function usable(e: Edge, p: Prefs) {
  if (p.stepFree && !e.stepFree) return false;
  if (e.closure && p.closed.has(e.closure)) return false;
  return true;
}

interface Search {
  dist: Map<string, number>;
  prev: Map<string, { node: string; edge: Edge }>;
}

export function search(start: string, p: Prefs): Search {
  const dist = new Map<string, number>([[start, 0]]);
  const prev = new Map<string, { node: string; edge: Edge }>();
  const done = new Set<string>();
  const queue: [number, string][] = [[0, start]];
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [d, u] = queue.shift()!;
    if (done.has(u)) continue;
    done.add(u);
    for (const e of ADJ.get(u) ?? []) {
      if (!usable(e, p)) continue;
      const v = e.a === u ? e.b : e.a;
      const nd = d + edgeSeconds(e, p.pace);
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd);
        prev.set(v, { node: u, edge: e });
        queue.push([nd, v]);
      }
    }
  }
  return { dist, prev };
}

export function attachNode(d: Destination) {
  return `${d.b}-${d.level}-${d.side}`;
}

function build(start: string, target: string, s: Search, p: Prefs, dest: Destination): Route | null {
  if (!s.dist.has(target)) return null;
  const legs: Leg[] = [];
  const nodes: string[] = [target];
  let cur = target;
  while (cur !== start) {
    const pr = s.prev.get(cur)!;
    legs.unshift({ edge: pr.edge, from: pr.node, to: cur, m: pr.edge.m, secs: edgeSeconds(pr.edge, p.pace) });
    nodes.unshift(pr.node);
    cur = pr.node;
  }
  const speed = p.pace === 'slow' ? 0.7 : 1.3;
  legs.push({ edge: null, from: target, to: target, m: dest.d, secs: dest.d / speed });
  const walkM = legs.reduce((a, l) => a + (l.edge && (l.edge.kind === 'elevator' || l.edge.kind === 'stairs') ? 0 : l.m), 0);
  const secs = legs.reduce((a, l) => a + l.secs, 0);
  const levels = [...new Set(nodes.map((n) => NODES.get(n)!.level))];
  const closuresUsed = [...new Set(legs.flatMap((l) => (l.edge?.closure ? [l.edge.closure] : [])))];
  return { legs, secs, walkM, levels, nodes, closuresUsed };
}

export function findRoute(start: string, dest: Destination, p: Prefs): Route | null {
  const s = search(start, p);
  return build(start, attachNode(dest), s, p, dest);
}

export function nearestOfKind(start: string, kind: string, all: Destination[], p: Prefs): Destination | null {
  const s = search(start, p);
  const speed = p.pace === 'slow' ? 0.7 : 1.3;
  let best: Destination | null = null;
  let bestCost = Infinity;
  for (const d of all) {
    if (d.kind !== kind) continue;
    const base = s.dist.get(attachNode(d));
    if (base === undefined) continue;
    const c = base + d.d / speed;
    if (c < bestCost) {
      bestCost = c;
      best = d;
    }
  }
  return best;
}

/* ---------- directions ---------- */

export interface Step {
  key: string;
  kind: 'walk' | 'elevator' | 'stairs' | 'sky' | 'arrive';
  text: string;
  note?: string;
  m: number;
  secs: number;
  level: number; // level on which the step starts
  toLevel: number;
  fromNode: string;
  toNode: string;
  legStart: number;
  legEnd: number;
}

function heading(a: string, b: string): [number, number] {
  const A = NODES.get(a)!;
  const B = NODES.get(b)!;
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

function turnBetween(prev: [number, number] | null, next: [number, number]): Turn {
  if (!prev) return 'none';
  const cross = prev[0] * next[1] - prev[1] * next[0];
  const dot = prev[0] * next[0] + prev[1] * next[1];
  const ang = (Math.atan2(cross, dot) * 180) / Math.PI; // + = clockwise on screen = right
  if (Math.abs(ang) < 30) return 'straight';
  if (Math.abs(ang) > 150) return 'none';
  return ang > 0 ? 'right' : 'left';
}

export interface PhraseCtx {
  lang: Lang;
  kioskNames: Record<string, string>; // node id → entrance name
}

export function placeName(nodeId: string, lang: Lang, kioskName?: string): string {
  const T = STEP_T[lang];
  const n = NODES.get(nodeId)!;
  const b = BUILDINGS[n.b];
  const bn = b.short[lang];
  switch (n.tag) {
    case 'hub':
      return n.level === 1 && n.b !== 'GAR' ? fmt(T.hubLobby, { b: bn }) : fmt(T.hubUp, { b: bn, n: n.level });
    case 'A':
    case 'B':
      return fmt(T.bank, { k: n.tag });
    case 'entrance':
    case 'exit':
      return n.tag === 'exit' ? T.garageExit : T.article + (kioskName ?? '');
    case 'east':
      return T.linkDoor;
    case 'west':
      return T.westLobby;
    case 'eastDoor':
      return T.eastDoors;
    case 'north':
    case 'south':
    case 'northW':
    case 'northE':
      return fmt(T.connectorDoor, { b: bn });
    default:
      return fmt(T.skyLanding, { b: bn });
  }
}

function dateShort(iso: string, lang: Lang, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(iso + 'T12:00:00'));
}

export function buildSteps(
  route: Route,
  dest: Destination,
  lang: Lang,
  locale: string,
  kioskNameFor: (nodeId: string) => string | undefined,
  closed: Set<string>,
): Step[] {
  const T = STEP_T[lang];
  const steps: Step[] = [];
  let facing: [number, number] | null = null;
  // standing at an entrance: you face into the building
  const first = route.legs[0];
  if (first?.edge && NODES.get(first.from)!.tag === 'entrance') facing = heading(first.from, first.to);

  const legs = route.legs;
  let i = 0;
  while (i < legs.length) {
    const leg = legs[i];
    const e = leg.edge;
    const fromN = NODES.get(leg.from)!;
    if (e && e.kind === 'elevator') {
      const k = fromN.tag;
      const toN = NODES.get(leg.to)!;
      const up = toN.level > fromN.level;
      let note: string | undefined;
      const sibling = k === 'A' ? 'B' : 'A';
      const closedBank = CLOSURES.find((c) => c.kind === 'elevator' && c.b === fromN.b && closed.has(c.id));
      if (closedBank && `${fromN.b}-${sibling}` === `${closedBank.b}-B`) {
        note = fmt(T.bankClosed, { k: 'B', d: dateShort(closedBank.to, lang, locale), alt: k });
      }
      steps.push({
        key: `s${i}`,
        kind: 'elevator',
        text: fmt(T.elevator, { k, dir: up ? T.up : T.down, n: toN.level }),
        note,
        m: 0,
        secs: leg.secs,
        level: fromN.level,
        toLevel: toN.level,
        fromNode: leg.from,
        toNode: leg.to,
        legStart: i,
        legEnd: i,
      });
      // after leaving the elevator you face the lobby hub
      const hub = `${toN.b}-${toN.level}-hub`;
      facing = NODES.has(hub) ? heading(leg.to, hub) : null;
      i++;
      continue;
    }
    if (e && e.kind === 'stairs') {
      const toN = NODES.get(leg.to)!;
      steps.push({
        key: `s${i}`,
        kind: 'stairs',
        text: fmt(T.stairs, { dir: toN.level > fromN.level ? T.up : T.down, n: toN.level }),
        m: 0,
        secs: leg.secs,
        level: fromN.level,
        toLevel: toN.level,
        fromNode: leg.from,
        toNode: leg.to,
        legStart: i,
        legEnd: i,
      });
      facing = null;
      i++;
      continue;
    }
    // walking-type leg(s): merge plain corridor legs into one step
    const via = e ? e.via : 'corridor';
    const isCorr = (x: Edge | null) => !x || (x.via === 'corridor' && x.kind === 'walk');
    let m = leg.m;
    let secs = leg.secs;
    let j = i;
    let endNode = leg.to;
    let lastHead: [number, number] | null = e ? heading(leg.from, leg.to) : facing;
    const firstHead = lastHead;
    if (isCorr(e)) {
      while (j + 1 < legs.length) {
        const nx = legs[j + 1];
        if (!isCorr(nx.edge)) break;
        const mid = NODES.get(endNode)!;
        if (nx.edge && mid.tag === 'hub' && mid.level === 1 && mid.b !== 'GAR') break; // stop in the lobby
        if (nx.edge && (mid.tag === 'east' || mid.tag === 'west')) break;
        m += nx.m;
        secs += nx.secs;
        if (nx.edge) {
          endNode = nx.to;
          lastHead = heading(nx.from, nx.to);
        }
        j++;
      }
    }
    const includesFinal = !legs[j].edge;
    const toLabel = includesFinal ? dest.name : placeName(endNode, lang, kioskNameFor(endNode));
    const tl: Turn = turnBetween(facing, firstHead ?? [0, -1]);
    const kind: Step['kind'] = via === 'sky' ? 'sky' : 'walk';
    let text: string;
    if (isCorr(e)) {
      text = fmt(T.corridor[tl], { to: toLabel });
    } else {
      const prefix = tl === 'left' || tl === 'right' ? T.turnPrefix[tl] : '';
      text = prefix + fmt(T[via as 'link' | 'plaza' | 'connector' | 'steps' | 'sky'], { to: toLabel });
    }
    let note: string | undefined;
    if (via === 'link') {
      const sky = CLOSURES.find((c) => c.kind === 'skybridge' && closed.has(c.id));
      if (sky) note = fmt(T.skyClosed, { d: dateShort(sky.to, lang, locale) });
    }
    steps.push({
      key: `s${i}`,
      kind,
      text,
      note,
      m,
      secs,
      level: fromN.level,
      toLevel: NODES.get(legs[j].to)!.level,
      fromNode: leg.from,
      toNode: legs[j].to,
      legStart: i,
      legEnd: j,
    });
    facing = lastHead;
    i = j + 1;
  }
  const last = legs[legs.length - 1];
  steps.push({
    key: 'arrive',
    kind: 'arrive',
    text: fmt(T.arrive, { name: dest.name }) + (dest.cat === 'amenity' || dest.cat === 'parking' ? '' : ' ' + T.deskNote),
    m: 0,
    secs: 0,
    level: dest.level,
    toLevel: dest.level,
    fromNode: last.to,
    toNode: last.to,
    legStart: legs.length - 1,
    legEnd: legs.length - 1,
  });
  return steps;
}

export function edgesById() {
  return new Map(EDGES.map((e) => [e.id, e]));
}
