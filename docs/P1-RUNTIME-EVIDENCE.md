# P1 Runtime Evidence

**Phase:** P1 — Detection and Attribution  
**Branch:** `agent/p1-detection-attribution`  
**Tested head:** `02a4f5fa56dbd558135271bc491a3c36c4531e0c`  
**Validate run:** #210  
**Test date:** August 10, 2026  
**Result:** Completed — 33 assertions passed, 0 failed, 0 runtime errors

## Artifact under test

The exact artifact produced by Validate run #210 was downloaded and tested.

- GitHub artifact name:
  `phantom-trail-chrome-4ac3c87af39ba487a0fc0a1b172df27c79e20bc7`
- GitHub artifact ID: `9079628500`
- GitHub artifact digest:
  `sha256:6243adf3e9e4050968cab2bd84a0d863e2e90fed37f372e250b69d50e2ce843d`
- Generated manifest: Manifest V3
- Extension name: `Phantom Trail`
- Extension version: `0.1.0`
- Chromium: `144.0.7559.96`

The extension loaded with ID:

`clcpmpjbimgmffmakgchbabipnhcchmg`

## Test environment

The artifact was loaded unpacked in Chromium with:

- a fresh isolated user-data directory;
- deterministic local page and resource fixtures;
- hostnames mapped to local fixture servers;
- no proxy;
- no pre-existing extension storage; and
- the repository's generated background worker, content script, main-world
  instrumentation, popup, graph, and export bundles.

The host's managed Chromium policy temporarily prevented unpacked-extension
loading and all navigation. The fixture removed only the blocking extension and
URL policy entries for the isolated run and restored the original policy after
completion. The restored policy was byte-compared with the backup.

No public website was used, and no real user data or API key was entered.

## Fixture model

The runtime used separate hostnames so party classification was not confused by
localhost ports:

- visited pages: `page.test`, `other.test`;
- catalog resource: `www.google-analytics.com`;
- low-confidence path-rule resource: `metrics.third.test`;
- dynamic DOM resource: `analytics.third.test`; and
- query-parameter-only control: `plain.third.test`.

All names resolved to local fixture servers. They do not represent claims about
the real services or domains.

## Assertions

### Extension lifecycle

- [x] Manifest V3 service worker started.
- [x] Fresh profile contained no detector rows.
- [x] Actual browser-action popup target opened through
  `chrome.action.openPopup()`.
- [x] Popup and fixture pages emitted no page errors.

### Legacy migration

A pre-P1 event was inserted into storage before opening the popup.

- [x] The row migrated to schema version 2.
- [x] Migration did not invent a visited-page domain.
- [x] The historical resource domain remained available.
- [x] Attribution and detector confidence were marked low.

### No-signal control

- [x] A simple page with no intentional detector-style requests or API
  thresholds stored zero rows.

### Network and DOM attribution

The primary page produced six stored rows representing seven occurrences.

- [x] Every row used schema version 2.
- [x] Every row was attributed to `page.test`.
- [x] No first-party network match was stored.
- [x] Query parameters alone did not create a `plain.third.test` row.
- [x] The catalog resource was stored as an attributed third-party match.
- [x] Two equivalent catalog fetches aggregated into one row with two
  occurrences.
- [x] A low-confidence third-party path rule was retained for inspection.
- [x] A dynamically inserted script was represented separately as a
  `dom-resource` event.
- [x] Every stored row carried detector evidence.

Observed routes included:

- `page.test` → `www.google-analytics.com`;
- `page.test` → `metrics.third.test`; and
- `page.test` → `analytics.third.test`.

Attribution provenance included `initiator` and `content-script`, with their
configured confidence levels recorded on the rows.

### In-page API thresholds

The fixture intentionally exercised canvas, storage, audio, WebGL, WebRTC,
font, sensor, form-input, and mouse behavior.

- [x] Main-world API rows were stored with `page.test` context.
- [x] Main-world rows did not invent a separate resource domain.
- [x] API-threshold evidence was marked low confidence.
- [x] Mouse movement and form-input interaction-only signals were suppressed.

The fixture intentionally crossed selected detector thresholds; this is not an
accuracy or false-negative benchmark.

### Cross-page separation

The same catalog resource was requested from `other.test` after the `page.test`
fixture.

- [x] `page.test` and `other.test` remained separate storage routes.
- [x] The second page did not merge into the first page's occurrence row.

The final store contained:

- 13 rows; and
- 14 aggregated occurrences.

### Popup and graph

- [x] The active-page header showed `other.test` and its page-specific signal
  count.
- [x] The feed showed `page → resource` routes.
- [x] Feed cards exposed source, party relationship, detector confidence,
  evidence, attribution basis, party basis, and occurrence count.
- [x] The graph reported five recorded domains and four inferred links.
- [x] The graph retained the warning that edges are inferred, not verified data
  flows.

Human inspection of the captured feed and map confirmed that the new evidence
fields were visible and the graph separated page nodes from resource nodes.

### Exports

CSV, JSON, and the compatibility plain-text report all downloaded successfully.

- [x] CSV included page domain, resource domain, attribution basis, and detector
  evidence columns.
- [x] JSON declared schema version 2 and included `context` and `detector` on
  every event.
- [x] Plain text included attributed page → resource routes and explicit
  evidence limitations.

Downloaded-file evidence:

- CSV: 8,482 bytes,
  `sha256:3ab0d6b37799f48773173782047685b2eef8827307ec2e2e69fd0b3d95117016`
- JSON: 23,148 bytes,
  `sha256:7beec8c639d5d61c639b67354de04d3b1f1e92a5c7ca36e9dff121c36b03dc02`
- text: 9,075 bytes,
  `sha256:9616739b446088f05df09d7eec14efc1146809495a49bbfc7d36d2fb427533b5`

## Runtime report integrity

The generated runtime report has SHA-256:

`98f6cb597a421b43655ace8887f284b0c90c88a102eb1d3ae4cb3eee1b5bfb5c`

Captured screenshots:

- feed SHA-256:
  `a64b5ac15076b6f19c09118f977b5d5d383032575b3fcf88d62d10d9650856f8`
- map SHA-256:
  `fd94108b381a1fe631dd744a451939a71a1f9c64c5a10b609a381bc08f943c6f`

The screenshots and raw JSON evidence are retained outside the repository for
review; this document records their reproducible results and hashes.

## Findings

No P1 runtime defect was found in the final run.

The earlier harness attempts exposed two harness issues rather than product
failures:

1. raw CDP expressions returned function objects instead of invoking their
   asynchronous bodies; and
2. API thresholds were initially triggered before main-world instrumentation
   had finished loading.

The fixture was corrected by invoking CDP expressions and waiting for detector
initialization. The final run then passed all assertions without changing the
extension source.

## Boundaries and remaining uncertainty

This runtime evidence does **not** establish:

- detector accuracy on public websites;
- complete Public Suffix List behavior;
- CNAME-cloaked tracker attribution;
- reliable iframe attribution when Chrome omits context;
- catalog ownership or corporate identity;
- collection, retention, sharing, sale, or user correlation;
- website privacy or safety;
- calibrated A–F scoring;
- performance targets;
- security or legal compliance; or
- absence of all false positives and false negatives.

The fixture confirms that the implemented P1 model keeps page and resource
context separate through the tested extension paths and applies the documented
false-positive controls.

## Conclusion

The P1 implementation completion gate is satisfied for:

- schema version 2;
- conservative migration;
- explicit page/resource attribution;
- party and attribution provenance;
- detector evidence and confidence;
- duplicate aggregation;
- page-aware filters, graph, patterns, local analysis, and exports;
- automated fixtures; and
- exact-artifact Chromium runtime behavior.

P1 can be considered **implementation complete on its branch**. PR #2 remains a
stacked draft because its P0 base is still under review and neither PR is
authorized for merge by this evidence document.
