import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/literata/300.css';
import '@fontsource/literata/400.css';
import '@fontsource/literata/600.css';
import '@fontsource/literata/700.css';
import '@fontsource/literata/400-italic.css';
import '@fontsource/literata/700-italic.css';
import './styles.css';
import App from './App';
import { StoreProvider } from './store';
import { loadStyle } from './outline';

// Warm the outline cache for the styles under review this morning.
loadStyle('regular');
loadStyle('bold');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>,
);
