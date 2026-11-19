# Changelog

## 0.2.0 (2026-11-18)

### New

- **Drag a box to pin any part of the page.** Click still picks an element; press and drag draws a box, and Before is exactly that box. Works on canvas-drawn boards such as Figma's, where a frame isn't an element of its own.
- **Clear or replace either image.** Hover the Before or After and click ✕. An empty slot takes a pasted image (⌘V fills Before first, then After) or **Select on page**, which sets the card aside while you click or drag on the page.
- **The comment is optional.** Copy works once there's a comment, an After or a CSS change.
- **CSS changes read as instructions** in the copied image: "Change the width from 232px to w-88 (352px), the nearest step to 350px."

### Changed

- New icon: a note pinned to an orange square.
- The copied image shows Before and After in one white frame with small before/after tags, both at the same scale, instead of grey panels.
- With no After and no CSS change, the copied image shows just the element, untagged.
- The copied image no longer has captions under the pictures, an empty Comment section, or the agent footer.
- Before and After are cropped to exactly the selected element, with nothing around it.
- Copied images stay sharp: the image grows wider when the pictures need it, instead of shrinking a wide After to half size.
- The card and picker are always light, matching the copied image. The toolbar is dark, and both float on a clear shadow.
- In the card, the arrow sits centred between the before value and the after box, and the card's ✕ button is gone. Esc still discards the pin.

### Fixed

- Dictated or pasted text and images reach the card on pages that intercept paste.
- Shadows, focus rings, dashed borders and border colours render inside pinspec; a build step had been resetting them.
- A copy that finishes after you've moved on no longer wipes the next pin.
- Double-clicks, Backspace after ✕, the toolbar during Select on page, and a page scrolling during capture all behave.

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
