// The designer's comment as the handoff image prints it.

/** Light, non-AI cleanup of a typed or dictated comment. */
export function tidy(comment: string) {
  const t = comment.trim().replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
  return t.charAt(0).toUpperCase() + t.slice(1)
}
