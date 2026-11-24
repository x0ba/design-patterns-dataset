import { useState } from 'react';
import { ChartDetail } from './components/ChartDetail';
import { ChartList } from './components/ChartList';
import { FinalizeModal, ReleaseModal } from './components/Modals';
import { SidePanel } from './components/SidePanel';
import { StatusStrip, TopBar } from './components/Header';
import { useNow, selectedChart } from './lib/selectors';
import { StoreProvider, useStore } from './lib/store';
import type { Comment } from './lib/types';

type Modal = { kind: 'finalize'; id: string } | { kind: 'release' } | null;

function Shell() {
  const { state, dispatch } = useStore();
  const now = useNow();
  const [modal, setModal] = useState<Modal>(null);
  const [focusThreadId, setFocusThreadId] = useState<string | null>(null);
  const chart = selectedChart(state);

  const openChart = (id: string) => {
    setFocusThreadId(null);
    dispatch({ type: 'select', id });
    dispatch({ type: 'tab', tab: 'comments' });
  };

  const openComment = (c: Comment) => {
    setFocusThreadId(c.id);
    dispatch({ type: 'select', id: c.chartId });
    dispatch({ type: 'tab', tab: 'comments' });
  };

  const finalizeChart = modal?.kind === 'finalize' ? state.charts.find((c) => c.id === modal.id) : null;

  return (
    <div className="app">
      <TopBar now={now} />
      <StatusStrip />
      <div className="workspace">
        <ChartList />
        {chart && (
          <ChartDetail
            key={chart.id}
            chart={chart}
            focusThreadId={focusThreadId}
            onFinalize={() => setModal({ kind: 'finalize', id: chart.id })}
          />
        )}
        <SidePanel now={now} onRelease={() => setModal({ kind: 'release' })} onOpenComment={openComment} onOpenChart={openChart} />
      </div>
      <footer className="foot">
        <span>Prototype with sample data. Names, figures and comments are invented for this demo.</span>
        <span>Changes last until the page is reloaded.</span>
      </footer>

      {finalizeChart && <FinalizeModal chart={finalizeChart} onClose={() => setModal(null)} />}
      {modal?.kind === 'release' && <ReleaseModal onClose={() => setModal(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
