// Draws the final handoff image: Before | After (or just the element when
// there's no After), the changes as sentences, comment, footer.

import type { Picture } from '@/lib/pin'

export interface ComposeInput {
  before: Picture
  after: Picture | null
  /** Short identification of the element: tag, classes, text. */
  caption: string
  /** Where the After came from, e.g. "Live preview of the changes below". */
  afterCaption: string
  /** Each CSS row as a sentence. */
  changes: string[]
  comment: string
  footer: string[]
}

const W = 1200
const PAD = 40
const GAP = 32
const COL = (W - PAD * 2 - GAP) / 2
const SCALE = 2
// Tall enough that stitched captures of long elements stay readable.
const MAX_PANEL_H = 1200
const PANEL_PAD = 20
const BULLET = 32
const CHANGE_LINE = 32
const CHANGE_GAP = 8

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'

const C = {
  bg: '#FFFFFF',
  ink: '#09090B',
  muted: '#52525B',
  faint: '#71717A',
  line: '#E4E4E7',
  panel: '#F4F4F5',
  accent: '#2563EB',
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(/(\s+)/)
    let line = ''
    for (const w of words) {
      const test = line + w
      if (ctx.measureText(test).width > width && line.trim()) {
        out.push(line.trimEnd())
        line = w.trimStart()
        // Break words longer than a line.
        while (ctx.measureText(line).width > width) {
          let i = line.length
          while (i > 1 && ctx.measureText(line.slice(0, i)).width > width) i--
          out.push(line.slice(0, i))
          line = line.slice(i)
        }
      } else line = test
    }
    out.push(line.trimEnd())
  }
  return out
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > width) t = t.slice(0, -1)
  return t + '…'
}

/** Fit inside the panel; never upscale past 2× CSS size so screenshots stay sharp. */
function fit(img: { width: number; height: number }, maxW: number, maxH: number) {
  const cssW = img.width / (window.devicePixelRatio || 1)
  const cssH = img.height / (window.devicePixelRatio || 1)
  const s = Math.min(maxW / cssW, maxH / cssH, 2)
  return { w: cssW * s, h: cssH * s }
}

export function compose(input: ComposeInput): HTMLCanvasElement {
  // Measure pass on a scratch context, then draw.
  const scratch = document.createElement('canvas').getContext('2d')!
  const innerW = COL - PANEL_PAD * 2
  const innerH = MAX_PANEL_H - PANEL_PAD * 2
  // With no After the element is the only picture: full width, untagged.
  const single = !input.after
  const panelW = single ? W - PAD * 2 : COL
  const bFit = fit(input.before, panelW - PANEL_PAD * 2, innerH)
  const aFit = input.after ? fit(input.after, innerW, innerH) : null
  const panelH = Math.max(160, Math.max(bFit.h, aFit?.h ?? 0) + PANEL_PAD * 2)

  scratch.font = `400 26px ${SANS}`
  const commentLines = wrap(scratch, input.comment, W - PAD * 2)
  scratch.font = `400 22px ${SANS}`
  const changeLines = input.changes.map((c) => wrap(scratch, c, W - PAD * 2 - BULLET))
  scratch.font = `400 17px ${SANS}`
  const footerParas = input.footer.map((p) => wrap(scratch, p, W - PAD * 2))
  const FOOTER_PARA_GAP = 10

  let h = PAD
  h += (single ? 0 : 22) + 26 + 12 // labels + caption
  h += panelH
  if (changeLines.length) h += 44 + 22 + 14 + changeLines.flat().length * CHANGE_LINE + (changeLines.length - 1) * CHANGE_GAP
  h += 44 + 22 + 14 + commentLines.length * 36
  h += 36 + 1 + 24 + footerParas.flat().length * 26 + (footerParas.length - 1) * FOOTER_PARA_GAP
  h += PAD

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = Math.ceil(h) * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.imageSmoothingQuality = 'high'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, h)

  const label = (text: string, x: number, y: number) => {
    ctx.font = `700 15px ${SANS}`
    ctx.fillStyle = C.faint
    ctx.letterSpacing = '1.5px'
    ctx.fillText(text.toUpperCase(), x, y)
    ctx.letterSpacing = '0px'
  }

  let y = PAD
  const xA = PAD + COL + GAP

  // 1. Before | After, or just the element
  if (!single) {
    label('Before', PAD, y + 15)
    label('After', xA, y + 15)
    y += 22
  }
  ctx.font = `400 15px ${MONO}`
  ctx.fillStyle = C.muted
  ctx.fillText(ellipsize(ctx, input.caption, panelW), PAD, y + 18)
  if (!single) ctx.fillText(ellipsize(ctx, input.afterCaption, COL), xA, y + 18)
  y += 26 + 12

  const panel = (x: number, img: Picture, f: { w: number; h: number }) => {
    ctx.fillStyle = C.panel
    ctx.beginPath()
    ctx.roundRect(x, y, panelW, panelH, 14)
    ctx.fill()
    const ix = x + (panelW - f.w) / 2
    const iy = y + (panelH - f.h) / 2
    ctx.drawImage(img, ix, iy, f.w, f.h)
    ctx.strokeStyle = C.line
    ctx.lineWidth = 1
    ctx.strokeRect(ix - 0.5, iy - 0.5, f.w + 1, f.h + 1)
  }
  panel(PAD, input.before, bFit)
  if (input.after && aFit) panel(xA, input.after, aFit)
  y += panelH

  // 2. Changes, one sentence per CSS row
  if (changeLines.length) {
    y += 44
    label('Changes', PAD, y + 15)
    y += 22 + 14
    ctx.font = `400 22px ${SANS}`
    changeLines.forEach((lines, i) => {
      if (i) y += CHANGE_GAP
      ctx.fillStyle = C.accent
      ctx.fillText('→', PAD, y + 24)
      ctx.fillStyle = C.ink
      for (const line of lines) {
        ctx.fillText(line, PAD + BULLET, y + 24)
        y += CHANGE_LINE
      }
    })
  }

  // 3. Comment
  y += 44
  label('Comment', PAD, y + 15)
  y += 22 + 14
  ctx.font = `400 26px ${SANS}`
  ctx.fillStyle = C.ink
  for (const line of commentLines) {
    ctx.fillText(line, PAD, y + 27)
    y += 36
  }

  // 4. Footer
  y += 36
  ctx.fillStyle = C.line
  ctx.fillRect(PAD, y, W - PAD * 2, 1)
  y += 1 + 24
  ctx.font = `400 17px ${SANS}`
  ctx.fillStyle = C.muted
  footerParas.forEach((lines, i) => {
    if (i) y += FOOTER_PARA_GAP
    for (const line of lines) {
      ctx.fillText(line, PAD, y + 4)
      y += 26
    }
  })

  return canvas
}

export async function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'),
  )
}
