# Installing pinspec

These steps set up pinspec, a Chrome extension, on the user's computer. They are written so a coding agent can run them for the user. A person can follow them too.

pinspec isn't on the Chrome Web Store yet, so Chrome loads it from a folder. The agent handles the folder: steps 1–3. Chrome only lets a person turn on an extension from a folder, so the user does step 4 by hand, and the agent walks them through it.

**Done when:** the pinspec icon is in Chrome's toolbar and pressing **⌥⇧P** (Alt+Shift+P on Windows and Linux) on a normal web page shows pinspec's dark toolbar at the bottom of the page.

## 1. Check for git and Chrome

```sh
git --version
```

If git is missing, install it:

- **macOS:** `xcode-select --install`, then the user clicks **Install** in the dialog that opens.
- **Windows:** `winget install --id Git.Git -e`
- **Linux:** the distro's package manager, e.g. `sudo apt install git`.

pinspec needs Google Chrome, or another Chromium browser that loads unpacked extensions: Edge, Brave or Arc. If none is installed, ask the user which browser they want before going on.

**Done when** `git --version` prints a version and the user has a Chromium browser.

## 2. Download the built extension

The [`extension`](https://github.com/priyaabhatt/pinspec/tree/extension) branch holds the ready-to-load build; every change to pinspec updates it. Put it in the user's home folder:

```sh
git clone -b extension https://github.com/priyaabhatt/pinspec.git ~/pinspec-extension
```

On Windows PowerShell, use `"$HOME\pinspec-extension"` as the folder.

If `~/pinspec-extension` already exists, update it instead:

```sh
git -C ~/pinspec-extension pull
```

**Done when** `~/pinspec-extension/manifest.json` exists.

## 3. Open the extensions page and copy the folder path

Open the browser's extensions page:

- **macOS:** `open -a "Google Chrome" "chrome://extensions"`
- **Windows:** `start chrome chrome://extensions`
- **Linux:** `google-chrome chrome://extensions`

Some setups refuse to open `chrome://` addresses from the command line. If so, ask the user to type `chrome://extensions` in the address bar. For Edge, the page is `edge://extensions`; for Brave, `brave://extensions`.

Put the folder's full path on the clipboard, so the user can paste it in step 4:

- **macOS:** `printf %s ~/pinspec-extension | pbcopy`
- **Windows:** `Set-Clipboard "$HOME\pinspec-extension"`
- **Linux:** `printf %s ~/pinspec-extension | xclip -selection clipboard`

**Done when** the extensions page is open and you know the full folder path; print it too, in case the clipboard step failed.

## 4. The user loads it in Chrome

Send the user these steps:

1. On the extensions page, turn on **Developer mode** (top right).
2. Click **Load unpacked**.
3. In the folder picker, go to the folder:
   - **macOS:** press **⌘⇧G** and paste the path.
   - **Windows and Linux:** paste the path into the address bar at the top of the picker.

   Then click **Select** (Select Folder on Windows).
4. Click the puzzle-piece icon in Chrome's toolbar and pin **pinspec**, so its icon stays visible.
5. Open any website, then click the pinspec icon or press **⌥⇧P** (Alt+Shift+P). A dark toolbar should appear at the bottom of the page.

**Done when** the user confirms they see the toolbar. If they don't, see Troubleshooting.

## Updating

```sh
git -C ~/pinspec-extension pull
```

Then the user clicks **↻** on pinspec's card in `chrome://extensions` and reloads any open tab they want to use it on.

## Uninstalling

The user clicks **Remove** on pinspec's card in `chrome://extensions`. Then delete the folder:

```sh
rm -rf ~/pinspec-extension
```

## Troubleshooting

| What the user sees | What to do |
| --- | --- |
| "Manifest file is missing or unreadable" | They chose the wrong folder: it must be the one that contains `manifest.json`, i.e. `~/pinspec-extension` itself. |
| Nothing happens on ⌥⇧P | Reload the tab first: pages open before the install don't have pinspec yet. Chrome doesn't run extensions on `chrome://` pages or the Chrome Web Store, so try a normal website. |
| The shortcut is taken by another extension | Set a different one at `chrome://extensions/shortcuts`. |
| Chrome warns about developer-mode extensions on startup | Expected for extensions loaded from a folder; the user can dismiss it. |
| `git clone` asks for a username or password | The URL is mistyped; the repository is public and needs no login. |

## For people working on pinspec itself

To build from source instead, see [Development](README.md#development) in the README, then load the `dist` folder in step 4.
