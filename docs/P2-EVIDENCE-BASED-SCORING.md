# P2 Evidence-Based Scoring

**Status:** Implementation complete on branch; stacked PR remains draft  
**Branch:** `agent/p2-evidence-based-scoring`  
**Stacked base:** `agent/p1-detection-attribution`  
**Started:** August 11, 2026  
**Runtime evidence:** [P2-RUNTIME-EVIDENCE.md](P2-RUNTIME-EVIDENCE.md)

## Purpose

P0 made Phantom Trail honest about its experimental status. P1 separated the
visited page from the matched resource and attached attribution and detector
confidence. P2 replaces the original row-count penalty formula with a published,
evidence-qualified model.

The P2 result is an **experimental observed-evidence index**, not a measurement
of a website's total privacy, safety, legal compliance, ownership, intent, or
actual data handling.

## Problems removed from the pre-P2 formula

The former calculation:

- returned a number when no usable evidence existed;
- started at 100 and could present missing observations as a favorable grade;
- penalized every stored row, allowing refreshes and repeated requests to
  dominate the result;
- added an HTTPS bonus unrelated to observed third-party evidence;
- added a global more-than-ten-rows penalty;
- added a simplified domain-group penalty;
- treated all detector and attribution confidence levels as equal; and
- exposed independent dashboard formulas that disagreed with one another.

P2 removes those behaviors.

## Result states

### `insufficient-evidence`

No numeric value or letter band is produced when the selected scope has no
qualifying evidence.

The result contains:

- `score: null`
- `grade: N/A`
- `color: gray`
- `confidence: none`
- exclusion counts and reasons

This state can mean detector coverage was incomplete, no qualifying signal
fired, attribution was missing, or only excluded low-quality signals were
present. It does **not** mean the page is private or safe.

### `estimated`

A numeric value and model band are produced only when at least one qualifying
evidence unit exists. Every estimate carries low, medium, or high **evidence
coverage confidence**.

Coverage confidence describes the amount and quality of recorded evidence. It
is not a detector-accuracy percentage.

## Qualifying evidence

A row can influence the index only when:

- it is a schema-v2 event rather than a legacy row;
- its page attribution is medium or high confidence;
- its detector confidence is medium or high;
- its source is a network request, DOM resource, or main-world API signal;
- network and DOM resources are explicitly classified as third-party; and
- a page-specific scope matches the event's attributed page domain.

Excluded rows remain visible in the feed, analysis, storage, and exports. P2
reports exclusion counts instead of silently converting weak evidence into a
number.

## Evidence units

P2 does not charge once per request row.

- Network and DOM evidence is grouped by attributed page and unique resource
  domain.
- Main-world API evidence is grouped by attributed page and detector family.
- Repeated equivalent observations use the P1 occurrence count and a bounded
  recurrence factor.
- Within one evidence unit, the strongest detector contribution counts in full.
- Additional distinct detector contributions in the same unit count at 30%.
- Every evidence unit has a 22-point penalty cap.

Unique parties and distinct evidence therefore matter more than refresh or
request volume.

## Published formula

### Base severity weights

| Prototype severity label | Base penalty |
| --- | ---: |
| low | 4 |
| medium | 8 |
| high | 14 |
| critical | 22 |

### Confidence and source factors

Each distinct detector contribution is:

`base severity × detector confidence × attribution confidence × party confidence × source factor × bounded recurrence`

Detector confidence:

- high: `1.00`
- medium: `0.65`
- low: excluded

Attribution confidence:

- high: `1.00`
- medium: `0.75`
- low: excluded

Party confidence for network and DOM routes:

- high: `1.00`
- medium: `0.80`
- low: excluded

Source factor:

- network request: `1.00`
- DOM resource: `0.85`
- main-world API threshold: `0.80`

Bounded recurrence:

`1 + min(log2(max(1, occurrences)), 2) × 0.10`

The recurrence factor never exceeds `1.20`.

Within one evidence unit:

- strongest contribution: `100%`
- remaining distinct contributions: `30%`
- unit cap: `22`

Final index:

`round(max(0, 100 - sum(unit penalties)))`

The model has no:

- HTTPS bonus;
- global row-count penalty;
- simplified domain-count adjustment;
- personal-annotation adjustment;
- P2P reputation adjustment;
- synthetic benchmark adjustment; or
- hidden category multiplier.

## Model bands

Bands are emitted only for an `estimated` result:

- A: 90–100
- B: 80–89
- C: 65–79
- D: 50–64
- F: 0–49

The interface calls these **model bands**, not verified privacy grades.

## Evidence coverage confidence

Coverage confidence uses qualifying evidence units and the share whose strongest
contribution has high detector and attribution confidence:

- high: at least four units and at least 75% high-quality units;
- medium: at least two units and at least 50% high-quality units;
- low: all other estimated results; and
- none: insufficient evidence.

This is a coverage label, not a probability or accuracy claim.

## Result breakdown

Every result records:

- selected scope and page domain;
- observed rows and aggregated occurrences;
- qualifying rows and occurrences;
- excluded rows by reason;
- unique third-party resource domains;
- page-local API evidence units;
- total and high-quality evidence units;
- raw and applied penalty;
- per-unit routes, detector IDs, rules, evidence, confidence, occurrences, and
  caps; and
- generated review notes tied to the evidence and exclusions.

## Compatibility behavior

The historical `calculatePrivacyScore` and `PrivacyScoreClass` API names remain
for incremental migration, but they now return explicit status and nullable
numeric values.

No caller may convert `insufficient-evidence` to zero, 100, A, or F.

P2 updated:

- current-page and recent-data popup summaries;
- dashboard metrics and hourly history;
- toolbar badge and tooltip;
- coaching and personalized-insight paths;
- trend snapshots and weekly aggregation;
- category, similar-site, user-history, and trust comparisons;
- local analysis and link-history paths;
- notifications;
- P2P anonymization, validation, sharing, and peer responses;
- CSV, JSON, and plain-text exports; and
- report-storage migration and validation.

Unknown values remain N/A or chart gaps. P2P sharing refuses unknown values
rather than advertising them as zero.

## Completed work breakdown

### P2.0 — Contract and pure fixtures

- [x] Define the evidence contract and formula.
- [x] Add a pure scoring and qualification engine.
- [x] Add fixtures for unknown state, confidence weighting, unique-party
  grouping, recurrence saturation, first-party exclusion, low-confidence
  exclusion, page scoping, API units, and unit caps.

### P2.1 — Compatibility API and domain results

- [x] Replace the row-count formula.
- [x] Return nullable values and `N/A` bands for insufficient evidence.
- [x] Publish exclusion and evidence-unit breakdowns.
- [x] Remove HTTPS, volume, domain-group, trust, peer, and synthetic adjustments.

### P2.2 — Visible and downstream consumers

- [x] Dashboard and current-page summaries.
- [x] Badge and tooltip.
- [x] Feed-adjacent summaries, local analysis, and generated prompts.
- [x] CSV, JSON, and text exports.
- [x] Trends, snapshots, coaching, recommendations, and link history.
- [x] Comparison disclosures without rankings or trust labels.
- [x] P2P guardrails so unknown values are never advertised as zero.
- [x] Nullable report-storage migration.

### P2.3 — Evidence

- [x] Build and package the final code head.
- [x] Pass 34 focused source fixtures.
- [x] Exercise empty, excluded-only, one-party, multi-party, recurrence,
  low-confidence API, page-specific, badge, dashboard, trend, export, and
  migration fixtures in Chromium.
- [x] Exercise a real deterministic network fixture.
- [x] Confirm a newly-created browser-action popup target.
- [x] Record remaining formula and detector limitations.

## Automated source and package evidence

GitHub Actions **Validate run #297** passed on runtime-tested source head:

`30a5106740d51ea8732e22a8c411591cc07d4dab`

Passed gates:

- committed-lockfile regeneration and equality check;
- `pnpm install --frozen-lockfile`;
- 34 scoring, attribution, detector-policy, migration, aggregation, and cap
  fixtures;
- `pnpm type-check`;
- `pnpm lint`;
- production Chrome build;
- generated Manifest V3 name/version validation;
- ZIP creation; and
- unpacked-extension and packaged-ZIP upload.

Artifact:

- name: `phantom-trail-chrome-8abe8d59f04e711357f6317e085843c3e873f220`
- artifact ID: `9082527963`
- GitHub digest:
  `sha256:650871f478e989f44a5d88d1d088e25856bf4b556917007c3c7b00815af88194`

## Exact-artifact Chromium evidence

The exact run #297 artifact was loaded in Chromium `144.0.7559.96` with a fresh
isolated profile and deterministic local fixtures.

Results:

- 39 runtime assertions passed;
- 0 failed;
- 0 page or popup runtime errors;
- N/A, one-unit `94/A`, bounded-recurrence `92/A`, four-unit `74/C`, and real
  network `97/A` results matched the published formula;
- low-confidence real API-only evidence remained N/A;
- UI, history, badge, comparison, peer, and export paths preserved status,
  confidence, evidence units, and exclusions; and
- a newly-created real browser-action popup target opened.

See [P2 Runtime Evidence](P2-RUNTIME-EVIDENCE.md) for exact hashes, assertions,
fixture scope, export hashes, and limitations.

## Known limitations

- The index is not detector accuracy or privacy ground truth.
- Severity labels and confidence remain prototype judgments.
- P1 uses an approximate site-key heuristic rather than a complete Public Suffix
  List.
- CNAME-cloaked resources are unresolved.
- initiator, tab, and iframe attribution can be incomplete or stale.
- low-confidence API and URL heuristics remain visible but excluded.
- excluding first-party URL-pattern matches does not mean first-party code
  cannot track users.
- an A model band does not mean private or safe.
- comparison, population percentile, and trust ranking remain unavailable.
- peer authenticity and representative sampling are not established.
- broad extension permissions remain P3 work.
- automatic reports, notifications, sync, general AI Q&A, and other incomplete
  features remain P4 work.

## Non-goals

P2 does not:

- establish detector accuracy or privacy ground truth;
- claim that an A band means safe or private;
- infer collection, retention, sharing, sale, ownership, identity, or intent;
- add a complete Public Suffix List or CNAME uncloaking;
- authenticate P2P data;
- complete AI, sync, notification, or report workflows;
- replace the P1 attribution model; or
- establish legal compliance.

## Completion status

The P2 implementation gate is complete on this branch:

- no qualifying evidence returns N/A rather than a number;
- visible and downstream consumers preserve N/A without substituting zero or
  100;
- unique parties and detector units drive the formula rather than request rows;
- recurrence is bounded;
- confidence and exclusions survive through UI, history, peer, analysis, and
  export paths;
- first-party, legacy, low-confidence, recurrence, page-scope, and migration
  fixtures pass;
- source, type, lint, build, manifest, and package gates pass; and
- exact-artifact Chromium evidence confirms unknown and estimated states.

PR #3 remains open and draft because its P0 and P1 bases remain under review.
This status does not authorize merging PR #1, PR #2, or PR #3.
