// Reads the page's design system from its CSS custom properties.
// Tailwind v4 exposes --spacing, --color-*, --radius-*, --text-*, --font-weight-*;
// shadcn adds semantic colours like --foreground and --muted-foreground.

import type { ColorToken, DesignSystem, LengthToken } from '@/lib/snap'
import { parseColor, resolveLength } from './env'

const ROOTISH = /(^|[\s,(]):root\b|(^|[\s,])html\b|:host\b|(^|[\s,])body\b|^\.dark\b|\[data-theme/

function collectNames(rules: CSSRuleList, out: Set<string>) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      if (ROOTISH.test(rule.selectorText)) {
        for (const prop of Array.from(rule.style)) if (prop.startsWith('--')) out.add(prop)
      }
      if (rule.cssRules?.length) collectNames(rule.cssRules, out)
    } else if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) {
      // @layer, @media, @supports, @container
      collectNames((rule as CSSGroupingRule).cssRules, out)
    }
  }
}

let cached: { at: number; ds: DesignSystem } | null = null

export function readDesignSystem(): DesignSystem {
  if (cached && Date.now() - cached.at < 2000) return cached.ds

  const names = new Set<string>()
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      collectNames(sheet.cssRules, names)
    } catch {
      // Cross-origin stylesheet: its rules are unreadable. Skip it.
    }
  }
  for (const prop of Array.from(document.documentElement.style)) if (prop.startsWith('--')) names.add(prop)

  const root = getComputedStyle(document.documentElement)
  const ds: DesignSystem = { spacing: null, colors: [], radii: [], fontSizes: [], fontWeights: [] }

  for (const name of names) {
    if (name.startsWith('--tw-')) continue
    const value = root.getPropertyValue(name).trim()
    if (!value) continue

    if (name === '--spacing') {
      ds.spacing = resolveLength(value)
    } else if (name.startsWith('--radius-')) {
      const px = resolveLength(value)
      if (px !== null && px < 9999) ds.radii.push({ name, px })
    } else if (name.startsWith('--text-') && !name.includes('--', 2)) {
      const px = resolveLength(value)
      if (px !== null) ds.fontSizes.push({ name, px })
    } else if (name.startsWith('--font-weight-')) {
      const n = Number(value)
      if (Number.isFinite(n)) ds.fontWeights.push({ name, px: n })
    } else if (!/^--(spacing|breakpoint|container|font|leading|tracking|shadow|blur|ease|animate|default|inset|perspective|aspect)/.test(name)) {
      const rgba = parseColor(value)
      if (rgba) ds.colors.push({ name, rgba } satisfies ColorToken)
    }
  }
  ds.radii.sort(byPx)
  ds.fontSizes.sort(byPx)
  cached = { at: Date.now(), ds }
  return ds
}

function byPx(a: LengthToken, b: LengthToken) {
  return a.px - b.px
}
