import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'remixicon/fonts/remixicon.css'
import './index.css'
import App from './App.tsx'
import { initializeThemeConfig } from './hooks/useSidebarLayout.ts'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

initializeThemeConfig()

// The app shell works offline once it has loaded online; only in production builds (dev servers change often).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}

createRoot(rootElement).render(
  <StrictMode> 
    <App />
  </StrictMode>,
)
