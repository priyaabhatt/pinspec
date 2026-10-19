# pinspec

A Chrome extension that turns a UI change into one image an AI coding agent can act on: the exact element, its current CSS, the target, values snapped to the page's design system, and your comment.

## Install (unpacked)

```sh
npm install
npm run build
```

In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick the `dist` folder. Pin the pinspec icon.

After changing code, run `npm run build` again and click reload on the extension card. `npm run dev` rebuilds the content script on save.

## Use

1. Click the pinspec icon. The toolbar appears at the bottom of the page (drag it anywhere).
2. Click ⌖, hover, and click an element. **↑** selects the parent, **↓** goes back down, **Esc** cancels.
3. Write or dictate the comment (required).
4. Optional: press ⌘V in the card to paste an after image.
5. Optional: click **{ }** to add CSS rows. Type an after value; it is applied live and snapped to the page's tokens. Click **exact** on a row to keep the typed value instead.
6. Click **Copy** (or ⌘↵). The image is on your clipboard; paste it into Codex, Claude Code or Cursor.

⌫ Remove clears only the element and keeps your comment, image and rows. Esc or ✕ discards the pin. Nothing is saved.

## Development

- `npm test` runs the snapping unit tests.
- `npm run typecheck` runs TypeScript.
- `dev/index.html` is a small page with a Tailwind v4 + shadcn style token set (`cd dev && python3 -m http.server`).
- `node build/icons.mjs` regenerates the toolbar icons from `build/icon.svg`.

### Layout

| Path | What it does |
| --- | --- |
| `src/background/index.ts` | Icon click injects or toggles the content script; handles `captureVisibleTab`. |
| `src/content/index.tsx` | Mounts the UI in a shadow root and keeps page key handlers out. |
| `src/content/App.tsx` | Pin state: select, card, live edits, copy. |
| `src/content/Selector.tsx` | Crosshair selection overlay. |
| `src/content/Card.tsx` | Annotation card, paste routing, CSS rows. |
| `src/content/CssPicker.tsx` | { } picker of non-default styles and the class list. |
| `src/content/tokens.ts` | Reads `--spacing`, `--color-*`, `--radius-*`, `--text-*` and semantic tokens from the page. |
| `src/lib/snap.ts` | Pure snapping logic (tested). |
| `src/content/compose.ts` | Draws the final PNG. |
| `build/postcss-shadow-safe.js` | rem → px and `@property` fallbacks so Tailwind works inside a shadow root. |

### Notes

- Permissions are only `activeTab` and `scripting`: pinspec runs on a tab when you click its icon, with no host permissions and no network calls.
- Built with a plain Vite setup rather than CRXJS: the content script is one IIFE bundle (required by `executeScript`) and the worker is one ES module.
- Elements taller than the viewport are cropped to their visible part.
- Tokens come from same-origin stylesheets; rules in cross-origin stylesheets can't be read.
