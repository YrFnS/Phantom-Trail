# P2 Evidence-Based Scoring

**Status:** In progress  
**Branch:** `agent/p2-evidence-based-scoring`  
**Stacked base:** `agent/p1-detection-attribution`  
**Started:** August 11, 2026

## Purpose

P0 made Phantom Trail honest about its experimental status. P1 separated the
visited page from the matched resource and attached attribution and detector
confidence. P2 replaces the original row-count penalty formula with a published,
evidence-qualified model.

The P2 result is an **experimental observed-evidence index**, not a measurement
of a website's total privacy, safety, legal compliance, ownership, intent, or
actual data handling.

## Problems in the pre-P2 formula

The earlier calculation:

- returned a numeric result even when no usable evidence existed;
- started at 100 and presented missing observations as a favorable grade;
- penalized every stored row, allowing refreshes and repeated requests to
  dominate the result;
- added an HTTPS bonus unrelated to whether third-party tracking evidence was
  observed;
- added a global more-than-ten-rows penalty;
- added a simplified domain-group penalty;
- treated all detector and attribution confidence levels as equal; and
- exposed several independent dashboard formulas that disagreed with one
  another.

## Result states

P2 uses two explicit states:

### `insufficient-evidence`

No numeric value or letter band is produced when the selected scope has no
qualifying evidence. This can mean detector coverage was incomplete, no
qualifying signal fired, attribution was missing, or only excluded low-quality
signals were present. It does **not** mean the page is private or safe.

### `estimated`

A numeric value and model band are produced only when at least one qualifying
evidence unit exists. Every estimate carries a low, medium, or high **evidence
coverage confidence**. That confidence describes the amount and quality of the
recorded evidence; it is not a detector-accuracy percentage.

## Qualifying evidence

A row can influence the index only when:

- it is a schema-v2 event rather than a legacy row;
- its page attribution is medium or high confidence;
- its detector confidence is medium or high;
- its source is a network request, DOM resource, or main-world API signal;
- network and DOM resources are explicitly classified as third-party; and
- the selected page scope matches the event's attributed page domain when a
  page-specific result is requested.

Excluded rows remain visible in the feed and exports. P2 reports exclusion
counts instead of silently converting weak evidence into a strong score.

## Evidence units

P2 does not charge once per request row.

- Network and DOM evidence is grouped by attributed page and unique resource
  party.
- Main-world API evidence is grouped by attributed page and detector family.
- Repeated equivalent observations use the P1 occurrence count and a small,
  bounded recurrence factor.
- Within one evidence unit, the strongest detector contribution is counted in
  full and additional distinct detector contributions are discounted.
- Every evidence unit has a hard penalty cap.

This makes unique parties and distinct evidence more important than refresh or
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

Detector confidence factors:

- high: `1.00`
- medium: `0.65`
- low: excluded

Attribution confidence factors:

- high: `1.00`
- medium: `0.75`
- low: excluded

Party confidence factors for network/DOM routes:

- high: `1.00`
- medium: `0.80`
- low: excluded

Source factors:

- network request: `1.00`
- DOM resource: `0.85`
- main-world API threshold: `0.80`

Bounded recurrence is:

`1 + min(log2(max(1, occurrences)), 2) × 0.10`

It therefore never exceeds `1.20`.

Within one evidence unit:

- the strongest distinct detector contribution counts in full;
- remaining distinct detector contributions count at `30%`; and
- the unit penalty is capped at `22`.

The final index is:

`round(max(0, 100 - sum(unit penalties)))`

There is no HTTPS bonus, row-count penalty, trusted-site adjustment, P2P
reputation adjustment, synthetic benchmark adjustment, or hidden category
multiplier.

## Model bands

Bands are emitted only for an `estimated` result:

- A: 90–100
- B: 80–89
- C: 65–79
- D: 50–64
- F: 0–49

The interface must call these **model bands**, not verified privacy grades.

## Evidence coverage confidence

Coverage confidence is derived from qualifying units and the share of units
whose strongest contribution has high detector and attribution confidence:

- high: at least four units and at least 75% high-quality units;
- medium: at least two units and at least 50% high-quality units;
- low: all other estimated results;
- none: insufficient evidence.

This is a transparent coverage label, not a probability or accuracy claim.

## Required breakdown

Every result records:

- selected scope and page domain;
- total observed rows and aggregated occurrences;
- qualifying rows and occurrences;
- excluded rows by reason;
- unique third-party resource parties;
- page-local API evidence units;
- total evidence units;
- raw and capped penalty;
- per-unit contributions, detector IDs, rules, confidence, and route; and
- generated review notes tied to the evidence and exclusions.

## Compatibility policy

The historical `calculatePrivacyScore` and `PrivacyScoreClass` names remain so
existing callers can migrate incrementally. Their return shape changes to carry
an explicit status and nullable numeric value. No caller may convert an
insufficient result to zero, 100, A, or F.

Trend, coaching, P2P, badge, export, AI, and dashboard consumers must skip or
label unknown values rather than averaging or graphing them as zero.

## P2 work breakdown

### P2.0 — Contract and pure fixtures

- [x] Define the evidence contract and formula.
- [ ] Add a pure scoring engine.
- [ ] Add fixtures for unknown state, confidence weighting, unique-party
  grouping, recurrence saturation, first-party exclusion, low-confidence
  exclusion, and page scoping.

### P2.1 — Compatibility API and domain results

- [ ] Replace the row-count formula.
- [ ] Return nullable values and `N/A` bands for insufficient evidence.
- [ ] Publish exclusion and evidence-unit breakdowns.
- [ ] Remove HTTPS, volume, and domain-group adjustments.

### P2.2 — Visible consumers

- [ ] Dashboard and current-page summaries.
- [ ] Badge and tooltip.
- [ ] Feed-adjacent summaries, local Q&A, and generated prompts.
- [ ] CSV, JSON, and text exports.
- [ ] Trends, snapshots, coaching, recommendations, and link history.
- [ ] P2P sharing guardrails so unknown values are never advertised as zero.

### P2.3 — Runtime evidence

- [ ] Build and package the final branch.
- [ ] Exercise no-evidence, one-party, multi-party, recurrence, low-confidence,
  page-specific, badge, dashboard, trend, export, and migration fixtures.
- [ ] Record remaining formula and detector limitations.

## Non-goals

P2 does not:

- establish detector accuracy or a privacy ground truth;
- claim that an A band means safe or private;
- infer collection, retention, sharing, sale, ownership, or intent;
- add a complete Public Suffix List or CNAME uncloaking;
- complete AI, sync, notification, report, or P2P authenticity work;
- replace the P1 attribution model; or
- establish legal compliance.

## Completion gate

P2 can be marked implementation-complete only when:

- no qualifying evidence produces `insufficient-evidence`, not a number;
- visible consumers render `N/A` without substituting zero or 100;
- unique parties and detector units drive the formula rather than request rows;
- confidence and exclusion reasons are preserved through UI and exports;
- first-party, legacy, unknown-attribution, and low-confidence fixtures pass;
- recurrence saturation and page-scope fixtures pass;
- type-check, lint, unit fixtures, production build, and package validation pass;
- exact-artifact Chromium evidence confirms the unknown and estimated states;
- the PR publishes the formula and known limitations; and
- PR #3 remains stacked and draft until its P0/P1 bases are reviewed.
