import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { CodeBlock, highlight } from './CodeEditor';
import { parseOnly } from './expr';
import { CATEGORY_LABEL, STEP_META, containsId, findStep, stepCode, stepSummary, stepTitle, type Arm, type Slot } from './steps';
import type { RunResult, StepResult } from './sim';
import type { Step } from './types';
import { fmtTime } from './time';

export type CardAction = 'duplicate' | 'delete' | 'toggle' | 'up' | 'down';

interface FlowProps {
  steps: Step[];
  run: RunResult | null;
  selectedId: string | null;
  codeOpen: Set<string>;
  issues: Record<string, string>;
  onSelect: (id: string | null) => void;
  onToggleCode: (id: string) => void;
  onMove: (id: string, slot: Slot) => void;
  onInsert: (slot: Slot, rect: DOMRect) => void;
  onAction: (id: string, a: CardAction) => void;
}

interface Ctx extends FlowProps {
  mounted: { current: boolean };
  dragging: string | null;
  setDragging: (id: string | null) => void;
}

export function Flow(props: FlowProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  const ctx: Ctx = { ...props, mounted, dragging, setDragging };
  return (
    <div className={`flow${dragging ? ' is-dragging' : ''}`} onDragEnd={() => setDragging(null)}>
      <FlowList ctx={ctx} list={props.steps} parentId={null} arm={null} />
    </div>
  );
}

function FlowList({ ctx, list, parentId, arm }: { ctx: Ctx; list: Step[]; parentId: string | null; arm: Arm | null }) {
  const nested = parentId !== null;
  return (
    <div className={`flow-list${nested ? ' nested' : ''}`}>
      {list.map((s, i) => (
        <div key={s.id} className="flow-item">
          {!(parentId === null && i === 0) && <Gap ctx={ctx} slot={{ parentId, arm, index: i }} />}
          <StepCard ctx={ctx} step={s} number={nested ? null : i + 1} />
        </div>
      ))}
      <Gap ctx={ctx} slot={{ parentId, arm, index: list.length }} end empty={list.length === 0} />
    </div>
  );
}

function Gap({ ctx, slot, end, empty }: { ctx: Ctx; slot: Slot; end?: boolean; empty?: boolean }) {
  const [over, setOver] = useState(false);
  const valid = (() => {
    if (!ctx.dragging) return false;
    if (slot.parentId === null && slot.index === 0) return false;
    const f = findStep(ctx.steps, ctx.dragging);
    if (!f) return false;
    if (slot.parentId && containsId(f.step, slot.parentId)) return false;
    if (f.parentId === slot.parentId && f.arm === slot.arm && (f.index === slot.index || f.index + 1 === slot.index)) return false;
    return true;
  })();
  return (
    <div
      className={`gap${end ? ' gap-end' : ''}${empty ? ' gap-empty' : ''}${valid ? ' droppable' : ''}${over && valid ? ' over' : ''}`}
      onDragOver={(e) => {
        if (!valid) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (valid && ctx.dragging) ctx.onMove(ctx.dragging, slot);
        ctx.setDragging(null);
      }}
    >
      <span className="gap-line" />
      {over && valid ? (
        <span className="drop-label">Move here</span>
      ) : empty ? (
        <button type="button" className="gap-empty-btn" onClick={(e) => {
            e.stopPropagation();
            ctx.onInsert(slot, e.currentTarget.getBoundingClientRect());
          }}>
          <Icon name="plus" size={14} /> Add a step
        </button>
      ) : (
        <button
          type="button"
          className={`gap-add${end ? ' visible' : ''}`}
          aria-label="Insert step here"
          title="Insert a step here"
          onClick={(e) => {
            e.stopPropagation();
            ctx.onInsert(slot, e.currentTarget.getBoundingClientRect());
          }}
        >
          <Icon name="plus" size={13} stroke={2.2} />
          {end && <span>{slot.parentId ? 'Add' : 'Add step'}</span>}
        </button>
      )}
    </div>
  );
}

export function ResultPill({ r, compact }: { r?: StepResult; compact?: boolean }) {
  if (!r) return null;
  const at = r.at !== null ? fmtTime(r.at) : '';
  const map: Record<StepResult['status'], { cls: string; icon: string; text: string }> = {
    pass: { cls: 'ok', icon: 'check', text: at },
    done: { cls: 'run', icon: 'play', text: at },
    fail: { cls: 'bad', icon: 'stop', text: `Stopped ${at}` },
    error: { cls: 'bad', icon: 'alert', text: 'Error' },
    skip: { cls: 'muted', icon: 'skip', text: 'Skipped' },
    unreached: { cls: 'muted', icon: 'x', text: 'Not reached' },
    nottaken: { cls: 'muted', icon: 'x', text: 'Not taken' },
    disabled: { cls: 'muted', icon: 'eyeOff', text: 'Off' },
  };
  const m = map[r.status];
  return (
    <span className={`pill pill-${m.cls}`} title={r.headline}>
      <Icon name={m.icon} size={11} stroke={2.4} />
      {!compact && m.text}
    </span>
  );
}

function StepCard({ ctx, step, number }: { ctx: Ctx; step: Step; number: number | null }) {
  const meta = STEP_META[step.type];
  const result = ctx.run?.steps[step.id];
  const selected = ctx.selectedId === step.id;
  const code = ctx.codeOpen.has(step.id);
  const isTrigger = step.type === 'schedule' && number === 1;
  const issue = ctx.issues[step.id];
  const [menu, setMenu] = useState(false);
  const exprError = step.type === 'expr' || step.type === 'branch' ? parseOnly(step.expr) : null;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && ctx.mounted.current) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected, ctx.mounted]);

  const dim = result && ['unreached', 'nottaken', 'disabled'].includes(result.status);

  return (
    <div
      ref={ref}
      className={`card cat-${meta.category}${selected ? ' selected' : ''}${step.disabled ? ' disabled' : ''}${dim ? ' dim' : ''}${ctx.dragging === step.id ? ' dragging' : ''}${step.type === 'branch' ? ' branch' : ''}`}
      draggable={!isTrigger}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', step.id);
        ctx.setDragging(step.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        ctx.onSelect(step.id);
      }}
      data-step={step.id}
    >
      <div className="card-main">
        <div className="card-rail">
          {isTrigger ? (
            <span className="grip locked" title="The trigger always comes first"><Icon name="lock" size={12} /></span>
          ) : (
            <span className="grip" title="Drag to reorder"><Icon name="grip" size={14} stroke={2.6} /></span>
          )}
        </div>
        <div className="card-icon">
          <Icon name={meta.icon} size={16} />
          {number !== null && <span className="card-num">{number}</span>}
        </div>
        <div className="card-body">
          <div className="card-kicker">
            <span className="kicker-cat">{CATEGORY_LABEL[meta.category]}</span>
            <span className="kicker-dot">·</span>
            <span>{meta.kind}</span>
            {step.disabled && <span className="tag">turned off</span>}
            {issue && (
              <span className="tag tag-bad" title={issue}>
                <Icon name="alert" size={11} /> {issue}
              </span>
            )}
          </div>
          <div className="card-title">{stepTitle(step)}</div>
          {code ? (
            step.type === 'expr' || step.type === 'branch' ? (
              <pre className="code-block card-code">
                <span className="tk-kw">{step.type === 'expr' ? 'require ' : 'if '}</span>
                {highlight(step.expr, exprError).slice(0, -1)}
                {step.type === 'branch' && <span className="tk-punc">:</span>}
              </pre>
            ) : (
              <CodeBlock className="card-code" code={stepCode(step)} />
            )
          ) : (
            <div className={`card-summary${step.type === 'expr' || step.type === 'branch' ? ' mono' : ''}`}>{stepSummary(step)}</div>
          )}
          {result && ctx.run && result.status !== 'unreached' && result.status !== 'nottaken' && (result.status === 'fail' || result.status === 'error' || step.type === 'waitUntil' || step.type === 'branch') && (
            <div className={`card-result r-${result.status}`}>{result.headline}</div>
          )}
        </div>
        <div className="card-side" onClick={(e) => e.stopPropagation()}>
          <ResultPill r={result} />
          <div className="card-tools">
            <button
              type="button"
              className={`icon-btn code-toggle${code ? ' on' : ''}`}
              title={code ? 'Show plain view' : 'Show code view'}
              aria-pressed={code}
              onClick={() => ctx.onToggleCode(step.id)}
            >
              <Icon name="code" size={14} />
            </button>
            <div className="menu-wrap">
              <button type="button" className="icon-btn" title="More" onClick={() => setMenu((m) => !m)} aria-label="Step menu">
                <Icon name="more" size={16} stroke={3} />
              </button>
              {menu && <CardMenu isTrigger={isTrigger} disabled={!!step.disabled} onClose={() => setMenu(false)} onPick={(a) => ctx.onAction(step.id, a)} />}
            </div>
          </div>
        </div>
      </div>
      {step.type === 'branch' && (
        <div className="arms">
          {(['then', 'else'] as Arm[]).map((arm) => {
            const taken = result?.branch;
            return (
              <div key={arm} className={`arm arm-${arm}${taken === arm ? ' taken' : ''}${taken && taken !== arm ? ' not-taken' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="arm-head">
                  <span className="arm-label">{arm === 'then' ? 'If true' : 'Otherwise'}</span>
                  {taken === arm && <span className="arm-taken">taken on {ctx.run && fmtDayShort(ctx.run.date)}</span>}
                </div>
                <FlowList ctx={ctx} list={step[arm]} parentId={step.id} arm={arm} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmtDayShort(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function CardMenu({ isTrigger, disabled, onPick, onClose }: { isTrigger: boolean; disabled: boolean; onPick: (a: CardAction) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  const item = (a: CardAction, icon: string, label: string, danger = false) => (
    <button
      type="button"
      className={`menu-item${danger ? ' danger' : ''}`}
      onClick={() => {
        onPick(a);
        onClose();
      }}
    >
      <Icon name={icon} size={14} /> {label}
    </button>
  );
  return (
    <div className="menu" ref={ref} role="menu">
      {!isTrigger && item('up', 'arrowUp', 'Move up')}
      {!isTrigger && item('down', 'arrowDown', 'Move down')}
      {!isTrigger && item('duplicate', 'copy', 'Duplicate')}
      {item('toggle', disabled ? 'eye' : 'eyeOff', disabled ? 'Turn step on' : 'Turn step off')}
      {!isTrigger && <div className="menu-sep" />}
      {!isTrigger && item('delete', 'trash', 'Delete step', true)}
    </div>
  );
}
