# Project skills

Agent skills for working on pinspec. Claude Code loads them from this folder; each `agents/openai.yaml` is the matching metadata for Codex.

| Skill | Use it to |
| --- | --- |
| [`code-review`](code-review/SKILL.md) | Review a branch or PR on two separate axes: the repo's standards, and the issue it's meant to implement |
| [`codebase-design`](codebase-design/SKILL.md) | Design or restructure modules with a shared vocabulary (deep modules, seams, adapters) |
| [`diagnosing-bugs`](diagnosing-bugs/SKILL.md) | Debug a hard bug or slowdown: build a feedback loop that goes red first, then hypothesise |
| [`domain-modeling`](domain-modeling/SKILL.md) | Keep [`GLOSSARY.md`](../../GLOSSARY.md) and the decision records in [`docs/adr/`](../../docs/adr/) sharp |

How they map onto this repo is in [`CLAUDE.md`](../../CLAUDE.md) under "Skills".

## Source

Copied unchanged from [mattpocock/skills](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering) at commit `49dd158`, under the MIT License:

> MIT License
>
> Copyright (c) 2026 Matt Pocock
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

To update, copy the folders again from upstream and change the commit above.
