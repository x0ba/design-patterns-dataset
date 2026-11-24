import type { ReactNode } from 'react';

const INLINE = /(\[TODO[^\]]*\]|\*\*[^*]+\*\*|\bmoor(?:s|ed|ing)?\b)/gi;

export function inline(text: string, mark = true): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\[TODO/.test(part)) return mark ? <mark key={i} className="todo">{part}</mark> : <span key={i}>{part}</span>;
    if (/^moor/i.test(part)) return mark ? <span key={i} className="term-flag" title={'The book says “dock”, not “moor”'}>{part}</span> : <span key={i}>{part}</span>;
    return <span key={i}>{part}</span>;
  });
}

export function RuleText({ text, mark = true }: { text: string; mark?: boolean }) {
  return (
    <>
      {text.split(/\n\n+/).map((block, i) => {
        const lines = block.split('\n');
        if (lines.every((l) => l.startsWith('- '))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2), mark)}</li>)}</ul>;
        if (lines.every((l) => /^\d+\. /.test(l))) return <ol key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ''), mark)}</li>)}</ol>;
        return <p key={i}>{inline(block, mark)}</p>;
      })}
    </>
  );
}
