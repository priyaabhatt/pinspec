# pinspec

## Git workflow

- `main` holds the shipped work. Never commit or push to `main` directly.
- Every change goes on a feature branch and reaches `main` through a pull request.
- Never merge pull requests. Priya opens and merges them unless Priya asks otherwise.

## Attribution

- Commits are authored as Priya Bhatt <08priyabhatt@gmail.com>.
- Never add Claude attribution anywhere: no `Co-Authored-By` or `Claude-Session` trailers in commits, and no "Generated with Claude Code" line in pull requests or comments.

## Checks before pushing

`npm run typecheck`, `npm test` and `npm run build` must all pass.
