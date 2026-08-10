# Phantom Trail Project Status

**Version:** 0.1.0  
**Assessment date:** August 10, 2026  
**Release posture:** Experimental prototype

This matrix separates source presence from validated product behavior. “Implemented” means code exists for the stated narrow behavior; it does not mean the feature is accurate, complete, secure, or production-ready.

## Capability matrix

| Capability | Status | Current reality |
| --- | --- | --- |
| Extension shell | Implemented | WXT/Manifest V3 extension with a React popup and six main views. |
| Request observation | Partial | `webRequest` events are observed, but page attribution and third-party-resource attribution are not modeled reliably. |
| Tracker catalog | Implemented data / experimental detection | 56 manually listed domain entries across analytics, advertising, social, fingerprinting, and cryptomining categories. Broad path/query heuristics can create false positives. |
| In-page signal instrumentation | Experimental | Eleven signal types are instrumented. Normal API use can trigger them, and a signal is not proof of tracking. |
| Event storage | Implemented | Local event storage, 1,000-record cap, and cleanup code for records older than 30 days. |
| Live feed | Implemented | Displays recorded event objects. Accuracy depends on detector quality. |
| Network graph | Partial | Visualizes relationships inferred from stored events; it is not a verified map of data brokers or actual data transfer chains. |
| Privacy score | Experimental / unvalidated | Hand-written penalties produce A–F grades. No independent calibration, benchmark, or “unknown” state. |
| Badge | Partial | Badge updates exist, but inherit the score and attribution limitations. |
| AI event summary | Partial | Optional OpenRouter path summarizes recent domains, counts, types, and risks. |
| Natural-language assistant | Partial | Keyword-routed local analyzers exist; general chat does not yet use the user’s question reliably. |
| Coaching and goals | Prototype | Goal and insight modules exist, but several values are derived from unvalidated signals and incomplete trend data. |
| Privacy-tool discovery | Partial | Supported extension names and enabled state can be read through `management`; actual blocked requests and effectiveness are not measured. |
| Notifications | Partial | Notification utilities exist, but detection wiring and daily summary execution are incomplete. |
| Trends and reports | Partial | Calculation and storage modules exist; automatic daily snapshot and summary alarms are placeholders. |
| CSV/JSON export | Implemented | Raw stored events can be exported. |
| PDF export | Not implemented as PDF | The current option generates a plain-text report. |
| Scheduled export | Partial | Scheduler code exists; central alarm routing is incomplete, date-range handling is incorrect, and email/cloud delivery is absent. |
| Trusted sites | Partial | Management and score adjustments exist; detector enforcement is not consistently integrated. |
| Cross-device sync | Experimental | Chrome sync code exists with known storage-key and data-shape inconsistencies. |
| Privacy predictions | Experimental | Heuristic and historical tooltip logic exists; predictions are not validated forecasts. |
| P2P community transport | Experimental | Trystero transport and peer messages exist. Peer identity, data authenticity, reputation integrity, and representativeness are not established. |
| Community benchmarks | Not established | Fabricated adoption percentages and hard-coded community distributions are removed in P0. No representative benchmark remains. |
| Category comparison | Synthetic prototype | Category averages and distributions are hard-coded, not sourced from a documented dataset. |
| GDPR/CCPA compliance | Not assessed | Retention and deletion-related code exists, but no legal or independent compliance review has occurred. |
| Security review | Not completed | No independent extension-security audit or permission-minimization gate. |
| Performance targets | Unverified | CPU, memory, bundle, and page-load claims have not been reproduced through a documented benchmark. |
| Automated tests and CI | Not established | The package has no complete test script and the repository has no active CI workflow for this branch. |

## P0 — Truthfulness baseline

P0 is focused on preventing the repository and UI from presenting assumptions as measured facts.

### Completed in this branch

- Align package and manifest version at `0.1.0`.
- Align package and repository licensing on MIT.
- Replace the marketing README with an experimental-product disclosure.
- Remove unsupported success, performance, compliance, and release-readiness claims.
- Replace “62+ across eight categories” with the current 56-entry, five-category source count.
- Remove fabricated privacy-tool effectiveness, blocked, and missed metrics from the UI.
- Remove fabricated peer adoption rates and percentile claims from Community Insights.
- Aggregate displayed peer samples from received messages instead of hard-coded values.
- Make P2P disabled by default and disclose that peer data is unauthenticated.
- Replace the privacy policy’s compliance claims with an implementation-based data disclosure.
- Replace the prebuilt-release installation path with source-build instructions.

### Still required before P0 can be closed

- Run `pnpm install`, type check, lint, and production build in a network-enabled development environment.
- Load the branch in Chrome and complete a human runtime review.
- Confirm that every visible screen uses experimental/heuristic language where appropriate.
- Confirm that no release asset or store listing repeats removed claims.
- Record screenshots or test notes as evidence in the pull request.

P0 must remain open until those runtime and human-review gates are complete.

## Next phases

### P1 — Detection and attribution

Create an event model that distinguishes page URL/domain, resource URL/domain, initiator, tab, request type, first/third-party state, detector, evidence, and confidence. Build false-positive fixtures before expanding the catalog.

### P2 — Scoring

Introduce an explicit “unknown/insufficient evidence” state, score unique parties rather than raw request volume, remove trust-based factual score boosts, publish the formula, and validate it against labeled cases.

### P3 — Data protection

Minimize permissions, sanitize before storage, default optional networking off, document every external data flow, and add retention/deletion runtime tests.

### P4 — Feature completion

Finish or remove incomplete AI, sync, reports, notifications, exports, trusted-site enforcement, predictions, and community-reputation workflows.

### P5 — Evidence

Add CI, unit and browser integration tests, detector accuracy fixtures, reproducible performance benchmarks, release checklists, and independent security/privacy review gates.
