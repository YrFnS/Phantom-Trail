# P1 Detection and Attribution

**Status:** In progress — source/build slice implemented; Chromium runtime gate pending  
**Branch:** `agent/p1-detection-attribution`  
**Stacked base:** `agent/p0-truthfulness-baseline`  
**Started:** August 10, 2026

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

## False-positive controls in this slice

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

- [x] Build and package the current source slice.
- [x] Exercise pure first-party, third-party, main-frame, fallback-attribution,
  legacy-migration, tracker-rule, network-policy, duplicate, and event-cap
  fixtures.
- [ ] Exercise the exact artifact in Chromium with network, DOM-resource,
  API-threshold, migration, duplicate, graph, feed, and export assertions.
- [ ] Record runtime false-positive and false-negative limitations.

## Automated source/build evidence

GitHub Actions **Validate run #208** completed successfully on source head:

`60b95bd995f7d502d0ba65dc1e76a2ac68b4d2cb`

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

- name: `phantom-trail-chrome-0c7243c594dceef4c304a234d144913fb99a98bb`
- GitHub artifact ID: `9079556186`
- artifact SHA-256: `c287fc7fd344ddbd43e3f12b11f59234ef724b002cc604112a39c31cd15519a3`
- packaged extension ZIP SHA-256:
  `7d5cbcf50f5a9dd5092c68c4a0eaf56396728965bff04d5a1165081071ead6e1`

The generated manifest reports:

- Manifest V3;
- name `Phantom Trail`;
- version `0.1.0`; and
- description `Experimental Chrome extension for inspecting possible
  web-tracking signals`.

The built background, content-script, and popup bundles contain the explicit
`pageDomain`, `resourceDomain`, `attributionBasis`, `partyBasis`, and detector
evidence paths. This confirms packaging, not runtime correctness.

## Known limitations after this slice

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

P1 can be marked complete only when:

- all new events use schema v2;
- legacy rows migrate without invented page context;
- page and resource domains remain distinct through storage, UI, graph, pattern,
  analysis, and export paths;
- first-party and broad-rule false-positive fixtures pass;
- duplicate aggregation is tested;
- type-check, lint, unit fixtures, production build, and package validation pass;
- a real Chromium run confirms the stored context and visible route labels; and
- the PR records remaining known attribution limitations.

The source/build slice satisfies the first six gates. P1 remains **IN PROGRESS**
until exact-artifact Chromium evidence is recorded.
