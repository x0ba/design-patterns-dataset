import { useEffect, useMemo, useState } from 'react';
import { PAGE_DEFS, GROUP_ORDER, PROJECT, INITIAL_CONFIG, FIRST_BUILD_AT } from './data/project.js';
import {
  buildSite,
  diagnose,
  countIssues,
  resolveRef,
  retargetRef,
  convertBlockquoteCallout,
  setFrontmatterField,
} from './lib/site.js';
import { linkRefs } from './lib/markdown.js';
import { plural, summarize, timeLabel } from './lib/format.js';
import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Editor from './components/Editor.jsx';
import Preview from './components/Preview.jsx';
import Inspector from './components/Inspector.jsx';
import SiteSettings from './components/SiteSettings.jsx';
import PublishDialog from './components/PublishDialog.jsx';

const INITIAL_SOURCES = Object.fromEntries(PAGE_DEFS.map((p) => [p.slug, p.source]));
const INITIAL_COUNTS = countIssues(diagnose(buildSite(PAGE_DEFS, INITIAL_SOURCES)));
const BASE_URL_RE = /^https:\/\/\S+\/$/;

export default function App() {
  const [sources, setSources] = useState(INITIAL_SOURCES);
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [selected, setSelected] = useState('install');
  const [view, setView] = useState('page'); // 'page' | 'settings'
  const [mode, setMode] = useState('split'); // 'split' | 'source' | 'preview'
  const [tab, setTab] = useState('build'); // 'build' | 'page' | 'help'
  const [helpSlug, setHelpSlug] = useState(null);
  const [lineJump, setLineJump] = useState(null);
  const [anchorJump, setAnchorJump] = useState(null);
  const [builds, setBuilds] = useState([{ n: 1, at: FIRST_BUILD_AT, ...INITIAL_COUNTS }]);
  const [publish, setPublish] = useState({ status: 'idle', at: null });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const site = useMemo(() => buildSite(PAGE_DEFS, sources), [sources]);
  const issues = useMemo(() => diagnose(site), [site]);
  const counts = useMemo(() => countIssues(issues), [issues]);
  const page = site.bySlug[selected];
  const pageIssues = useMemo(() => issues.filter((i) => i.slug === selected), [issues, selected]);
  const previewHtml = useMemo(
    () => linkRefs(page.html, (target) => resolveRef(target, site)),
    [page, site],
  );

  const issuesByPage = useMemo(() => {
    const map = {};
    for (const issue of issues) {
      const entry = map[issue.slug] || (map[issue.slug] = { errors: 0, warnings: 0, notices: 0 });
      if (issue.severity === 'error') entry.errors += 1;
      else if (issue.severity === 'warning') entry.warnings += 1;
      else entry.notices += 1;
    }
    return map;
  }, [issues]);

  const baseUrlSet = BASE_URL_RE.test(config.baseUrl.trim());
  const blockers = [];
  if (counts.errors) blockers.push(plural(counts.errors, 'broken reference'));
  if (!baseUrlSet) blockers.push('no base URL');
  const canPublish = blockers.length === 0;
  const pendingFixes = counts.errors + counts.warnings;

  const steps = [
    { id: 'import', label: 'Import README', done: true, detail: 'README split into 3 guide pages' },
    { id: 'structure', label: 'Choose structure', done: true, detail: 'Guides + command reference' },
    {
      id: 'name',
      label: 'Name site',
      done: config.title.trim() !== '',
      detail: config.title.trim() || 'Give the site a name',
      action: 'settings',
    },
    {
      id: 'build',
      label: 'First build',
      done: builds.length > 0,
      detail: builds.length ? `Build #${builds.length} finished` : 'Run a build',
      action: 'rebuild',
    },
    {
      id: 'warnings',
      label: 'Fix warnings',
      done: pendingFixes === 0,
      detail: pendingFixes ? `${plural(counts.errors, 'error')}, ${plural(counts.warnings, 'warning')} open` : 'Nothing open',
      action: 'build-tab',
    },
    {
      id: 'url',
      label: 'Set base URL',
      done: baseUrlSet,
      detail: baseUrlSet ? config.baseUrl : 'Not set',
      action: 'settings',
    },
    {
      id: 'publish',
      label: 'Publish',
      done: publish.status === 'done',
      detail: publish.status === 'done' ? `Published ${publish.at}` : canPublish ? 'Ready to publish' : 'Blocked, see Publish',
      action: 'publish',
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = (message) => setToast({ id: Date.now(), message });
  const updateSource = (slug, text) => setSources((prev) => ({ ...prev, [slug]: text }));
  const updateConfig = (patch) => setConfig((prev) => ({ ...prev, ...patch }));

  const selectPage = (slug) => {
    setView('page');
    setSelected(slug);
    setLineJump(null);
    setAnchorJump(null);
  };

  const openLine = (slug, line) => {
    setView('page');
    setSelected(slug);
    if (mode === 'preview') setMode('split');
    setLineJump({ slug, line, n: Date.now() });
  };

  const openSection = (slug, anchor) => {
    if (slug !== selected) setSelected(slug);
    setView('page');
    setAnchorJump({ slug, anchor, n: Date.now() });
  };

  const navigate = (slug, anchor) => {
    if (!anchor) {
      selectPage(slug);
      return;
    }
    openSection(slug, anchor);
  };

  const brokenRefClick = (target) => {
    const issue = issues.find((i) => i.kind === 'broken-ref' && i.slug === selected && i.target === target);
    if (issue) openLine(issue.slug, issue.line);
  };

  const applyFix = (slug, nextSource, message) => {
    updateSource(slug, nextSource);
    notify(message);
  };

  const fixReference = (issue, newRef) =>
    applyFix(
      issue.slug,
      retargetRef(sources[issue.slug], issue.line, issue.target, newRef),
      `Reference fixed: now points to ${newRef}`,
    );

  const convertCallout = (issue) =>
    applyFix(
      issue.slug,
      convertBlockquoteCallout(sources[issue.slug], issue.line),
      `Callout on line ${issue.line} is now a ::: block`,
    );

  const setPageField = (slug, key, value) => updateSource(slug, setFrontmatterField(sources[slug], key, value));

  const rebuild = () => {
    const entry = { n: builds.length + 1, at: timeLabel(), ...counts };
    setBuilds((prev) => [entry, ...prev]);
    setView('page');
    setTab('build');
    notify(`Build #${entry.n} finished: ${summarize(counts)}`);
  };

  const openHelp = (slug) => {
    setView('page');
    setTab('help');
    setHelpSlug(slug);
  };

  const runStep = (step) => {
    if (step.action === 'settings') setView('settings');
    if (step.action === 'build-tab') {
      setView('page');
      setTab('build');
    }
    if (step.action === 'rebuild') rebuild();
    if (step.action === 'publish') setDialogOpen(true);
  };

  const onPublished = () => setPublish({ status: 'done', at: timeLabel() });

  return (
    <div className="app">
      <TopBar
        config={config}
        builds={builds}
        counts={counts}
        blockers={blockers}
        canPublish={canPublish}
        publish={publish}
        onRebuild={rebuild}
        onPublish={() => setDialogOpen(true)}
      />

      <Sidebar
        project={PROJECT}
        steps={steps}
        doneCount={doneCount}
        totalSteps={steps.length}
        groups={GROUP_ORDER}
        pages={site.pages}
        selected={selected}
        settingsOpen={view === 'settings'}
        issuesByPage={issuesByPage}
        onSelectPage={selectPage}
        onRunStep={runStep}
        onOpenSettings={() => setView('settings')}
      />

      <main className="center">
        {view === 'settings' ? (
          <SiteSettings
            config={config}
            onChange={updateConfig}
            baseUrlSet={baseUrlSet}
            latestRelease={PROJECT.latestRelease}
            onBack={() => setView('page')}
            onOpenHelp={openHelp}
          />
        ) : (
          <>
            <header className="page-header">
              <div>
                <p className="crumbs">
                  {page.group} <span>/</span> {page.title}
                </p>
                <h1>{page.title}</h1>
                <p className="file-path">pages/{selected}.md</p>
              </div>
              <div className="mode-toggle" role="group" aria-label="View mode">
                {[
                  ['source', 'Source'],
                  ['split', 'Split'],
                  ['preview', 'Preview'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={mode === value ? 'active' : ''}
                    aria-pressed={mode === value}
                    onClick={() => setMode(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </header>

            <div className={`workspace workspace-${mode}`}>
              {mode !== 'preview' && (
                <Editor
                  key={`${selected}-editor`}
                  value={page.source}
                  issues={pageIssues}
                  jump={lineJump && lineJump.slug === selected ? lineJump : null}
                  onChange={(text) => updateSource(selected, text)}
                />
              )}
              {mode !== 'source' && (
                <Preview
                  key={`${selected}-preview`}
                  html={previewHtml}
                  anchorJump={anchorJump && anchorJump.slug === selected ? anchorJump : null}
                  onNavigate={navigate}
                  onBrokenRef={brokenRefClick}
                />
              )}
            </div>
          </>
        )}
      </main>

      <Inspector
        tab={tab}
        onTab={setTab}
        counts={counts}
        issues={issues}
        builds={builds}
        site={site}
        baseUrlSet={baseUrlSet}
        page={page}
        helpSlug={helpSlug}
        onHelpSlug={setHelpSlug}
        onOpenHelp={openHelp}
        onOpenLine={openLine}
        onOpenSection={(anchor) => openSection(page.slug, anchor)}
        onFixReference={fixReference}
        onConvertCallout={convertCallout}
        onSetDescription={(slug, text) =>
          applyFix(
            slug,
            setFrontmatterField(sources[slug], 'description', text),
            `Description saved for ${site.bySlug[slug].title}`,
          )
        }
        onSetPageField={(key, value) => setPageField(page.slug, key, value)}
        onRebuild={rebuild}
      />

      {dialogOpen && (
        <PublishDialog
          site={site}
          counts={counts}
          canPublish={canPublish}
          version={config.version}
          baseUrl={config.baseUrl.trim()}
          status={publish.status}
          publishedAt={publish.at}
          onClose={() => setDialogOpen(false)}
          onPublished={onPublished}
          onFixErrors={() => {
            setDialogOpen(false);
            setView('page');
            setTab('build');
          }}
          onSetUrl={() => {
            setDialogOpen(false);
            setView('settings');
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
