# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it has a
tagged release.

## [Unreleased]

The project is pre-1.0; everything below has been built but not yet tagged.

### Added

- **Core loop (Milestone 1).** Encrypted local store (IndexedDB + Web Crypto
  AES-GCM, PBKDF2-derived key), passphrase vault with unlock gate, first-run
  flow, the model picker, the interview screen with the follow-up ladder and
  Field-notes review,
  the distiller with schema validation and a review queue, the Profile screen
  (edit/delete with evidence), and persona-prompt export. Network-activity panel
  and documented Content-Security-Policy.
- **Full profile (Milestone 2).** Facts form (layer 01), question banks for
  Triggers (04) and Voice (06), contradiction detection and the layer-05 view,
  live Map coverage, and full-profile-folder (`.zip`) plus encrypted-backup
  export.
- **Trust & accuracy (Milestone 3).** Test mode with the confidence lifecycle and
  a match score, the Mirror interview with sealed responses and a gap chart, the
  redaction name list, an OpenAI-compatible adapter (local servers / OpenRouter),
  and an in-browser WebGPU model option.
- **Public site.** Pre-rendered landing, privacy, and terms pages in the app's
  design language, served at `/` with the SPA scoped under `/studio`; `robots.txt`,
  `sitemap.xml`, `llms.txt`, and structured data.
- **Project infrastructure.** MIT license, contributor and security docs, and
  Playwright end-to-end walkthrough scripts.

### Changed

- **Split into two repos.** The marketing site moved to its own repo
  (`getselfprint/website`, serving `selfprint.org`); this repo is now the app
  only - a **root-based** SPA with no `/studio` base, served at
  `try.selfprint.org`. `npm run dev` runs it straight at `/`, so it clones and
  self-hosts cleanly. Removed the combined-build scripts (`build-site`, `serve`,
  `clean`) and the `/site` folder.
- **One linear flow, one navigation.** Replaced the first-run stepper and the
  grouped menu with a single top menu (Map · Interview · Profile · Settings) and
  a linear flow: landing → model picker → Map → interview → Profile → Settings.
  The app moved from `/app` to **`/studio`** (driven from the Vite base, so the
  path lives in one place), with legacy `/app` URLs 301-redirecting.
- **Model-first setup with a background download.** The interview always runs a
  live model; the no-AI "Guided" and manual "copy-paste" modes were removed. The
  in-browser model downloads in the background (`DownloadContext`) while you fill
  in Facts, with honest percent / MB / ETA progress on the Map, Facts, and
  Interview screens.
- **Facts is Layer 01 of the interview** — a no-AI, two-page form inside the
  interview shell (still editable later at `/studio/facts`).
- **Map** shows the next step inside the active layer row (no separate banner);
  **Export** moved into the Profile as its final section; **Test** and **Mirror**
  moved under Settings → Diagnostics. Added an app footer and a right-aligned nav.
- **Interview fixes:** the step/answer box now hold until the model finishes
  distilling, and a layer answered in full but with no claims no longer traps the
  flow — you can continue to the next layer.

### Notes

- The app uses AI in exactly four places (interviewer follow-ups, the distiller,
  test-scenario generation, and answering as the persona in Test mode);
  everything exact, private, or repeatable is deterministic code.
