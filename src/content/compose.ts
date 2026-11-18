// Draws the final handoff image: Before | After (or just the element when
// there's no After), the changes as sentences and the comment.

import type { Picture } from '@/lib/pin'

export interface ComposeInput {
  before: Picture
  after: Picture | null
  /** Each CSS row as a sentence. */
  changes: string[]
  /** Left out of the image when empty. */
  comment: string
}

/** The image is this wide unless the pictures need more room to stay at full size. */
const MIN_W = 1200
/** Past this, pictures are shrunk to fit rather than the image growing further. */
const MAX_W = 2400
const PAD = 40
/** Text wraps at the narrow width, so lines stay readable in a wide image. */
const TEXT_W = MIN_W - PAD * 2
const SCALE = 2
// Tall enough that stitched captures of long elements stay readable.
const MAX_PICTURE_H = 1160
/** Room around each picture inside the frame, and above it for the tag. */
const CELL_PAD = 32
const TAG_ROOM = 48
const MIN_FRAME_H = 160
const BULLET = 32
const CHANGE_LINE = 32
const CHANGE_GAP = 8

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const C = {
  bg: '#FFFFFF',
  ink: '#09090B',
  muted: '#52525B',
  faint: '#71717A',
  line: '#E4E4E7',
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

/** Wide enough for the pictures at full CSS size, within MIN_W and MAX_W. */
function widthFor(pictures: Picture[]) {
  const dpr = window.devicePixelRatio || 1
  const needed = pictures.reduce((sum, p) => sum + p.width / dpr + CELL_PAD * 2, 0) + PAD * 2
  return Math.round(Math.min(MAX_W, Math.max(MIN_W, needed)))
}

/**
 * Draw a picture shrunk to w × h. A single big downscale on a canvas blurs
 * fine text, so large shrinks happen in halving steps first.
 */
function drawSharp(ctx: CanvasRenderingContext2D, img: Picture, x: number, y: number, w: number, h: number) {
  let src: CanvasImageSource = img
  let sw = img.width
  let sh = img.height
  const target = w * SCALE
  while (sw / 2 >= target) {
    const half = document.createElement('canvas')
    half.width = Math.round(sw / 2)
    half.height = Math.round(sh / 2)
    const hctx = half.getContext('2d')!
    hctx.imageSmoothingQuality = 'high'
    hctx.drawImage(src, 0, 0, half.width, half.height)
    src = half
    sw = half.width
    sh = half.height
  }
  ctx.drawImage(src, x, y, w, h)
}

/**
 * Lay the pictures out side by side in one frame, all at the same scale so
 * Before and After compare honestly: as large as the frame allows, never past
 * 2× CSS size so screenshots stay sharp. Each column is as wide as its picture
 * plus padding, and leftover width is shared out in proportion.
 */
function layout(pictures: Picture[], frameW: number) {
  const dpr = window.devicePixelRatio || 1
  const css = pictures.map((p) => ({ w: p.width / dpr, h: p.height / dpr }))
  const room = frameW - pictures.length * CELL_PAD * 2
  const s = Math.min(2, room / css.reduce((sum, c) => sum + c.w, 0), MAX_PICTURE_H / Math.max(...css.map((c) => c.h)))
  const sizes = css.map((c) => ({ w: c.w * s, h: c.h * s }))
  const base = sizes.map((z) => z.w + CELL_PAD * 2)
  const total = base.reduce((a, b) => a + b, 0)
  const cols = base.map((b) => (b / total) * frameW)
  return { sizes, cols, pictureH: Math.max(...sizes.map((z) => z.h)) }
}

export function compose(input: ComposeInput): HTMLCanvasElement {
  // Measure pass on a scratch context, then draw.
  const scratch = document.createElement('canvas').getContext('2d')!
  // With no After the element is the only picture, untagged.
  const pictures = input.after ? [input.before, input.after] : [input.before]
  const tags = input.after ? ['before', 'after'] : []
  const W = widthFor(pictures)
  const frameW = W - PAD * 2
  const { sizes, cols, pictureH } = layout(pictures, frameW)
  const top = tags.length ? TAG_ROOM : CELL_PAD
  const frameH = Math.max(MIN_FRAME_H, top + pictureH + CELL_PAD)

  scratch.font = `400 26px ${SANS}`
  const commentLines = wrap(scratch, input.comment, TEXT_W)
  scratch.font = `400 22px ${SANS}`
  const changeLines = input.changes.map((c) => wrap(scratch, c, TEXT_W - BULLET))

  let h = PAD
  h += frameH
  if (changeLines.length) h += 44 + 22 + 14 + changeLines.flat().length * CHANGE_LINE + (changeLines.length - 1) * CHANGE_GAP
  if (input.comment) h += 44 + 22 + 14 + commentLines.length * 36
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

  /** A small boxed tag, like a sticky label on a design frame. */
  const tag = (text: string, x: number, y: number) => {
    ctx.font = `600 13px ${SANS}`
    const w = ctx.measureText(text).width + 14
    ctx.fillStyle = C.bg
    ctx.strokeStyle = C.line
    ctx.beginPath()
    ctx.roundRect(x + 0.5, y + 0.5, w, 22, 4)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = C.ink
    ctx.fillText(text, x + 7.5, y + 16)
  }

  let y = PAD

  // 1. One white frame: Before | After (or just the element), split by a line
  ctx.strokeStyle = C.line
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(PAD + 0.5, y + 0.5, frameW - 1, frameH - 1, 6)
  ctx.stroke()
  let x = PAD
  pictures.forEach((img, i) => {
    if (i) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, y)
      ctx.lineTo(x + 0.5, y + frameH)
      ctx.stroke()
    }
    const z = sizes[i]
    // Centred in the room below the tags.
    drawSharp(ctx, img, x + (cols[i] - z.w) / 2, y + top + (frameH - top - CELL_PAD - z.h) / 2, z.w, z.h)
    if (tags[i]) tag(tags[i], x + 10, y + 10)
    x += cols[i]
  })
  y += frameH

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

  // 3. Comment, when there is one
  if (input.comment) {
    y += 44
    label('Comment', PAD, y + 15)
    y += 22 + 14
    ctx.font = `400 26px ${SANS}`
    ctx.fillStyle = C.ink
    for (const line of commentLines) {
      ctx.fillText(line, PAD, y + 27)
      y += 36
    }
  }

  return canvas
}

export async function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'),
  )
}
