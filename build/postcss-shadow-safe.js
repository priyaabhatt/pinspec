// Makes Tailwind's output safe to run inside a shadow root on someone else's page.
//
// 1. rem -> px. rem follows the host page's <html> font size, so a page set to
//    62.5% would shrink pinspec. Everything is converted at 16px per rem.
// 2. @property -> plain declarations. @property is ignored inside shadow roots,
//    so Tailwind's --tw-* variables would lose their initial values (rings,
//    shadows and transforms break). They are non-inheriting, so declaring the
//    initial value on every element is equivalent.

const REM = /(-?\d*\.?\d+)rem\b/g

export default function shadowSafe() {
  return {
    postcssPlugin: 'pinspec-shadow-safe',
    Once(root, { rule, decl }) {
      const initials = []
      root.walkAtRules('property', (at) => {
        let initial
        at.walkDecls('initial-value', (d) => (initial = d.value))
        if (initial !== undefined) initials.push(decl({ prop: at.params.trim(), value: initial }))
        at.remove()
      })
      if (initials.length) {
        const r = rule({ selector: ':host, *, ::before, ::after, ::backdrop' })
        r.append(initials)
        root.prepend(r)
      }
      root.walkDecls((d) => {
        if (d.value.includes('rem')) {
          d.value = d.value.replace(REM, (_, n) => `${+(parseFloat(n) * 16).toFixed(4)}px`)
        }
      })
      root.walkAtRules('media', (at) => {
        if (at.params.includes('rem')) {
          at.params = at.params.replace(REM, (_, n) => `${parseFloat(n) * 16}px`)
        }
      })
    },
  }
}
shadowSafe.postcss = true
