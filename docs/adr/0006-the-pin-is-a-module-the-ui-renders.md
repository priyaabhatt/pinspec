# The pin is a module the UI renders, and cancelling selection keeps the draft

A pin's contents and lifecycle (select, Remove, edit, Copy, Discard) live in `src/lib/pin.ts`, not in React state. Screenshots, the clipboard, the live preview and the page's styles are reached through a `PinEnvironment`: the real one in `src/content/pinEnvironment.ts`, a recording fake in the tests, so the pin's rules are unit tested without a browser. App only subscribes to the pin and keeps UI-only state (the picker, the toast).

One rule changed on purpose from the product brief, which said Esc ends a pin: cancelling selection (Esc or the pointer button) now keeps the draft for the next element picked. A pin ends only with Copy, Esc while the card is open, or turning pinspec off. Losing a written comment to a stray Esc while re-selecting was the worse mistake, and Esc on the open card is always there to throw a pin away on purpose.
