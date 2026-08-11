# 👻 Phantom Trail

> **Experimental prototype — version 0.1.0**
>
> Phantom Trail is not a tracker blocker, security scanner, privacy
> certification, legal-compliance tool, anonymity product, or production-ready
> release.

Phantom Trail is a Manifest V3 Chrome extension prototype for inspecting
**possible web-tracking signals**. It records bounded request and browser-API
rule matches, separates visited-page and resource attribution, stores minimized
local evidence, and exposes cautious local summaries.

A detector signal can be wrong. It does **not** prove that a company collected,
retained, shared, sold, or intentionally used personal data.

## Current product surface

The current stacked P0–P5 implementation contains:

- a WXT/React popup with **Feed, Map, Stats, Explore, Reports, and Peers** views;
- a manually maintained catalog of **56 domains across five source categories**;
- explicit page/resource attribution, first/third-party classification,
  detector identity, evidence, and confidence;
- duplicate aggregation with occurrence and first/last-seen timestamps;
- origin-only event URL retention by default, with queries, fragments,
  credentials, raw API arguments, and sensitive path details removed before
  persistence;
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
- an optional experimental P2P aggregate-sample exchange with versioned consent;
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
- generated coaching goals; and
- peer domain-reputation requests.

The historical export path named `pdf` still produces a clearly labeled
plain-text `.txt` file. Phantom Trail does not claim to generate PDF reports.

## Detection and scoring limits

### Detection

Network, DOM-resource, and selected browser-API rules can still produce false
positives or false negatives. Page attribution, site-key classification,
iframe context, CNAME cloaking, ownership, and tracker intent can remain
ambiguous.

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
redacted pathname. Query strings, fragments, URL credentials, raw detector
arguments, and identifier-like path segments are removed under the active
policy.

### OpenRouter

OpenRouter summaries are off by default and require:

1. explicit enablement;
2. a configured credential; and
3. a direct summary action.

The default outbound mode contains aggregate counts only. An optional mode can
include up to five resource-domain labels. Page URLs, resource URLs, paths,
queries, fragments, descriptions, detector-evidence strings, raw events,
personal annotations, storage keys, and the credential are excluded.

### P2P

The experimental peer network is off by default. Connection and local aggregate
sharing are separate choices under versioned consent. Peer identity, sample
authenticity, representativeness, and reputation integrity are not established.
WebRTC and supporting infrastructure can expose ordinary connection metadata.

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

## P5 evidence and release discipline

P5 adds machine-readable regression evidence for:

- the curated detector corpus and catalog drift;
- unit and contract tests;
- exact-head build and package integrity;
- source/package security invariants;
- production dependency advisories and inventory;
- deterministic package-size and throughput budgets;
- an isolated Chrome lifecycle and popup accessibility contract; and
- commit-bound artifact hashes and release evidence.

These checks are bounded regression gates. They are **not** real-world detection
accuracy, WCAG certification, penetration testing, production performance,
privacy protection, or legal compliance.

A stable release remains blocked by the human and independent gates in:

- [P5 Evidence and Release Discipline](docs/P5-EVIDENCE-AND-RELEASE.md)
- [Release Checklist](docs/RELEASE-CHECKLIST.md)
- `release/manual-gates.v1.json`

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

- **P0 — Truthfulness:** implementation complete on its draft branch; public
  publication and human/external-copy gates remain.
- **P1 — Detection and attribution:** implementation complete on its stacked
  draft branch.
- **P2 — Evidence scoring:** implementation complete on its stacked draft branch.
- **P3 — Data protection:** implementation complete on its stacked draft branch.
- **P4 — Functionality integrity:** implementation complete on its stacked draft
  branch.
- **P5 — Evidence and release discipline:** implementation and automated evidence
  are developed on the current stacked draft branch; stable release remains
  blocked until all required gates pass.

No phase may be treated as publicly released while the default branch and
external distribution surfaces still contain older claims or artifacts.

## Security and reporting

Review [SECURITY.md](SECURITY.md) before reporting a sensitive issue. Do not
include credentials, private browsing data, or a public weaponized proof of
concept.

For ordinary defects, open a repository issue with the exact commit, Chrome
version, reproduction steps, expected/actual behavior, console errors, and the
state of optional AI, P2P, notification, management, and badge features.

## License

Phantom Trail is licensed under the [MIT License](LICENSE).