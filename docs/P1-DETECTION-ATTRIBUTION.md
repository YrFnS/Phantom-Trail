# P1 Detection and Attribution

**Status:** Implementation complete on branch — stacked review/merge pending  
**Branch:** `agent/p1-detection-attribution`  
**Stacked base:** `agent/p0-truthfulness-baseline`  
**Started:** August 10, 2026  
**Implementation gate completed:** August 10, 2026

## Purpose

P0 stopped Phantom Trail from presenting experimental output as verified fact.
P1 changes the underlying event model so the extension no longer overloads one
`url`/`domain` pair for both the page being visited and the resource that matched
a detector rule.

P1 does not make detector output authoritative. It makes each event inspectable:
what page was active, what resource or API operation was observed, which rule
matched, why the page/resource relationship was classified, and how confident
the prototype is in those fields.

## Root problem

The pre-P1 event shape stores only:

- `url`
- `domain`
- category and severity labels
- a description

Network events use those fields for the requested resource. In-page events use
them for the visited page. Consumers then guess which meaning applies. This can
cause:

- third-party resources to disappear from current-page filters;
- resource domains to be treated as visited websites;
- graph edges to connect the wrong nodes;
- repeated-domain patterns to use the same hostname as both page and resource;
- domain heuristics to return no evidence or the wrong evidence; and
- duplicate requests to inflate storage and downstream penalties.

## Event schema v2

P1 retains the legacy `url` and `domain` aliases for compatibility, but every
new event carries explicit context.

### Context

- source: network request, DOM resource, in-page API, user interaction,
  extension-internal, or legacy;
- page URL and page domain;
- resource URL and resource domain when one exists;
- initiator;
- tab, frame, parent-frame, and request identifiers where available;
- request type and method;
- first-party, third-party, or unknown relationship;
- the basis and confidence for that relationship; and
- the basis and confidence for page attribution.

### Detector evidence

- stable detector ID;
- exact match type;
- rule or catalog entry;
- low, medium, or high detector confidence; and
- human-readable evidence strings.

### Occurrence aggregation

Equivalent events recorded in a short window are represented by one row with:

- `occurrences`;
- `firstSeenAt`; and
- `lastSeenAt`.

The deduplication key includes page, resource, source, request type, request
method, detector, rule, and in-page method. Identical resources observed on
different pages do not collapse into one event.

## Attribution rules

Network page context is resolved in this order:

1. the request itself for a main-frame navigation;
2. `documentUrl`;
3. `initiator`;
4. the current tab URL; and
5. unknown when no HTTP(S) page context is available.

The event records which source was used. `documentUrl` and main-frame context
are marked high confidence; initiator/tab fallbacks are medium; missing or
legacy attribution is low.

Party classification uses exact hosts, direct parent/child subdomains, and a
disclosed approximate site-key heuristic for sibling subdomains. It is not a
full Public Suffix List implementation. The basis and confidence are retained
on every event so consumers do not have to treat the label as certain.

## False-positive controls

- main-frame and attributed first-party network matches are not stored as
  third-party tracking evidence;
- low-confidence path and hostname rules are not stored without page context;
- UTM, `fbclid`, and `gclid` parameters alone no longer create detector events;
- broad path rules require complete path segments rather than arbitrary
  substrings;
- non-HTTP(S) extension resources remain excluded;
- the DOM `analytics` token rule is limited to attributed third-party resources;
- mouse movement and form-input hooks are no longer stored as detector events
  because they observe the user's own interaction without identifying observing
  page code; and
- legacy rows migrate without inventing page attribution.

## Work breakdown

### P1.0 — Contract and fixtures

- [x] Define schema v2 and attribution invariants.
- [x] Add pure attribution, tracker-match, network-storage, and event-merge
  policy modules.
- [x] Add focused Node fixtures to CI.

### P1.1 — Network attribution

- [x] Resolve page and resource context from Chrome request metadata.
- [x] Store request type, method, initiator, tab, frame, parent-frame, and
  request IDs where Chrome provides them.
- [x] Exclude first-party and unattributed low-confidence broad matches.
- [x] Stop requesting request bodies from the `webRequest` listener.

### P1.2 — In-page and DOM attribution

- [x] Attach page context, detector evidence, and confidence.
- [x] Attribute DOM script/iframe resource URLs separately from the page.
- [x] Stop storing unsupported mouse/form interaction-only signals.

### P1.3 — Storage and consumers

- [x] Migrate legacy rows conservatively.
- [x] Aggregate short-window duplicates without merging identical resources
  across different pages.
- [x] Update active-page filters, graph construction, repeated-domain patterns,
  feed cards, exports, historical link estimates, page-risk summaries, local
  website summaries, and resource-domain summaries to use explicit fields.
- [x] Keep compatibility `url` and `domain` aliases while marking schema v2 as
  authoritative for new consumers.

### P1.4 — Runtime evidence

- [x] Build and package the source slice.
- [x] Exercise pure first-party, third-party, main-frame, fallback-attribution,
  legacy-migration, tracker-rule, network-policy, duplicate, and event-cap
  fixtures.
- [x] Exercise the exact artifact in Chromium with network, DOM-resource,
  API-threshold, migration, duplicate, graph, feed, action-popup, and export
  assertions.
- [x] Record runtime false-positive and false-negative limitations.

## Automated source/build evidence

GitHub Actions **Validate run #210** completed successfully on tested head:

`02a4f5fa56dbd558135271bc491a3c36c4531e0c`

Passed gates:

- committed-lockfile regeneration and equality check;
- frozen-lockfile dependency installation;
- 24 attribution and false-positive-control fixtures;
- TypeScript type checking;
- ESLint;
- production Chrome build;
- generated Manifest V3 name/version validation;
- ZIP creation; and
- unpacked-extension and ZIP artifact upload.

Artifact:

- name: `phantom-trail-chrome-4ac3c87af39ba487a0fc0a1b172df27c79e20bc7`
- GitHub artifact ID: `9079628500`
- artifact SHA-256:
  `6243adf3e9e4050968cab2bd84a0d863e2e90fed37f372e250b69d50e2ce843d`

The generated manifest reports:

- Manifest V3;
- name `Phantom Trail`;
- version `0.1.0`; and
- description `Experimental Chrome extension for inspecting possible
  web-tracking signals`.

The built background, content-script, and popup bundles contain the explicit
`pageDomain`, `resourceDomain`, `attributionBasis`, `partyBasis`, and detector
evidence paths.

## Exact-artifact Chromium evidence

The run #210 artifact was loaded in Chromium `144.0.7559.96` with an isolated
profile and deterministic local page/resource fixtures.

The final fixture completed with:

- 33 assertions passed;
- 0 assertions failed;
- 0 page/runtime errors;
- 13 final storage rows;
- 14 aggregated occurrences; and
- a successfully opened browser-action popup target.

Verified runtime behavior included:

- schema-v2 migration without invented page context;
- zero rows on a no-signal control page;
- explicit `page.test` → resource routes;
- first-party network-rule suppression;
- query-parameter-only suppression;
- high-confidence catalog evidence;
- low-confidence attributed path evidence;
- separate DOM-resource attribution;
- duplicate occurrence aggregation;
- mouse/form interaction-only suppression;
- separate routes for the same resource across `page.test` and `other.test`;
- active-page filtering in the popup;
- visible route, evidence, basis, and confidence metadata;
- page/resource graph nodes and inferred links; and
- schema-v2 CSV, JSON, and plain-text exports.

Full evidence, hashes, fixture scope, and limitations are recorded in
[P1-RUNTIME-EVIDENCE.md](P1-RUNTIME-EVIDENCE.md).

## Known limitations

- party classification uses an approximate site-key heuristic, not a complete
  Public Suffix List;
- CNAME-cloaked trackers are not resolved;
- `initiator` and tab-URL fallbacks can be incomplete or stale;
- iframe attribution can still be ambiguous when Chrome omits document context;
- catalog ownership labels remain maintained metadata, not independently
  verified identity;
- DOM and API threshold rules can still produce false positives;
- first-party resources can still perform tracking even though P1 deliberately
  does not store first-party URL-pattern matches as third-party evidence;
- low-confidence attributed third-party heuristics are retained for inspection,
  not treated as confirmed trackers;
- the current A–F formula still counts stored rows and remains P2 work; and
- no detector accuracy percentage is claimed.

## Non-goals

P1 does not:

- calibrate A–F scoring;
- prove data collection, retention, sharing, sale, ownership, or identity;
- establish a complete Public Suffix List or CNAME-uncloaking system;
- authenticate P2P data;
- complete OpenRouter chat, sync, notifications, or reports; or
- claim a detector accuracy percentage.

Those remain later phases.

## Completion gate

P1 requires:

- all new events to use schema v2;
- legacy rows to migrate without invented page context;
- page and resource domains to remain distinct through storage, UI, graph,
  pattern, analysis, and export paths;
- first-party and broad-rule false-positive fixtures to pass;
- duplicate aggregation to be tested;
- type-check, lint, unit fixtures, production build, and package validation to
  pass;
- a real Chromium run to confirm stored context and visible route labels; and
- remaining attribution limitations to be documented.

All P1 implementation gates are satisfied on this branch. P1 is therefore
**implementation complete**.

PR #2 remains a stacked draft because PR #1 and the P0 base remain under review.
This status does not authorize merging either pull request.
