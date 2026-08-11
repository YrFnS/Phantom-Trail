# Phantom Trail Project Status

**Version:** 0.1.0  
**Assessment date:** August 11, 2026  
**Source branch:** `main`  
**Source publication:** P0–P5 complete and merged  
**Release posture:** Experimental prototype; stable release blocked

This document distinguishes source implementation, automated regression
evidence, human review, external distribution, and production readiness.

“Implemented” means code exists for the narrow stated behavior. It does not mean
that behavior is accurate, secure, private, accessible, legally compliant, or
production-ready.

## Publication record

The remediation stack was merged to `main` in dependency order:

| Phase | Pull request | Published result |
| --- | ---: | --- |
| P0 — Truthfulness | #1 | Merged; public default-branch copy corrected |
| P1 — Detection and attribution | #2 | Merged; page/resource evidence model published |
| P2 — Evidence scoring | #3 | Merged; N/A-safe evidence index published |
| P3 — Data protection | #4 | Merged; minimization, retention, permissions, and deletion published |
| P4 — Functionality integrity | #5 | Merged; working workflows finished and incomplete surfaces removed |
| P5 — Evidence and release discipline | #6 | Merged; automated evidence, provenance, security, and release gates published |

The P5 publication merge is:

`24b833501c8dfccefd92563990b6c35e5d7bfd6f`

The final P5 source head was:

`a1dccabaf758ed15c619de08dc2e20e9322e559a`

Both use implementation tree:

`bc9511a02ab56c2598814f06a40ebc140e236219`

Source publication is complete. Stable publication is not.

## Capability matrix

| Capability | Current status | Current reality |
| --- | --- | --- |
| Extension shell | Implemented | WXT/Manifest V3 extension with a React popup and Feed, Map, Stats, Explore, Reports, and Peers views. |
| Request observation | Implemented with attribution limits | Observes HTTP(S) request metadata through `webRequest`; does not request bodies. Browser metadata can still be absent, stale, or ambiguous. |
| Tracker catalog | Implemented source data / unvalidated coverage | 56 manually maintained domain entries across Analytics, Advertising, Social Media, Fingerprinting, and Cryptomining. A match is not proof of tracking or ownership. |
| URL/path rules | Experimental | Exact/subdomain catalog matches are high-confidence rule matches; bounded path and standalone hostname-token rules remain low-confidence. Real-site error rates are unknown. |
| In-page instrumentation | Experimental | Selected browser API operations are counted and thresholded. Normal API use can trigger signals. Interaction-only mouse/form storage paths were removed. |
| Event attribution | Implemented / incomplete | Separates visited page and resource context and records attribution/party basis and confidence. Site-key logic is approximate; CNAME cloaking, iframe ambiguity, redirects, and missing initiators remain limitations. |
| Event aggregation | Implemented | Equivalent short-window events aggregate into one row while retaining occurrences and first/last-seen timestamps. The same resource on different pages remains separate. |
| Event storage | Implemented with minimization | Origin-only URL retention by default, optional redacted pathname mode, seven-day default retention, and a 1,000-row cap. Origins/domains/timestamps can still reveal browsing patterns. |
| Signal feed | Implemented | Displays stored rule evidence, page→resource attribution, confidence, party classification, and occurrence counts with uncertainty language. |
| Relationship map | Implemented as inference | Visualizes inferred page/resource relationships from stored events. It is not a verified data-flow, ownership, or broker map. |
| Evidence index | Implemented experimental model | Uses qualified evidence units, confidence factors, distinct parties, and bounded recurrence. Empty or weak evidence returns N/A. It is not a validated privacy rating. |
| Toolbar badge | Implemented / opt-in | Displays the same experimental N/A or estimated state; off by default. Green or A does not mean safe or private. |
| Local Evidence Explorer | Implemented | Supports deterministic local questions about stored signals, patterns, current-page evidence, timelines, domains, and score breakdowns. Unsupported prompts return bounded guidance. |
| OpenRouter aggregate summary | Implemented / opt-in / provider-unverified | Separate explicit action requiring enablement and credential. Uses a bounded aggregate payload. Live provider routing, retention, account, cost, and output quality remain unverified. |
| OpenRouter credential handling | Implemented | Separate credential storage; session/memory by default, persistent only after explicit remember choice. Credential is excluded from prompts, exports, peer payloads, and evidence manifests by policy and tests. |
| Daily snapshots | Implemented | Local date-keyed evidence snapshot generated manually and by alarm; preserves N/A. |
| Weekly reports | Implemented | Local week-keyed aggregation generated manually and by alarm; preserves nullable evidence state. Not a verified privacy trend. |
| Evidence notifications | Implemented / optional | Optional permission plus separate enablement. Qualifying evidence alerts and daily local summaries are throttled and respect quiet hours. OS delivery still requires human/platform review. |
| CSV/JSON export | Implemented | Exports minimized attributed evidence and formula disclosures. Files can reveal browsing patterns. |
| Text report | Implemented | Legacy source identifier `pdf` generates a labeled plain-text `.txt` report, not PDF. |
| Scheduled/email/cloud export | Removed | Incomplete scheduler, email/cloud placeholders, and background export command were removed in P4. |
| Personal site annotations | Implemented | Local user annotations only. They cannot alter scores, suppress evidence, verify safety, or imply reputation. |
| Privacy-tool discovery | Implemented / optional | Optional `management` permission can show recognized installed extension names and enabled state. It cannot measure blocking effectiveness. |
| Cross-device feature sync | Removed | Obsolete/incomplete sync manager, UI, storage adapter, and claims were removed. |
| Link destination prediction | Removed | URL-pattern hover score and tooltip were removed. |
| Generated coaching goals | Removed | Coach/journey engines and generated goal UI were removed; Reports replaced that surface. |
| P2P transport | Experimental / opt-in | Versioned consent, separate connection/sharing choices, and validated aggregate sample shape. Peer identity, authenticity, representativeness, and reputation integrity are not established. |
| Peer domain reputation | Removed | Domain-label reputation request/response behavior was removed. |
| Clear All Data | Implemented | Typed confirmation clears extension-controlled local/session/sync storage, alarms, badge state, active peer session, and supported optional permissions. It cannot recall exports or externally processed data. |
| Required permissions | Implemented boundary | `webRequest`, `storage`, `tabs`, and `alarms`; HTTP(S) host access only. Broad HTTP(S) access remains a material prototype risk. |
| Optional permissions | Implemented boundary | `management` and `notifications`; neither is granted or enabled by default. |
| Build CI | Implemented | Exact source-head checkout, frozen install, lockfile equality, tests, type-check, lint, build, ZIP, and evidence artifacts. |
| Curated detector evidence | Implemented P5 gate | Versioned corpus, source-catalog exact/subdomain coverage, explicit negative/storage cases, confusion matrix, and machine-readable failures. It is regression evidence, not real-web accuracy. |
| Security gate | Implemented P5 gate | Checks source/package invariants, permission boundary, remote executable code, request-body paths, credential diagnostics, outbound calls, retired features, and stale tests. Not an independent audit. |
| Dependency gate | Implemented P5 gate | Production dependency inventory and registry advisory audit. Advisory data is time-dependent and incomplete. |
| Performance gate | Implemented P5 gate | Package-size and deterministic matcher/evidence/sanitization ceilings plus isolated browser timing ceilings. Not real-device or real-site validation. |
| Accessibility gate | Implemented bounded P5 contract | Popup language, accessible names, labels, duplicate IDs, landmarks, focusability, and Chrome accessibility-tree checks. Not WCAG certification or assistive-technology review. |
| Browser lifecycle gate | Implemented P5 harness | Isolated Chrome for Testing fixture covers worker startup, attribution/storage, popup, alarms, timing, and browser-restart local/session behavior. Not multi-day or full-platform QA. |
| Release evidence | Implemented P5 generator | Records exact commit, versions, tests, reports, dependency status, manifest, unpacked tree hash, ZIP SHA-256, and unresolved manual gates. |
| GDPR/CCPA/WCAG compliance | Not assessed | No legal or independent compliance review. No compliance claim is authorized. |
| Production readiness | Not established | Human accessibility, real-site accuracy, long-duration lifecycle, live provider/P2P review, independent security/privacy assessment, external-copy correction, and final owner approval remain incomplete. |

## Phase record

### P0 — Truthfulness baseline

**Source status:** Published on `main`.

P0 corrected product status, version/license, tracker count, unsupported
compliance/performance/accuracy claims, fabricated blocker/peer metrics, defaults,
visible wording, and documentation. It established deterministic build evidence
and bounded Chromium runtime evidence.

### P1 — Detection and attribution

**Source status:** Published on `main`.

P1 introduced event schema v2, page/resource separation, browser metadata,
party/attribution basis and confidence, detector evidence, storage migration,
deduplication, false-positive controls, and attribution-aware consumers and
exports.

Known limits include approximate site-key logic, missing browser context,
iframes, redirects, CNAME cloaking, catalog ownership, and remaining heuristic
false positives and false negatives.

### P2 — Evidence-based scoring

**Source status:** Published on `main`.

P2 added a true insufficient-evidence/N/A state, a published evidence-unit
formula, confidence weighting, bounded recurrence, explicit exclusions, and
nullable score handling across badge, reports, trends, comparisons, exports,
OpenRouter summaries, and P2P.

The formula remains experimental and independently uncalibrated.

### P3 — Data protection

**Source status:** Published on `main`.

P3 added pre-persistence URL/text minimization, origin-only default, shorter
retention, credential separation, outbound previews, versioned P2P consent,
permission minimization, storage inventory, complete deletion, fixtures, package
checks, and exact-artifact Chromium evidence.

Minimization does not provide anonymity or secure a compromised profile.

### P4 — Functionality integrity

**Source status:** Published on `main`.

P4 finished the local Evidence Explorer, explicit aggregate OpenRouter action,
daily/weekly reports, optional notifications, and truthful keyboard commands.
It removed incomplete sync, scheduled export, background export, generic AI
chat, link prediction, generated coaching, and peer domain reputation.

Live provider behavior, OS notification delivery, real peer exchange, and
long-duration alarms remain later review gates.

### P5 — Evidence and release discipline

**Source status:** Published on `main`.  
**Automated gate:** Passed.  
**Stable release:** Blocked.

P5 added:

- versioned detector regression corpus and catalog drift checks;
- machine-readable confusion matrix and per-family results;
- exact-head CI checkout and artifact provenance;
- executable security and dependency gates;
- deterministic package-size and throughput ceilings;
- isolated Chrome lifecycle/restart evidence;
- bounded popup DOM/accessibility-tree checks;
- `SECURITY.md` and repository threat model;
- changelog and release checklist;
- commit-bound release-evidence manifest; and
- explicit unresolved human and independent release gates.

The exact final metrics, hashes, and limitations are recorded in
[P5 Runtime Evidence](P5-RUNTIME-EVIDENCE.md).

## Final automated P5 evidence

Validate run **#647** passed on exact source head:

`a1dccabaf758ed15c619de08dc2e20e9322e559a`

Highlights:

- 51 of 51 unit/contract tests passed;
- 141 of 141 curated detector cases passed;
- 21 of 21 Chrome lifecycle/accessibility assertions passed;
- source/package security gate passed with zero failures;
- performance/package budgets passed;
- dependency audit reported zero high or critical advisories and one moderate
  advisory at that run;
- commit-bound evidence and exact artifact upload passed; and
- release status remained `blocked` because manual and independent gates were
  unresolved.

These results are bounded regression evidence only. They must not be represented
as real-world detector accuracy, accessibility certification, penetration-test
success, production performance, privacy protection, or legal compliance.

## Blocking stable-release gates

The authoritative machine-readable list is
`release/manual-gates.v1.json`.

Source-stack publication is resolved. Remaining blockers are:

1. Human review of the actual browser-action popup in normal unmanaged Chrome.
2. Keyboard, screen-reader, zoom, contrast, focus, reduced-motion, and cognitive
   accessibility review.
3. Multi-day worker, storage, retention, report, alarm, notification, restart,
   browser-update, and storage-pressure testing.
4. Labeled real-site false-positive and false-negative assessment.
5. Live OpenRouter provider, routing, retention, cost, payload, response, and
   failure-state review with a dedicated credential.
6. Real P2P exchange, abuse, authenticity, replay/flood, metadata, signaling,
   relay, and disconnect-cleanup review.
7. Independent extension-security and privacy assessment.
8. Authenticated external-copy correction and audit. The confirmed blocker is
   the stale public `v1.0.0` GitHub release; issue #7 tracks its withdrawal or
   rewrite.
9. Qualified legal review before any compliance claim or regulated deployment.
10. Final owner approval of the exact candidate artifact, release notes,
    limitations, known issues, rollback plan, and withdrawal plan.

Until those gates are resolved, Phantom Trail must remain labeled experimental
and must not be described as stable or production-ready.

## Authoritative documents

- [README](../README.md)
- [Installation](../INSTALL.md)
- [Privacy and Data Disclosure](PRIVACY_POLICY.md)
- [Security Policy](../SECURITY.md)
- [Threat Model](THREAT-MODEL.md)
- [P5 Runtime Evidence](P5-RUNTIME-EVIDENCE.md)
- [P5 Evidence and Release Discipline](P5-EVIDENCE-AND-RELEASE.md)
- [Release Checklist](RELEASE-CHECKLIST.md)
- [Changelog](../CHANGELOG.md)
