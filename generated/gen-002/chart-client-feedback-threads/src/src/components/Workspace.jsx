import { VERSIONS, THREADS } from '../data.js';
import Chart from './Chart.jsx';
import Thread from './Thread.jsx';

const TAB_ORDER = ['client', 'data', 'studio'];

export default function Workspace({
  graphic,
  version,
  onVersion,
  floor,
  muted,
  oct,
  onFloor,
  onMuted,
  onOct,
  onResetPreview,
  pinned,
  highlight,
  flash,
  onPickIndex,
  onPinClick,
  thread,
  onThread,
  unreadCounts,
  threadMessages,
  firstUnreadId,
  filter,
  onFilter,
  focus,
  composers,
  onComposer,
  onSend,
  onPinChip,
  onFile,
  onRemoveFile,
  onRemovePin,
  onVersionData,
  onShowAsSent,
}) {
  const v = VERSIONS[version];
  const composer = composers[thread];
  const previewOn = floor !== 0 || muted || (version === 'v3' && oct === 'corrected');

  return (
    <div className="workspace">
      <header className="g-head">
        <div className="g-title">
          <span className="g-num">G{graphic.n}</span>
          <h1>{graphic.title}</h1>
        </div>
        <div className="g-sub">
          Tri-County Transit Authority · Riding Back · reviewed by Renée Almeida and Sam Pruitt
        </div>
      </header>

      <div className="version-bar">
        {['v1', 'v2', 'v3'].map((id) => (
          <button
            key={id}
            className={`ver ${version === id ? 'on' : ''}`}
            onClick={() => onVersion(id)}
            aria-pressed={version === id}
          >
            <span className="ver-id">{id}</span>
            <span className="ver-date">sent {VERSIONS[id].sent}</span>
            {VERSIONS[id].current && <span className="ver-tag">current</span>}
          </button>
        ))}
        <div className="ver planned" aria-disabled="true">
          <span className="ver-id">v4</span>
          <span className="ver-date">not started</span>
        </div>
        <div className="version-meta">
          <p className="version-summary" title={`${v.summary} Data to ${v.through}.`}>
            {v.summary} Data to {v.through}.
          </p>
          <div className="version-files">
            <button className="file-chip" onClick={onShowAsSent} title={`${v.image.name}. Click to show the chart as sent.`}>
              <span className="kind">IMG</span> {version} image <span className="muted">{v.image.size}</span>
            </button>
            <button className="file-chip" onClick={() => onVersionData(version)} title={v.data.name}>
              <span className="kind">CSV</span> {version} data <span className="muted">{v.data.size}</span> ↓
            </button>
          </div>
        </div>
      </div>

      <div className="chart-area">
        <div className="toolbar">
          <Seg
            label="Axis floor"
            value={floor}
            onChange={onFloor}
            options={[
              [0, '0%'],
              [20, '20%'],
              [40, '40%'],
            ]}
          />
          <Seg
            label="2020 span"
            value={muted ? 'muted' : 'as'}
            onChange={(val) => onMuted(val === 'muted')}
            options={[
              ['as', 'As sent'],
              ['muted', 'Muted, proposed'],
            ]}
          />
          <Seg
            label="Oct 2026"
            disabled={version !== 'v3'}
            value={oct}
            onChange={onOct}
            options={[
              ['prelim', '81.4 prelim'],
              ['corrected', '79.8 corrected'],
            ]}
          />
          {previewOn && (
            <button className="link-btn" onClick={onResetPreview}>
              Reset to as sent
            </button>
          )}
        </div>

        {previewOn && (
          <div className="preview-note">
            Preview only. Nothing here changes {version} as sent.
            {floor === 40 && ' With a 40% floor, the April 2020 low falls off the chart.'}
          </div>
        )}

        <Chart
          version={version}
          floor={floor}
          muted={muted}
          oct={oct}
          pinned={pinned}
          highlight={highlight}
          flash={flash}
          onPickIndex={onPickIndex}
          onPinClick={onPinClick}
        />
        <p className="chart-caption">
          Click a month to pin it to your next client message. Numbered pins are on v3 and link to the thread.
        </p>
      </div>

      <section className="thread-area">
        <div className="tabs">
          {TAB_ORDER.map((t) => (
            <button key={t} className={`tab ${thread === t ? 'on' : ''} ${t === 'studio' ? 'studio' : ''}`} onClick={() => onThread(t)}>
              {t === 'studio' && <LockIcon />}
              {THREADS[t].label}
              {unreadCounts[t] > 0 && <span className="count">{unreadCounts[t]}</span>}
            </button>
          ))}
          <div className="spacer" />
          <label className="filter">
            Show
            <select value={filter} onChange={(e) => onFilter(e.target.value)}>
              <option value="all">All versions</option>
              <option value="this">{version} only</option>
            </select>
          </label>
        </div>

        <div className={`visibility ${thread === 'studio' ? 'studio' : ''}`}>
          {thread === 'studio' ? <LockIcon /> : null}
          {THREADS[thread].visibleTo}
        </div>

        <Thread
          threadId={thread}
          messages={threadMessages}
          firstUnreadId={firstUnreadId}
          focus={focus}
          flash={flash}
          composer={composer}
          version={version}
          onComposer={(patch) => onComposer(thread, patch)}
          onSend={() => onSend(thread)}
          onPinChip={onPinChip}
          onFile={onFile}
          onRemoveFile={(f) => onRemoveFile(thread, f)}
          onRemovePin={() => onRemovePin(thread)}
        />
      </section>
    </div>
  );
}

function Seg({ label, options, value, onChange, disabled = false }) {
  return (
    <div className={`seg-group ${disabled ? 'disabled' : ''}`}>
      <span className="seg-label">{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map(([val, text]) => {
          const on = String(value) === String(val);
          return (
            <button
              key={String(val)}
              disabled={disabled}
              className={on ? 'on' : ''}
              aria-pressed={on}
              onClick={() => onChange(val)}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" className="lock">
      <rect x="2" y="5" width="8" height="6" rx="1.2" fill="currentColor" />
      <path d="M4 5V3.6a2 2 0 0 1 4 0V5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
