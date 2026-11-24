import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/newsreader';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles.css';
import App from './App';
import { DEFAULT_HASH } from './lib/router';

if (!window.location.hash || !window.location.hash.startsWith('#/')) window.history.replaceState(null, '', DEFAULT_HASH);
createRoot(document.getElementById('root')!).render(<App />);
