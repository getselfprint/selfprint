# Architecture

Local-first, installable PWA. No backend, no account, no telemetry (spec §10, §15).

## Stack

- TypeScript + React + Vite, installable as a PWA (`vite-plugin-pwa`).
- Fonts bundled locally via `@fontsource` — no remote font requests (§15.5).
- Storage (planned): IndexedDB, every record encrypted with the Web Crypto API
  (AES-GCM, key derived from the user's passphrase). The passphrase is never
  stored.
- Model access (planned flows): the browser calls the provider directly with
  the user's own key; no screen talks to a provider directly — everything goes
  through `src/llm`.

## Repo layout (src)

| Path | Role |
|------|------|
| `src/app` | Routes and screens. App is mounted under `/app` and is `noindex` (§17). |
| `src/engine` | Layer definitions, coverage, session flow, confidence state machine. Deterministic, no AI (§5). |
| `src/llm` | Provider interface + adapters. `createProvider()` is the single factory. |
| `src/store` | Encrypted IndexedDB layer (interface defined; implementation = Milestone 1). |
| `src/export` | Persona/profile templates, redaction, file writers (Milestone 1–2). |
| `src/types` | The `§9` data model. |
| `src/styles` | Design tokens (§11) and global base styles. |
| `prompts/` | Public prompts: `interviewer.md`, `distiller.md`, `scenario.md`, `persona-template.md`. |
| `questions/` | Curated seed questions per layer (`<layer>.json`). |

## Current state

All screens are built: Map, Facts, Interview, Profile, Mirror, Test, Export, and
Settings, plus the first-run flow and the encrypted vault. Model providers wired:
**Anthropic** (direct browser fetch), **OpenAI-compatible** (OpenAI / OpenRouter
/ a local server such as Ollama), and an **in-browser** model via WebGPU (WebLLM).

## Content-Security-Policy

The production CSP is enforced as an HTTP response header at the static host (a
strict meta CSP breaks Vite's dev HMR). `connect-src` lists `'self'` plus the
hosts the shipped providers need — the Anthropic and OpenAI-compatible endpoints,
and the model-download hosts for the in-browser option.

## Not yet implemented (by milestone)

- **M1:** encrypted store + passphrase, first-run, network-activity panel,
  question banks (layers 02/03), interview screen, distiller + review queue,
  profile screen, persona export, public static site.
- **M2:** facts form, layers 04/06 banks, contradiction detection + layer 05,
  full profile folder export, encrypted backup.
- **M3:** test mode + confidence lifecycle + match score, mirror + gap chart,
  redaction list, providers C/D/F.
