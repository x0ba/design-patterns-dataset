import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/fraunces/600.css';
import './styles.css';
import App from './App';
import { loadFonts } from './geometry';

const root = createRoot(document.getElementById('root')!);
root.render(<div className="boot">Loading letterforms…</div>);
loadFonts()
  .then(() => document.fonts.ready)
  .then(() => root.render(<StrictMode><App /></StrictMode>))
  .catch((e) => {
    root.render(<div className="boot">Could not load the lettering fonts. {String(e)}</div>);
  });
