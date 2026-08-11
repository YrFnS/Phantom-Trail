# Phantom Trail Project Status

**Version:** 0.1.0  
**Assessment date:** August 11, 2026  
**Release posture:** Experimental prototype; stable release blocked  
**Default-branch publication:** P0 gate still incomplete  
**Current implementation branch:** `agent/p5-evidence-release-discipline`

This document distinguishes source implementation, automated regression
evidence, human review, public integration, and production readiness.

“Implemented” means that code exists for a narrow stated behavior. It does not
mean the behavior is accurate, secure, private, accessible, legally compliant,
or production-ready.

## Branch and phase stack

```text
PR #1  P0 truthfulness baseline             draft
  └── PR #2  P1 detection attribution       draft
        └── PR #3  P2 evidence scoring      draft
              └── PR #4  P3 data protection draft
                    └── PR #5  P4 integrity draft
                          └── PR #6  P5 evidence/release draft
```

Nothing in this stack is authorized for independent merge out of dependency
order. The public default branch is not corrected until the reviewed P0–P5 stack
is deliberately integrated and verified.

## Capability matrix

| Capability | Current status | Current reality |
| --- | --- | --- |
| Extension shell | Implemented | WXT/Manifest V3 extension with a React popup and six views: Feed, Map, Stats, Explore, Reports, and Peers. |
| Request observation | Implemented with attribution limits | Observes HTTP(S) request metadata through `webRequest`; does not request bodies. Stores explicit page/resource, tab/frame, request type/method, initiator, party, evidence, and confidence where available. Browser metadata can still be absent or wrong. |
| Tracker catalog | Implemented source data / unvalidated coverage | 56 manually maintained domain entries across Analytics, Advertising, Social Media, Fingerprinting, and Cryptomining. A catalog match is not proof of tracking or ownership. |
| URL/path rules | Experimental | Exact/subdomain catalog matches are high-confidence rule matches; bounded path and standalone hostname-token rules remain low-confidence. Real-site false-positive and false-negative rates are not established. |
| In-page instrumentation | Experimental | Selected browser API operations are counted and thresholded. Normal API use can trigger signals. Mouse movement and form-input interaction-only storage paths were removed. |
| Event attribution | Implemented / incomplete | Separates visited page and resource context and records attribution/party basis and confidence. Site-key logic is approximate; CNAME cloaking, iframe ambiguity, redirects, and missing initiators remain limitations. |
| Event aggregation | Implemented | Equivalent short-window events aggregate into one row while retaining occurrence count and first/last-seen timestamps. The same resource on different pages remains separate. |
| Event storage | Implemented with P3 minimization | Origin-only URL retention by default, optional redacted pathname mode, seven-day default retention, and 1,000-row cap. Origins/domains/timestamps can still reveal browsing patterns. |
| Signal feed | Implemented | Displays stored rule evidence, page→resource attribution, confidence, party classification, and occurrence counts with uncertainty language. |
| Relationship map | Implemented as inference | Visualizes inferred page/resource relationships from stored events. It is not a verified data-flow, ownership, or broker map. |
| Evidence index | Implemented experimental model | Uses score-qualified evidence units, confidence factors, distinct parties, and bounded recurrence. Empty/weak evidence returns N/A rather than a favorable default. It is not an independently validated privacy rating. |
| Toolbar badge | Implemented / opt-in | Displays the same experimental N/A or estimated state; off by default. Green/A does not mean safe or private. |
| Local Evidence Explorer | Implemented | Supports deterministic local questions about stored signals, patterns, current-page evidence, timelines, domains, and score breakdowns. Unsupported prompts return bounded guidance. |
| OpenRouter aggregate summary | Implemented / opt-in / provider-unverified | Separate explicit action requiring enablement and credential. Uses the canonical bounded aggregate payload. Live provider routing, retention, account, cost, and response quality remain outside default automation. |
| OpenRouter credential handling | Implemented | Separate credential storage; session/memory by default, persistent only after explicit remember choice. Credential is excluded from prompts, exports, peer payloads, and evidence manifests by policy and regression checks. |
| Daily snapshots | Implemented | Local date-keyed evidence snapshot generated manually and by alarm; preserves N/A. |
| Weekly reports | Implemented | Local week-keyed aggregation generated manually and by alarm; preserves nullable evidence state. Not a verified privacy trend. |
| Evidence notifications | Implemented / optional | Optional permission plus separate enablement. Qualifying high/critical evidence alerts and daily local summaries are throttled and respect quiet hours. OS delivery still requires human/platform review. |
| CSV/JSON export | Implemented | Exports minimized attributed evidence and formula disclosures. Files can reveal browsing patterns. |
| Text report | Implemented | Legacy source identifier `pdf` generates a labeled plain-text `.txt` report, not PDF. |
| Scheduled/email/cloud export | Removed | Incomplete scheduler, email/cloud placeholders, and background export command were removed in P4. |
| Personal site annotations | Implemented | Local user annotations only. They cannot alter score, suppress evidence, verify safety, or imply reputation. |
| Privacy-tool discovery | Implemented / optional | Optional `management` permission can show recognized installed extension names and enabled state. It cannot measure blocking effectiveness. |
| Cross-device feature sync | Removed | Obsolete/incomplete sync manager, UI, storage adapter, and claims were removed in P4. |
| Link destination prediction | Removed | URL-pattern hover score and tooltip were removed in P4. |
| Generated coaching goals | Removed | Coach/journey engines and generated goal UI were removed; the current Reports view replaces that product surface. |
| P2P transport | Experimental / opt-in | Versioned consent, separate connection/sharing choices, and validated aggregate sample shape. Peer identity, authenticity, representativeness, and reputation integrity are not established. |
| Peer domain reputation | Removed | Domain-label reputation request/response behavior was removed in P3/P4. |
| Clear All Data | Implemented | Typed confirmation clears extension-controlled local/session/sync storage, alarms, badge state, active peer session, and supported optional permissions. Cannot recall exports or externally processed data. |
| Required permissions | Implemented boundary | `webRequest`, `storage`, `tabs`, and `alarms`; HTTP(S) host access only. Broad HTTP(S) access remains a material prototype risk. |
| Optional permissions | Implemented boundary | `management` and `notifications`; neither is granted or enabled by default. |
| Build CI | Implemented | Exact source-head checkout, frozen install, lockfile equality, tests, type-check, lint, build, ZIP, and evidence artifacts. |
| Curated detector evidence | Implemented P5 gate | Versioned corpus, generated exact/subdomain coverage for the source catalog, reviewed explicit negative/storage cases, confusion matrix, and machine-readable report. It is regression evidence—not real-web accuracy. |
| Security gate | Implemented P5 gate | Checks source/package invariants, permission boundary, remote executable code, request-body paths, credential diagnostics, outbound calls, retired features, and stale tests. Not an independent audit. |
| Dependency gate | Implemented P5 gate | Production dependency inventory and registry advisory audit. Advisory data is time-dependent and incomplete. |
| Performance gate | Implemented P5 gate | Package-size and deterministic matcher/evidence-qualification/sanitization ceilings plus isolated browser timing ceilings. Not real-device or real-site performance validation. |
| Accessibility gate | Implemented bounded P5 contract | Popup language, accessible names, labels, duplicate IDs, landmarks, focusability, and Chrome accessibility-tree checks. Not WCAG certification or assistive-technology review. |
| Browser lifecycle gate | Implemented P5 harness | Isolated Chrome for Testing fixture covers worker startup, attribution/storage, popup, alarms, timing, and browser-restart local/session behavior. Not multi-day or full-platform QA. |
| Release evidence | Implemented P5 generator | Records exact commit, versions, tests, reports, dependency status, manifest, unpacked tree hash, ZIP SHA-256, and unresolved manual gates. Stable release remains blocked. |
| GDPR/CCPA/WCAG compliance | Not assessed | No legal or independent compliance review. No compliance claim is authorized. |
| Production readiness | Not established | Independent security/privacy review, human accessibility, real-site accuracy, long-duration lifecycle, provider review, external-copy audit, public integration, and owner approval remain incomplete. |

## P0 — Truthfulness baseline

**Implementation:** Complete on `agent/p0-truthfulness-baseline`.  
**PR:** #1 remains draft.  
**Closure:** Blocked.

P0 corrected product status, version/license, tracker count, unsupported
compliance/performance/accuracy claims, fabricated blocker/peer metrics, defaults,
visible wording, and documentation. It established deterministic build evidence
and bounded Chromium runtime evidence.

P0 remains open because the default branch and authenticated external surfaces
have not completed their human review, publication, and post-publication audit.

## P1 — Detection and attribution

**Implementation:** Complete on `agent/p1-detection-attribution`.  
**PR:** #2 remains stacked and draft.

P1 introduced event schema v2, page/resource separation, browser metadata,
party/attribution basis and confidence, detector evidence, storage migration,
deduplication, false-positive controls, and attribution-aware consumers and
exports.

Known limits include approximate site-key logic, missing browser context,
iframes, redirects, CNAME cloaking, catalog ownership, and remaining heuristic
false positives/negatives.

## P2 — Evidence-based scoring

**Implementation:** Complete on `agent/p2-evidence-based-scoring`.  
**PR:** #3 remains stacked and draft.

P2 added a true insufficient-evidence/N/A state, published evidence-unit formula,
confidence weighting, bounded recurrence, explicit exclusions, and nullable
score handling across badge, reports, trends, comparisons, exports, AI, and P2P.

The formula remains experimental and independently uncalibrated.

## P3 — Data protection

**Implementation:** Complete on `agent/p3-data-protection`.  
**PR:** #4 remains stacked and draft.

P3 added pre-persistence URL/text minimization, origin-only default, shorter
retention, credential separation, outbound previews, versioned P2P consent,
permission minimization, storage inventory, complete deletion, fixtures, package
checks, and exact-artifact Chromium evidence.

Minimization does not provide anonymity or secure a compromised profile.

## P4 — Functionality integrity

**Implementation:** Complete on `agent/p4-functionality-integrity`.  
**PR:** #5 remains stacked and draft.

P4 finished the local Evidence Explorer, explicit aggregate OpenRouter action,
daily/weekly reports, optional notifications, and truthful keyboard commands.
It removed incomplete sync, scheduled export, background export, generic AI chat,
link prediction, generated coaching, and peer domain reputation.

Live provider behavior, OS notification delivery, and long-duration alarm
behavior remain later review gates.

## P5 — Evidence and release discipline

**Implementation:** In progress on `agent/p5-evidence-release-discipline`.  
**PR:** #6 remains stacked and draft.  
**Stable release:** Blocked.

P5 adds:

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

P5 automation must not be described as real-world accuracy, accessibility
certification, penetration testing, production performance, privacy protection,
or legal compliance.

Final P5 run IDs, hashes, assertion counts, measurements, and limitations are
recorded in `P5-RUNTIME-EVIDENCE.md` only after the final exact source head passes
all automated gates.

## Blocking release gates

The authoritative machine-readable list is
`release/manual-gates.v1.json`. Current blockers include:

1. Review and publish P0–P5 in dependency order, then verify public `main`.
2. Human review of the actual browser-action popup in normal unmanaged Chrome.
3. Keyboard, screen-reader, zoom, contrast, focus, reduced-motion, and cognitive
   accessibility review.
4. Multi-day worker, retention, report, alarm, and notification lifecycle review.
5. Labeled real-site false-positive/false-negative assessment.
6. Live OpenRouter provider/routing/retention/cost/failure review.
7. Real P2P exchange and abuse/authenticity/metadata review.
8. Independent extension-security and privacy assessment.
9. Authenticated GitHub Release/Tag, Chrome Web Store, demo, submission, video,
   download, portfolio, and social-copy audit.
10. Qualified legal review before any compliance claim or regulated use.
11. Final owner approval of exact artifact hash, notes, limitations, known
    issues, and rollback/withdrawal plan.

Until these gates are resolved, Phantom Trail must remain labeled experimental
and must not be described as stable or production-ready.

## Authoritative documents

- [README](../README.md)
- [Installation](../INSTALL.md)
- [Privacy and Data Disclosure](PRIVACY_POLICY.md)
- [Security Policy](../SECURITY.md)
- [Threat Model](THREAT-MODEL.md)
- [P5 Evidence and Release Discipline](P5-EVIDENCE-AND-RELEASE.md)
- [Release Checklist](RELEASE-CHECKLIST.md)
- [Changelog](../CHANGELOG.md)
