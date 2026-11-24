import { useEffect, useMemo, useRef } from 'react';

export const LINE_HEIGHT = 20;
const RANK = { error: 3, warning: 2, notice: 1 };
const LABEL = { error: 'Error', warning: 'Warning', notice: 'Notice' };

export default function Editor({ value, issues, jump, onChange }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const lines = value.split('\n');

  const marks = useMemo(() => {
    const map = {};
    for (const issue of issues) {
      const current = map[issue.line];
      if (!current || RANK[issue.severity] > RANK[current.severity]) {
        map[issue.line] = { severity: issue.severity, kind: issue.kind };
      }
    }
    return map;
  }, [issues]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!jump || !textarea) return;
    const sourceLines = value.split('\n');
    const start = sourceLines.slice(0, jump.line - 1).reduce((sum, line) => sum + line.length + 1, 0);
    const end = start + (sourceLines[jump.line - 1] || '').length;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(start, end);
    textarea.scrollTop = Math.max(0, (jump.line - 4) * LINE_HEIGHT);
    if (gutterRef.current) gutterRef.current.scrollTop = textarea.scrollTop;
    // Only jump when a new jump request arrives, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump]);

  return (
    <section className="pane editor-pane">
      <div className="pane-head">
        <span className="pane-title">Source</span>
        <span className="muted">{lines.length} lines · Markdown</span>
      </div>
      <div className="editor">
        <div className="gutter" ref={gutterRef} aria-hidden="true">
          {lines.map((_, index) => {
            const mark = marks[index + 1];
            return (
              <div
                key={index}
                className={`gl ${mark ? `gl-${mark.severity}` : ''}`}
                title={mark ? `${LABEL[mark.severity]}: ${mark.kind.replace(/-/g, ' ')}` : undefined}
              >
                {index + 1}
              </div>
            );
          })}
        </div>
        <textarea
          ref={textareaRef}
          className="source"
          value={value}
          spellCheck={false}
          wrap="off"
          aria-label="Page source"
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => {
            if (gutterRef.current) gutterRef.current.scrollTop = event.target.scrollTop;
          }}
        />
      </div>
    </section>
  );
}
