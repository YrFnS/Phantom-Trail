# P5 Runtime, Evidence, and Publication Record

**Evidence date:** August 11, 2026  
**Product version:** 0.1.0  
**Status:** Automated P5 gate passed; stable release blocked  
**Final P5 source head:** `a1dccabaf758ed15c619de08dc2e20e9322e559a`  
**Published source merge:** `24b833501c8dfccefd92563990b6c35e5d7bfd6f`

## Scope

This document records the final automated P5 evidence generated from the exact
production source head before publication. It is a regression and provenance
record, not a statement that Phantom Trail is accurate, secure, private,
accessible, compliant, or production-ready.

The P5 source head includes the final P4 validation fixes as real merge parents.
The published `main` merge uses the same implementation tree:

`bc9511a02ab56c2598814f06a40ebc140e236219`

## GitHub Actions run

Final P5 Validate run:

- workflow run number: **647**
- workflow run ID: `31533912328`
- source commit: `a1dccabaf758ed15c619de08dc2e20e9322e559a`
- expected source commit: `a1dccabaf758ed15c619de08dc2e20e9322e559a`
- working tree: clean
- result: both jobs succeeded

Passed workflow stages:

- committed-lockfile regeneration and equality;
- frozen-lockfile dependency installation;
- unit and contract tests;
- curated detector regression corpus;
- TypeScript;
- ESLint;
- production Chrome build;
- extension ZIP generation;
- source and package security invariants;
- package and deterministic performance budgets;
- production dependency inventory and advisory gate;
- exact-artifact Chrome lifecycle and bounded accessibility contract;
- commit-bound release-evidence generation; and
- exact extension/evidence artifact upload.

## Uploaded evidence artifact

- artifact ID: `9118004170`
- artifact name:
  `phantom-trail-evidence-a1dccabaf758ed15c619de08dc2e20e9322e559a`
- GitHub artifact digest:
  `sha256:29db17fb60518efa6b06c6c5756de61693112702e889773165ac0017791fcb42`
- retention at creation: 14 days

The artifact contains the machine-readable reports, unpacked production
extension, and packaged extension ZIP from the same source head.

## Commit-bound release evidence

The generated release-evidence report recorded:

- automated status: `passed`
- release status: `blocked`
- product: `phantom-trail` 0.1.0
- license: MIT
- unresolved manual/independent gates at generation: 11

The stack-publication gate was unresolved at generation time. It was resolved
only after PRs #1–#6 were subsequently merged to `main`. The remaining human and
independent gates continue to block a stable release.

### Generated manifest

- Manifest V3
- name: `Phantom Trail`
- version: `0.1.0`
- required permissions:
  - `webRequest`
  - `storage`
  - `tabs`
  - `alarms`
- optional permissions:
  - `management`
  - `notifications`
- host access:
  - `http://*/*`
  - `https://*/*`
- commands:
  - `toggle-popup`
  - `quick-analysis`
- generated manifest SHA-256:
  `4ee3670bda9b61fe3546bdce4d7a3e66a2ac2c61697d183921638d9fe84bd076`

### Production artifact

- path: `.output/phantom-trail-0.1.0-chrome.zip`
- bytes: `449154`
- ZIP SHA-256:
  `014a214b95164987f35110aa7dfe84c99e84c045bd47b5561d9e239a6dcf84b7`
- unpacked file count: `21`
- unpacked bytes: `1364134`
- unpacked tree SHA-256:
  `626ef3413e94dfb7c4f275a4416d6e4b03c872061fc7c64f4051ecc36b802396`

## Unit and detector regression evidence

### Unit and contract tests

- tests: `51`
- passed: `51`
- failed: `0`
- skipped: `0`
- todo: `0`

The suite covers data minimization, attribution, event storage, scoring,
network-match policy, OpenRouter credential handling, outbound payloads, P2P
consent, and tracker matching.

### Curated detector corpus

- corpus version: `2026-08-11.1`
- corpus SHA-256:
  `254efe4d3bc9059603780a003baf216406b39e5a04fd068a5f773426f08f5efa`
- catalog domains: `56`
- generated catalog cases: `112`
- explicit reviewed cases: `29`
- total cases: `141`
- passed: `141`
- failed: `0`
- true positives: `129`
- false positives: `0`
- true negatives: `12`
- false negatives: `0`

The report calculates precision, recall, specificity, and accuracy as 1.0 on
this curated corpus. Those values apply only to the maintained fixture set.
They are not real-world tracker-detection rates, population estimates, coverage
claims, company-identity evidence, or privacy-impact measurements.

Catalog counts at this run:

- Analytics: 22
- Advertising: 14
- Social Media: 10
- Fingerprinting: 6
- Cryptomining: 4

## Chrome lifecycle and accessibility contract

The production extension was loaded into an isolated Chrome for Testing profile.

- Chrome version: `Google Chrome for Testing 151.0.7922.77`
- extension manifest digest:
  `4ee3670bda9b61fe3546bdce4d7a3e66a2ac2c61697d183921638d9fe84bd076`
- profile reused across controlled browser restart: yes
- assertions: `21`
- passed: `21`
- failed: `0`
- runtime exceptions: `0`
- actionable console errors/assert calls: `0`
- ignored teardown messages: `0`

Verified bounded behavior included:

- Phantom Trail service-worker startup;
- Manifest V3 and product version;
- optional `management` and `notifications` permissions off by default;
- cleanup, daily-snapshot, and weekly-report alarms;
- attributed page-to-resource detector event persistence;
- origin-only stored page and resource URLs;
- packaged popup rendering;
- expected Feed, Map, Stats, Explore, Reports, and Peers navigation;
- absence of retired AI and Coach navigation;
- document language, accessible names, labels, unique IDs, landmarks, and
  focusable primary controls;
- local-storage persistence across restart;
- session-storage clearing across restart;
- popup and detector-event timing budgets; and
- absence of runtime exceptions and actionable console failures.

Measured timings in the deterministic fixture:

- first attributed detector event: `186 ms`
- popup target ready: `167 ms`
- popup DOMContentLoaded: approximately `116.4 ms`
- popup load: approximately `116.6 ms`

The harness opens the packaged popup URL in an extension-page-equivalent target.
It does not replace a human toolbar-click review in normal unmanaged Chrome.
The accessibility checks are not WCAG certification or assistive-technology
validation.

## Security gate

- status: passed
- project-owned source files scanned: `197`
- source digest:
  `00444d03ee91aadc4a10389d56e690e97bffa44cedc8ede996b4c5d8f4c269fb`
- failures: `0`
- reviewed project-owned outbound call sites: one `fetch` in
  `lib/ai/client.ts`

The gate checked the permission/host boundary, request-body paths, dynamic
evaluation, externally connectable surfaces, remote executable-code patterns,
credential diagnostics, project-owned outbound calls, generated manifest/CSP,
retired P4 paths, and stale unexecuted tests.

A passing gate is not a penetration test, malicious-dependency analysis,
browser-vulnerability assessment, privacy audit, or security certification.

## Dependency evidence

- production dependency inventory: passed
- advisory command exit code: `0`
- critical advisories: `0`
- high advisories: `0`
- moderate advisories: `1`
- low advisories: `0`
- total reported advisories: `1`

Registry advisory data is time-dependent. A passing high/critical threshold does
not prove that all dependencies are safe or uncompromised.

## Performance and package budgets

All configured regression ceilings passed.

Package measurements:

- unpacked extension: `1364134 bytes`
- packaged ZIP: `449154 bytes`
- largest JavaScript asset: `449245 bytes`
- background worker: `93002 bytes`
- content script: `16557 bytes`

Deterministic throughput measurements:

- 100,000 tracker matches: `246.83 ms`
- 100,000 evidence qualifications: `109.95 ms`
- 25,000 event sanitizations: `677.08 ms`

These are measurements from one controlled CI environment. They are not
real-device CPU, memory, battery, network, page-load, or user-perceived
performance claims.

## Source publication

PRs #1–#6 were merged to `main` in dependency order after their recorded phase
gates passed. P5 was merged through commit:

`24b833501c8dfccefd92563990b6c35e5d7bfd6f`

That merge commit uses implementation tree:

`bc9511a02ab56c2598814f06a40ebc140e236219`

which is the same tree used by the final P5 source head.

Publishing the stack resolves the source-publication gate. It does not resolve
the remaining release gates.

## Remaining blockers

The authoritative list is `release/manual-gates.v1.json`. Stable release remains
blocked by:

- normal unmanaged Chrome human review;
- keyboard and assistive-technology review;
- multi-day lifecycle testing;
- labeled real-site false-positive/false-negative review;
- live OpenRouter provider and retention review;
- real P2P exchange and abuse/authenticity review;
- independent extension-security and privacy assessment;
- authenticated external-copy correction and audit;
- legal review before any compliance claim or regulated use; and
- final owner approval of the exact artifact, notes, limitations, and rollback
  plan.

The confirmed public external-copy blocker is the stale `v1.0.0` GitHub release,
which still contains retired production-ready and capability claims. Repository
issue #7 tracks the required withdrawal or rewrite.

## Conclusions allowed by this evidence

The final P5 source head installed, tested, built, packaged, passed its curated
regression corpus, passed the bounded security/dependency/performance gates,
completed the isolated Chrome lifecycle/accessibility fixture, and produced a
commit-bound evidence package.

## Conclusions not allowed

This record does not establish:

- real-world detector precision, recall, or coverage;
- absence of false positives or false negatives;
- website privacy, safety, ownership, collection, sharing, or sale;
- anonymity or complete sensitive-data removal;
- WCAG conformance;
- penetration-test or independent-security success;
- low real-device CPU, memory, battery, or page impact;
- live OpenRouter or P2P safety, retention, authenticity, or availability;
- GDPR, CCPA, or other legal compliance; or
- stable or production-ready release status.
