import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// Open on the car-lockout recording Rafa was just listening to.
if (!window.location.hash) {
  window.history.replaceState(null, '', '#/calls/c01');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
