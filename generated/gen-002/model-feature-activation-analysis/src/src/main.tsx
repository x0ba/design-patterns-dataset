import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './styles.css'
import { App } from './App'
import { Provider } from './store'

createRoot(document.getElementById('root')!).render(
  <Provider>
    <App />
  </Provider>,
)
