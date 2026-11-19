<!-- Thanks for contributing to Selfprint. -->

## What and why

<!-- What does this change, and what problem does it solve? Link any issue. -->

Closes #

## How I verified it

<!-- Typecheck/build output, steps you ran, screenshots for UI changes. -->

- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Verified the affected flow (describe how)

## Checklist

- [ ] Keeps the "AI in exactly four places" rule (no model calls outside the
      interviewer, distiller, scenario generator, and persona test)
- [ ] Screens don't touch IndexedDB or a provider directly (go through the store
      and `createProvider`)
- [ ] Uses design tokens / UI primitives rather than hardcoded styles
- [ ] No em dashes or emoji in user-facing copy
- [ ] Docs updated if behavior or structure changed
