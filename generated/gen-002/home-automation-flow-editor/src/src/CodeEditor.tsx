import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { COMPLETIONS, tokenize, type ExprError } from './expr';

const DSL_KW = new Set(['when', 'require', 'if', 'else', 'wait', 'until', 'pass']);
const KNOWN_FNS = new Set(['now', 'holiday', 'home', 'schedule', 'notify', 'set', 'off', 'on', 'pause', 'resume']);
const DAYS = new Set(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

export function highlight(src: string, error?: ExprError | null, readOnly = false): ReactNode[] {
  const toks = tokenize(src);
  const out: ReactNode[] = [];
  toks.forEach((t, i) => {
    let cls = `tk-${t.type}`;
    if (t.type === 'ident') {
      if (DSL_KW.has(t.text) && readOnly) cls = 'tk-kw';
      else if (DAYS.has(t.text)) cls = 'tk-day';
      else if (KNOWN_FNS.has(t.text) && src[t.end] === '(') cls = 'tk-fn';
      else if (src[t.start - 1] === '.') cls = 'tk-field';
    }
    if (t.type === 'err' && readOnly) cls = 'tk-punc';
    const inErr = error && t.type !== 'ws' && t.start < error.end && t.end > error.start;
    out.push(
      <span key={i} className={`${cls}${inErr ? ' tk-error' : ''}`}>
        {t.text}
      </span>,
    );
  });
  if (error && error.start >= src.length) out.push(<span key="eol" className="tk-error tk-eol">{' '}</span>);
  out.push('\n');
  return out;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: ExprError | null;
  autoFocus?: boolean;
  ariaLabel: string;
  showChips?: boolean;
}

export function CodeEditor({ value, onChange, error, autoFocus, ariaLabel, showChips = true }: Props) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const pre = useRef<HTMLPreElement>(null);
  const pendingCaret = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (pendingCaret.current !== null && ta.current) {
      ta.current.focus();
      ta.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  });

  useLayoutEffect(() => {
    if (autoFocus && ta.current) {
      ta.current.focus();
      const end = ta.current.value.length;
      ta.current.setSelectionRange(end, end);
    }
  }, [autoFocus]);

  const insert = (text: string) => {
    const el = ta.current;
    const start = el ? el.selectionStart : value.length;
    const end = el ? el.selectionEnd : value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const padL = before && !/[\s([]$/.test(before) ? ' ' : '';
    const padR = after && !/^[\s)\],]/.test(after) ? ' ' : '';
    const next = before + padL + text + padR + after;
    pendingCaret.current = (before + padL + text).length;
    onChange(next);
  };

  return (
    <div className="code-editor-wrap">
      <div className={`code-editor${error ? ' has-error' : ''}`}>
        <pre ref={pre} className="code-hl" aria-hidden="true">
          {highlight(value, error)}
        </pre>
        <textarea
          ref={ta}
          aria-label={ariaLabel}
          className="code-input"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            if (pre.current) pre.current.scrollTop = e.currentTarget.scrollTop;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              insert('  ');
            }
          }}
        />
      </div>
      {showChips && (
        <div className="chips" aria-label="Insert a name">
          {COMPLETIONS.map((c) => (
            <button key={c.name} type="button" className="chip" title={c.detail} onClick={() => insert(c.insert)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CodeBlock({ code, className }: { code: string; className?: string }) {
  return <pre className={`code-block ${className ?? ''}`}>{highlight(code, null, true)}</pre>;
}
