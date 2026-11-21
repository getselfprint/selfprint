<p align="center">
  <img src="docs/brand/logo.png" alt="Selfprint" width="300" />
</p>

<h3 align="center">An AI that answers the way you would.</h3>

<p align="center">
  <a href="https://selfprint.org"><strong>selfprint.org</strong></a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-6F5433.svg" alt="License: MIT" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-6F5433.svg" alt="PRs welcome" /></a>
  <a href="#privacy"><img src="https://img.shields.io/badge/local--first-no%20backend-6F5433.svg" alt="Local-first" /></a>
</p>

Selfprint interviews you, turns your answers into a personality model you can
read and edit, and exports it as a plain-Markdown file that makes any AI answer
the way you would. It runs entirely in your browser — no account, no server, no
analytics — and your data is encrypted on your device.

## Why

People want an AI that feels like *someone*, not a generic assistant. The usual
options are to guess at your own traits in a prompt, or accept a persona someone
else designed. Selfprint builds the model from a careful interview, shows you
every inference as an editable **claim** with its evidence, and hands you a file
you own.

It is honest about its limits: it is a model of how you tend to decide and speak,
built from what you told it, not a copy of your mind, and only as good as your
answers. Test mode exists to find and fix where it is wrong.

## How it works

Your profile is six layers, surface to depth:

| # | Layer | What it captures |
|---|-------|------------------|
| 01 | Facts | Body, history, relationships, tastes (no AI; a short form in the interview) |
| 02 | Formative stories | The moments that shaped you |
| 03 | Values in conflict | Which value wins when two collide |
| 04 | Triggers and soothers | What sets you off, what calms you |
| 05 | Contradictions | Where you act against your own values |
| 06 | Voice | Humor, phrases, how you argue and apologize |

Short interviews turn answers into **claims** (`"Avoids conflict with family,
confronts it at work."`), each carrying its evidence and a confidence level
(`inferred` → `stated` → `tested`). You confirm, edit, or delete every one.

**AI is used in exactly four places** (interviewer follow-ups, the distiller that
proposes claims, test-scenario generation, and answering as the persona in Test
mode). Everything that must be exact, private, or repeatable — storage,
encryption, evidence links, the confidence state machine, export assembly — is
plain deterministic code.

## Features

- **Interview → claims → profile → export** loop, with a Field-notes review of
  every proposed claim.
- **Four model options**: a direct Anthropic key, an OpenAI-compatible endpoint
  (OpenAI / OpenRouter / your own), an in-browser model via WebGPU (no key,
  nothing leaves the device), or a local model server (Ollama, etc.).
- **Test mode** scores how well the model answers like you and promotes claims to
  `tested`.
- **Mirror** lets someone who knows you answer the same questions; a sealed
  comparison shows your blind spots.
- **Export** a persona prompt, a full profile folder (`.zip`), or an encrypted
  backup.
- **Encrypted, local-first storage** (IndexedDB + Web Crypto AES-GCM) and a
  Network-activity panel that shows every outbound request.

## Privacy

Everything stays on your device, encrypted at rest, unless you export it or send
it to an AI provider you configured. By default the app opens with no passphrase
(the encryption key is kept on your device); you can add a passphrase to lock it,
and it is never stored and cannot be recovered. See [SECURITY.md](SECURITY.md)
and the in-app privacy page for the full model.

## Quick start

Prerequisites: **Node 20+** and **npm**.

```bash
npm install
npm run dev        # the app at http://localhost:5173/studio
```

Build and preview the whole site (public pages at `/`, the app at `/studio`):

```bash
npm run build      # typecheck, build the SPA into dist/studio, copy the site into dist/
npm run serve      # serve dist/ at http://localhost:4318
```

Other scripts: `npm run typecheck`, `npm run preview` (app only).

> This repo pins Rollup to its pure-WASM build (`@rollup/wasm-node`) so it builds
> on machines whose policy blocks native `.node` addons. Remove that `overrides`
> entry in `package.json` if you don't need it.

## Project structure

```
/src
  /app        routes, screens, and feature folders (vault, config, facts,
              interview, mirror, test, net, data, components)
  /engine     coverage, session flow, confidence state machine, distiller
              (deterministic; no AI)
  /llm        the LlmProvider interface and adapters (createProvider factory)
  /store      encrypted IndexedDB layer (crypto, db, vault, backup)
  /export     persona / profile / backup assembly (fixed templates, no AI)
  /types      the data model
  /styles     design tokens and base styles
/prompts      the four public prompts (interviewer, distiller, scenario, persona)
/questions    curated seed questions per layer (JSON)
/site         the pre-rendered public site (landing, privacy, terms)
/scripts      build-site, serve, clean, and the Playwright e2e walkthroughs
/docs         architecture and public-site notes
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the layering rules and how to add a
question, a prompt, or a provider, and [docs/architecture.md](docs/architecture.md)
for the architecture.

## The prompts are the point

The interview, distiller, scenario, and persona prompts live in
[`/prompts`](prompts) as plain, versioned files. They are the project's main
contribution: anyone can read exactly what is asked and how answers become
claims.

## Status

Milestones 1–3 (core loop, full profile, trust & accuracy) and the public site
are built. See [CHANGELOG.md](CHANGELOG.md) for details and the roadmap.

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Found a security issue? See
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Selfprint contributors.
