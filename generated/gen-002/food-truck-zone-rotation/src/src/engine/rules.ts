import { DAYS, dayLabel, holidayFor } from '../data/calendar';
import { Assignment, operates } from '../data/seed';
import { TRUCKS, TRUCK_BY_ID, Truck } from '../data/trucks';
import { CLOSURES, ZONES, ZONE_BY_ID, TIER_VALUE, closureFor, Zone } from '../data/zones';
import { SWAP_REQUESTS, RequestStatus } from '../data/requests';

export type Severity = 'blocking' | 'warning' | 'info';
export type FlagKind =
  | 'closure'
  | 'event'
  | 'availability'
  | 'permit'
  | 'double'
  | 'capacity'
  | 'zone_closed'
  | 'civic'
  | 'unconfirmed'
  | 'attendance';

export interface Flag {
  kind: FlagKind;
  severity: Severity;
  message: string;
}

export const CIVIC_LIMIT = 2;

export const cellKey = (zoneId: string, day: number) => `${zoneId}:${day}`;

export function truckAvailable(t: Truck, day: number): boolean {
  return !t.availability.unavailable.includes(day);
}
export function permitValid(t: Truck, day: number): boolean {
  return !t.permitLastDay || day <= t.permitLastDay;
}

/** Monthly target: guarantee, prorated when the truck isn't operating or the permit lapses mid-month. */
export function targetFor(t: Truck): { target: number; note?: string } {
  if (t.availability.status === 'not_operating') return { target: 0, note: 'Not operating in December' };
  if (t.permitLastDay) {
    if (t.permitLastDay >= 31) return { target: t.guarantee };
    const target = Math.ceil((t.guarantee * t.permitLastDay) / 31);
    return { target, note: `Prorated — permit lapses Dec ${t.permitLastDay}` };
  }
  return { target: t.guarantee };
}

export function zoneOpen(zone: Zone, day: number): { open: boolean; reason?: string } {
  const h = holidayFor(day);
  if (h?.kind === 'closed') return { open: false, reason: h.label };
  if (!zone.days.includes(new Date(2026, 11, day).getDay())) return { open: false, reason: `${zone.name} doesn’t operate ${dayLabel(day).slice(0, 3)}s` };
  const c = closureFor(zone.id, day);
  if (c) return { open: false, reason: `${c.title} (${c.short})` };
  return { open: true };
}

export interface Analysis {
  flags: Record<string, Flag[]>;
  blockingIds: Set<string>;
  cells: Record<string, Assignment[]>;
  cellValid: Record<string, number>;
  byTruck: Record<string, Assignment[]>;
  valid: Record<string, number>;
  civic: Record<string, number>;
  emptyCells: { zoneId: string; day: number }[];
  under: { truckId: string; valid: number; target: number }[];
  dayStats: Record<number, { blocking: number; warning: number; empty: number }>;
}

export function analyze(assignments: Assignment[]): Analysis {
  const flags: Record<string, Flag[]> = {};
  const cells: Record<string, Assignment[]> = {};
  const byTruck: Record<string, Assignment[]> = {};
  const civic: Record<string, number> = {};
  const truckDay: Record<string, Assignment[]> = {};

  for (const a of assignments) {
    (cells[cellKey(a.zoneId, a.day)] ??= []).push(a);
    (byTruck[a.truckId] ??= []).push(a);
    (truckDay[a.truckId + ':' + a.day] ??= []).push(a);
    if (a.zoneId === 'civic') civic[a.truckId] = (civic[a.truckId] ?? 0) + 1;
  }
  Object.values(byTruck).forEach((l) => l.sort((x, y) => x.day - y.day));

  const push = (id: string, f: Flag) => (flags[id] ??= []).push(f);

  for (const a of assignments) {
    const t = TRUCK_BY_ID[a.truckId];
    const z = ZONE_BY_ID[a.zoneId];
    const c = closureFor(a.zoneId, a.day);
    if (c) {
      push(a.id, {
        kind: c.kind,
        severity: 'blocking',
        message: c.kind === 'closure' ? `${z.name} closed — ${c.title.toLowerCase()}` : `${c.title} takes over ${z.name}`,
      });
    } else if (!operates(z, a.day)) {
      push(a.id, { kind: 'zone_closed', severity: 'blocking', message: `${z.name} isn’t open on ${dayLabel(a.day)}` });
    }
    if (!truckAvailable(t, a.day)) {
      push(a.id, {
        kind: 'availability',
        severity: 'blocking',
        message:
          t.availability.status === 'not_operating'
            ? `${t.name} not operating in December`
            : `${t.name} unavailable — form says “${t.availability.summary}”`,
      });
    }
    if (!permitValid(t, a.day)) {
      push(a.id, {
        kind: 'permit',
        severity: 'blocking',
        message: `Permit ${t.permit} lapses Dec ${t.permitLastDay}${t.renewal?.startsWith('Renewal application') ? ' (renewal pending)' : ''}`,
      });
    }
    if ((truckDay[a.truckId + ':' + a.day]?.length ?? 0) > 1) {
      push(a.id, { kind: 'double', severity: 'blocking', message: `${t.name} is booked twice on ${dayLabel(a.day)}` });
    }
  }

  // Capacity
  for (const [key, list] of Object.entries(cells)) {
    const z = ZONE_BY_ID[key.split(':')[0]];
    if (list.length > z.capacity) {
      list.slice(z.capacity).forEach((a) =>
        push(a.id, { kind: 'capacity', severity: 'blocking', message: `${z.name} over capacity (${list.length}/${z.capacity})` }),
      );
    }
  }

  // Civic Plaza fairness — flag every slot after the second
  for (const [truckId, list] of Object.entries(byTruck)) {
    const civ = list.filter((a) => a.zoneId === 'civic');
    if (civ.length > CIVIC_LIMIT) {
      civ.slice(CIVIC_LIMIT).forEach((a) =>
        push(a.id, {
          kind: 'civic',
          severity: 'warning',
          message: `${civ.length} Civic Plaza slots this month — limit is ${CIVIC_LIMIT}`,
        }),
      );
    }
    const t = TRUCK_BY_ID[truckId];
    if (t.availability.status === 'no_form') {
      list.forEach((a) => push(a.id, { kind: 'unconfirmed', severity: 'info', message: 'Unconfirmed — no December availability form' }));
    }
    if (t.warning) {
      list
        .filter((a) => ZONE_BY_ID[a.zoneId].tier === 'A')
        .forEach((a) => push(a.id, { kind: 'attendance', severity: 'info', message: 'Truck on attendance warning, placed in a tier A zone' }));
    }
  }

  const blockingIds = new Set(
    Object.entries(flags)
      .filter(([, fl]) => fl.some((f) => f.severity === 'blocking'))
      .map(([id]) => id),
  );

  const cellValid: Record<string, number> = {};
  for (const [key, list] of Object.entries(cells)) cellValid[key] = list.filter((a) => !blockingIds.has(a.id)).length;

  const valid: Record<string, number> = {};
  for (const t of TRUCKS) valid[t.id] = (byTruck[t.id] ?? []).filter((a) => !blockingIds.has(a.id)).length;

  const emptyCells: { zoneId: string; day: number }[] = [];
  for (const z of ZONES)
    for (const d of DAYS) if (zoneOpen(z, d).open && !(cellValid[cellKey(z.id, d)] > 0)) emptyCells.push({ zoneId: z.id, day: d });

  const under = TRUCKS.map((t) => ({ truckId: t.id, valid: valid[t.id], target: targetFor(t).target })).filter(
    (u) => u.valid < u.target,
  );

  const dayStats: Analysis['dayStats'] = {};
  DAYS.forEach((d) => (dayStats[d] = { blocking: 0, warning: 0, empty: 0 }));
  for (const a of assignments) {
    const fl = flags[a.id];
    if (!fl) continue;
    if (fl.some((f) => f.severity === 'blocking')) dayStats[a.day].blocking++;
    else if (fl.some((f) => f.severity === 'warning')) dayStats[a.day].warning++;
  }
  emptyCells.forEach((e) => dayStats[e.day].empty++);

  return { flags, blockingIds, cells, cellValid, byTruck, valid, civic, emptyCells, under, dayStats };
}

export function worstSeverity(fl?: Flag[]): Severity | null {
  if (!fl || !fl.length) return null;
  if (fl.some((f) => f.severity === 'blocking')) return 'blocking';
  if (fl.some((f) => f.severity === 'warning')) return 'warning';
  return 'info';
}

// ---------------------------------------------------------------------------
// Placement checks and suggestions

export interface PlaceCheck {
  hard?: string; // cannot place at all
  soft: string[]; // allowed, but would create an issue
}

export function checkPlacement(
  an: Analysis,
  truckId: string,
  zoneId: string,
  day: number,
  ignoreId?: string,
): PlaceCheck {
  const z = ZONE_BY_ID[zoneId];
  const t = TRUCK_BY_ID[truckId];
  const open = zoneOpen(z, day);
  if (!open.open) return { hard: open.reason, soft: [] };
  const inCell = (an.cells[cellKey(zoneId, day)] ?? []).filter((a) => a.id !== ignoreId);
  if (inCell.some((a) => a.truckId === truckId)) return { hard: `${t.name} is already in this zone`, soft: [] };
  if (inCell.length >= z.capacity) return { hard: `${z.name} is full (${z.capacity}/${z.capacity})`, soft: [] };
  const sameDay = (an.byTruck[truckId] ?? []).find((a) => a.day === day && a.id !== ignoreId);
  if (sameDay) return { hard: `${t.name} already has ${ZONE_BY_ID[sameDay.zoneId].name} that day`, soft: [] };
  const soft: string[] = [];
  if (!truckAvailable(t, day))
    soft.push(t.availability.status === 'not_operating' ? 'Truck not operating in December' : `Unavailable (${t.availability.summary})`);
  if (!permitValid(t, day)) soft.push(`Permit lapses Dec ${t.permitLastDay}`);
  if (zoneId === 'civic') {
    const ignoring = an.byTruck[truckId]?.find((a) => a.id === ignoreId)?.zoneId === 'civic' ? 1 : 0;
    if ((an.civic[truckId] ?? 0) - ignoring >= CIVIC_LIMIT) soft.push(`Would be Civic Plaza slot #${(an.civic[truckId] ?? 0) - ignoring + 1}`);
  }
  return { soft };
}

export interface MoveOption {
  zoneId: string;
  day: number;
  score: number;
  reasons: string[];
  fillsEmpty: boolean;
}

export function moveOptions(an: Analysis, a: Assignment, limit = 8): MoveOption[] {
  const from = ZONE_BY_ID[a.zoneId];
  const out: MoveOption[] = [];
  for (const z of ZONES) {
    for (const d of DAYS) {
      if (z.id === a.zoneId && d === a.day) continue;
      const chk = checkPlacement(an, a.truckId, z.id, d, a.id);
      if (chk.hard || chk.soft.length) continue;
      const reasons: string[] = [];
      let score = 100;
      const dd = Math.abs(d - a.day);
      if (dd === 0) {
        score += 40;
        reasons.push('Same day');
      } else {
        score -= Math.min(dd, 10) * 5 + (dd > 10 ? 20 : 0);
        reasons.push(`${d > a.day ? '+' : '−'}${dd} day${dd > 1 ? 's' : ''}`);
      }
      const tierDiff = TIER_VALUE[z.tier] - TIER_VALUE[from.tier];
      if (tierDiff === 0) {
        score += 15;
        reasons.push(`Tier ${z.tier}`);
      } else {
        score -= Math.abs(tierDiff) * 14;
        reasons.push(`Tier ${from.tier}→${z.tier}`);
      }
      const fromNight = from.kind === 'nightlife';
      const toNight = z.kind === 'nightlife';
      if (fromNight !== toNight) score -= 22;
      if (z.kind === 'breakfast' && from.kind !== 'breakfast') score -= 18;
      const fillsEmpty = !(an.cellValid[cellKey(z.id, d)] > 0);
      if (fillsEmpty) {
        score += 28;
        reasons.push('Fills empty zone');
      }
      const already = (an.byTruck[a.truckId] ?? []).filter((x) => x.zoneId === z.id && x.id !== a.id).length;
      score -= already * 6;
      // Prefer spreading trucks out over the day
      score -= (an.cellValid[cellKey(z.id, d)] ?? 0) * 3;
      out.push({ zoneId: z.id, day: d, score, reasons, fillsEmpty });
    }
  }
  return out.sort((x, y) => y.score - x.score).slice(0, limit);
}

export interface FillOption {
  truckId: string;
  score: number;
  reasons: string[];
  valid: number;
  target: number;
}

export function fillOptions(an: Analysis, zoneId: string, day: number, limit = 10): FillOption[] {
  const z = ZONE_BY_ID[zoneId];
  const out: FillOption[] = [];
  for (const t of TRUCKS) {
    const { target } = targetFor(t);
    if (target === 0) continue;
    const chk = checkPlacement(an, t.id, zoneId, day);
    if (chk.hard || chk.soft.length) continue;
    const valid = an.valid[t.id];
    const deficit = target - valid;
    const reasons: string[] = [];
    let score = deficit * 30;
    if (deficit > 0) reasons.push(`Needs ${deficit} more`);
    else if (deficit === 0) reasons.push('At guarantee');
    else reasons.push(`+${-deficit} over`);
    const displaced = (an.byTruck[t.id] ?? []).some((a) => an.blockingIds.has(a.id));
    if (displaced) {
      score += 12;
      reasons.push('Has a displaced slot');
    }
    if (t.warning && z.tier === 'A') {
      score -= 25;
      reasons.push('On attendance warning');
    }
    if (t.availability.status === 'no_form') {
      score -= 8;
      reasons.push('No form');
    }
    const already = (an.byTruck[t.id] ?? []).filter((a) => a.zoneId === zoneId).length;
    if (already) {
      score -= already * 8;
      reasons.push(`${already}× here already`);
    }
    if (z.kind === 'breakfast' && /coffee|breakfast|bakery|waffle/i.test(t.cuisine)) {
      score += 15;
      reasons.push('Breakfast menu');
    }
    out.push({ truckId: t.id, score, reasons, valid, target });
  }
  return out.sort((x, y) => y.score - x.score).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Issue list

export interface IssueItem {
  key: string;
  severity: Severity;
  title: string;
  detail: string;
  day?: number;
  assignmentId?: string;
  zoneId?: string;
  truckId?: string;
  ackable?: boolean;
}

export interface IssueGroup {
  id: string;
  severity: Severity;
  title: string;
  subtitle?: string;
  items: IssueItem[];
  rehome?: boolean;
}

export function buildIssues(
  an: Analysis,
  assignments: Assignment[],
  acks: Set<string>,
  requestStatus: Record<string, RequestStatus>,
): { groups: IssueGroup[]; acked: IssueItem[] } {
  const acked: IssueItem[] = [];
  const byKind = (kind: FlagKind) =>
    assignments
      .filter((a) => an.flags[a.id]?.some((f) => f.kind === kind))
      .sort((x, y) => x.day - y.day)
      .map<IssueItem>((a) => {
        const t = TRUCK_BY_ID[a.truckId];
        const z = ZONE_BY_ID[a.zoneId];
        const f = an.flags[a.id].find((f) => f.kind === kind)!;
        return {
          key: `${kind}:${a.id}`,
          severity: f.severity,
          title: t.name,
          detail: `${z.name} · ${dayLabel(a.day)}`,
          day: a.day,
          assignmentId: a.id,
          zoneId: a.zoneId,
          truckId: a.truckId,
        };
      });

  const groups: IssueGroup[] = [];
  const fifth = CLOSURES[0];
  const wl = CLOSURES[1];
  groups.push({
    id: 'closure',
    severity: 'blocking',
    title: 'Fifth St closure displaces Courthouse',
    subtitle: `Dec 8–12 · ${fifth.source}`,
    items: byKind('closure'),
    rehome: true,
  });
  groups.push({
    id: 'event',
    severity: 'blocking',
    title: 'Winter Lights takes over Riverside',
    subtitle: `Dec 13–14 · ${wl.source}`,
    items: byKind('event'),
    rehome: true,
  });
  groups.push({
    id: 'availability',
    severity: 'blocking',
    title: 'Conflicts with availability forms',
    subtitle: 'From forms received over the weekend',
    items: byKind('availability'),
    rehome: true,
  });
  groups.push({
    id: 'permit',
    severity: 'blocking',
    title: 'Permit lapses before slot',
    subtitle: 'Seoul Sister Dec 4 · Kebab Korner Dec 15',
    items: byKind('permit'),
    rehome: true,
  });
  const errors = [...byKind('double'), ...byKind('capacity'), ...byKind('zone_closed')];
  if (errors.length) groups.push({ id: 'errors', severity: 'blocking', title: 'Scheduling errors', items: errors, rehome: true });

  const civicItems: IssueItem[] = Object.entries(an.civic)
    .filter(([, n]) => n > CIVIC_LIMIT)
    .map(([truckId, n]) => {
      const days = an.byTruck[truckId].filter((a) => a.zoneId === 'civic').map((a) => a.day);
      const extra = an.byTruck[truckId].filter((a) => a.zoneId === 'civic')[CIVIC_LIMIT];
      return {
        key: `civic:${truckId}`,
        severity: 'warning' as Severity,
        title: TRUCK_BY_ID[truckId].name,
        detail: `${n} Civic Plaza slots (Dec ${days.join(', ')})`,
        day: extra.day,
        assignmentId: extra.id,
        truckId,
      };
    });
  groups.push({ id: 'civic', severity: 'warning', title: 'Civic Plaza fairness (max 2/month)', items: civicItems });

  const emptyItems: IssueItem[] = an.emptyCells.map((e) => {
    const z = ZONE_BY_ID[e.zoneId];
    const had = (an.cells[cellKey(e.zoneId, e.day)] ?? []).length;
    return {
      key: `empty:${e.zoneId}:${e.day}`,
      severity: 'warning',
      title: z.name,
      detail: `${dayLabel(e.day)}${had ? ' · only truck is displaced' : ' · no truck assigned'}`,
      day: e.day,
      zoneId: e.zoneId,
      ackable: true,
    };
  });
  groups.push({ id: 'empty', severity: 'warning', title: 'Zones left empty', subtitle: 'Open zone-days with no valid truck', items: emptyItems });

  const underItems: IssueItem[] = an.under
    .map((u) => {
      const t = TRUCK_BY_ID[u.truckId];
      return {
        key: `under:${u.truckId}`,
        severity: 'warning' as Severity,
        title: t.name,
        detail: `${u.valid} of ${u.target} slots${t.permitType === 'premium' ? ' · premium' : ''}${
          t.availability.status === 'partial' ? ` · ${t.availability.summary}` : ''
        }`,
        truckId: u.truckId,
        ackable: true,
      };
    })
    .sort((x, y) => x.title.localeCompare(y.title));
  groups.push({ id: 'under', severity: 'warning', title: 'Below monthly guarantee', items: underItems });

  const reqItems: IssueItem[] = SWAP_REQUESTS.filter((r) => requestStatus[r.id] === 'pending').map((r) => ({
    key: `req:${r.id}`,
    severity: 'info',
    title: `${TRUCK_BY_ID[r.a.truckId].name} ↔ ${TRUCK_BY_ID[r.b.truckId].name}`,
    detail: `Swap Saturday Dec ${r.a.day} zones · ${r.id}`,
    day: r.a.day,
  }));
  groups.push({ id: 'requests', severity: 'info', title: 'Swap requests waiting', items: reqItems });

  const noForm: IssueItem[] = TRUCKS.filter((t) => t.availability.status === 'no_form').map((t) => ({
    key: `noform:${t.id}`,
    severity: 'info',
    title: t.name,
    detail: `${(an.byTruck[t.id] ?? []).length} unconfirmed slots · ${t.owner}`,
    truckId: t.id,
  }));
  groups.push({ id: 'noform', severity: 'info', title: 'No December form yet', items: noForm });

  const att: IssueItem[] = assignments
    .filter((a) => an.flags[a.id]?.some((f) => f.kind === 'attendance'))
    .map((a) => ({
      key: `att:${a.id}`,
      severity: 'info',
      title: TRUCK_BY_ID[a.truckId].name,
      detail: `On attendance warning · ${ZONE_BY_ID[a.zoneId].name} ${dayLabel(a.day)}`,
      day: a.day,
      assignmentId: a.id,
      truckId: a.truckId,
      ackable: true,
    }));
  groups.push({ id: 'attendance', severity: 'info', title: 'Attendance watch', items: att });

  for (const g of groups) {
    const keep: IssueItem[] = [];
    for (const it of g.items) (acks.has(it.key) ? acked : keep).push(it);
    g.items = keep;
  }
  return { groups, acked };
}

// ---------------------------------------------------------------------------
// Batch re-homing plan

export interface PlanRow {
  assignmentId: string;
  options: MoveOption[];
  choice: number; // index into options, -1 = remove slot
}

export function planRehome(assignments: Assignment[], ids: string[]): PlanRow[] {
  let working = assignments.map((a) => ({ ...a }));
  const rows: PlanRow[] = [];
  const order = ids
    .map((id) => working.find((a) => a.id === id)!)
    .filter(Boolean)
    .sort((x, y) => x.day - y.day || TIER_VALUE[ZONE_BY_ID[y.zoneId].tier] - TIER_VALUE[ZONE_BY_ID[x.zoneId].tier]);
  for (const a of order) {
    const an = analyze(working);
    const options = moveOptions(an, a, 4);
    rows.push({ assignmentId: a.id, options, choice: options.length ? 0 : -1 });
    if (options.length) {
      const o = options[0];
      working = working.map((x) => (x.id === a.id ? { ...x, zoneId: o.zoneId, day: o.day } : x));
    }
  }
  return rows;
}

export const SEVERITY_LABEL: Record<Severity, string> = { blocking: 'Must fix', warning: 'Review', info: 'FYI' };
