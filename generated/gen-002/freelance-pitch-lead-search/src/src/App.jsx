import { useCallback, useEffect, useMemo, useState } from 'react';
import { ARTICLES, CALLS, OPENING_QUERY } from './data/generate.js';
import { OUTLETS, OUTLET_BY_ID } from './data/outlets.js';
import { PITCHES_OUT, SAVED_SEARCHES } from './data/profile.js';
import { FRIDAY, LAST_CHECK, SIX_MONTHS_START, TODAY, fmtWeekdayDate, daysBetween } from './lib/dates.js';
import * as S from './lib/search.js';
import TopBar from './components/TopBar.jsx';
import FiltersRail from './components/FiltersRail.jsx';
import RightRail from './components/RightRail.jsx';
import CoveragePanel from './components/CoveragePanel.jsx';
import OutletsPanel from './components/OutletsPanel.jsx';
import CallsPanel from './components/CallsPanel.jsx';
import PlanPanel from './components/PlanPanel.jsx';
import ArticleDrawer from './components/ArticleDrawer.jsx';

const PLAN_KEY = 'leadloom.pitchPlan.v1';
const PLAN_SIZE = 3;
const PAGE = 20;

const CALLS_BY_OUTLET = CALLS.reduce((m, c) => {
  (m[c.outletId] ||= []).push(c);
  return m;
}, {});

const SAVED = SAVED_SEARCHES.map((s) => {
  const toks = S.tokenize(s.q);
  const newCount = ARTICLES.filter((a) => a.date >= LAST_CHECK && S.matchesQuery(a, toks)).length;
  const total = S.runQuery(ARTICLES, s.q).length;
  const openCalls = CALLS.filter((c) => {
    const text = [c.title, ...c.topics].join(' ').toLowerCase();
    return toks.every((t) => new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text));
  });
  return { ...s, newCount, total, openCalls };
});

const INITIAL_FILTERS = {
  window: 'all',
  topics: new Set(),
  angle: null,
  author: 'any',
  words: 'any',
};

function loadPlan() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PLAN_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((p) => OUTLET_BY_ID[p.outletId]) : [];
  } catch {
    return [];
  }
}

function defaultAngle(outlet) {
  return (
    outlet.angleHint ||
    `Pitch the Milwaukee hive losses and the new virus, framed for ${outlet.name} readers.`
  );
}

export default function App() {
  const [queryInput, setQueryInput] = useState(OPENING_QUERY);
  const [submitted, setSubmitted] = useState(OPENING_QUERY);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [sort, setSort] = useState('relevance');
  const [shown, setShown] = useState(PAGE);
  const [tab, setTab] = useState('coverage');
  const [openId, setOpenId] = useState(null);
  const [outletOpts, setOutletOpts] = useState({ hideNoCoverage: true, writtenOnly: false });
  const [callOpts, setCallOpts] = useState({ relevance: 'match', deadline: 'any', pay: 'any' });
  const [plan, setPlan] = useState(loadPlan);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const runSearch = useCallback((q, resetFilters = true) => {
    setSubmitted(q);
    setQueryInput(q);
    setShown(PAGE);
    if (resetFilters) setFilters(INITIAL_FILTERS);
    setTab('coverage');
  }, []);

  const toks = useMemo(() => S.tokenize(submitted), [submitted]);
  const base = useMemo(() => S.runQuery(ARTICLES, submitted), [submitted]);
  const filtered = useMemo(() => S.applyFilters(base, filters), [base, filters]);
  const sorted = useMemo(() => S.sortArticles(filtered, sort, toks), [filtered, sort, toks]);

  // Outlets and calls respond to every filter except the date window, so they
  // always show the recent (6-month) count alongside the full picture.
  const outletBase = useMemo(() => S.applyFilters(base, filters, { window: true }), [base, filters]);
  const coverage = useMemo(() => S.outletCoverage(outletBase), [outletBase]);
  const active = useMemo(() => S.activeCallTopics(filters, outletBase), [filters, outletBase]);

  const recentBase = useMemo(() => base.filter((a) => a.date >= SIX_MONTHS_START), [base]);

  const angleRows6m = useMemo(() => {
    const list = S.applyFilters(base, { ...filters, window: '6m', angle: null }, {});
    const counts = {};
    for (const a of list) counts[a.angle] = (counts[a.angle] || 0) + 1;
    return Object.entries(counts).sort((x, y) => y[1] - x[1]);
  }, [base, filters]);

  const topicCounts = useMemo(() => S.topicCounts(base, filters), [base, filters]);
  const angleCounts = useMemo(() => S.angleCounts(base, filters), [base, filters]);

  const outletRows = useMemo(
    () =>
      OUTLETS.map((o) => {
        const calls = CALLS_BY_OUTLET[o.id] || [];
        const cov = coverage.get(o.id) || null;
        const score = S.scoreOutlet({ outlet: o, coverage: cov, calls, active, pitchesOut: PITCHES_OUT });
        const relevantCalls = calls.filter((c) => S.callIsRelevant(c, active));
        return { outlet: o, coverage: cov, calls, relevantCalls, score };
      }),
    [coverage, active],
  );
  const rowById = useMemo(() => Object.fromEntries(outletRows.map((r) => [r.outlet.id, r])), [outletRows]);

  const planIds = useMemo(() => new Set(plan.map((p) => p.outletId)), [plan]);

  // Recommendations: best fit, freelance-open, not already on the plan, and not
  // pitched in the last 30 days (those are held, not dropped).
  const rankedCandidates = useMemo(
    () =>
      outletRows
        .filter((r) => r.score && !planIds.has(r.outlet.id))
        .sort((a, b) => {
          const ds = b.score.score - a.score.score;
          if (ds) return ds;
          const da = a.score.bestCall?.deadline || '9999';
          const db = b.score.bestCall?.deadline || '9999';
          return da < db ? -1 : da > db ? 1 : 0;
        }),
    [outletRows, planIds],
  );
  const suggestions = rankedCandidates.filter((r) => !r.score.pitchedRecently).slice(0, 3);
  const held = rankedCandidates.filter((r) => r.score.pitchedRecently).slice(0, 3);

  const callRows = useMemo(
    () =>
      CALLS.filter((c) => {
        if (callOpts.relevance === 'match' && !S.callIsRelevant(c, active)) return false;
        if (!S.callDeadlineOk(c, callOpts.deadline)) return false;
        if (callOpts.pay !== 'any' && c.pay.type !== callOpts.pay) return false;
        return true;
      }).sort((a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0)),
    [callOpts, active],
  );
  const relevantCallCount = useMemo(() => CALLS.filter((c) => S.callIsRelevant(c, active)).length, [active]);
  const closingByFriday = useMemo(() => callRows.filter((c) => c.deadline <= FRIDAY).length, [callRows]);

  const addToPlan = useCallback(
    (outletId) => {
      if (planIds.has(outletId)) return;
      if (plan.length >= PLAN_SIZE) {
        setToast(`Your Friday plan already has ${PLAN_SIZE} outlets. Remove one to add another.`);
        return;
      }
      const outlet = OUTLET_BY_ID[outletId];
      setPlan((p) => [...p, { outletId, angle: defaultAngle(outlet), drafted: false, sent: false }]);
      setToast(`Added ${outlet.name} to the Friday plan.`);
    },
    [plan, planIds],
  );

  const updatePlan = useCallback((outletId, patch) => {
    setPlan((p) => p.map((item) => (item.outletId === outletId ? { ...item, ...patch } : item)));
  }, []);

  const removeFromPlan = useCallback((outletId) => {
    setPlan((p) => p.filter((item) => item.outletId !== outletId));
  }, []);

  const openArticle = openId ? ARTICLES.find((a) => a.id === openId) : null;

  const tabs = [
    { key: 'coverage', label: 'Coverage', count: filtered.length },
    { key: 'outlets', label: 'Outlets', count: outletRows.filter((r) => r.score).length },
    { key: 'calls', label: 'Open calls', count: relevantCallCount },
    { key: 'plan', label: 'Friday plan', count: `${plan.length}/${PLAN_SIZE}` },
  ];

  const onSubmit = (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    runSearch(trimmed, false);
  };

  return (
    <div className="app">
      <TopBar
        query={queryInput}
        onQuery={setQueryInput}
        onSubmit={onSubmit}
        todayLabel={fmtWeekdayDate(TODAY)}
        fridayLabel={fmtWeekdayDate(FRIDAY)}
        daysToFriday={daysBetween(TODAY, FRIDAY)}
      />

      <div className="body">
        <FiltersRail
          filters={filters}
          setFilters={setFilters}
          topicCounts={topicCounts}
          angleCounts={angleCounts}
          baseCount={base.length}
          onReset={() => setFilters(INITIAL_FILTERS)}
        />

        <main className="main">
          <nav className="tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                className={`tab ${tab === t.key ? 'on' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span className="tab-count">{t.count}</span>
              </button>
            ))}
          </nav>

          <div className="panel-scroll">
            {tab === 'coverage' && (
              <CoveragePanel
                submitted={submitted}
                baseCount={base.length}
                recentCount={recentBase.length}
                filteredCount={filtered.length}
                freelanceRecent={recentBase.filter((a) => a.authorType === 'freelance').length}
                angleRows6m={angleRows6m}
                activeAngle={filters.angle}
                onAngle={(a) => setFilters((f) => ({ ...f, angle: f.angle === a ? null : a }))}
                sort={sort}
                setSort={setSort}
                rows={sorted.slice(0, shown)}
                total={sorted.length}
                toks={toks}
                onMore={() => setShown((n) => n + PAGE)}
                onOpen={setOpenId}
                hasMore={shown < sorted.length}
                onSwitchWindow={(w) => setFilters((f) => ({ ...f, window: w }))}
              />
            )}

            {tab === 'outlets' && (
              <OutletsPanel
                rows={outletRows}
                opts={outletOpts}
                setOpts={setOutletOpts}
                plan={plan}
                planFull={plan.length >= PLAN_SIZE}
                onAdd={addToPlan}
                onOpenCalls={() => setTab('calls')}
                submitted={submitted}
              />
            )}

            {tab === 'calls' && (
              <CallsPanel
                rows={callRows}
                opts={callOpts}
                setOpts={setCallOpts}
                relevantCount={relevantCallCount}
                closingByFriday={closingByFriday}
                planIds={planIds}
                planFull={plan.length >= PLAN_SIZE}
                onAdd={addToPlan}
              />
            )}

            {tab === 'plan' && (
              <PlanPanel
                plan={plan}
                rowById={rowById}
                suggestions={suggestions}
                held={held}
                onAdd={addToPlan}
                onUpdate={updatePlan}
                onRemove={removeFromPlan}
                onToast={setToast}
                fridayLabel={fmtWeekdayDate(FRIDAY)}
                daysToFriday={daysBetween(TODAY, FRIDAY)}
              />
            )}
          </div>
        </main>

        <RightRail
          saved={SAVED}
          onRun={(q) => runSearch(q, true)}
          pitches={PITCHES_OUT}
          planIds={planIds}
        />
      </div>

      {openArticle && (
        <ArticleDrawer
          article={openArticle}
          submitted={submitted}
          onClose={() => setOpenId(null)}
          rowById={rowById}
          planIds={planIds}
          planFull={plan.length >= PLAN_SIZE}
          onAdd={addToPlan}
          onOpenCalls={() => {
            setOpenId(null);
            setTab('calls');
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
