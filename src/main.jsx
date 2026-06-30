import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

registerSW({
  onOfflineReady() {
    console.log('[PWA] App lista para uso offline')
  },
  onNeedRefresh() {
    console.log('[PWA] Nueva version disponible — se actualizara automaticamente')
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
