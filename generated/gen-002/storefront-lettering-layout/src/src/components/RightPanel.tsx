import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowDown, ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUp, ArrowUpRight, Copy, Trash2, Lock, Unlock, Check, Circle } from 'lucide-react';
import { boxOf, FONT_META } from '../geometry';
import { fmt, maxCap, materials, type Check as CheckT } from '../model';
import type { Doc, El, FontId, Finishes, Fill, Version } from '../types';
import { BOOK_SQIN, LEAF_IN, LEAF_SQIN, LEAVES_PER_BOOK, WIN_W } from '../window';
import { ENAMEL, ENAMEL_NAME } from './ElementArt';
import { NumberField, Section, Segmented, Slider, Switch } from './ui';

interface Props {
  doc: Doc;
  selected: El | null;
  checks: CheckT[];
  compare: Version | null;
  exported: boolean;
  manual: Record<string, boolean>;
  onManual: (k: string, v: boolean) => void;
  onEdit: (id: string, patch: Partial<El>, key: string) => void;
  onFinishes: (patch: Partial<Finishes>, key: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
}

const DIRS: { a: number; icon: typeof ArrowUp; label: string }[] = [
  { a: 135, icon: ArrowUpLeft, label: 'up and left' },
  { a: 90, icon: ArrowUp, label: 'up' },
  { a: 45, icon: ArrowUpRight, label: 'up and right' },
  { a: 180, icon: ArrowLeft, label: 'left' },
  { a: -1, icon: Circle, label: '' },
  { a: 0, icon: ArrowRight, label: 'right' },
  { a: 225, icon: ArrowDownLeft, label: 'down and left' },
  { a: 270, icon: ArrowDown, label: 'down' },
  { a: 315, icon: ArrowDownRight, label: 'down and right' },
];

export default function RightPanel(p: Props) {
  const [tab, setTab] = useState<'element' | 'materials' | 'job'>('element');
  const m = useMemo(() => materials(p.doc), [p.doc]);
  return (
    <aside className="right">
      <div className="tabs" role="tablist">
        {(['element', 'materials', 'job'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t === 'element' ? 'Element' : t === 'materials' ? 'Materials' : 'Job'}
            {t === 'materials' && m.leaves > LEAVES_PER_BOOK && <i className="dot warn" />}
          </button>
        ))}
      </div>
      <div className="right-scroll">
        {tab === 'element' && <Inspector {...p} />}
        {tab === 'materials' && <Materials {...p} />}
        {tab === 'job' && <Job {...p} />}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */

function Inspector(p: Props) {
  const el = p.selected;
  if (!el) {
    return (
      <div className="empty">
        <h3>Nothing selected</h3>
        <p>Click lettering on the window, or pick an element from the list, to set its size, arc and finishes.</p>
        <ul className="elist">
          {p.doc.elements.map((e) => (
            <li key={e.id}>
              <button className="link" onClick={() => p.onSelect(e.id)}>{e.name}</button>
              <span className="mono">{fmt(e.cap)}″</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return <InspectorBody {...p} el={el} />;
}

function InspectorBody(p: Props & { el: El }) {
  const el = p.el;
  const set = (patch: Partial<El>, key: string) => p.onEdit(el.id, patch, `${el.id}:${key}`);
  const box = boxOf(el);
  const isText = el.kind === 'text';
  const room = useMemo(() => maxCap(p.doc, el.id), [p.doc, el.id]);
  const prev = p.compare?.doc.elements.find((e) => e.id === el.id);
  const setCapKeepAnchor = (cap: number) => set({ cap: Math.round(cap * 100) / 100 }, 'cap');
  const geoMissing = isText ? Array.from(new Set(el.lines.join('').split('').filter((c) => c.trim() && !/[\x20-\x7E·–—’“”&]/.test(c)))) : [];

  return (
    <>
      <div className="insp-head">
        <input className="name-input" aria-label="Element name" value={el.name} onChange={(e) => set({ name: e.target.value }, 'name')} />
        <div className="insp-actions">
          <button className="icon-btn" title={el.locked ? 'Unlock' : 'Lock position'} aria-label={el.locked ? 'Unlock element' : 'Lock element'} onClick={() => p.onEdit(el.id, { locked: !el.locked }, `${el.id}:lock`)}>
            {el.locked ? <Lock size={15} /> : <Unlock size={15} />}
          </button>
          <button className="icon-btn" title="Duplicate (⌘D)" aria-label="Duplicate element" onClick={() => p.onDuplicate(el.id)}><Copy size={15} /></button>
          <button className="icon-btn danger" title="Delete (Del)" aria-label="Delete element" onClick={() => p.onRemove(el.id)}><Trash2 size={15} /></button>
        </div>
      </div>

      {isText && (
        <Section title="Lettering">
          <textarea
            className="text-input"
            aria-label="Lettering text"
            rows={el.lines.length > 1 ? 3 : 2}
            spellCheck={false}
            value={el.lines.join('\n')}
            onChange={(e) => set({ lines: e.target.value.split('\n').slice(0, 4), ...(e.target.value.includes('\n') ? { arc: 0 } : {}) }, 'text')}
          />
          {geoMissing.length > 0 && <p className="hint warn">This typeface has no glyph for {geoMissing.join(' ')} — those characters are skipped.</p>}
          <div className="row">
            <label className="field-label" htmlFor="font-sel">Typeface</label>
            <select id="font-sel" className="select" value={el.font} onChange={(e) => set({ font: e.target.value as FontId }, 'font')}>
              {(Object.keys(FONT_META) as FontId[]).map((f) => (
                <option key={f} value={f}>{FONT_META[f].label} — {FONT_META[f].sub}</option>
              ))}
            </select>
          </div>
        </Section>
      )}

      <Section
        title={isText ? 'Size & arc' : 'Size'}
        right={prev && prev.cap !== el.cap ? <span className="delta">Nov 12: {fmt(prev.cap)}″</span> : undefined}
      >
        <div className="row">
          <NumberField label={isText ? 'Cap height' : 'Height'} unit="in" value={el.cap} step={0.25} min={0.5} max={48} onChange={setCapKeepAnchor} width="100%" />
        </div>
        <Slider label="Cap height slider" value={Math.min(el.cap, isText && el.cap < 20 ? 20 : 48)} min={0.5} max={isText && el.cap <= 20 ? 20 : 48} step={0.05} onChange={setCapKeepAnchor} />
        <div className="quick">
          <button className="mini" onClick={() => setCapKeepAnchor(el.cap - 0.25)}>−¼″</button>
          <button className="mini" onClick={() => setCapKeepAnchor(el.cap + 0.25)}>+¼″</button>
          <button className="mini" onClick={() => setCapKeepAnchor(el.cap * 1.1)}>+10%</button>
          <button className="mini" onClick={() => setCapKeepAnchor(el.cap / 1.1)}>−10%</button>
        </div>
        <div className={`room${room.cap > el.cap + 0.04 ? '' : ' tight'}`}>
          {room.cap > el.cap + 0.04 ? (
            <>
              <span>Room to grow to <b className="mono">{fmt(room.cap)}″</b> <small>before it hits the {room.limit}</small></span>
              <button className="mini primary" onClick={() => setCapKeepAnchor(room.cap)}>Set to max</button>
            </>
          ) : (
            <span>At the limit — <small>blocked by the {room.limit}. Move the neighbour or nudge this element to grow.</small></span>
          )}
        </div>
        {isText && (
          <>
            <div className="row gap">
              <NumberField label="Arc" unit="°" value={el.arc} step={1} min={-45} max={45} dp={1} disabled={el.lines.length > 1} onChange={(v) => set({ arc: v }, 'arc')} width="100%" />
            </div>
            <Slider label="Arc slider" value={el.arc} min={-45} max={45} step={0.5} disabled={el.lines.length > 1} onChange={(v) => set({ arc: v }, 'arc')} />
            <div className="slider-scale"><span>sags</span><button className="link" onClick={() => set({ arc: 0 }, 'arc')}>straight</button><span>arches</span></div>
            {el.lines.length > 1 && <p className="hint">Arcs apply to single-line text only.</p>}
            <div className="row two gap">
              <NumberField label="Width" unit="%" value={Math.round(el.wd * 100)} step={1} min={40} max={130} dp={0} onChange={(v) => set({ wd: v / 100 }, 'wd')} />
              <NumberField label="Letterspace" unit="em" value={el.tracking} step={0.01} min={-0.1} max={1} onChange={(v) => set({ tracking: v }, 'tracking')} />
            </div>
            {el.lines.length > 1 && (
              <div className="row two gap"><NumberField label="Leading" unit="×" value={el.leading} step={0.05} min={1} max={4} onChange={(v) => set({ leading: v }, 'leading')} /></div>
            )}
          </>
        )}
      </Section>

      <Section title="Position" right={<span className="hint-r">inches from left / floor</span>}>
        <div className="row two">
          <NumberField label="Centre X" unit="in" value={el.x} step={0.25} onChange={(v) => set({ x: v }, 'x')} disabled={el.locked} />
          <NumberField label={isText ? 'Baseline' : 'Bottom'} unit="in" value={el.y} step={0.25} onChange={(v) => set({ y: v }, 'y')} disabled={el.locked} />
        </div>
        <div className="quick">
          <button className="mini" disabled={el.locked} onClick={() => set({ x: WIN_W / 2 }, 'x')}>Centre on window</button>
          <button className="mini" disabled={el.locked} onClick={() => set({ x: 54 }, 'x')}>Centre on door</button>
        </div>
        <dl className="bounds">
          <div><dt>Left</dt><dd className="mono">{fmt(box.l, 1)}″</dd></div>
          <div><dt>Right</dt><dd className="mono">{fmt(box.r, 1)}″</dd></div>
          <div><dt>Bottom</dt><dd className="mono">{fmt(box.b, 1)}″</dd></div>
          <div><dt>Top</dt><dd className="mono">{fmt(box.t, 1)}″</dd></div>
          <div><dt>Width</dt><dd className="mono">{fmt(box.r - box.l, 1)}″</dd></div>
          <div><dt>Height</dt><dd className="mono">{fmt(box.t - box.b, 1)}″</dd></div>
        </dl>
      </Section>

      <Section title="Finish">
        <div className="field-label">Fill</div>
        <Segmented<Fill>
          ariaLabel="Fill"
          value={el.fill}
          onChange={(v) => set({ fill: v }, 'fill')}
          options={[
            { value: 'gold', label: <><i className="swatch gold" />Gold leaf</> },
            { value: 'enamel', label: <><i className="swatch" style={{ background: ENAMEL[p.doc.finishes.enamel] }} />Enamel</> },
            { value: 'none', label: 'Open' },
          ]}
        />
        <div className="toggle-row">
          <div>
            <b>Outline</b>
            <small>1-Shot {ENAMEL_NAME[p.doc.finishes.enamel].toLowerCase()}, outside the letter</small>
          </div>
          <Switch label="Outline" on={el.outline.on} onChange={(v) => set({ outline: { ...el.outline, on: v } }, 'outline')} />
        </div>
        {el.outline.on && (
          <div className="sub">
            <NumberField label="Line width" unit="in" value={el.outline.w} step={0.01} min={0.01} max={1} onChange={(v) => set({ outline: { ...el.outline, w: v } }, 'outlinew')} />
            <Slider label="Outline width" value={el.outline.w} min={0.01} max={Math.max(0.5, el.cap * 0.06)} step={0.01} onChange={(v) => set({ outline: { ...el.outline, w: v } }, 'outlinew')} />
          </div>
        )}
        <div className="toggle-row">
          <div>
            <b>Drop shade</b>
            <small>Block shadow, solid {ENAMEL_NAME[p.doc.finishes.enamel].toLowerCase()}</small>
          </div>
          <Switch label="Drop shade" on={el.shade.on} onChange={(v) => set({ shade: { ...el.shade, on: v } }, 'shade')} />
        </div>
        {el.shade.on && (
          <div className="sub shade-sub">
            <div>
              <NumberField label="Offset" unit="in" value={el.shade.dist} step={0.05} min={0.05} max={2} onChange={(v) => set({ shade: { ...el.shade, dist: v } }, 'shadedist')} />
              <Slider label="Shade offset" value={el.shade.dist} min={0.05} max={Math.max(1, el.cap * 0.1)} step={0.05} onChange={(v) => set({ shade: { ...el.shade, dist: v } }, 'shadedist')} />
            </div>
            <div className="dirs" role="radiogroup" aria-label="Shade direction">
              {DIRS.map((d, i) =>
                d.a < 0 ? (
                  <span key={i} className="dir-center" />
                ) : (
                  <button key={i} role="radio" aria-checked={el.shade.angle === d.a} aria-label={`Shade ${d.label}`} className={el.shade.angle === d.a ? 'on' : ''} onClick={() => set({ shade: { ...el.shade, angle: d.a } }, 'shadeang')}>
                    <d.icon size={14} />
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Materials(p: Props) {
  const f = p.doc.finishes;
  const m = useMemo(() => materials(p.doc), [p.doc]);
  const books = Math.max(1, m.books);
  const cells = books * LEAVES_PER_BOOK;
  const over = m.leaves > LEAVES_PER_BOOK;
  return (
    <>
      <Section title="Gold leaf">
        <div className="big-num">
          <div>
            <span className="num">{fmt(m.leafSqFt, 1)}</span>
            <span className="unit"> sq ft</span>
          </div>
          <div className="big-sub">
            {m.leaves} leaves · {m.books} {m.books === 1 ? 'book' : 'books'}
            <br />
            <small>{fmt(m.gildedSqIn, 0)} sq in gilded + {f.wastePct}% waste</small>
          </div>
        </div>
        <div className="leaf-grid" role="img" aria-label={`${m.leaves} of ${cells} leaves used`}>
          {Array.from({ length: cells }, (_, i) => (
            <i key={i} className={i < m.leaves ? (i >= LEAVES_PER_BOOK ? 'used second' : 'used') : ''} />
          ))}
        </div>
        <p className={`hint${over ? ' warn' : ''}`}>
          {over
            ? `One book is ${LEAVES_PER_BOOK} leaves at ${LEAF_IN}″ square (${fmt(BOOK_SQIN / 144, 2)} sq ft). This job needs ${m.leaves - LEAVES_PER_BOOK} more, so plan on a second book — ${m.spare} leaves left over.`
            : `One book is ${LEAVES_PER_BOOK} leaves at ${LEAF_IN}″ square (${fmt(BOOK_SQIN / 144, 2)} sq ft). ${m.spare} leaves spare.`}
        </p>
        <table className="tbl">
          <thead><tr><th>Gilded element</th><th>sq in</th><th>Share</th></tr></thead>
          <tbody>
            {m.perEl.map((e) => (
              <tr key={e.id} onClick={() => p.onSelect(e.id)} className="clickable">
                <td>{e.name}</td>
                <td className="mono">{fmt(e.sqin, 0)}</td>
                <td><span className="bar"><i style={{ width: `${(e.sqin / m.gildedSqIn) * 100}%` }} /></span></td>
              </tr>
            ))}
            {m.perEl.length === 0 && <tr><td colSpan={3} className="muted">Nothing is set to gold leaf.</td></tr>}
          </tbody>
          <tfoot>
            <tr><td>Leaf cost ({m.books} × ${f.bookPrice})</td><td className="mono" colSpan={2}>${m.cost}</td></tr>
          </tfoot>
        </table>
      </Section>

      <Section title="Leaf & gilding">
        <div className="row">
          <label className="field-label" htmlFor="karat">Leaf</label>
          <select id="karat" className="select" value={f.leafKarat} onChange={(e) => p.onFinishes({ leafKarat: e.target.value as Finishes['leafKarat'] }, 'karat')}>
            <option value="22k">22k gold leaf</option>
            <option value="23k">23k gold leaf</option>
            <option value="23.75k">23¾k gold leaf</option>
          </select>
        </div>
        <div className="field-label">Gilded on</div>
        <Segmented<Finishes['side']>
          ariaLabel="Gilding side"
          value={f.side}
          onChange={(v) => p.onFinishes({ side: v }, 'side')}
          options={[
            { value: 'surface', label: 'Surface (outside)' },
            { value: 'reverse', label: 'Reverse (inside)' },
          ]}
        />
        {f.side === 'reverse' && <p className="hint warn">Reverse-glass reads from the inside, so the pouncing pattern will be exported mirrored.</p>}
        <div className="field-label">Gold finish</div>
        <Segmented<Finishes['center']>
          ariaLabel="Gold finish"
          value={f.center}
          onChange={(v) => p.onFinishes({ center: v }, 'center')}
          options={[
            { value: 'matte', label: 'Matte centre' },
            { value: 'burnished', label: 'Burnished' },
          ]}
        />
        <div className="row two gap">
          <NumberField label="Waste" unit="%" value={f.wastePct} step={1} min={0} max={50} dp={0} onChange={(v) => p.onFinishes({ wastePct: v }, 'waste')} />
          <NumberField label="Price / book" unit="$" value={f.bookPrice} step={1} min={0} max={500} dp={0} onChange={(v) => p.onFinishes({ bookPrice: v }, 'price')} />
        </div>
      </Section>

      <Section title="1-Shot lettering enamel">
        <div className="row">
          <label className="field-label" htmlFor="enamel">Colour</label>
          <select id="enamel" className="select" value={f.enamel} onChange={(e) => p.onFinishes({ enamel: e.target.value as Finishes['enamel'] }, 'enamel')}>
            {(Object.keys(ENAMEL_NAME) as Finishes['enamel'][]).map((k) => (
              <option key={k} value={k}>{ENAMEL_NAME[k]}</option>
            ))}
          </select>
        </div>
        <dl className="bounds two">
          <div><dt>Solid enamel fill</dt><dd className="mono">{fmt(m.enamelFillSqFt, 2)} sq ft</dd></div>
          <div><dt>Outline &amp; shade line</dt><dd className="mono">≈ {fmt(m.lineFeet, 0)} ft</dd></div>
        </dl>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Job(p: Props) {
  const m = useMemo(() => materials(p.doc), [p.doc]);
  const script = p.doc.elements.find((e) => e.id === 'script');
  const barClear = !p.checks.some((c) => c.level === 'error' && c.id.startsWith('bar'));
  const tasks = [
    { k: 'bigger', label: 'Enlarge the main script', detail: script ? (script.cap > 9 ? `Now ${fmt(script.cap)}″ cap height (was 9″)` : `Still ${fmt(script.cap)}″ — owner asked for bigger`) : '', done: !!script && script.cap > 9, auto: true },
    { k: 'arc', label: 'Settle the arc of the script', detail: script ? `${fmt(script.arc)}° right now` : '', done: !!p.manual.arc, auto: false },
    { k: 'gold', label: 'Place gold-leaf areas', detail: `${p.doc.elements.filter((e) => e.fill === 'gold' && e.visible).length} elements gilded`, done: !!p.manual.gold, auto: false },
    { k: 'shade', label: 'Set outline & drop shade', detail: `${p.doc.elements.filter((e) => (e.outline.on || e.shade.on) && e.visible).length} elements with enamel line work`, done: !!p.manual.shade, auto: false },
    { k: 'bar', label: 'Keep lettering clear of the push bar', detail: barClear ? 'Clear' : 'Something is still behind the bar', done: barClear, auto: true },
    { k: 'export', label: 'Export pounce pattern', detail: p.exported ? 'Pattern downloaded' : 'Not exported yet', done: p.exported, auto: true },
  ];
  const doneCount = tasks.filter((t) => t.done).length;
  return (
    <>
      <Section title="Job">
        <div className="job-card">
          <div className="job-title">Hollis &amp; Daughter Bakery</div>
          <div className="job-sub">Front window · owner Margaret Hollis</div>
          <dl className="bounds two job-dl">
            <div><dt>Quote</dt><dd className="mono">$1,850</dd></div>
            <div><dt>Opens</dt><dd>Dec 7 <small>(21 days)</small></dd></div>
            <div><dt>Leaf in quote</dt><dd className="mono">${m.cost} <small>{Math.round((m.cost / 1850) * 100)}%</small></dd></div>
            <div><dt>Window</dt><dd className="mono">72 × 84″</dd></div>
          </dl>
        </div>
      </Section>
      <Section title="Revision rounds">
        <div className="rounds">
          <div className="round used"><Check size={14} /><div><b>Round 1 · used</b><small>Wording changes, approved Nov 15</small></div></div>
          <div className="round open"><Circle size={14} /><div><b>Round 2 · available</b><small>Owner wants the script bigger. Sending this layout counts as the last included round.</small></div></div>
        </div>
        <div className="pips" aria-label="1 of 2 revision rounds used"><i className="used" /><i /><span>1 of 2 used</span></div>
      </Section>
      <Section title="Before painting" right={<span className="hint-r">{doneCount} of {tasks.length}</span>}>
        <ul className="tasks">
          {tasks.map((t) => (
            <li key={t.k} className={t.done ? 'done' : ''}>
              <button
                className="tick"
                role="checkbox"
                aria-checked={t.done}
                aria-label={t.label}
                disabled={t.auto}
                onClick={() => p.onManual(t.k, !p.manual[t.k])}
              >
                {t.done && <Check size={12} strokeWidth={3} />}
              </button>
              <div>
                <b>{t.label}</b>
                <small>{t.detail}</small>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
