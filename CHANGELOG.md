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
  flow, the "Choose how the interview runs" screen (Guided, copy-paste, Anthropic
  key), the interview screen with the follow-up ladder and Field-notes review,
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

### Notes

- The app uses AI in exactly four places (interviewer follow-ups, the distiller,
  test-scenario generation, and answering as the persona in Test mode);
  everything exact, private, or repeatable is deterministic code.
