import { classList } from './styles'

/** One line that helps the agent find the element in code: tag, classes, text. */
export function caption(el: Element) {
  const classes = classList(el).slice(0, 6)
  const text = (el instanceof HTMLElement ? el.innerText : el.textContent ?? '').trim().replace(/\s+/g, ' ')
  const parts = [el.tagName.toLowerCase() + (classes.length ? '.' + classes.join('.') : '')]
  if (text) parts.push(`"${text.length > 48 ? text.slice(0, 47) + '…' : text}"`)
  return parts.join(' ')
}
