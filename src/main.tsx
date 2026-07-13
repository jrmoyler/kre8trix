import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import './backend/handlers'
import { AuthProvider } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import App from './App.tsx'

// C6: PWA — register the service worker in production builds only, so dev is unaffected.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failure (e.g. insecure context) is non-fatal; the app works without it.
    })
  })
}
// /C6

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>,
)
