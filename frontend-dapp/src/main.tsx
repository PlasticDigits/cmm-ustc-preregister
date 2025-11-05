import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import process from 'process'
import App from './App.tsx'

// Polyfill Buffer for Station wallet (required for WalletConnect v1 support)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).Buffer = Buffer;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Buffer = Buffer;

// Provide process globally for other libraries
window.process = process;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).process = process;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
