import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StoreProvider } from './lib/store';
import { DEFAULT_ROUTE } from './lib/model';
import './styles.css';

// Open on the Sourdough community when the address has no route (plain http://host/ or index.html).
if (!window.location.hash || window.location.hash === '#') {
  window.history.replaceState(null, '', DEFAULT_ROUTE);
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
