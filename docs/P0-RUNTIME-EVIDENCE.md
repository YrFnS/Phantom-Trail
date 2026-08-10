# P0 Runtime Evidence

**Date:** August 10, 2026  
**Branch:** `agent/p0-truthfulness-baseline`  
**Tested branch head:** `838d036752d558e02b9fad084c6a8952c5b19297`  
**Validate workflow:** run `#131` (`31425211833`)  
**Artifact ID:** `9076926716`  
**Artifact name:** `phantom-trail-chrome-0f0661a0dcd303a2edb866917c25577a997c129a`  
**Artifact digest:** `sha256:0e9de7b6edc59bf154ba1c6e5ca401256e45251dbdf7e2b1b4c9997bdf1ccf82`

## Evidence posture

This document records a real Chromium execution of the exact unpacked extension
artifact produced by Validate run #131. It is stronger than a seeded React-only
harness because the generated Manifest V3 extension, background service worker,
content script, main-world instrumentation, Chrome storage, action badge,
downloads, and optional-network controls were exercised together.

It is not an accuracy benchmark, independent security review, legal review, or
substitute for final human review in a normal unmanaged browser.

## Environment

- Chromium `144.0.7559.96`
- Fresh isolated browser profile
- Exact `chrome-mv3` directory from the run #131 workflow artifact
- Local deterministic fixture served from `127.0.0.1`
- Managed extension and URL blocking policy keys were removed only for the
  isolated test session and restored immediately afterward
- Host WebRTC and network policy remained restrictive, so the P2P check covers
  initialization and lifecycle behavior rather than a successful peer exchange

Policy restoration was verified after the run:

- `ExtensionInstallBlocklist`: `['*']`
- `URLBlocklist`: `['*']`
- `DownloadRestrictions`: `1`

## Automated build gate

Validate run #131 completed successfully on the tested head.

Passed steps:

- regenerated-lockfile equality check
- `pnpm install --frozen-lockfile`
- `pnpm type-check`
- `pnpm lint`
- `pnpm build`
- generated manifest name/version validation
- `pnpm zip`
- unpacked extension and ZIP artifact upload

## Runtime checks completed

### Extension startup and manifest

- Background service worker started from the packaged extension.
- Generated manifest loaded as Manifest V3.
- Name was `Phantom Trail`.
- Version was `0.1.0`.
- The fresh profile contained no detector events before opening the fixture.
- Cleanup, daily-summary, and daily-snapshot alarms were registered.

### Request and in-page signal capture

The fixture exercised request rules and browser APIs including URL-pattern
classification, canvas operations, storage activity, WebRTC construction,
form/input observation, and sensor-listener registration.

Results after the initial fixture pass:

- 9 recorded events
- 0 event descriptions using unqualified “detected” wording
- 0 events generated from `chrome-extension://` resources

The final storage audit, after opening every popup view and reloading the
fixture for badge testing, also contained:

- 0 events generated from Phantom Trail’s own extension assets

Network-rule descriptions now state that a URL or hostname matched a prototype
rule and that the classification can be wrong. They do not claim confirmed
tracking, collection, sharing, or sale.

### Popup document and visible screens

The packaged `popup.html` document was loaded from the real extension origin and
all six views were exercised:

- Feed
- Map
- Stats
- AI
- Coach
- Peers

Settings screens exercised during the same run included:

- General
- Personal site annotations
- Experimental badge
- P2P lifecycle controls

Thirteen screenshots were captured during the run:

1. Feed
2. Map
3. Stats
4. AI
5. Coach
6. Peers disabled
7. Local AI-off query result
8. General settings
9. Personal site annotation
10. Badge enabled
11. P2P joined
12. P2P left
13. Final settings state

The ephemeral browser-action popup surface was not exposed reliably as a
Playwright page target. The identical packaged popup document was exercised
directly from its extension URL. A final human toolbar-popup review therefore
remains required.

### Conservative defaults and AI consent

Fresh-profile defaults verified:

- OpenRouter summaries disabled
- no OpenRouter key present
- link estimates disabled
- toolbar badge disabled
- P2P not joined

A supported local signal query rendered while OpenRouter was off.

The General settings flow was then used to persist AI enablement together with a
dummy key. No external OpenRouter request was submitted. The settings were
restored to AI off and an empty key before the run continued.

This verifies the consent and persistence guardrail, not live OpenRouter model
behavior.

### Personal site annotation

A personal annotation for `example.com` was created and persisted. Stored
settings kept automatic suggestions and subdomain inheritance disabled. The UI
continued to describe annotations as personal notes that do not change scores,
suppress monitoring, or establish safety.

### Toolbar badge

The real Chrome action badge was exercised against the fixture tab:

- after enabling and reloading the fixture: `F`
- after disabling and saving: empty string

This confirms that disabling now clears existing per-tab badge text rather than
leaving a stale grade visible.

### P2P lifecycle

The Peers screen was used to join and leave the experimental network.

After joining:

- the transport initialized successfully
- the UI reached `Searching for peers...`
- the Leave Network control appeared
- no invalid Trystero action-name error occurred

After leaving:

- `joinPrivacyNetwork` returned to `false`
- `shareAnonymousData` returned to `false`
- the UI returned to the explicit join disclosure

No valid peer was available in this environment. Public relay WebSocket attempts
failed under the host network conditions, so no peer sample exchange is claimed.

### Exports

The real extension download flow completed for:

- CSV
- JSON
- plain-text `.txt` report

The exported files included the experimental-signal disclaimers and stored-URL
warnings. The legacy source format named `pdf` produced a `.txt` report rather
than a PDF document, matching the visible UI disclosure.

## Runtime defects found and repaired

The first artifact pass, from Validate run #122, exposed three source defects:

1. broad network rules emitted certainty-heavy descriptions and could classify
   Phantom Trail’s own extension resources;
2. P2P initialization failed because `reputation_request` and
   `reputation_response` exceeded Trystero’s 12-byte action-name limit; and
3. disabling the toolbar badge did not clear a previously written per-tab
   grade.

The fixes were committed to the same P0 branch and verified against the exact
run #131 artifact.

Run #131 fixture result:

- **status:** completed
- **detected defects:** 0
- **runtime errors:** 0

## Remaining P0 gates

P0 remains **IN PROGRESS** and pull request #1 remains draft. The following work
is still required before closing P0:

- human review of the actual browser-action popup from the toolbar in a normal,
  unmanaged Chrome installation
- human review of the recorded screenshots and real-event wording
- external-copy audit covering any GitHub Release, Chrome Web Store listing,
  demo video, submission page, or other published product description
- optional live OpenRouter verification using a user-controlled key, without
  recording or exposing that key
- a real two-peer P2P exchange if P2P is retained beyond the prototype
- a decision on whether to add a visible clear-data workflow or continue to
  document uninstall as the most complete current deletion path

The runtime evidence above does not validate detector accuracy, score quality,
performance, privacy guarantees, or security properties.
