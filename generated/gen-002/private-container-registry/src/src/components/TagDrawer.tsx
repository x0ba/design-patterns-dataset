import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useApp } from '../context';
import { CVE_ID, CVE_INFO, isBookwormWarning, matchesCve } from '../data/cve';
import { currentBaseDigest } from '../data/seed';
import type { Env, Severity, Tag } from '../data/types';
import { AdvisoryChip, CopyButton, EnvBadge } from './Badges';
import { fmtDateTime, relTime } from '../lib/time';
import { fmtSize, shortHash } from '../lib/format';

type Tab = 'overview' | 'build' | 'vulns';
const ENVS: Env[] = ['prod', 'staging', 'none'];
const SEVERITIES: ('all' | Severity)[] = ['all', 'critical', 'high', 'medium', 'low'];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function CodeBlock({ text, label }: { text: string; label: string }) {
  return (
    <div className="codeblock">
      <pre>{text}</pre>
      <CopyButton text={text} label={label} />
    </div>
  );
}

export function TagDrawer({ tag, onClose }: { tag: Tag; onClose: () => void }) {
  const { setEnv } = useApp();
  const [tab, setTab] = useState<Tab>('overview');
  const [sev, setSev] = useState<'all' | Severity>('all');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const affected = matchesCve(tag.base, tag.pushedAt);
  const warn = isBookwormWarning(tag.base, tag.pushedAt);
  const currentDigest = currentBaseDigest(tag.base);
  const baseChanged = currentDigest !== undefined && currentDigest !== tag.baseDigest;
  const b = tag.build;
  const totalFindings = tag.scan.critical + tag.scan.high + tag.scan.medium + tag.scan.low;
  const shownFindings = tag.findings.filter((f) => sev === 'all' || f.severity === sev);

  const rebuildCmd = [
    `git checkout ${b.commit}`,
    `docker buildx build --pull --build-arg BASE_IMAGE=${tag.base} --build-arg APP_VERSION=${tag.name} -f ${b.dockerfile} -t ${tag.repo}:${tag.name}-patch1 .`,
  ].join('\n');
  const checkCmd = `docker run --rm ${tag.repo}:${tag.name} dpkg -s libssl3 | grep Version`;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Details for ${tag.id}`}>
        <header className="drawer-head">
          <div className="drawer-title">
            <div className="chip-row">
              <EnvBadge env={tag.env} />
              {affected && <AdvisoryChip id={CVE_ID} />}
            </div>
            <h2 className="mono">
              {tag.repo}
              <span className="colon">:</span>
              {tag.name}
            </h2>
            <div className="digest-line mono">
              {tag.digest}
              <CopyButton text={tag.digest} label="Digest" />
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
            ×
          </button>
        </header>

        <nav className="tabs" role="tablist">
          {(
            [
              ['overview', 'Overview'],
              ['build', 'Build'],
              ['vulns', `Vulnerabilities · ${totalFindings}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`tab${tab === key ? ' tab-active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="drawer-body">
          {tab === 'overview' && (
            <>
              {affected ? (
                <div className="verdict verdict-bad">
                  <strong>Needs rebuild.</strong> Built on <span className="mono">{tag.base}</span> on{' '}
                  {fmtDateTime(tag.pushedAt)}, so it ships the vulnerable {CVE_INFO.pkg}.
                  {baseChanged && ' The base has been rebuilt since, so a fresh pull picks up the fix.'}
                  <div className="verdict-body">
                    Rebuild from the same commit with <span className="mono">--pull</span>, then test before you move the tag.
                  </div>
                  <CodeBlock text={rebuildCmd} label="Rebuild command" />
                </div>
              ) : warn ? (
                <div className="verdict verdict-warn">
                  <strong>Not matched by the base rule, but check it.</strong> <span className="mono">{tag.base}</span> is
                  Debian 12 (bookworm) underneath and was built before Nov 14. Confirm the installed libssl3 version:
                  <CodeBlock text={checkCmd} label="Check command" />
                </div>
              ) : (
                <div className="verdict verdict-ok">
                  <strong>Not affected.</strong>{' '}
                  {tag.base.startsWith('debian:12')
                    ? 'Pushed after Nov 14, so it was built on the patched debian:12 base.'
                    : `Base is ${tag.base}, not debian:12.`}
                </div>
              )}

              <dl className="fields">
                <Field label="Environment">
                  <select
                    className="select"
                    value={tag.env}
                    aria-label="Environment label"
                    onChange={(e) => setEnv(tag.id, e.target.value as Env)}
                  >
                    {ENVS.map((env) => (
                      <option key={env} value={env}>
                        {env}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Image size">{fmtSize(tag.sizeMB)} (before layer sharing)</Field>
                <Field label="Architecture">{tag.arch}</Field>
                <Field label="Pushed">
                  {fmtDateTime(tag.pushedAt)} by {tag.pushedBy}
                </Field>
                <Field label="Last pulled">
                  {relTime(tag.lastPulledAt)}
                  {tag.lastPulledAt && <span className="sub"> · {fmtDateTime(tag.lastPulledAt)}</span>}
                </Field>
                <Field label="Pulls, last 30 days">{tag.pulls30d}</Field>
                <Field label="Base image">
                  <span className="mono">{tag.base}</span>
                </Field>
                <Field label="Base digest at build">
                  <span className="mono">{shortHash(tag.baseDigest, 19)}</span>
                </Field>
                <Field label="Base digest now">
                  {currentDigest ? <span className="mono">{shortHash(currentDigest, 19)}</span> : <span className="sub">not tracked</span>}
                </Field>
                <Field label="Base changed since build">
                  {currentDigest === undefined ? <span className="sub">not tracked</span> : baseChanged ? <strong className="txt-bad">Yes</strong> : 'No'}
                </Field>
              </dl>

              <p className="note">
                Untagged images are deleted after 30 days. If a rebuild moves this tag, the current digest becomes untagged and is
                deleted 30 days later.
              </p>
            </>
          )}

          {tab === 'build' && (
            <>
              <dl className="fields">
                <Field label="Source">
                  {b.sourceRepo} <span className="mono sub">@ {b.branch}</span>
                </Field>
                <Field label="Commit">
                  <span className="mono">{b.commit.slice(0, 12)}</span> <CopyButton text={b.commit} label="Commit SHA" />
                </Field>
                <Field label="Message">{b.commitMessage}</Field>
                <Field label="Author">{b.author}</Field>
                <Field label="Pipeline">
                  {b.pipeline} on {b.runner}, {Math.floor(b.durationSec / 60)}m {b.durationSec % 60}s
                </Field>
                <Field label="Dockerfile">
                  <span className="mono">{b.dockerfile}</span>
                </Field>
              </dl>

              <h4>Build arguments</h4>
              <table className="kv">
                <tbody>
                  {Object.entries(b.buildArgs).map(([k, v]) => (
                    <tr key={k}>
                      <th className="mono">{k}</th>
                      <td className="mono">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4>Layers</h4>
              <table className="table compact">
                <thead>
                  <tr>
                    <th className="num">#</th>
                    <th>Instruction</th>
                    <th className="num">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {b.history.map((line, i) => (
                    <tr key={`${i}-${line.instruction}`}>
                      <td className="num">{i + 1}</td>
                      <td className="mono wrap">{line.instruction}</td>
                      <td className="num">{line.sizeMB > 0 ? `${line.sizeMB.toFixed(1)} MB` : '0 B'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4>Labels</h4>
              <table className="kv">
                <tbody>
                  {Object.entries(b.labels).map(([k, v]) => (
                    <tr key={k}>
                      <th className="mono wrap">{k}</th>
                      <td className="mono wrap">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {tab === 'vulns' && (
            <>
              <div className="scan-summary">
                <span className="scan-pill sev-critical-bg">Critical {tag.scan.critical}</span>
                <span className="scan-pill sev-high-bg">High {tag.scan.high}</span>
                <span className="scan-pill sev-medium-bg">Medium {tag.scan.medium}</span>
                <span className="scan-pill sev-low-bg">Low {tag.scan.low}</span>
              </div>
              <div className="seg seg-small" role="group" aria-label="Filter by severity">
                {SEVERITIES.map((s) => (
                  <button key={s} type="button" className={`seg-btn${sev === s ? ' seg-active' : ''}`} onClick={() => setSev(s)}>
                    {s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <p className="sub">
                Showing {tag.findings.length} of {totalFindings} findings, most severe first.
              </p>
              <table className="table compact">
                <thead>
                  <tr>
                    <th>CVE</th>
                    <th>Severity</th>
                    <th>Package</th>
                    <th>Installed</th>
                    <th>Fixed in</th>
                  </tr>
                </thead>
                <tbody>
                  {shownFindings.map((f) => (
                    <tr key={`${f.cve}-${f.pkg}`} className={f.cve === CVE_ID ? 'row-advisory' : undefined}>
                      <td>
                        <div className="mono">{f.cve}</div>
                        <div className="sub wrap">{f.title}</div>
                      </td>
                      <td>
                        <span className={`sev-tag sev-tag-${f.severity}`}>{f.severity}</span>
                      </td>
                      <td className="mono">{f.pkg}</td>
                      <td className="mono wrap">{f.installed}</td>
                      <td className="mono wrap">{f.fixedIn ?? <span className="sub">no fix yet</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
