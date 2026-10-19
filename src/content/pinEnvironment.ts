// The real world behind the pin module's seam: Chrome screenshots, the page's
// styles and tokens, the canvas composer and the clipboard. Tests use a fake.

import type { PinEnvironment } from '@/lib/pin'
import { captureElement } from './capture'
import { compose, toPng } from './compose'
import { caption } from './describe'
import { footer, tidy } from './footer'
import { LivePreview } from './livePreview'
import { classList, readValue } from './styles'
import { readDesignSystem } from './tokens'

export function pageEnvironment(): PinEnvironment {
  const livePreview = new LivePreview()
  return {
    capture: captureElement,
    designSystem: readDesignSystem,
    readValue,
    classes: classList,
    isValid: (prop, value) => CSS.supports(prop, value),
    preview: (el, values) => livePreview.sync(el, values),
    render: async (h) =>
      toPng(
        compose({
          before: h.before,
          after: h.after,
          caption: caption(h.element),
          afterCaption: { pasted: 'Pasted target', 'live preview': 'Live preview of the changes below', none: '' }[h.afterSource],
          changes: h.changes,
          comment: tidy(h.comment),
          footer: footer({
            hasSystem: h.hasSystem,
            hasRows: h.changes.length > 0,
            hasExact: h.hasExact,
            hasPastedAfter: h.afterSource === 'pasted',
          }),
        }),
      ),
    // Handing the clipboard a promise keeps the click's user activation alive
    // across the async capture and compose.
    writeImage: (png) => navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]),
    release: (after) => URL.revokeObjectURL(after.url),
  }
}
