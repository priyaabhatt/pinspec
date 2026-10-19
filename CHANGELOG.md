# Changelog

## Unreleased

- The toolbar, card and picker match the page being pinned (light or dark) instead of the system setting.
- In the card, the arrow sits centred between the before value and the after box, and the cancel button is gone (Esc or the toolbar's ✕ still discard).

## 0.1.0 (2026-10-19)

First release.

- Floating, draggable toolbar; activating pinspec starts selecting right away.
- Element selection with hover tint and size label; ↑ and ↓ move between parent and child.
- Annotation card with Before and After images, a required comment, and ⌘V paste routing.
- CSS rows picked with checkboxes, applied live on the page, and snapped to the page's Tailwind and shadcn tokens, with a per-row exact option.
- Copy composes one PNG (Before, After, CSS, comment, agent footer) to the clipboard.
- Agent footer that says how to find the element, where the target comes from, and to change only this usage of a shared component (#4).
- Snapping works on non-Tailwind sites with names like `--space-4`, `--rounded-md` or `--brand-primary`, shown as `var(--space-4)` (#8).
- End-to-end tests in a real browser, run in CI on every pull request (#9).
- Chrome Web Store listing, graphics, privacy policy, and versioned release zips from `v*` tags (#10).
- Icons select as one `<svg>`, invisible overlays are skipped, ↓ steps into the child under the pointer, and the hover label shows a breadcrumb (#7).
- Logo: a pointer over a selection box.
- ⌥⇧P (Alt+Shift+P) turns pinspec on and off (#3).
- The toolbar, card and property picker follow the system's dark mode (#6).
- Elements taller than the screen are captured in full by scrolling and stitching, including inside scroll containers. Sticky headers are hidden while capturing (#5).
