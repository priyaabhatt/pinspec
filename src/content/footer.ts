// The agent footer printed at the bottom of every copy.

export function footer({ hasSystem, hasRows, hasExact }: { hasSystem: boolean; hasRows: boolean; hasExact: boolean }) {
  const lines = [
    "Implement this UI change on the element shown in Before only. Treat slash-style names (background/primary) as design tokens and map them to the codebase's tokens. Snap values to the existing scale. Don't change anything else; ask if anything is unclear.",
  ]
  const notes: string[] = []
  if (hasRows && !hasSystem) {
    notes.push('No design system was found on the page, so CSS values are raw: map each one to the nearest existing token.')
  }
  if (hasExact) notes.push('Rows marked exact must use the value as given.')
  if (notes.length) lines.push(notes.join(' '))
  return lines
}

/** Light, non-AI cleanup of a typed or dictated comment. */
export function tidy(comment: string) {
  const t = comment.trim().replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
  return t.charAt(0).toUpperCase() + t.slice(1)
}
