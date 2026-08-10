# Phantom Trail Project Status

**Version:** 0.1.0  
**Assessment date:** August 10, 2026  
**Release posture:** Experimental prototype  
**P0 status:** In progress pending Chrome runtime and final human-review gates

This matrix separates source presence from validated product behavior.
“Implemented” means code exists for the stated narrow behavior; it does not mean
the capability is accurate, complete, secure, or production-ready.

## Capability matrix

| Capability | Status | Current reality |
| --- | --- | --- |
| Extension shell | Implemented | WXT/Manifest V3 extension with a React popup and six main views. |
| Request observation | Partial | `webRequest` events are observed, but page attribution and third-party-resource attribution are not modeled reliably. |
| Tracker catalog | Implemented data / experimental detection | 56 manually listed domain entries across analytics, advertising, social, fingerprinting, and cryptomining categories. Broad path/query rules can create false positives. |
| In-page instrumentation | Experimental | Eleven signal types are instrumented. Normal browser API use can trigger them; a signal is not proof of tracking. |
| Event storage | Implemented | Local event storage, a 1,000-record cap, and cleanup code for records older than 30 days. Stored URLs are not minimized before storage. |
| Signal feed | Implemented | Displays recorded event objects with explicit evidence limitations. Accuracy depends on detector quality. |
| Relationship graph | Partial | Visualizes links inferred from stored event URLs. It is not a verified data-flow or ownership map. |
| Heuristic score | Experimental / unvalidated | Hand-written penalties produce A–F labels. No independent calibration, benchmark, or consistent unknown state. |
| Toolbar badge | Partial / opt-in | Can display the heuristic grade or score. It defaults off and is labeled as non-authoritative. |
| OpenRouter event summary | Partial / opt-in | Requires both an explicit AI toggle and a stored API key. Summarizes sanitized recent-event data. |
| Signal Q&A | Partial | Keyword-routed local analyzers exist. The general OpenRouter path summarizes events rather than reliably answering the question wording. |
| Coaching and goals | Prototype | Generates goals, history, and suggestions from heuristic event data. UI copy states that these are not behavior or safety measurements. |
| Privacy-tool discovery | Partial | Supported extension names and enabled state can be read through `management`; actual blocked requests and effectiveness are not measured. |
| Notifications | Hidden / incomplete | Utility code exists, but detector wiring and daily summary execution are incomplete. P0 hides automatic-alert controls. |
| Trends and reports | Partial | Calculation and storage modules exist; automatic daily snapshot and summary alarms remain incomplete. Visible data is labeled heuristic. |
| CSV/JSON export | Implemented | Raw stored events can be exported, including stored URL fields. UI warns users to review files before sharing. |
| PDF export | Not implemented as PDF | The legacy `pdf` code path generates a plain-text `.txt` report and is labeled as such. |
| Scheduled export | Hidden / incomplete | Scheduler code exists, but alarm routing, date-range behavior, and delivery options are incomplete. P0 hides the controls. |
| Personal site annotations | Implemented | Users can save domain labels and notes. They cannot boost a score, suppress monitoring, inherit to subdomains, or establish safety. |
| Cross-device sync | Experimental / incomplete | Chrome sync code exists with known storage-key, data-shape, conflict, and application inconsistencies. |
| Link estimates | Experimental / opt-in | Uses URL/hostname rules and prior recorded events. Defaults off and is explicitly not a destination audit. |
| P2P transport | Experimental / opt-in | Trystero transport and peer messages exist. Peer identity, data authenticity, reputation integrity, and representativeness are not established. |
| Community benchmarks | Not established | Fabricated adoption percentages, percentiles, and hard-coded distributions are removed. Received samples remain unverified. |
| Category comparison | Hidden synthetic prototype | Category averages and distributions are hard-coded and not sourced from a documented dataset. The dashboard does not present them as benchmarks. |
| GDPR/CCPA compliance | Not assessed | Retention and deletion-related code exists, but no legal or independent compliance review has occurred. |
| Security review | Not completed | No independent extension-security audit or permission-minimization gate. |
| Performance targets | Unverified | CPU, memory, bundle, and page-load claims have not been reproduced through a documented benchmark. |
| Build CI | Established | `validate.yml` checks lockfile consistency, install, type-check, lint, production build, manifest metadata, ZIP creation, and artifact upload. |
| Behavioral test suite | Not established | No complete unit, detector-accuracy, browser integration, runtime permission, performance, or privacy regression suite. |

## P0 — Truthfulness baseline

P0 prevents documentation and visible UI from presenting assumptions, generated
values, or incomplete modules as measured product facts.

### Implemented in this branch

- Align package and manifest versions at `0.1.0`.
- Align package and repository licensing on MIT.
- Replace the marketing README with an experimental-product disclosure.
- Remove unsupported production, performance, compliance, detection-rate, and
  release-readiness claims.
- Replace “62+ across eight categories” with the actual 56-entry,
  five-category source count.
- Replace prebuilt-release instructions with source-build instructions.
- Add an implementation-based privacy and data-flow disclosure.
- Remove fabricated blocker effectiveness, blocked-request, and missed-request
  metrics.
- Remove fabricated peer adoption rates, percentile claims, and hard-coded
  community distributions.
- Aggregate displayed community values only from valid samples received during
  the current session.
- Label peer identity and samples unauthenticated and unrepresentative.
- Make P2P, OpenRouter summaries, link estimates, and the toolbar badge default
  off.
- Require both explicit AI enablement and an API key before an OpenRouter call.
- Label feed entries, graph links, grades, trends, coaching, recommendations,
  and link estimates as heuristic or generated.
- Hide synthetic category comparison from the dashboard.
- Convert trusted-site behavior into neutral personal annotations.
- Prevent personal annotations from changing scores or suppressing detector
  output.
- Disable automatic reputation suggestions based on hard-coded “reputable”
  domains.
- Hide incomplete automatic notification and scheduled-export controls.
- Disclose that CSV/JSON exports can include full stored URLs and that the
  legacy report path creates text rather than PDF.
- Add a deterministic GitHub Actions build gate in
  `.github/workflows/validate.yml`.
- Remove temporary duplicate and self-modifying workflows so CI remains
  read-only and deterministic.

### Evidence available

The validation workflow is designed to provide evidence for:

- committed lockfile consistency;
- frozen-lockfile dependency installation;
- TypeScript type checking;
- ESLint;
- production Chrome build;
- generated manifest name/version checks;
- ZIP packaging; and
- build artifact upload.

A successful CI run is build evidence only. It does not validate runtime
behavior, detector accuracy, product claims, or privacy/security properties.

### Still required before P0 can be closed

- Require the validation workflow to pass on the final P0 branch head.
- Load the final artifact as an unpacked extension in Chrome.
- Complete a human review of every popup view and settings screen.
- Exercise AI-off, AI-on, P2P-off, P2P-on, badge-off, annotation, export, and
  clear-data flows.
- Confirm that no GitHub release description, external listing, demo, or store
  copy repeats the removed claims.
- Record runtime notes or screenshots in pull request #1.

P0 must remain open and the pull request must remain draft until these runtime
and human-review gates are complete.

## Next phases

### P1 — Detection and attribution

Create an event model that distinguishes page URL/domain, resource URL/domain,
initiator, tab, request type, first/third-party state, detector, evidence, and
confidence. Build false-positive fixtures before expanding the catalog.

### P2 — Scoring

Introduce an explicit unknown/insufficient-evidence state, score unique parties
rather than raw request volume, publish the formula, and validate it against
labeled cases.

### P3 — Data protection

Minimize permissions, sanitize before storage, document external flows, and add
retention/deletion runtime tests.

### P4 — Feature completion

Finish or remove incomplete sync, snapshots, reports, notifications, scheduled
export, general Q&A, prediction, and community-reputation workflows.

### P5 — Evidence

Add unit and browser integration tests, labeled detector fixtures, reproducible
performance benchmarks, release checklists, and independent security/privacy
review gates.
