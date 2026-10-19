// Reads an element's current styles for the { } picker and for Before values.

import { hex, matchColor, isColorProp, type DesignSystem } from '@/lib/snap'
import { defaultStyleFor, parseColor } from './env'

export const GROUPS: { name: string; props: string[] }[] = [
  {
    name: 'Layout',
    props: [
      'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
      'display', 'position', 'top', 'right', 'bottom', 'left',
      'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap', 'row-gap', 'column-gap',
      'grid-template-columns', 'overflow',
    ],
  },
  {
    name: 'Spacing',
    props: [
      'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    ],
  },
  {
    name: 'Typography',
    props: ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration-line', 'white-space'],
  },
  { name: 'Color', props: ['color', 'background-color', 'border-color', 'outline-color', 'fill', 'stroke'] },
  {
    name: 'Border',
    props: [
      'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-style',
      'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
    ],
  },
  { name: 'Effects', props: ['opacity', 'box-shadow', 'transform', 'filter', 'backdrop-filter', 'cursor'] },
]

/** Always shown: the size of the thing you clicked is never "default". */
const ALWAYS = new Set(['width', 'height'])

/** Shorthands collapsed when all sides agree, so the list stays short. */
const SHORTHANDS: Record<string, string[]> = {
  padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  'border-width': ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'],
  'border-radius': ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'],
}

export interface StyleEntry {
  prop: string
  value: string
}

export function readValue(el: Element, prop: string): string {
  const cs = getComputedStyle(el)
  const longhands = SHORTHANDS[prop]
  if (longhands) {
    const vals = longhands.map((p) => cs.getPropertyValue(p))
    return vals.every((v) => v === vals[0]) ? vals[0] : vals.join(' ')
  }
  if (prop === 'border-color') {
    const sides = ['top', 'right', 'bottom', 'left'].map((s) => cs.getPropertyValue(`border-${s}-color`))
    return sides.every((v) => v === sides[0]) ? sides[0] : sides.join(' ')
  }
  return cs.getPropertyValue(prop)
}

/** Non-default styles, grouped, with equal-sided longhands collapsed. */
export function readStyles(el: Element): { name: string; entries: StyleEntry[] }[] {
  const cs = getComputedStyle(el)
  const def = defaultStyleFor(el.tagName.toLowerCase())
  const differs = (p: string) => ALWAYS.has(p) || !def || cs.getPropertyValue(p) !== def.getPropertyValue(p)

  return GROUPS.map(({ name, props }) => {
    const entries: StyleEntry[] = []
    const used = new Set<string>()
    for (const [short, longs] of Object.entries(SHORTHANDS)) {
      if (!longs.every((p) => props.includes(p))) continue
      if (!longs.some(differs)) {
        longs.forEach((p) => used.add(p))
        continue
      }
      const vals = longs.map((p) => cs.getPropertyValue(p))
      if (vals.every((v) => v === vals[0])) {
        entries.push({ prop: short, value: vals[0] })
        longs.forEach((p) => used.add(p))
      }
    }
    for (const p of props) {
      if (used.has(p) || !differs(p)) continue
      if (p === 'outline-color' && cs.outlineStyle === 'none') continue
      if (p === 'border-color' || p === 'border-style') {
        // Only meaningful when there is a border.
        if (!cs.borderTopWidth || parseFloat(cs.borderTopWidth) === 0) continue
      }
      entries.push({ prop: p, value: readValue(el, p) })
    }
    return { name, entries }
  }).filter((g) => g.entries.length)
}

/** `#6B7280 = --muted-foreground` for colours that match a token exactly. */
export function describeValue(prop: string, value: string, ds: DesignSystem): { text: string; token?: string } {
  if (!isColorProp(prop)) return { text: value }
  const rgba = parseColor(value)
  if (!rgba) return { text: value }
  const token = matchColor(rgba, ds.colors)
  return { text: hex(rgba), token: token?.name }
}

/** Class list, which survives minification when the page uses Tailwind. */
export function classList(el: Element): string[] {
  return Array.from(el.classList).filter((c) => !c.startsWith('pinspec'))
}
