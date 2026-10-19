# pinspec

pinspec turns a UI change on a rendered web page into one image a coding agent can act on. These are the words for its parts.

## The pin

**Pin**:
One UI change on one element: the element, a comment, an optional After and optional CSS rows. It exists until it is copied or discarded.
_Avoid_: annotation, note, ticket

**Draft**:
A pin's comment, After and CSS rows while it has no element: after Remove, or when selecting is cancelled. The next element picked gets it.
_Avoid_: unsaved pin, pending pin

**Element**:
The single DOM element a pin is about, chosen while selecting.
_Avoid_: node, target, component

**Comment**:
The designer's description of the change, typed or dictated. Required on every pin.
_Avoid_: note, message, description

**Before**:
A screenshot of the element as it is on the page, with a little surrounding context.
_Avoid_: original, current screenshot

**After**:
What the element should look like: either a pasted image, or the live preview captured as an image.
_Avoid_: target image, mockup

**Live preview**:
The CSS rows' after values applied to the page as they're typed, so the element shows the change before it's copied.
_Avoid_: live render, live edit

**CSS row**:
One property's change, from its value on the page (before) to the value the designer wants (after).
_Avoid_: style edit, property row

## Design system

**Design system**:
The set of tokens a page exposes through its CSS, read once per pin. Always the page's, never pinspec's own (that is the UI kit).
_Avoid_: theme, style guide, tokens file

**Token**:
A named design value the page exposes as a CSS custom property, such as `--spacing`, `--color-muted-foreground` or `--space-4`.
_Avoid_: variable, design variable

**Snap**:
Replacing a typed value with the nearest token or scale step, e.g. `350px` becoming `w-88`.
_Avoid_: round, normalise

**Exact**:
A CSS row that keeps the typed value instead of snapping.
_Avoid_: raw, override

## Output

**Handoff image**:
The single PNG a copy produces: Before, After, CSS rows, comment and footer.
_Avoid_: export, screenshot, spec image

**Footer**:
The short instructions to the agent at the bottom of every handoff image.
_Avoid_: prompt, agent instructions

**Copy**:
Composing the handoff image, putting it on the clipboard, and discarding the pin.
_Avoid_: export, share

**Discard**:
Ending a pin without copying it (✕, or Esc while the card is open). Nothing is kept. Cancelling selection is not a discard: the draft is kept.
_Avoid_: cancel, delete

## Interface

**UI kit**:
The parts pinspec's own toolbar and card are built from; the list is in [docs/ui-kit.md](docs/ui-kit.md).
_Avoid_: design system, component library

**Toolbar**:
The small floating bar with the select and turn-off buttons.
_Avoid_: panel, menu

**Card**:
The panel attached to the selected element where the pin is written.
_Avoid_: annotation card, popover, modal

**Selecting**:
The mode where hovering highlights elements and a click picks one.
_Avoid_: inspect mode, picking
