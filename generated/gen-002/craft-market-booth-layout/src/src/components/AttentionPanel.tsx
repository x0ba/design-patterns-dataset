import type { Issue } from '../lib/types';

interface Props {
  issues: Issue[];
  onSelect: (id: string) => void;
}

export function AttentionPanel({ issues, onSelect }: Props) {
  const errors = issues.filter((i) => i.level === 'error');
  const cautions = issues.filter((i) => i.level === 'caution');
  const todos = issues.filter((i) => i.level === 'todo');

  const item = (i: Issue) => (
    <li key={i.key}>
      <button
        type="button"
        className={`issue issue-${i.level}`}
        onClick={() => i.vendorIds[0] && onSelect(i.vendorIds[0])}
        disabled={!i.vendorIds.length}
      >
        <span className="issue-icon">{i.level === 'error' ? '!' : i.level === 'caution' ? '?' : '+'}</span>
        <span>
          {i.text}
        </span>
      </button>
    </li>
  );

  return (
    <div className="panel attention">
      <div className="panel-head">
        <h2>Layout check</h2>
        <span className={`count ${errors.length ? 'count-error' : 'count-ok'}`}>
          {errors.length ? `${errors.length} to fix` : 'No rule breaks'}
        </span>
      </div>
      {errors.length === 0 && cautions.length === 0 && <p className="ok-line">Every booth on the floor passes the rules.</p>}
      <ul className="issues">
        {errors.map(item)}
        {cautions.map(item)}
      </ul>
      {todos.length > 0 && (
        <>
          <div className="sub-head">Still to place</div>
          <ul className="issues">{todos.map(item)}</ul>
        </>
      )}
    </div>
  );
}
