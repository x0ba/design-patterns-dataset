import { useEffect, useRef } from 'react';
import { FILE } from './data';
import { DIFFICULTY, codeFilename, downloadText, fitLabel, fitScore, fmtDate, fmtMinutes, hasReq, runStatus, totalMinutes, type Extras } from './logic';
import { getRecipe } from './App';
import { Thumb } from './Thumb';
import { DifficultyPips, Icon, StatusBadge } from './bits';

export function CompareModal(props: {
  ids: string[];
  extras: Extras;
  focus: 'winter' | 'year';
  onClose: () => void;
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
  notify: (m: string) => void;
}) {
  const rs = props.ids.map(getRecipe);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);

  const rows: { label: string; cell: (i: number) => React.ReactNode }[] = [
    {
      label: 'Runs with your setup?',
      cell: (i) => <StatusBadge status={runStatus(rs[i], props.extras)} />,
    },
    {
      label: 'Written in',
      cell: (i) => {
        const t = rs[i].tool;
        const lang = t === 'matplotlib' ? 'Python' : t === 'ggplot2' ? 'R' : t === 'Vega-Lite' ? 'JSON spec' : 'JavaScript';
        return lang === 'Python' ? <span className="ok-text">Python</span> : <span className="warn-text">{lang}</span>;
      },
    },
    {
      label: 'Extra installs',
      cell: (i) => {
        const miss = rs[i].requires.filter((q) => hasReq(q, props.extras) === false);
        return miss.length ? <span className="warn-text">{miss.join(', ')}</span> : <span className="ok-text">None</span>;
      },
    },
    {
      label: 'Difficulty',
      cell: (i) => (
        <>
          <DifficultyPips level={rs[i].difficulty} /> Level {rs[i].difficulty} · {DIFFICULTY[rs[i].difficulty]}
        </>
      ),
    },
    { label: 'Time', cell: (i) => `${rs[i].steps.length} steps · ${fmtMinutes(totalMinutes(rs[i]))}` },
    {
      label: 'Fit to your file',
      cell: (i) => {
        const m = rs[i].match;
        if (!m) return <span className="muted">Different data shape</span>;
        const fl = fitLabel(fitScore(rs[i], props.focus));
        return (
          <>
            <span className={`fit-chip ${fl.tone}`}>{fl.label}</span>
            <div className="small">{m.why}</div>
          </>
        );
      },
    },
    {
      label: 'Your columns used',
      cell: (i) => {
        const m = rs[i].match;
        if (!m) return '—';
        return <span className="mono small">{[...new Set(m.uses.map((u) => u.yours).filter(Boolean))].join(', ')}</span>;
      },
    },
    {
      label: 'Winter only',
      cell: (i) => {
        const w = rs[i].match?.winter;
        return w === 'built-in' ? 'Built in' : w === 'one setting' ? 'Change one setting' : <span className="muted">Not a winter chart</span>;
      },
    },
    { label: `Blank values (yours: ${FILE.missingPct}%)`, cell: (i) => <span className="small">{rs[i].missing}</span> },
    { label: 'Poster output', cell: (i) => <span className="small">{rs[i].poster}</span> },
    { label: 'Remakes', cell: (i) => rs[i].remakes.toLocaleString() },
    { label: 'License · updated', cell: (i) => `${rs[i].license} · ${fmtDate(rs[i].updated)}` },
    {
      label: 'Watch out for',
      cell: (i) => (rs[i].match?.watch ? <span className="small warn-text">{rs[i].match!.watch}</span> : <span className="muted">—</span>),
    },
  ];

  return (
    <div className="overlay center" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cmp-title">
        <div className="modal-top">
          <h2 id="cmp-title">Compare your shortlist</h2>
          <button ref={ref} className="icon-btn" onClick={props.onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">
          <table className="compare" style={{ ['--n' as string]: rs.length }}>
            <thead>
              <tr>
                <th></th>
                {rs.map((r) => (
                  <th key={r.id}>
                    <button className="cmp-thumb" onClick={() => props.onOpen(r.id)}>
                      <Thumb kind={r.thumb} seed={r.id} />
                    </button>
                    <button className="cmp-title" onClick={() => props.onOpen(r.id)}>
                      {r.title}
                    </button>
                    <div className="tiny muted">
                      @{r.author} · {r.tool}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {rs.map((r, i) => (
                    <td key={r.id}>{row.cell(i)}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <th></th>
                {rs.map((r) => (
                  <td key={r.id} className="cmp-actions">
                    <button
                      className="btn outline small"
                      onClick={() => {
                        downloadText(codeFilename(r), r.code);
                        props.notify(`Downloaded ${codeFilename(r)}`);
                      }}
                    >
                      <Icon name="download" /> {codeFilename(r)}
                    </button>
                    <button className="btn ghost small" onClick={() => props.onRemove(r.id)}>
                      Remove
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
