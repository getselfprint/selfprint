# Architecture

Local-first, installable PWA. No backend, no account, no telemetry (spec §10, §15).

## Stack

- TypeScript + React + Vite, installable as a PWA (`vite-plugin-pwa`).
- Fonts bundled locally via `@fontsource` — no remote font requests (§15.5).
- Storage: IndexedDB, every record encrypted with the Web Crypto API (AES-GCM).
  By default the data key lives on-device so the app opens with no prompt; adding
  a passphrase wraps that key under a PBKDF2 key. The passphrase is never stored.
- Model access: the browser calls the provider directly with the user's own key,
  or runs an in-browser model; no screen talks to a provider directly —
  everything goes through `src/llm`. The in-browser model downloads in the
  background via `src/app/model/DownloadContext`.

## Repo layout (src)

| Path | Role |
|------|------|
| `src/app` | Routes and screens. App is mounted under `/studio` and is `noindex` (§17). |
| `src/engine` | Layer definitions, coverage, session flow, confidence state machine. Deterministic, no AI (§5). |
| `src/llm` | Provider interface + adapters. `createProvider()` is the single factory. |
| `src/store` | Encrypted IndexedDB layer (`crypto`, `db`, `vault`, `backup`). |
| `src/export` | Persona/profile templates, redaction, file writers. |
| `src/types` | The `§9` data model. |
| `src/styles` | Design tokens (§11) and global base styles. |
| `prompts/` | Public prompts: `interviewer.md`, `distiller.md`, `scenario.md`, `persona-template.md`. |
| `questions/` | Curated seed questions per layer (`<layer>.json`). |

## Flow

One linear flow under a single top menu (Map · Interview · Profile · Settings),
no stepper:

`/` landing → `/studio/model` (pick a model; the in-browser option starts
downloading in the background) → `/studio/` the **Map** (home: the six layers as
a staircase; the active layer expands in place with the next step) → the
**interview** (`/studio/interview`), where **Facts (Layer 01)** is a no-AI,
two-page form and Layers 02–06 are model-driven questions → **Profile**
(`/studio/profile`, with Export as its final section) → **Settings**
(`/studio/settings`; Test and Mirror live under Diagnostics). `/studio/facts` is
the standalone Facts editor, reached from Profile/Settings.

All screens are built, plus the encrypted vault. Model providers wired:
**Anthropic** (direct browser fetch), **OpenAI-compatible** (OpenAI / OpenRouter
/ a local server such as Ollama), and an **in-browser** model via WebGPU (WebLLM).

## Content-Security-Policy

The production CSP is enforced as an HTTP response header at the static host (a
strict meta CSP breaks Vite's dev HMR). `connect-src` lists `'self'` plus the
hosts the shipped providers need — the Anthropic and OpenAI-compatible endpoints,
and the model-download hosts for the in-browser option.

## Not built yet

The whole six-layer loop, the trust tooling (Test, Mirror, confidence
lifecycle), the three export formats, and the public site are built and
deployed. Open ideas (spec §13): a "who said it" game inside Mirror, importing
your own writing as Voice evidence, and a desktop wrapper that stores plain files
instead of IndexedDB.
