// The agent footer printed at the bottom of every copy. It is written for
// the coding agent, not a person, and kept short because it is on every copy.

export interface FooterContext {
  /** The page exposed design tokens that values were snapped to. */
  hasSystem: boolean
  /** The copy includes CSS rows. */
  hasRows: boolean
  /** At least one row is marked exact. */
  hasExact: boolean
  /** The After is a pasted image rather than the live preview. */
  hasPastedAfter: boolean
}

export function footer({ hasSystem, hasRows, hasExact, hasPastedAfter }: FooterContext) {
  const target = hasPastedAfter
    ? 'Make it match After; the CSS rows and comment take precedence over the image.'
    : hasRows
      ? 'Make it match After by applying the CSS rows.'
      : 'Make the change described in the comment.'
  const lines = [
    `Change only the element shown in Before; find it in the code by the tag, classes and text above it. ${target}`,
    "Use the codebase's existing tokens and scale: names like w-88 or text-muted-foreground are its classes, and slash-style names in the comment (background/primary) are design tokens. If the element is a shared component, change only this usage unless the comment says otherwise. Don't change anything else; ask if anything is unclear.",
  ]
  const notes: string[] = []
  if (hasRows && !hasSystem) notes.push('No design tokens were found on the page, so CSS values are raw: map each one to the nearest existing token.')
  if (hasExact) notes.push('Rows marked exact must use the value as given.')
  if (notes.length) lines.push(notes.join(' '))
  return lines
}

/** Light, non-AI cleanup of a typed or dictated comment. */
export function tidy(comment: string) {
  const t = comment.trim().replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
  return t.charAt(0).toUpperCase() + t.slice(1)
}
