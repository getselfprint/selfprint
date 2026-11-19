# Security Policy

Selfprint is a privacy tool: it stores sensitive personal answers, encrypted, on
the user's device. We take security reports seriously.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Email **security@selfprint.org** with:

- a description of the issue and its impact,
- steps to reproduce (or a proof of concept),
- affected version / commit, and browser if relevant.

We aim to acknowledge within a few days and to keep you updated as we
investigate. Please give us reasonable time to fix an issue before public
disclosure. We're happy to credit you unless you'd prefer to stay anonymous.

## What's in scope

- The encryption and key handling (`src/store/crypto.ts`, `vault.ts`,
  `backup.ts`).
- Anything that could cause data to leave the device unexpectedly, or weaken the
  "stays local" guarantee (e.g. the `createProvider` boundary, the Network panel,
  the Content-Security-Policy).
- Schema validation of model responses (`engine/distiller.ts`, `engine/test.ts`).
- The export and redaction paths (`src/export/`).

## Known, intentional trust boundaries

These are by design, not vulnerabilities:

- **The AI provider you configure receives what you send to it.** Its own terms
  apply. An in-browser or local model keeps inference on your machine.
- **The static web host can see standard request logs** (IP, time) when a page
  loads.
- **By default there is no passphrase.** The data key is kept on the device and
  the app opens straight away, so anyone who can use the browser profile can open
  it. Data is still encrypted at rest and never leaves the device on its own.
- **If you add a passphrase, losing it means unrecoverable data.** The passphrase
  is never stored and there is no reset: it wraps the data key via a PBKDF2-derived
  key, unwrapped in memory only while the app is unlocked.
- Encryption protects data at rest in the browser. It does not protect against a
  compromised device or a malicious browser extension with access to the page.

## Hardening the project relies on

- A strict Content-Security-Policy limiting `connect-src` to the app's origin and
  the hosts the shipped providers need (set as an HTTP header by the host;
  documented at the top of `index.html`).
- No third-party scripts, no remote fonts, no analytics.
- Dependencies kept minimal and updated.
