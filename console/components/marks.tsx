import { STATE_LABEL } from '@/lib/format';

/** A site or rater state: a shape and a color, so it never relies on color alone, plus its name. */
export function StateMark({ state, children }: { state: string; children?: React.ReactNode }) {
  return (
    <span className="st" data-state={state}>
      <i aria-hidden="true" />
      {children ?? STATE_LABEL[state] ?? state}
    </span>
  );
}

/** Only the shape, named for screen readers and on hover. */
export function StateDot({ state, label }: { state: string; label: string }) {
  return (
    <span className="st" data-state={state} title={label}>
      <i aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
