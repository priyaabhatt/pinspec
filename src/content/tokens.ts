// Reads the page's design system from its CSS custom properties.
// Tailwind v4 exposes --spacing, --color-*, --radius-*, --text-*, --font-weight-*;
// shadcn adds semantic colours like --foreground and --muted-foreground; other
// sites use names like --space-4 or --brand-primary. tokenKind sorts them.

import { createDesignSystem, type DesignSystem } from '@/lib/designSystem'
import { tokenKind, type ColorToken, type LengthToken, type Tokens } from '@/lib/snap'
import { parseColor, remPx, resolveLength } from './env'

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

/**
 * Read the page's design system. Called once per selected element, so every
 * part of a pin (card, picker, handoff image) uses the same snapshot.
 */
export function readDesignSystem(): DesignSystem {
  return createDesignSystem(readTokens(), { parseColor, remPx: remPx() })
}

function readTokens(): Tokens {
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
  const tokens: Tokens = { spacing: null, spaces: [], colors: [], radii: [], fontSizes: [], fontWeights: [] }
  const length = (list: LengthToken[], name: string, value: string) => {
    const px = resolveLength(value)
    if (px !== null && px >= 0 && px < 9999) list.push({ name, px })
  }

  for (const name of names) {
    const kind = tokenKind(name)
    if (!kind) continue
    const value = root.getPropertyValue(name).trim()
    if (!value) continue

    if (kind === 'spacing-base') tokens.spacing = resolveLength(value)
    else if (kind === 'space') length(tokens.spaces, name, value)
    else if (kind === 'radius') length(tokens.radii, name, value)
    else if (kind === 'font-size') length(tokens.fontSizes, name, value)
    else if (kind === 'font-weight') {
      const n = Number(value)
      if (Number.isFinite(n)) tokens.fontWeights.push({ name, px: n })
    } else {
      const rgba = parseColor(value)
      if (rgba) tokens.colors.push({ name, rgba } satisfies ColorToken)
    }
  }
  tokens.spaces.sort(byPx)
  tokens.radii.sort(byPx)
  tokens.fontSizes.sort(byPx)
  return tokens
}

function byPx(a: LengthToken, b: LengthToken) {
  return a.px - b.px
}
