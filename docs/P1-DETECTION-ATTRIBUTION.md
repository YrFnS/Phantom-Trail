# P1 Detection and Attribution

**Status:** In progress  
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

The deduplication key includes page, resource, source, request type, detector,
rule, and in-page method. Identical resources observed on different pages do not
collapse into one event.

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
- [ ] Add pure attribution and tracker-match modules.
- [ ] Add focused Node fixtures to CI.

### P1.1 — Network attribution

- [ ] Resolve page and resource context from Chrome request metadata.
- [ ] Store request type, method, initiator, tab, frame, and request IDs.
- [ ] Exclude first-party and unattributed low-confidence broad matches.

### P1.2 — In-page and DOM attribution

- [ ] Attach page context, detector evidence, and confidence.
- [ ] Attribute DOM script/iframe resource URLs separately from the page.
- [ ] Stop storing unsupported user-interaction-only signals.

### P1.3 — Storage and consumers

- [ ] Migrate legacy rows conservatively.
- [ ] Aggregate short-window duplicates.
- [ ] Update page filters, graph construction, pattern grouping, feed cards, and
  exports to use explicit fields.

### P1.4 — Runtime evidence

- [ ] Build the final branch artifact.
- [ ] Exercise first-party, third-party, main-frame, DOM-resource, API-threshold,
  legacy-migration, and duplicate fixtures.
- [ ] Record false-positive and false-negative limitations.

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
  and export paths;
- first-party and broad-rule false-positive fixtures pass;
- duplicate aggregation is tested;
- type-check, lint, unit fixtures, production build, and package validation pass;
- a real Chromium run confirms the stored context and visible route labels; and
- the PR records remaining known attribution limitations.
