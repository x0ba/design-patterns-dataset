import { useMemo, useReducer } from 'react';
import { BOOKINGS, LENA_ID, UNITS } from './data/mock';
import {
  buildOptions,
  relocationsFor,
  upNext,
  type OptionId,
  type OptionResult,
} from './lib/engine';
import { NOW, fmtRange, fmtTime } from './lib/time';
import { Header } from './components/Header';
import { Board } from './components/Board';
import { BookingDetail } from './components/BookingDetail';
import { RequestPanel } from './components/RequestPanel';
import { UpNextPanel } from './components/UpNextPanel';
import type { Booking } from './types';

interface State {
  selected: OptionId; // which option card is open and previewed on the board
  applied: OptionId | null; // which option has been committed to the day
  slotIdx: number; // which later slot Option C is offering
  offerAccepted: boolean;
  inspectId: string; // booking shown in the detail panel
  log: string[];
}

type Action =
  | { type: 'select'; id: OptionId }
  | { type: 'slot'; idx: number }
  | { type: 'apply'; id: OptionId; entry: string }
  | { type: 'undo' }
  | { type: 'accept' }
  | { type: 'inspect'; id: string };

const initial: State = {
  selected: 'B',
  applied: null,
  slotIdx: 0,
  offerAccepted: false,
  inspectId: LENA_ID,
  log: [],
};

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'select':
      return { ...s, selected: a.id };
    case 'slot':
      return { ...s, selected: 'C', slotIdx: a.idx };
    case 'apply':
      return { ...s, applied: a.id, selected: a.id, log: [...s.log, a.entry] };
    case 'undo':
      return {
        ...s,
        applied: null,
        offerAccepted: false,
        log: [...s.log, `${fmtTime(NOW)} · Board reset to the 1:10 PM state`],
      };
    case 'accept':
      return {
        ...s,
        offerAccepted: true,
        log: [...s.log, `${fmtTime(NOW)} · Lena Strauss said yes to the Bay 3 slot`],
      };
    case 'inspect':
      return { ...s, inspectId: a.id };
  }
}

function logEntry(opt: OptionResult, slotLabel: string): string {
  if (opt.id === 'B') {
    return `${fmtTime(NOW)} · Option B applied: Arlo Goods moved to Bay 3, Lena extended to 3:30 PM, SB-2 carried to Bay 3`;
  }
  return `${fmtTime(NOW)} · Option C applied: offered Lena ${slotLabel}, awaiting her yes`;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);

  const { options, slots } = useMemo(
    () => buildOptions(BOOKINGS, UNITS, { slotIdx: state.slotIdx, offerAccepted: state.offerAccepted }),
    [state.slotIdx, state.offerAccepted],
  );

  const selectedOpt = options.find((o) => o.id === state.selected)!;
  const appliedOpt = state.applied ? options.find((o) => o.id === state.applied)! : null;

  // What the board shows: the committed day, or the untouched 1:10 PM day with the
  // selected option drawn on top as a preview.
  const bookings: Booking[] = appliedOpt ? appliedOpt.bookings : BOOKINGS;
  const units = appliedOpt ? appliedOpt.units : UNITS;
  const ghosts = appliedOpt ? [] : selectedOpt.ghosts;
  const previewBookings = appliedOpt ? bookings : selectedOpt.bookings;
  const previewUnits = appliedOpt ? units : UNITS;
  const relocs = relocationsFor(previewBookings, previewUnits);
  // Bookings the previewed option moves to another bay; drawn faded under the ghost.
  const staleIds = appliedOpt
    ? []
    : selectedOpt.bookings
        .filter((b) => {
          const orig = BOOKINGS.find((x) => x.id === b.id);
          return !!orig && orig.bayId !== b.bayId;
        })
        .map((b) => b.id);

  // Handoff list shows the day as it will be once the selected option is in place.
  const arrivals = useMemo(() => upNext(previewBookings, previewUnits), [previewBookings, previewUnits]);
  const inspected = bookings.find((b) => b.id === state.inspectId) ?? bookings.find((b) => b.id === LENA_ID);
  const lena = BOOKINGS.find((b) => b.id === LENA_ID)!;

  const apply = (opt: OptionResult) => {
    const slot = slots[state.slotIdx];
    const slotLabel = slot ? fmtRange(slot.start, slot.end) : '';
    dispatch({ type: 'apply', id: opt.id, entry: logEntry(opt, slotLabel) });
  };

  return (
    <div className="app">
      <Header />

      <main className="layout">
        <div className="left">
          <Board
            bookings={bookings}
            units={units}
            ghosts={ghosts}
            relocs={relocs}
            staleIds={staleIds}
            selectedId={state.inspectId}
            onSelect={(id) => dispatch({ type: 'inspect', id })}
          />
          <UpNextPanel
            items={arrivals}
            previewOf={appliedOpt ? null : selectedOpt.id}
          />
        </div>

        <aside className="right" aria-label="Extension decision">
          <RequestPanel
            lena={lena}
            options={options}
            selected={state.selected}
            applied={state.applied}
            slots={slots}
            slotIdx={state.slotIdx}
            offerAccepted={state.offerAccepted}
            latest={state.log[state.log.length - 1]}
            onSelect={(id) => dispatch({ type: 'select', id })}
            onSlot={(idx) => dispatch({ type: 'slot', idx })}
            onApply={apply}
            onUndo={() => dispatch({ type: 'undo' })}
            onAccept={() => dispatch({ type: 'accept' })}
          />
          <BookingDetail booking={inspected} units={units} />
        </aside>
      </main>
    </div>
  );
}
