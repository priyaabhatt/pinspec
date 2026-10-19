// Screenshots via chrome.tabs.captureVisibleTab, cropped to an element.

import { getHost } from './env'

const CONTEXT = 16

function nextFrame() {
  return new Promise<void>((r) => requestAnimationFrame(() => r()))
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = src
  })
}

let lastCapture = 0

/** Capture the visible tab with pinspec's own UI hidden for that frame. */
export async function captureVisible(): Promise<HTMLImageElement> {
  // Chrome allows two captures per second per extension.
  const wait = 550 - (Date.now() - lastCapture)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))

  const host = getHost()
  host.style.setProperty('visibility', 'hidden', 'important')
  try {
    await nextFrame()
    await nextFrame()
    const res: { dataUrl?: string; error?: string } = await chrome.runtime.sendMessage({ type: 'pinspec:capture' })
    lastCapture = Date.now()
    if (!res?.dataUrl) throw new Error(res?.error ?? 'Capture failed')
    return await loadImage(res.dataUrl)
  } finally {
    host.style.removeProperty('visibility')
  }
}

/**
 * Crop to the element plus ~16px of context, clamped to the viewport.
 * Elements taller than the viewport are cropped to their visible part.
 */
export function cropToElement(shot: HTMLImageElement, rect: DOMRect): HTMLCanvasElement {
  const scale = shot.naturalWidth / window.innerWidth
  const x0 = Math.max(0, rect.left - CONTEXT)
  const y0 = Math.max(0, rect.top - CONTEXT)
  const x1 = Math.min(window.innerWidth, rect.right + CONTEXT)
  const y1 = Math.min(window.innerHeight, rect.bottom + CONTEXT)
  const w = Math.max(1, Math.round((x1 - x0) * scale))
  const h = Math.max(1, Math.round((y1 - y0) * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(shot, Math.round(x0 * scale), Math.round(y0 * scale), w, h, 0, 0, w, h)
  return canvas
}

export async function captureElement(el: Element): Promise<HTMLCanvasElement> {
  const r = el.getBoundingClientRect()
  if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) {
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
  const shot = await captureVisible()
  return cropToElement(shot, el.getBoundingClientRect())
}
