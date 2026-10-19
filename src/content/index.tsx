import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { PortalContainer } from '@/components/ui/portal'
import { App } from './App'
import { setEnv } from './env'
import { syncTheme } from './theme'
import css from './styles.css?inline'

// Injected on demand by the background worker when the toolbar icon is
// clicked. A second click toggles pinspec off and on again.

declare global {
  interface Window {
    __pinspec?: { toggle: () => void }
  }
}

let host: HTMLElement | null = null
let root: Root | null = null

/** Keys typed into pinspec must not reach the page's own shortcuts. */
const CONTAINED = ['keydown', 'keyup', 'keypress', 'input', 'focusin', 'focusout', 'paste', 'copy', 'cut']

function mount() {
  host = document.createElement('pinspec-ui')
  host.setAttribute(
    'style',
    'all: initial !important; position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; pointer-events: none !important; display: block !important;',
  )
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = css
  shadow.appendChild(style)
  const container = document.createElement('div')
  container.className = 'pinspec-root'
  shadow.appendChild(container)
  for (const type of CONTAINED) shadow.addEventListener(type, (e) => e.stopPropagation())
  document.documentElement.appendChild(host)
  setEnv(host, shadow)
  syncTheme()

  root = createRoot(container)
  root.render(
    <StrictMode>
      <PortalContainer.Provider value={container}>
        <App onClose={unmount} />
      </PortalContainer.Provider>
    </StrictMode>,
  )
}

function unmount() {
  // Let React run cleanups (restoring live edits) before the node goes away.
  queueMicrotask(() => {
    root?.unmount()
    host?.remove()
    root = null
    host = null
  })
}

function toggle() {
  if (host) unmount()
  else mount()
}

if (!window.__pinspec) {
  window.__pinspec = { toggle }
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'pinspec:toggle') toggle()
  })
  mount()
}
