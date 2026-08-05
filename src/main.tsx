import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeThemeConfig } from './hooks/useSidebarLayout.ts'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

initializeThemeConfig()

createRoot(rootElement).render(
  <StrictMode> 
    <App />
  </StrictMode>,
)
