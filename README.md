# 👻 Phantom Trail

> **Experimental prototype — version 0.1.0**
>
> The P0–P5 remediation stack is published on `main`, but Phantom Trail is not
> a stable or production-ready release. It is not a tracker blocker, security
> scanner, privacy certification, anonymity product, or legal-compliance tool.

Phantom Trail is a Manifest V3 Chrome extension prototype for inspecting
**possible web-tracking signals**. It records bounded network-request and
isolated-world DOM-resource rule matches, separates visited-page and resource
attribution, stores minimized local evidence, and exposes cautious local
summaries.

A detector signal can be wrong. It does **not** prove that a company collected,
retained, shared, sold, or intentionally used personal data.

## Published source status

The six remediation pull requests were merged to `main` in dependency order on
August 11, 2026:

- P0 — truthful experimental baseline;
- P1 — explicit page/resource attribution;
- P2 — evidence-qualified scoring with a real N/A state;
- P3 — storage minimization, retention, permissions, and deletion;
- P4 — functionality integrity and removal of incomplete workflows; and
- P5 — detector, browser, security, dependency, performance, accessibility,
  provenance, and release gates.

The final P5 implementation tree passed GitHub Actions Validate run **#647** on
source head `a1dccabaf758ed15c619de08dc2e20e9322e559a`. The same implementation
tree was then published through merge commit
`24b833501c8dfccefd92563990b6c35e5d7bfd6f`.

Source publication corrects the default branch. It does not close the human,
independent-review, external-copy, provider, real-site, long-duration, legal, or
final-owner release gates.

## Current product surface

The published implementation contains:

- a WXT/React popup with **Feed, Map, Stats, Explore, Reports, and Peers** views;
- a manually maintained catalog of **56 domains across five source categories**;
- explicit page/resource attribution, Public Suffix List-backed first/third-
  party classification, detector identity, evidence, and confidence;
- duplicate aggregation with occurrence and first/last-seen timestamps;
- origin-only event URL retention by default, with queries, fragments,
  credentials, legacy raw detector details, and sensitive path details removed
  before persistence;
- a seven-day default event-retention policy and a 1,000-row cap;
- an evidence index with a real **N/A / insufficient-evidence** state rather than
  invented favorable defaults;
- deterministic local Evidence Explorer queries;
- explicit optional OpenRouter aggregate summaries using a separately stored
  credential and bounded outbound payload;
- local daily snapshots and weekly evidence aggregations;
- optional, permission-gated evidence notifications;
- manual CSV, JSON, and plain-text exports;
- personal site annotations that do not alter detection or scores;
- an optional experimental P2P aggregate-sample exchange with versioned
  consent, strict bounded parsing, freshness checks, peer caps, and throttling;
- an opt-in toolbar evidence badge; and
- a visible typed-confirmation **Clear All Data** workflow.

See [Project Status](docs/PROJECT_STATUS.md) for the implementation matrix and
phase boundaries.

## Removed or unavailable functionality

P4 removed incomplete or misleading workflows rather than continuing to expose
non-working controls:

- cross-device sync;
- scheduled export;
- email and cloud delivery;
- background export shortcut;
- generic AI chat or arbitrary-question routing;
- link-destination prediction;
- generated coaching goals;
- peer domain-reputation requests;
- page-world browser-API monkey-patching and its forgeable DOM event bridge; and
- webpage-posted P2P discovery messages.

The historical export path named `pdf` still produces a clearly labeled
plain-text `.txt` file. Phantom Trail does not claim to generate PDF reports.

## Post-P5 trust-boundary hardening

The current source further narrows two high-risk boundaries:

- party classification uses the maintained Public Suffix List rather than a
  hand-written suffix table; and
- page-world detector injection, native browser-API monkey-patching, and
  webpage-posted P2P discovery were removed because page code is untrusted.

The P2P sample path now accepts only a fresh, bounded canonical aggregate and
limits how frequently accepted peers can update community state. These changes
reduce false attribution, forged local evidence, page interference, and peer
sample poisoning. They do not make the detector model accurate or P2P peers
trusted.

## Detection and scoring limits

### Detection

Network and isolated-world DOM-resource rules can still produce false
positives or false negatives. Page attribution, Public-Suffix-List-based site
classification, iframe context, CNAME cloaking, ownership, and tracker intent
can remain ambiguous.

The former injected main-world API instrumentation was removed because page
scripts could forge its event bridge and native API wrappers could change page
behavior. The current build does not claim canvas, audio, WebGL, WebRTC, font,
battery, sensor, mouse, or form-monitoring detection.

The tracker catalog is source data, not proof that every request to a listed
root domain is tracking. P1 reduces broad matches and interaction-only signals,
but does not establish real-world detector accuracy.

### Evidence index

The index summarizes qualifying recorded evidence units. It uses detector,
attribution, party, source, severity, and bounded recurrence factors.

- **N/A** means insufficient score-qualified evidence.
- N/A is not favorable and does not show that tracking was absent.
- An A band or green badge does not show that a site is safe or private.
- The model has not been independently calibrated or validated as a privacy
  rating.

## Data and privacy

### Local storage

Stored detector events can contain origins, domains, timestamps, attribution,
request metadata, category/severity labels, and minimized detector evidence.
Origins and timing can still reveal browsing patterns.

Default event URL handling keeps origins only. The optional path mode retains a
redacted pathname. Query strings, fragments, URL credentials, legacy raw
detector arguments, and identifier-like path segments are removed under the
active policy. The active build does not inject page-world API wrappers.

### OpenRouter

OpenRouter summaries are off by default and require:

1. explicit enablement;
2. a configured credential; and
3. a direct summary action.

The default outbound mode contains aggregate counts only. An optional mode can
include up to five resource-domain labels. Page URLs, resource URLs, paths,
queries, fragments, descriptions, detector-evidence strings, raw events,
personal annotations, storage keys, and the credential are excluded.

OpenRouter and any routed model provider operate under their own account,
retention, pricing, routing, and privacy policies. Live provider behavior is
not validated by the default automated suite.

### P2P

The experimental peer network is off by default. Connection and local aggregate
sharing are separate choices under versioned consent. Inbound samples are
strictly type-, size-, range-, grade-, freshness-, and shape-checked; accepted
peers are capped and throttled. These controls do not establish peer identity,
sample authenticity, representativeness, or reputation integrity. WebRTC and
supporting infrastructure can expose ordinary connection metadata.

Read [Privacy and Data Disclosure](docs/PRIVACY_POLICY.md) and
[Threat Model](docs/THREAT-MODEL.md) before enabling optional external flows.

## Permissions

Required install-time permissions:

```text
webRequest
storage
tabs
alarms
```

Required host access:

```text
http://*/*
https://*/*
```

Optional permissions, requested only through visible user actions:

```text
management
notifications
```

HTTP(S) host access remains broad because continuous request attribution is a
core part of the prototype. This increases the impact of extension defects.

## Build from source

Prerequisites:

- Node.js 22;
- `pnpm` at the version pinned in `package.json`; and
- a current supported Chrome or Chromium-based browser.

```bash
git clone https://github.com/YrFnS/Phantom-Trail.git
cd Phantom-Trail
pnpm install --frozen-lockfile
pnpm test
pnpm evidence:detectors
pnpm type-check
pnpm lint
pnpm build
pnpm zip
pnpm evidence:security
pnpm evidence:performance
```

Then load `.output/chrome-mv3` from `chrome://extensions/` using **Load
unpacked**. Detailed instructions are in [INSTALL.md](INSTALL.md).

## Automated evidence

The validation workflow produces machine-readable evidence for:

- committed-lockfile equality and frozen installation;
- unit and contract tests;
- the versioned curated detector corpus and catalog drift;
- exact-head build and package integrity;
- source/package security invariants;
- production dependency advisories and inventory;
- deterministic package-size and throughput budgets;
- isolated Chrome lifecycle and restart behavior;
- a bounded popup DOM/accessibility-tree contract; and
- commit-bound artifact hashes and release evidence.

The original P5 publication run recorded:

- 51 passing unit/contract tests;
- 141 of 141 passing curated detector cases;
- 21 of 21 passing Chrome lifecycle/accessibility assertions;
- zero high or critical production dependency advisories at that run;
- passing source/package security and performance budgets; and
- a release status of `blocked` because manual and independent gates remain.

Those figures are a historical P5 baseline, not the current candidate's test
count. Exact-commit CI evidence is authoritative for later changes. All of these
checks remain bounded regression evidence; they are **not** real-world detection
accuracy, WCAG certification, penetration testing, production performance,
privacy protection, or legal compliance.

Detailed final evidence is in
[P5 Runtime Evidence](docs/P5-RUNTIME-EVIDENCE.md).

## Stable-release blockers

A stable release remains blocked by the unresolved gates in:

- [P5 Evidence and Release Discipline](docs/P5-EVIDENCE-AND-RELEASE.md)
- [Release Checklist](docs/RELEASE-CHECKLIST.md)
- `release/manual-gates.v1.json`

The public historical `v1.0.0` GitHub release also contains retired
production-ready and capability claims. It must be withdrawn or rewritten before
stable publication; the tracked repository blocker is issue #7.

## Development commands

```bash
pnpm dev
pnpm test
pnpm evidence:detectors
pnpm type-check
pnpm lint
pnpm build
pnpm zip
pnpm evidence:security
pnpm evidence:performance
pnpm evidence:dependencies
pnpm evidence:browser
pnpm evidence:release
pnpm validate
```

## Phase status

- **P0 — Truthfulness:** source implementation published on `main`.
- **P1 — Detection and attribution:** source implementation published on `main`.
- **P2 — Evidence scoring:** source implementation published on `main`.
- **P3 — Data protection:** source implementation published on `main`.
- **P4 — Functionality integrity:** source implementation published on `main`.
- **P5 — Evidence and release discipline:** source implementation and automated
  evidence published on `main`.

The source phases are published. Phantom Trail itself remains an experimental
prototype until the separate human and independent stable-release gates are
resolved.

## Security and reporting

Review [SECURITY.md](SECURITY.md) before reporting a sensitive issue. Do not
include credentials, private browsing data, or a public weaponized proof of
concept.

For ordinary defects, open a repository issue with the exact commit, Chrome
version, reproduction steps, expected/actual behavior, console errors, and the
state of optional AI, P2P, notification, management, and badge features.

## License

Phantom Trail is licensed under the [MIT License](LICENSE).
