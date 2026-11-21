# Contributing to Selfprint

Thanks for your interest. Selfprint is a local-first, open-source project; the
bar is friendly review, clear boundaries, and keeping the privacy promises
honest. By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting set up

Prerequisites: **Node 20+** and **npm**.

```bash
git clone https://github.com/getselfprint/selfprint
cd selfprint
npm install
npm run dev          # app at http://localhost:5173/studio
```

| Script | What it does |
|--------|--------------|
| `npm run dev` | Vite dev server (app only, served under `/studio`) |
| `npm run typecheck` | `tsc` in `--noEmit` mode |
| `npm run build` | typecheck, build the SPA into `dist/studio`, copy `site/` into `dist/` |
| `npm run serve` | serve the combined build (`site` at `/`, app at `/studio`) |
| `npm run preview` | Vite preview of the app only |

> **Native-binary note.** The repo pins Rollup to `@rollup/wasm-node` via a
> `package.json` `overrides` entry so it builds on machines whose security
> policy blocks native `.node` addons. If you don't need it, remove the override
> and reinstall.

## Architecture and separation of responsibilities

The golden rule, from the spec: **AI is used in exactly four places** (interviewer
follow-ups, the distiller, test-scenario generation, and answering as the persona
in Test mode). Everything that must be exact, private, or repeatable is plain,
deterministic code. Keep that boundary.

Layers, and what each may depend on:

```
app  ──▶ engine, llm, store, export, types     (UI; no business rules of its own)
engine ─▶ types, questions, prompts            (pure logic; no React, no I/O)
llm  ──▶ provider interface + adapters         (the ONLY place that calls a model)
store ─▶ crypto, IndexedDB                     (the ONLY place that persists data)
export ▶ types, prompts                        (fixed templates; never calls a model)
```

Concrete rules:

- **Screens never touch IndexedDB or a provider directly.** They go through the
  `VaultContext` / store repos and the `createProvider` factory.
- **`engine/` is pure and framework-free** so it can be reasoned about and unit
  tested. No `fetch`, no `window`, no React.
- **The confidence lifecycle is enforced in `engine/confidence.ts`, not by the
  model.** A model can propose a claim; only code can mark it `tested`.
- **Every model response is schema-validated in code** (`engine/distiller.ts`,
  `engine/test.ts`) and retried once, then dropped.
- **Adding a provider = adding one adapter file** in `llm/` plus a case in
  `createProvider`. Nothing else should know which provider is in use.

Folder map:

| Path | Responsibility |
|------|----------------|
| `src/app/screens` | Top-level pages (Map, Profile, Export, Settings) |
| `src/app/<feature>` | Feature folders: `vault`, `config`, `model`, `firstrun`, `facts`, `interview`, `mirror`, `test`, `net`, `data` |
| `src/app/components` | Shared, reusable UI (`ui.tsx`, `ConfidenceTag`, `AppHeader`) |
| `src/engine` | `coverage`, `session`, `confidence`, `distiller`, `test`, `layers` |
| `src/llm` | `provider` interface, adapters (`anthropic`, `openai`, `webllm`), `createProvider` |
| `src/store` | `crypto`, `db`, `store`, `vault`, `backup` |
| `src/export` | persona / profile-folder / backup assembly |
| `src/types` | the `§9` data model |
| `prompts/` | the four public prompts |
| `questions/` | seed questions per layer (JSON) |
| `site/` | the pre-rendered public pages |

## Conventions

- **TypeScript strict.** `npm run typecheck` must pass. Prefer explicit types at
  module boundaries.
- **Styling is Tailwind + design tokens.** Colors, fonts, and radii come from the
  CSS variables in `src/styles/tokens.css` (mapped into `tailwind.config.js` as
  `bg-ground`, `text-ink`, `font-mono`, `rounded-card`, …). Don't hardcode hex.
- **Reuse the UI primitives** in `src/app/components/ui.tsx` (`Button`, `Field`,
  `TextArea`, `Panel`) and the `label-mono` class for monospace labels, rather
  than re-deriving class strings.
- **Writing style:** plain, concrete, no em dashes (use commas or a regular
  dash), no emoji in UI copy. Match the app's calm, scientific tone.
- **IDs** use `crypto.randomUUID()` via `engine/session.ts` `newId()`.

## How to extend

**Add or edit interview questions** — edit `questions/<layer>.json`. Each seed is
`{ id, type, text, followUpHints }`. Keep questions behavioral (ask about a real
past action), concrete, and single-choice. New layers are registered in
`src/questions/index.ts` (`BANKS` + `INTERVIEWABLE_LAYERS`).

**Edit a prompt** — the four prompts in `prompts/` are loaded at runtime from
`src/prompts/index.ts`. They are public on purpose; changes are reviewable.

**Add an LLM provider** — implement `LlmProvider` in a new `src/llm/<name>.ts`,
export it, and add a `case` to `createProvider` in `src/llm/index.ts`. If it is a
live model, add it to `LIVE_MODES` in `src/app/config/provider.ts` and a card in
the model picker (`src/app/model/ChooseModelScreen.tsx`, and `ChooseHow` which
the Settings model section reuses).

**Add a data entity** — add the type in `src/types/model.ts`, a store in
`src/store/db.ts` (`ENTITY_STORES`), and a repo in `src/store/store.ts`.

## Tests and verification

There isn't a unit-test suite yet (a great first contribution). For now, verify
behavior end-to-end with the Playwright walkthroughs:

```bash
npm run build && npm run serve        # in one terminal
node scripts/e2e.mjs                  # full walkthrough → docs/e2e/*.png
node scripts/e2e-site.mjs             # public site + SPA boot
```

They use the system Chrome (`channel: "chrome"`). Review the screenshots the run
produces. Note: `scripts/e2e.mjs` predates the one-linear-flow redesign and needs
updating to match the current `/studio` flow — treat it as a starting point
(rewriting it is a welcome contribution).

## Pull requests

1. Fork and branch from `main`.
2. Keep PRs focused. Run `npm run typecheck` and `npm run build` before pushing.
3. Describe the change and how you verified it. Screenshots help for UI.
4. Respect the four-AI-places rule and the layering above.

## Reporting issues

Use the issue templates. For anything security- or privacy-sensitive, follow
[SECURITY.md](SECURITY.md) instead of opening a public issue.
