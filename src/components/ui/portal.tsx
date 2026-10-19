import { createContext, useContext } from 'react'

/**
 * Radix portals render to document.body by default, outside the shadow root,
 * where they lose all styles. Every portalled component reads this instead.
 */
export const PortalContainer = createContext<HTMLElement | null>(null)

export function usePortalContainer() {
  return useContext(PortalContainer) ?? undefined
}
