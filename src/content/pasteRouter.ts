// Pastes inside pinspec (⌘V, or a dictation app pasting for you) are caught on
// the window in the capture phase, ahead of the page's document and element
// paste handlers: many web apps cancel or swallow every paste for their
// editor, which would otherwise stop text and images reaching pinspec's card.
// A window capture listener the page added before pinspec mounted still runs
// first; if it cancels the paste, the card inserts the text itself.

type Handler = (e: ClipboardEvent, target: Element) => void

let handler: Handler | null = null

/** The card registers how it routes a paste; returns the unregister function. */
export function onPinspecPaste(fn: Handler) {
  handler = fn
  return () => {
    if (handler === fn) handler = null
  }
}

/** Install once per mount; returns the uninstall function. */
export function installPasteRouter(host: Element) {
  const listener = (e: Event) => {
    const path = e.composedPath()
    if (!path.includes(host)) return
    // The page's handlers never see a paste meant for pinspec.
    e.stopImmediatePropagation()
    const target = path[0]
    if (target instanceof Element) handler?.(e as ClipboardEvent, target)
  }
  window.addEventListener('paste', listener, true)
  return () => window.removeEventListener('paste', listener, true)
}
