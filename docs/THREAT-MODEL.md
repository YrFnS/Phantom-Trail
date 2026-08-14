# Phantom Trail Threat Model

**Version:** P5 plus trust-boundary hardening  
**Last updated:** August 14, 2026  
**Status:** Review input, not a security certification

## 1. System overview

Phantom Trail is a Manifest V3 Chrome extension that observes HTTP(S) request
metadata and attributed third-party script or iframe URLs from an isolated
content script, stores minimized detector events, shows local summaries, and
optionally sends aggregate summaries to OpenRouter or aggregate samples to
unauthenticated peers.

Primary components:

- **Background service worker:** request observation, event persistence, badge,
  reports, alarms, optional notifications, and message routing.
- **Isolated content script:** attributed DOM-resource observation and bounded
  extension-runtime responses. It does not inject page-world code or trust
  page-posted detector messages.
- **Popup:** feed, relationship graph, evidence dashboard, local explorer,
  reports, peer controls, settings, exports, and deletion.
- **Storage:** Chrome local/session/sync storage controlled by the extension.
- **External services:** optional OpenRouter requests and optional
  Trystero/WebRTC peer exchange.
- **Build/release system:** GitHub Actions, WXT build output, ZIP artifacts, and
  evidence manifests.

## 2. Trust boundaries

### Page DOM ↔ isolated content script

The page controls DOM nodes, resource attributes, mutation timing, and navigation.
The isolated content script treats those values as untrusted, parses only HTTP(S)
script and iframe URLs, requires attributed third-party context, applies a narrow
low-confidence token rule, and sends a canonical extension-owned event shape. It
does not accept page-posted detector messages or inject native API wrappers.

### Content script ↔ background worker

Runtime messages can contain attacker-influenced page data. The worker must
validate supported message types, enrich attribution from trusted browser
metadata where possible, and reject arbitrary actions or oversized payloads.

### Extension ↔ Chrome storage

Stored values can be stale, corrupted, legacy, user-modified through developer
tools, or restored from a browser profile. Every read path must normalize or
fail safely. Storage is not independently encrypted.

### Extension ↔ OpenRouter

The API key is sensitive. Aggregate payloads and model responses are untrusted.
Provider retention, model-provider routing, account configuration, pricing, and
availability are outside Phantom Trail's control.

### Extension ↔ P2P network

Peers are unauthenticated. Samples can be fabricated, replayed, withheld, or
crafted to consume resources. WebRTC, signaling, and relay infrastructure can
expose connection metadata. Peer data cannot establish reputation or truth.

### Source ↔ dependencies/build output

Dependencies, build plugins, generated chunks, GitHub Actions, and downloaded
artifacts form a software-supply-chain boundary. Source review alone does not
prove packaged behavior.

## 3. Important assets

| Asset | Sensitivity | Required property |
| --- | --- | --- |
| OpenRouter API key | High | Never logged, exported, synced, prompted, or shared with peers |
| Browsing origins/domains/timestamps | High | Minimized, retained briefly, deletable, never silently transmitted |
| Detector evidence and descriptions | Medium–high | Bounded, sanitized, attributable, not presented as fact |
| Personal annotations/settings | Medium | Local unless explicitly documented, deletable |
| Optional peer samples | Medium | Aggregate only, consented, unauthenticated label preserved |
| Release artifact | High integrity | Same commit as evidence manifest, hashed, reproducible enough for review |
| Public claims | High integrity | Supported by evidence and limitations |

## 4. Attacker profiles

- A malicious or compromised website visited by the user.
- Third-party scripts embedded in an otherwise benign page.
- A malicious iframe or redirect chain.
- A hostile or curious P2P peer.
- A compromised OpenRouter/model-provider account or response path.
- Another process or person with access to the browser profile.
- A malicious dependency or build-time package.
- A contributor who unintentionally reintroduces a retired or misleading
  feature.
- An artifact distributor who replaces the reviewed ZIP.

## 5. Abuse cases and controls

### Forged or noisy DOM evidence

**Threat:** A page creates script or iframe elements whose URLs are designed to
trigger a low-confidence DOM token rule or excessive mutation work.

**Controls:** isolated-world observation, HTTP(S)-only parsing, third-party
attribution, a narrow rule set, deduplication, source/confidence labels, and no
privileged action based on one detector event.

**Remaining risk:** a page can still influence heuristic evidence and create
noise or resource pressure within configured limits.

### Sensitive URL or argument retention

**Threat:** credentials, tokens, searches, patient/customer identifiers, email
addresses, or API arguments enter local storage, exports, reports, logs, AI, or
P2P payloads.

**Controls:** origin-only default storage, URL/text sanitization before
persistence, raw-detail removal, separate outbound builders, retention limits,
and deletion.

**Remaining risk:** origins, domains, timing, categories, and detector metadata
can still reveal browsing patterns.

### Credential disclosure

**Threat:** OpenRouter credentials appear in general settings, logs, error text,
exports, cached prompts, sync, or peer messages.

**Controls:** dedicated credential storage, session-only default, static source
checks, outbound payload tests, and deletion.

**Remaining risk:** a compromised browser profile or extension context can read
extension-controlled storage.

### Permission creep

**Threat:** optional or unfinished capabilities become required permissions,
increasing impact without clear user action.

**Controls:** exact manifest allowlists in CI, optional permission checks,
user-driven requests, and release evidence.

### Remote-code or injection paths

**Threat:** remotely hosted scripts/styles, unsafe HTML construction, malformed
runtime messages, or dynamic evaluation execute with extension privilege.

**Controls:** Manifest V3 CSP, no project-owned `eval`/`new Function`, no remote
executable assets, no page-world injection, bounded message handling, and
source/package security gates.

**Remaining risk:** dependencies, broad host access, and content/background
message handling require continued review.

### P2P poisoning and deanonymization

**Threat:** peers submit fabricated values, correlate timing, observe IP
metadata, or flood the session.

**Controls:** P2P off by default, versioned consent, aggregate payload only,
strict byte/shape/range/freshness validation, score-band consistency, accepted-
peer caps, per-peer throttling, duplicate suppression, expiry pruning, no domain
reputation, and unverified labels.

**Remaining risk:** peer identity and authenticity are not solved; connection
metadata can be observable.

### Misleading output

**Threat:** users treat a detector match, graph edge, model band, AI summary, or
peer average as proof of collection, safety, reputation, or compliance.

**Controls:** N/A state, evidence coverage, bounded wording, removed fabricated
benchmarks, visible limitations, and release-copy checks.

### Resource exhaustion

**Threat:** pages generate large request volumes or DOM mutations, and peers send
repeated payloads that consume memory or CPU.

**Controls:** event deduplication, occurrence aggregation, row caps, narrow DOM
resource filtering, storage retention, bounded arrays/strings, peer throttling,
and performance budgets.

**Remaining risk:** real-site CPU, memory, battery, and service-worker behavior
remain incompletely measured.

### Artifact substitution

**Threat:** a ZIP or release description does not correspond to the reviewed
source and evidence.

**Controls:** CI-built artifacts, SHA-256 hashes, commit-bound evidence manifest,
version consistency, and no hand-rebuilt stable candidate.

## 6. Security verification map

| Property | Automated evidence | Human/independent evidence still required |
| --- | --- | --- |
| URL/data minimization | unit fixtures, package scan, Chromium storage checks | review sensitive real-world cases |
| Permission boundary | manifest gate, runtime permission state | product justification and store review |
| DOM/message boundary | unit/source checks, lifecycle fixture | adversarial extension-security assessment |
| Credential isolation | storage/outbound fixtures, source scan | compromised-profile risk review |
| OpenRouter payload | canonical payload tests and preview | live provider/retention review |
| P2P payload | consent and validation fixtures | real peer abuse/authenticity review |
| Accessibility | DOM/AX contract | keyboard, screen-reader, zoom, contrast, motion review |
| Performance | deterministic budgets | varied hardware and real-site profiling |
| Artifact provenance | CI evidence manifest and hashes | owner release approval and public verification |

## 7. Non-goals

The current architecture does not attempt to:

- block trackers;
- prevent fingerprinting;
- provide anonymity;
- verify company identity or ownership;
- authenticate peer samples;
- secure a compromised browser profile;
- inspect encrypted request bodies;
- certify GDPR, CCPA, WCAG, or other compliance; or
- prove complete detector accuracy.

Any future change to these non-goals requires a new threat-model and evidence
phase before public claims change.
