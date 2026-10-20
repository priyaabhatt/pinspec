# Build your own pinspec

pinspec is MIT-licensed. You can copy the whole repository, change anything, and run or share your own version. Keep the `LICENSE` file and its copyright line in your copy; that's the licence's one condition.

These steps take you from nothing to your own working extension. A person can follow them, or a coding agent can run them. To hand them to an agent, paste:

> Make me my own copy of pinspec by following https://github.com/priyaabhatt/pinspec/blob/main/BUILD-YOUR-OWN.md

Steps 1–2 give you a working copy. Steps 3–5 are optional: making it yours, sharing it with your team, and keeping up with pinspec's changes.

## 1. Copy the repository

You need [git](https://git-scm.com/downloads), [Node.js](https://nodejs.org) 20 or newer, and a GitHub account if you want your copy online.

**Fork it** (recommended): your own copy on GitHub that can still pull in pinspec's updates. Click **Fork** at the top of [the repository page](https://github.com/priyaabhatt/pinspec), or with the GitHub CLI:

```sh
gh repo fork priyaabhatt/pinspec --clone
cd pinspec
```

Without the CLI, clone your fork, replacing `YOUR-NAME` with your GitHub username:

```sh
git clone https://github.com/YOUR-NAME/pinspec.git
cd pinspec
```

**Or just download it**, with no GitHub account: `git clone https://github.com/priyaabhatt/pinspec.git`.

**Done when** you're inside the `pinspec` folder and `git log -1` shows a commit.

## 2. Build it and load it in Chrome

```sh
npm install
npm run build
```

This writes the extension into the `dist` folder. Load it like any unpacked extension:

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. If the original pinspec is installed, click **Remove** on it, so the two don't share a shortcut.
3. Click **Load unpacked** and choose the `dist` folder inside your copy.
4. Open any website and press **⌥⇧P** (Alt+Shift+P on Windows and Linux).

**Done when** pinspec's dark toolbar appears at the bottom of the page.

## 3. Change it

Run the content script in watch mode while you work:

```sh
npm run dev
```

After each change, click **↻** on your extension's card in `chrome://extensions` and reload the page you're testing on. `dev/index.html` is a test page with Tailwind and shadcn tokens; serve it with `cd dev && python3 -m http.server` and open http://localhost:8000.

Common first changes:

| To change | Edit |
| --- | --- |
| Name and description | `name` and `description` in `public/manifest.json` (and `package.json`) |
| Keyboard shortcut | `commands._execute_action.suggested_key` in `public/manifest.json` |
| Icon | `build/icon.svg`, then `node build/icons.mjs` to regenerate the PNGs (set `CHROMIUM_PATH` if Chrome isn't in the usual place) |
| Card and toolbar colours | the variables at the top of `src/content/styles.css` |
| The copied image's layout | `src/content/compose.ts` |
| How CSS changes are worded | `src/lib/cssRow.ts` |

The README's [project structure](README.md#project-structure) lists every other part, and [`GLOSSARY.md`](GLOSSARY.md) defines the terms the code uses.

Before you share a change, run the same checks pinspec's CI runs:

```sh
npm run typecheck
npm test
npm run test:e2e   # needs Chromium; set PINSPEC_CHROMIUM to its path if Playwright's own isn't installed
npm run build
```

## 4. Share it with your team

Your fork comes with pinspec's GitHub Actions workflows. Once switched on, every push to your `main` builds the extension and publishes it to your fork's `extension` branch, ready for teammates to load.

1. On your fork, open the **Actions** tab and click **I understand my workflows, go ahead and enable them**.
2. Push a change to `main`, or run **Build extension** by hand from the Actions tab.
3. Your teammates follow [INSTALL.md](INSTALL.md), using your fork's address in step 2:

   ```sh
   git clone -b extension https://github.com/YOUR-NAME/pinspec.git ~/pinspec-extension
   ```

**Done when** your fork has an `extension` branch containing `manifest.json`.

To publish on the Chrome Web Store under your own developer account, follow [`store/AUTO-PUBLISH.md`](store/AUTO-PUBLISH.md). Give your version its own name and icon first, so people can tell it apart from pinspec.

## 5. Keep up with pinspec

To bring pinspec's later improvements into your copy:

```sh
git remote add upstream https://github.com/priyaabhatt/pinspec.git   # once
git pull upstream main
```

Resolve any conflicts with your own changes, run the checks from step 3, and push. On GitHub, the **Sync fork** button on your fork does the same thing when you haven't changed the same files.

## Contributing back

If your change would help everyone, open a pull request to pinspec; see [Contributing](README.md#contributing).
