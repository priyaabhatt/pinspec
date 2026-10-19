# Privacy policy

_Last updated: 19 October 2026_

pinspec is a Chrome extension that turns a UI change on a web page into one image for a coding agent. This policy explains what it does with data.

## Summary

pinspec collects no data. It has no server, makes no network requests, uses no analytics, and stores nothing.

## What pinspec accesses, and why

| Access | Why | Where it goes |
| --- | --- | --- |
| The current tab, only after you click the pinspec icon or press its shortcut (`activeTab`) | To show the toolbar and card, and to take a screenshot of the element you select | Nowhere. Stays in your browser |
| Running its own script on that tab (`scripting`) | To add the toolbar and card to the page | Nowhere |
| The page's styles and CSS custom properties | To show current CSS values and snap new ones to the page's design tokens | Nowhere. Read in your browser |
| Your comment, CSS values and any pasted image | To compose the handoff image | Your clipboard, only when you click Copy |

When you click Copy, the composed image is written to your clipboard and the pin is discarded. Nothing is kept after that, and nothing is saved between pins.

## Sharing and selling

pinspec does not sell, share or transfer any data. It does not use data for advertising, credit decisions or any purpose other than composing the image you asked for.

## Changes

Changes to this policy will be published in this file in the pinspec repository: https://github.com/priyaabhatt/pinspec

## Contact

Questions: open an issue at https://github.com/priyaabhatt/pinspec/issues
