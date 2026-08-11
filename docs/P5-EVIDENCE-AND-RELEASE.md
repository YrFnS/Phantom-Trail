# P5 — Evidence and Release Discipline

**Status:** In progress  
**Branch:** `agent/p5-evidence-release-discipline`  
**Base:** `agent/p4-functionality-integrity`

P5 does not turn Phantom Trail into a validated privacy product. It creates a
repeatable evidence system that makes unsupported release claims harder to
publish and makes regressions easier to detect.

## Objective

Every release candidate must produce reviewable evidence for:

1. detector-rule regression behavior;
2. extension lifecycle behavior in Chromium;
3. performance and package-size budgets;
4. a bounded accessibility contract;
5. security invariants and dependency review;
6. artifact provenance and release-copy consistency; and
7. explicit human and independent-review gates that automation cannot satisfy.

## Evidence classes

### A. Curated detector regression corpus

A versioned, human-readable corpus will contain labeled positive and negative
examples for maintained catalog, subdomain, path, and hostname-token rules.

The evaluation report will include:

- case count and corpus version;
- true positives, false positives, true negatives, and false negatives;
- precision, recall, specificity, and accuracy on the curated corpus;
- results by rule family and category; and
- every failed case with its expected and actual outcome.

Passing this corpus means the implementation matches reviewed examples. It is
**not** a measurement of real-world tracker-detection accuracy, population
coverage, company identity, data collection, or privacy impact.

### B. Browser lifecycle evidence

A built, unpacked artifact will be loaded into Chromium with an isolated
profile. The lifecycle harness will verify bounded behaviors such as:

- service-worker startup;
- content-script loading on HTTP(S) fixtures;
- detector-event persistence and page/resource attribution;
- popup rendering;
- report-alarm registration and report persistence;
- optional permissions defaulting off;
- session-only credential behavior across a browser restart where feasible;
- data deletion and retention behavior; and
- absence of retired P4 features.

The harness must emit machine-readable evidence and preserve console/runtime
errors. It does not replace long-duration, multi-browser, OS-notification, or
human usability testing.

### C. Performance and package budgets

P5 will record and gate:

- unpacked extension size;
- packaged ZIP size;
- largest JavaScript asset;
- background-worker bundle size;
- content-script bundle size;
- popup navigation timing in the deterministic fixture;
- bounded detector-classification throughput; and
- bounded evidence-score throughput.

Budgets are regression limits, not marketing claims. A passing budget does not
establish low CPU usage, low memory use, low battery impact, or negligible page
impact on real websites.

### D. Bounded accessibility contract

Automated checks will inspect the popup accessibility tree and DOM for:

- named interactive controls;
- labeled form controls;
- unique IDs;
- valid landmark/navigation structure;
- keyboard reachability of primary controls;
- visible focus treatment declared in the application CSS; and
- no serious runtime accessibility-contract failures in the deterministic
  fixture.

This is not a WCAG certification. Keyboard, screen-reader, zoom, contrast,
motion, localization, and cognitive-usability review still require humans and
broader tooling.

### E. Security and privacy invariants

P5 will add a repository security policy, threat model, and executable source
and package checks. At minimum, the gate will reject:

- remotely hosted executable code in project-owned extension pages;
- project-owned `eval` or `new Function` use;
- request-body collection;
- required optional-feature permissions;
- `<all_urls>` regressions;
- externally connectable extension surfaces without an approved policy;
- logging or exporting OpenRouter credentials;
- reintroduction of retired sync, scheduled-export, link-prediction, or peer
  reputation paths;
- unreviewed outbound `fetch` destinations in project-owned code; and
- release artifacts that do not match documented manifest metadata.

A passing automated gate is not an independent penetration test or security
certification.

### F. Release-candidate evidence manifest

Each candidate must produce a machine-readable manifest containing:

- source commit SHA;
- product version;
- generated manifest version and permissions;
- test and evidence-corpus summaries;
- performance-budget results;
- accessibility-contract results;
- security-gate results;
- artifact names, sizes, and SHA-256 hashes; and
- unresolved manual or independent-review gates.

The manifest and build artifact must be uploaded by CI from the same commit.

## Release blocking policy

A candidate must not be described as production-ready or published as a stable
release when any of the following is true:

- a required automated job failed or was skipped;
- the artifact was rebuilt outside the recorded workflow;
- release version metadata disagrees across package, WXT manifest, changelog,
  and release notes;
- unsupported capability, compliance, accuracy, security, performance, or
  privacy claims are present;
- a high or critical dependency advisory is unresolved without an explicit,
  reviewed exception;
- the human popup/accessibility review is incomplete;
- the authenticated external-copy audit is incomplete;
- the security/privacy review gate is incomplete; or
- P0–P4 remain unpublished draft dependencies.

## Human and independent gates

Automation cannot close these items:

- normal unmanaged Chrome review on supported desktop platforms;
- keyboard and assistive-technology review;
- review of real websites and labeled false-positive/false-negative reports;
- long-duration service-worker, retention, and alarm lifecycle testing;
- live OpenRouter provider behavior and third-party retention review;
- real P2P exchange, abuse, authenticity, and metadata review;
- independent extension-security and privacy assessment;
- legal review where compliance claims or regulated deployment are considered;
- authenticated Chrome Web Store, release, demo, and submission copy audit; and
- final owner approval of release notes and limitations.

## P5 completion gate

P5 implementation can be marked complete on its branch only when:

- the curated detector corpus and evaluator pass;
- browser lifecycle evidence passes on the exact CI artifact;
- package and performance budgets pass;
- accessibility-contract checks pass;
- security and dependency gates pass or document a truthful blocking finding;
- a release-candidate evidence manifest is generated from the same source head;
- stale tests and files for removed P4 features are deleted or converted into
  explicit absence regressions;
- the project status, security policy, threat model, release checklist, and
  changelog are current; and
- the pull request records exact hashes, scope, failures encountered, fixes,
  and remaining human or independent-review gates.

The P5 pull request must remain draft while P0–P4 remain draft. P5 does not
authorize merging any pull request in the stack.