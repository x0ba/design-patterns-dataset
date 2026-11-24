import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { TopBar } from './components/TopBar';
import { LeftRail } from './components/LeftRail';
import { Stage } from './components/Stage';
import { Lineup } from './components/Lineup';
import { SidePanel, useCommsVoice } from './components/SidePanel';
import { Help, Presenter, Toast } from './components/Overlays';
import { useKeys, usePlayback } from './components/hooks';

function App() {
  usePlayback();
  useKeys();
  useCommsVoice();
  return (
    <div className="app">
      <TopBar />
      <div className="body">
        <LeftRail />
        <Stage />
        <aside className="rail right">
          <Lineup />
          <SidePanel />
        </aside>
      </div>
      <Presenter />
      <Toast />
      <Help />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
