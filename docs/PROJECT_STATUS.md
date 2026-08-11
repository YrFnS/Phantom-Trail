# Phantom Trail Project Status

**Version:** 0.1.0  
**Assessment date:** August 10, 2026  
**Release posture:** Experimental prototype  
**P0 status:** In progress pending final human, authenticated external-copy, and publication gates

This matrix separates source presence from validated product behavior.
“Implemented” means code exists for the stated narrow behavior; it does not mean
the capability is accurate, complete, secure, or production-ready.

## Capability matrix

| Capability | Status | Current reality |
| --- | --- | --- |
| Extension shell | Implemented | WXT/Manifest V3 extension with a React popup and six main views. |
| Request observation | Partial | `webRequest` events are observed, but page attribution and third-party-resource attribution are not modeled reliably. Non-HTTP(S) extension resources are excluded from stored network events. |
| Tracker catalog | Implemented data / experimental detection | 56 manually listed domain entries across analytics, advertising, social, fingerprinting, and cryptomining categories. Broad path/query rules can create false positives. |
| In-page instrumentation | Experimental | Eleven signal types are instrumented. Normal browser API use can trigger them; a signal is not proof of tracking. |
| Event storage | Implemented | Local event storage, a 1,000-record cap, and cleanup code for records older than 30 days. Stored URLs are not minimized before storage. |
| Signal feed | Implemented | Displays recorded event objects with explicit evidence limitations. Accuracy depends on detector quality. |
| Relationship graph | Partial | Visualizes links inferred from stored event URLs. It is not a verified data-flow or ownership map. |
| Heuristic score | Experimental / unvalidated | Hand-written penalties produce A–F labels. No independent calibration, benchmark, or consistent unknown state. |
| Toolbar badge | Partial / opt-in | Can display the heuristic grade or score. It defaults off, is labeled non-authoritative, and run #131 verified that disabling clears existing per-tab text. |
| OpenRouter event summary | Partial / opt-in | Requires both an explicit AI toggle and a stored API key. Summarizes sanitized recent-event data. Live provider behavior was not exercised in P0. |
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
| P2P transport | Experimental / opt-in | Run #131 verified initialization and join/leave state after fixing Trystero action names. No successful peer exchange or authenticity property is claimed. |
| Community benchmarks | Not established | Fabricated adoption percentages, percentiles, and hard-coded distributions are removed. Received samples remain unverified. |
| Category comparison | Hidden synthetic prototype | Category averages and distributions are hard-coded and not sourced from a documented dataset. The dashboard does not present them as benchmarks. |
| GDPR/CCPA compliance | Not assessed | Retention and deletion-related code exists, but no legal or independent compliance review has occurred. |
| Security review | Not completed | No independent extension-security audit or permission-minimization gate. |
| Performance targets | Unverified | CPU, memory, bundle, and page-load claims have not been reproduced through a documented benchmark. |
| Build CI | Established | `validate.yml` checks lockfile consistency, install, type-check, lint, production build, manifest metadata, ZIP creation, and artifact upload. |
| Runtime smoke evidence | Established / bounded | The exact run #131 artifact completed an isolated Chromium fixture with zero detected defects and zero runtime errors. This is not an accuracy, security, performance, or privacy benchmark. |
| Public repository copy | Blocking until publication | The public default branch remains `main` and still serves retired README, installation, privacy, version, and licensing claims. The truthful P0 copy is not the public default until reviewed and published. |
| External listings | Partially audited / unproven | Public exact-name searches found no matching store, demo, submission, or video result, but authenticated release/store/submission surfaces still require owner review. |
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
- Exclude non-HTTP(S) extension assets from network-event storage.
- Replace certainty-heavy network-event descriptions with evidence-bounded URL
  and hostname rule-match descriptions.
- Fix P2P initialization by keeping Trystero action names within its 12-byte
  limit and surface initialization failure instead of remaining indefinitely at
  “Connecting”.
- Clear global and per-tab action badges when the badge feature is disabled.
- Add a deterministic GitHub Actions build gate in
  `.github/workflows/validate.yml`.
- Remove temporary duplicate and self-modifying workflows so CI remains
  read-only and deterministic.
- Record exact-artifact Chromium evidence in
  [P0-RUNTIME-EVIDENCE.md](P0-RUNTIME-EVIDENCE.md).
- Audit the public repository and public discovery surfaces in
  [P0-EXTERNAL-COPY-AUDIT.md](P0-EXTERNAL-COPY-AUDIT.md).

### Evidence available

Validate run #131 passed on tested head
`838d036752d558e02b9fad084c6a8952c5b19297` and produced artifact
`9076926716`.

The exact unpacked artifact was loaded in an isolated Chromium profile and
exercised with a deterministic local fixture. The run verified:

- service-worker startup and generated manifest metadata;
- content-script and main-world signal capture;
- request observation and local event storage;
- zero unqualified network “detected” descriptions;
- zero self-events from `chrome-extension://` assets;
- all six packaged popup views and relevant settings screens;
- conservative feature defaults;
- local AI-off query behavior and AI consent persistence;
- personal site annotation storage;
- badge off/on/off behavior;
- P2P initialization and join/leave lifecycle;
- CSV, JSON, and plain-text downloads; and
- policy restoration after the isolated run.

The fixture completed with zero detected defects and zero runtime errors. See
[P0 Runtime Evidence](P0-RUNTIME-EVIDENCE.md) for the scope and limitations.

The external-copy audit verified that the public default branch still exposes
the older README, installation guide, privacy policy, package version,
description, and license metadata. Public searches did not identify a matching
Chrome Web Store, demo, submission, or video result, but search absence is not
proof of nonexistence. See
[P0 External-Copy Audit](P0-EXTERNAL-COPY-AUDIT.md).

This evidence does not validate detector accuracy, score quality, website
privacy, performance, security, legal compliance, live OpenRouter behavior, or
a real peer-to-peer sample exchange.

### Still required before P0 can be closed

- Require the validation workflow to pass on the final P0 documentation head.
- Complete a human review of the actual toolbar browser-action popup in a normal,
  unmanaged Chrome installation.
- Human-review the captured views and real-event wording rather than relying
  only on automation.
- Inspect GitHub Releases, Tags, and assets while authenticated and correct or
  withdraw any stale `1.0.0` object or production-ready copy.
- Inspect Chrome Web Store drafts/listings, demos, submissions, videos, shared
  downloads, and other known owner-controlled surfaces.
- Decide whether live OpenRouter verification belongs in P0 or should remain a
  later feature-completion gate.
- Decide whether to add a visible clear-data workflow or continue documenting
  uninstall as the most complete current deletion path.
- After human approval, publish the reviewed P0 copy to the default branch and
  verify it again as an unauthenticated visitor.
- Record final human, authenticated external-copy, and post-publication findings
  in pull request #1.

P0 must remain open and the pull request must remain draft until these human,
authenticated external-copy, and publication gates are complete. P0 cannot close
while the public default branch serves the retired claims.

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
