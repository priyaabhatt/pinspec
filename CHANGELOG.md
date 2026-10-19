# Changelog

## Unreleased

- Easier selection: icons select as one `<svg>`, invisible overlays are skipped, ↓ steps into the child under the pointer, and the hover label shows a breadcrumb (#7).
- ⌥⇧P (Alt+Shift+P) turns pinspec on and off (#3).
- The toolbar, card and property picker follow the system's dark mode (#6).
- Elements taller than the screen are captured in full by scrolling and stitching, including inside scroll containers. Sticky headers are hidden while capturing (#5).

## 0.1.0 (unreleased)

First version.

- Floating, draggable toolbar; activating pinspec starts selecting right away.
- Element selection with hover tint and size label; ↑ and ↓ move between parent and child.
- Annotation card with Before and After images, a required comment, and ⌘V paste routing.
- CSS rows picked with checkboxes, applied live on the page, and snapped to the page's Tailwind and shadcn tokens, with a per-row exact option.
- Copy composes one PNG (Before, After, CSS, comment, agent footer) to the clipboard.
