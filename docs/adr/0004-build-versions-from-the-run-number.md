# Published versions come from the build, not the repo

The Chrome Web Store only accepts an upload with a higher version than the last one, and we publish on every merge to `main`. Rather than bumping versions by hand, the Build extension workflow stamps each build as `major.minor` from `package.json` plus its run number (e.g. `0.1.27`). So the version in `package.json` and `public/manifest.json` only sets `major.minor`, and the version users see is usually higher than what's committed. To start a new line, change both files to e.g. `0.2.0`.
