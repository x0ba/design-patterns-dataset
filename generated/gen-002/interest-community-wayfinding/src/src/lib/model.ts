import { communities, groups, guides, spaces, threads } from '../data/seed';
import type { Community, Guide, RegionalGroup, Space, Thread } from '../data/types';

// ---------- Lookups ----------

const communityIndex = new Map(communities.map((c) => [c.id, c]));
const spaceIndex = new Map(spaces.map((s) => [s.id, s]));
const threadIndex = new Map(threads.map((t) => [t.id, t]));
const guideIndex = new Map(guides.map((g) => [g.id, g]));
const groupIndex = new Map(groups.map((g) => [g.id, g]));

export const getCommunity = (id: string): Community | undefined => communityIndex.get(id);
export const getSpace = (id: string): Space | undefined => spaceIndex.get(id);
export const getThread = (id: string): Thread | undefined => threadIndex.get(id);
export const getGuide = (id: string): Guide | undefined => guideIndex.get(id);
export const getGroup = (id: string): RegionalGroup | undefined => groupIndex.get(id);

/** Root-first list of spaces leading to (and including) the given space. */
export function spaceChain(id: string): Space[] {
  const out: Space[] = [];
  let cur = spaceIndex.get(id);
  while (cur) {
    out.unshift(cur);
    cur = cur.parentId ? spaceIndex.get(cur.parentId) : undefined;
  }
  return out;
}

export const topSpaces = (communityId: string): Space[] =>
  spaces.filter((s) => s.communityId === communityId && s.parentId === null);

export const childSpaces = (parentId: string): Space[] => spaces.filter((s) => s.parentId === parentId);

export const threadsInSpace = (spaceId: string): Thread[] =>
  threads.filter((t) => t.spaceId === spaceId).sort((a, b) => b.lastActivityAt - a.lastActivityAt);

export const threadsInCommunity = (communityId: string): Thread[] => threads.filter((t) => t.communityId === communityId);

export const regionalGroups = (): RegionalGroup[] =>
  [...groups].sort((a, b) => a.milesFromPittsburgh - b.milesFromPittsburgh);

export const nearbyGroup = (): RegionalGroup | undefined => groups.find((g) => g.meetup);

/** "Beginners › Starters Help" */
export function spacePath(spaceId: string): string {
  return spaceChain(spaceId)
    .map((s) => s.name)
    .join(' › ');
}

/** Where a thread lives, e.g. "Sourdough & Wild Yeast · Beginners › Starters Help". */
export function threadLocation(thread: Thread): string {
  const community = communityIndex.get(thread.communityId);
  return `${community?.name ?? ''} · ${spacePath(thread.spaceId)}`;
}

export const communityIdOfSpace = (spaceId: string): string | undefined => spaceIndex.get(spaceId)?.communityId;

// ---------- Routes (hash-based so the static build works without rewrites) ----------

export type Route =
  | { name: 'home' }
  | { name: 'community'; id: string }
  | { name: 'space'; id: string }
  | { name: 'thread'; id: string }
  | { name: 'guide'; id: string; section: number }
  | { name: 'regional' }
  | { name: 'group'; id: string }
  | { name: 'recent'; community: string | null }
  | { name: 'saved' }
  | { name: 'search'; q: string }
  | { name: 'notfound' };

const NOT_FOUND: Route = { name: 'notfound' };

export const DEFAULT_ROUTE = '#/community/sourdough';

export function parseRoute(hash: string): Route {
  const [pathPart = '', query = ''] = hash.replace(/^#/, '').split('?');
  const segs = pathPart
    .split('/')
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
  const params = new URLSearchParams(query);
  const [kind, id, extra] = segs;

  if (!kind) return { name: 'community', id: 'sourdough' };

  switch (kind) {
    case 'home':
      return { name: 'home' };
    case 'community':
      return id && communityIndex.has(id) ? { name: 'community', id } : NOT_FOUND;
    case 'space':
      if (id === 'regional-groups') return { name: 'regional' };
      return id && spaceIndex.has(id) ? { name: 'space', id } : NOT_FOUND;
    case 'thread':
      return id && threadIndex.has(id) ? { name: 'thread', id } : NOT_FOUND;
    case 'guide': {
      const guide = id ? guideIndex.get(id) : undefined;
      const section = Number(extra ?? 0);
      if (!guide || !Number.isInteger(section) || section < 0 || section > guide.sections.length) return NOT_FOUND;
      return { name: 'guide', id: guide.id, section };
    }
    case 'regional':
      return { name: 'regional' };
    case 'group':
      return id && groupIndex.has(id) ? { name: 'group', id } : NOT_FOUND;
    case 'recent': {
      const c = params.get('c');
      return { name: 'recent', community: c && communityIndex.has(c) ? c : null };
    }
    case 'saved':
      return { name: 'saved' };
    case 'search':
      return { name: 'search', q: params.get('q') ?? '' };
    default:
      return NOT_FOUND;
  }
}

export const href = {
  home: () => '#/home',
  community: (id: string) => `#/community/${id}`,
  space: (id: string) => (id === 'regional-groups' ? '#/regional' : `#/space/${id}`),
  thread: (id: string) => `#/thread/${id}`,
  guide: (id: string, section = 0) => `#/guide/${id}${section ? `/${section}` : ''}`,
  regional: () => '#/regional',
  group: (id: string) => `#/group/${id}`,
  recent: (community?: string | null) => (community ? `#/recent?c=${community}` : '#/recent'),
  saved: () => '#/saved',
  search: (q: string) => `#/search?q=${encodeURIComponent(q)}`,
};

/** Which community a route belongs to, for sidebar highlighting. */
export function communityOfRoute(route: Route): string | null {
  switch (route.name) {
    case 'community':
      return route.id;
    case 'space':
      return communityIdOfSpace(route.id) ?? null;
    case 'thread':
      return threadIndex.get(route.id)?.communityId ?? null;
    case 'guide':
      return guideIndex.get(route.id)?.communityId ?? null;
    case 'regional':
    case 'group':
      return 'sourdough';
    case 'recent':
      return route.community;
    default:
      return null;
  }
}

/** Short label used for "Back to …" links. */
export function routeLabel(route: Route): string {
  switch (route.name) {
    case 'home':
      return 'Home';
    case 'community':
      return getCommunity(route.id)?.name ?? 'Community';
    case 'space':
      return getSpace(route.id)?.name ?? 'Space';
    case 'thread':
      return getThread(route.id)?.title ?? 'Thread';
    case 'guide':
      return getGuide(route.id)?.title ?? 'Guide';
    case 'regional':
      return 'Regional Groups';
    case 'group':
      return getGroup(route.id)?.name ?? 'Group';
    case 'recent':
      return 'Recently viewed';
    case 'saved':
      return 'Saved';
    case 'search':
      return `search for “${route.q}”`;
    default:
      return 'Meadowmark';
  }
}

export interface Crumb {
  label: string;
  href?: string;
}

/** Full path from Meadowmark down to the current page. The last crumb has no href. */
export function crumbsFor(route: Route): Crumb[] {
  const home: Crumb = { label: 'Meadowmark', href: href.home() };
  const communityCrumb = (communityId: string): Crumb[] => {
    const c = getCommunity(communityId);
    return c ? [{ label: c.name, href: href.community(c.id) }] : [];
  };
  const spaceCrumbs = (spaceId: string): Crumb[] => {
    const chain = spaceChain(spaceId);
    return chain.map((s) => ({ label: s.name, href: href.space(s.id) }));
  };

  switch (route.name) {
    case 'home':
      return [{ label: 'Meadowmark' }];
    case 'community': {
      const c = getCommunity(route.id);
      return [home, { label: c?.name ?? 'Community' }];
    }
    case 'space': {
      const chain = spaceChain(route.id);
      const last = chain[chain.length - 1];
      const trail = spaceCrumbs(route.id);
      if (trail.length) trail[trail.length - 1] = { label: last.name };
      return [home, ...communityCrumb(last.communityId), ...trail];
    }
    case 'thread': {
      const t = getThread(route.id);
      if (!t) return [home];
      return [home, ...communityCrumb(t.communityId), ...spaceCrumbs(t.spaceId), { label: t.title }];
    }
    case 'guide': {
      const g = getGuide(route.id);
      if (!g) return [home];
      const base: Crumb[] = [home, ...communityCrumb(g.communityId)];
      if (route.section === 0) return [...base, { label: g.title }];
      return [...base, { label: g.title, href: href.guide(g.id) }, { label: `Section ${route.section}` }];
    }
    case 'regional':
      return [home, ...communityCrumb('sourdough'), { label: 'Regional Groups' }];
    case 'group': {
      const g = getGroup(route.id);
      return [
        home,
        ...communityCrumb('sourdough'),
        { label: 'Regional Groups', href: href.regional() },
        { label: g?.name ?? 'Group' },
      ];
    }
    case 'recent': {
      const c = route.community ? getCommunity(route.community) : undefined;
      return c
        ? [home, { label: 'Recently viewed', href: href.recent() }, { label: c.name }]
        : [home, { label: 'Recently viewed' }];
    }
    case 'saved':
      return [home, { label: 'Saved' }];
    case 'search':
      return [home, { label: 'Search' }];
    default:
      return [home];
  }
}

// ---------- Search ----------

export interface SearchHit {
  kind: 'Thread' | 'Guide section' | 'Space' | 'Regional group' | 'Community';
  title: string;
  where: string;
  href: string;
  haystack: string;
}

const hits: SearchHit[] = [
  ...communities.map<SearchHit>((c) => ({
    kind: 'Community',
    title: c.name,
    where: 'Community',
    href: href.community(c.id),
    haystack: `${c.name} ${c.description}`.toLowerCase(),
  })),
  ...spaces
    .filter((s) => s.id !== 'regional-groups')
    .map<SearchHit>((s) => ({
      kind: 'Space',
      title: s.name,
      where: `${getCommunity(s.communityId)?.name ?? ''} · ${spacePath(s.id)}`,
      href: href.space(s.id),
      haystack: `${s.name} ${s.description}`.toLowerCase(),
    })),
  ...threads.map<SearchHit>((t) => ({
    kind: 'Thread',
    title: t.title,
    where: `${getCommunity(t.communityId)?.name ?? ''} · ${spacePath(t.spaceId)}`,
    href: href.thread(t.id),
    haystack: `${t.title} ${t.body} ${t.replies.map((r) => r.text).join(' ')}`.toLowerCase(),
  })),
  ...guides.flatMap((g) =>
    g.sections.map<SearchHit>((s, i) => ({
      kind: 'Guide section',
      title: `${g.title}: ${s.title}`,
      where: `Pinned guide · ${getCommunity(g.communityId)?.name ?? ''}`,
      href: href.guide(g.id, i + 1),
      haystack: `${s.title} ${s.paragraphs.join(' ')} ${(s.bullets ?? []).join(' ')}`.toLowerCase(),
    })),
  ),
  ...groups.map<SearchHit>((g) => ({
    kind: 'Regional group',
    title: g.name,
    where: `Regional Groups · ${g.city}, ${g.state}`,
    href: href.group(g.id),
    haystack: `${g.name} ${g.city} ${g.state} ${g.about}`.toLowerCase(),
  })),
];

const KIND_ORDER: SearchHit['kind'][] = ['Thread', 'Guide section', 'Regional group', 'Space', 'Community'];

export function searchSite(query: string): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return hits
    .filter((h) => terms.every((term) => h.haystack.includes(term)))
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
}
