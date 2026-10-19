# UI kit

What pinspec's own toolbar, card and picker are built from. (Not to be confused with the **design system**, which is the page's tokens; see [GLOSSARY.md](../GLOSSARY.md).)

| Part | From | Where |
| --- | --- | --- |
| Button (variants: default, ghost, outline, secondary; sizes: default, sm, icon, icon-sm) | [shadcn/ui](https://ui.shadcn.com/docs/components/button) | `src/components/ui/button.tsx` |
| Popover (the { } picker) | shadcn/ui on [Radix Popover](https://www.radix-ui.com/primitives/docs/components/popover) | `src/components/ui/popover.tsx` |
| Tooltip (toolbar and card buttons) | shadcn/ui on [Radix Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip) | `src/components/ui/tooltip.tsx` |
| Portal container (keeps Radix popups inside the shadow root) | pinspec | `src/components/ui/portal.tsx` |
| `cn()` class merging | shadcn/ui, using `clsx` and `tailwind-merge` | `src/lib/utils.ts` |
| Icons: MousePointer2, X, Braces, Copy, Check, ImagePlus | [Lucide](https://lucide.dev) | imported where used |
| Theme colours and radii (light and dark) | shadcn/ui's neutral theme, declared on `:host` | `src/content/styles.css` |
| Styling | Tailwind CSS v4, compiled to px for the shadow root | see [ADR 0003](adr/0003-ui-in-a-shadow-root-with-px-tailwind.md) |

When adding a part, take it from shadcn/ui first, point any portal at `usePortalContainer()`, and add it here.
