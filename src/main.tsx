import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 z-40 h-8 select-none"
      data-tauri-drag-region
    />
    <App />
  </React.StrictMode>,
)
