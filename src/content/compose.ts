// Draws the final handoff image: Before | After, CSS rows, comment, footer.

export interface ComposeRow {
  prop: string
  before: string
  /** What to implement: a token/class when snapped, else the raw value. */
  after: string
  /** Secondary text: the resolved value, or "exact". */
  afterNote?: string
  /** Swatch colours for colour rows. */
  beforeSwatch?: string
  afterSwatch?: string
}

export interface ComposeInput {
  before: CanvasImageSource & { width: number; height: number }
  after: (CanvasImageSource & { width: number; height: number }) | null
  /** Short identification of the element: tag, classes, text. */
  caption: string
  /** Where the After came from, e.g. "Live render of the CSS below". */
  afterCaption: string
  rows: ComposeRow[]
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
  const bFit = fit(input.before, innerW, innerH)
  const aFit = input.after ? fit(input.after, innerW, innerH) : null
  const panelH = Math.max(160, Math.max(bFit.h, aFit?.h ?? 0) + PANEL_PAD * 2)

  scratch.font = `400 26px ${SANS}`
  const commentLines = wrap(scratch, input.comment, W - PAD * 2)
  scratch.font = `400 17px ${SANS}`
  const footerLines = input.footer.flatMap((p) => wrap(scratch, p, W - PAD * 2))

  const ROW_H = 52
  let h = PAD
  h += 22 + 26 + 12 // labels + caption
  h += panelH
  if (input.rows.length) h += 44 + 22 + 14 + input.rows.length * ROW_H
  h += 44 + 22 + 14 + commentLines.length * 36
  h += 36 + 1 + 24 + footerLines.length * 26
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

  // 1. Before | After
  label('Before', PAD, y + 15)
  label('After', xA, y + 15)
  y += 22
  ctx.font = `400 15px ${MONO}`
  ctx.fillStyle = C.muted
  ctx.fillText(ellipsize(ctx, input.caption, COL), PAD, y + 18)
  ctx.fillText(ellipsize(ctx, input.afterCaption, COL), xA, y + 18)
  y += 26 + 12

  const panel = (x: number, img: ComposeInput['before'] | null, f: { w: number; h: number } | null) => {
    ctx.fillStyle = C.panel
    ctx.beginPath()
    ctx.roundRect(x, y, COL, panelH, 14)
    ctx.fill()
    if (img && f) {
      const ix = x + (COL - f.w) / 2
      const iy = y + (panelH - f.h) / 2
      ctx.drawImage(img, ix, iy, f.w, f.h)
      ctx.strokeStyle = C.line
      ctx.lineWidth = 1
      ctx.strokeRect(ix - 0.5, iy - 0.5, f.w + 1, f.h + 1)
    } else {
      ctx.font = `500 20px ${SANS}`
      ctx.fillStyle = C.faint
      ctx.textAlign = 'center'
      ctx.fillText('No visual target. Follow the comment.', x + COL / 2, y + panelH / 2 + 7)
      ctx.textAlign = 'left'
    }
  }
  panel(PAD, input.before, bFit)
  panel(xA, input.after, aFit)
  y += panelH

  // 2. CSS rows, level across both columns
  if (input.rows.length) {
    y += 44
    label('CSS', PAD, y + 15)
    y += 22 + 14
    ctx.strokeStyle = C.line
    ctx.lineWidth = 1
    for (const r of input.rows) {
      ctx.beginPath()
      ctx.moveTo(PAD, y + 0.5)
      ctx.lineTo(W - PAD, y + 0.5)
      ctx.stroke()
      cell(ctx, PAD, y, r.prop, r.before, undefined, r.beforeSwatch, false)
      cell(ctx, xA, y, r.prop, r.after, r.afterNote, r.afterSwatch, true)
      // Arrow in the gutter between columns.
      ctx.font = `700 24px ${SANS}`
      ctx.fillStyle = C.accent
      ctx.textAlign = 'center'
      ctx.fillText('→', PAD + COL + GAP / 2, y + 34)
      ctx.textAlign = 'left'
      y += ROW_H
    }
    ctx.beginPath()
    ctx.moveTo(PAD, y + 0.5)
    ctx.lineTo(W - PAD, y + 0.5)
    ctx.stroke()
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
  for (const line of footerLines) {
    ctx.fillText(line, PAD, y + 4)
    y += 26
  }

  return canvas
}

function cell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  prop: string,
  value: string,
  note: string | undefined,
  swatch: string | undefined,
  strong: boolean,
) {
  const base = y + 34
  ctx.font = `500 22px ${MONO}`
  ctx.fillStyle = C.muted
  const propW = 230
  ctx.fillText(ellipsize(ctx, prop, propW - 12), x, base)
  let vx = x + propW
  if (swatch) {
    ctx.fillStyle = swatch
    ctx.beginPath()
    ctx.roundRect(vx, y + 15, 22, 22, 5)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.stroke()
    ctx.strokeStyle = C.line
    vx += 32
  }
  const room = COL - (vx - x)
  ctx.font = `${strong ? 700 : 500} 22px ${MONO}`
  ctx.fillStyle = C.ink
  const v = ellipsize(ctx, value, room)
  ctx.fillText(v, vx, base)
  if (note) {
    const used = ctx.measureText(v).width + 14
    if (used < room - 40) {
      ctx.font = `400 18px ${MONO}`
      ctx.fillStyle = C.faint
      ctx.fillText(ellipsize(ctx, note, room - used), vx + used, base)
    }
  }
}

export async function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'),
  )
}
