# Chrome Web Store listing

Everything needed to publish pinspec on the Chrome Web Store. Copy the text below into the [developer dashboard](https://chrome.google.com/webstore/devconsole).

## Package

Each GitHub release has `pinspec-<version>.zip` attached; upload that. To build it locally, run `npm run zip`.

## Store listing

**Name:** pinspec

**Summary** (132 characters max):

> Pin a UI change on any page and copy it as one image your coding agent can act on: element, CSS, design tokens and your comment.

**Description:**

> pinspec turns a UI change into one image an AI coding agent can act on, so a design handoff works even when nobody reads it.
>
> Click the pinspec icon, select an element on any page (production, a preview link or localhost), and write what should change. pinspec captures the element, lets you paste a target image, and lets you pick CSS properties and type their new values, which are applied live on the page and snapped to the page's own design tokens (Tailwind, shadcn, or custom names like --space-4).
>
> Click Copy and you get one PNG with:
> • Before and After images of the element
> • Before → after CSS rows with the matching tokens (w-88, rounded-lg, text-muted-foreground)
> • Your comment
> • Short instructions that keep the agent focused on that one element
>
> Paste it into Codex, Claude Code, Cursor or any agent that reads images.
>
> Private by design: no account, no server, no network requests, nothing stored. pinspec only runs on a tab after you click its icon.
>
> Shortcut: ⌥⇧P (Alt+Shift+P). Open source: https://github.com/priyaabhatt/pinspec

**Category:** Developer Tools
**Language:** English

## Graphics

| Asset | File | Size |
| --- | --- | --- |
| Store icon | `icon-128.png` | 128 × 128 |
| Screenshot 1: selecting an element | `screenshot-1-select.png` | 1280 × 800 |
| Screenshot 2: the annotation card | `screenshot-2-annotate.png` | 1280 × 800 |
| Screenshot 3: the copied image | `screenshot-3-handoff.png` | 1280 × 800 |
| Small promo tile | `promo-small-440x280.png` | 440 × 280 |

## Privacy tab

**Single purpose:**

> Capture a UI element on the current page with the designer's comment and CSS changes, and copy it to the clipboard as one image for an AI coding agent.

**Permission justifications:**

- `activeTab`: Runs pinspec on the current tab only after the user clicks the extension icon or presses its shortcut, and takes a screenshot of the visible tab to capture the selected element.
- `scripting`: Injects pinspec's toolbar and annotation card into the current tab when the user activates it.

**Remote code:** No, pinspec does not use remote code. All code ships in the package.

**Data usage:** tick none of the data types. pinspec does not collect or transmit user data. Then certify the three statements (no selling, no unrelated use, no creditworthiness use).

**Privacy policy URL:** https://github.com/priyaabhatt/pinspec/blob/main/PRIVACY.md

## Publishing a new version

1. Bump `version` in both `package.json` and `public/manifest.json`, and add a section to `CHANGELOG.md`.
2. Merge to `main`, then tag the merge commit: `git tag v0.2.0 && git push origin v0.2.0`.
3. The Release workflow builds, checks the versions match, and publishes a GitHub release with the zip.
4. Upload the zip in the developer dashboard and submit for review.
