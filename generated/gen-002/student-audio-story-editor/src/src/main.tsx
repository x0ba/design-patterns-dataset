import { createRoot } from 'react-dom/client';
import '@fontsource-variable/dm-sans';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
