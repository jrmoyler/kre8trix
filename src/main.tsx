import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import './lib/mock/handlers'
import { AuthProvider } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>,
)
