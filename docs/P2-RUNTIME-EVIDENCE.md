# P2 Runtime Evidence

**Evidence date:** August 11, 2026  
**Branch:** `agent/p2-evidence-based-scoring`  
**Runtime-tested code head:** `30a5106740d51ea8732e22a8c411591cc07d4dab`  
**Status:** Exact-artifact Chromium fixture completed

## Scope

This document records bounded runtime evidence for P2’s evidence-based scoring
model. It verifies the implemented state transitions, formula outputs, UI
rendering, storage behavior, badge behavior, trends, exports, peer-sharing
guardrails, and popup lifecycle against a deterministic fixture.

It does **not** validate detector accuracy, website privacy, data collection,
ownership, identity, safety, performance, legal compliance, or the correctness
of every attribution decision.

## Exact artifact

GitHub Actions **Validate run #297** completed successfully on source head:

`30a5106740d51ea8732e22a8c411591cc07d4dab`

GitHub artifact:

- name: `phantom-trail-chrome-8abe8d59f04e711357f6317e085843c3e873f220`
- artifact ID: `9082527963`
- GitHub artifact digest:
  `sha256:650871f478e989f44a5d88d1d088e25856bf4b556917007c3c7b00815af88194`
- downloaded artifact ZIP size: `884,273` bytes
- downloaded artifact ZIP SHA-256:
  `0d446818247f32ed9899604934bba812f734d428f624b809d2b2c64fcc9b0220`
- packaged extension ZIP size: `441,367` bytes
- packaged extension ZIP SHA-256:
  `ccd127696c9a579434da22e95e1d680fbb3006a5cbfff4a84a1764ed94de9a76`
- unpacked extension size: `1,338,031` bytes

Generated manifest:

- Manifest V3
- name: `Phantom Trail`
- version: `0.1.0`
- description:
  `Experimental Chrome extension for inspecting possible web-tracking signals`
- broad permissions and `<all_urls>` remain later permission-minimization work

## Runtime environment

- browser: Chromium `144.0.7559.96`
- extension ID: `pgdbecdphjmpkochkflmhdagiefhdcjo`
- fresh isolated profile
- deterministic local page and resource hosts
- unpacked extension loaded from the exact run #297 artifact
- host-managed extension and URL policies temporarily relaxed for the isolated
  fixture and restored afterward

Post-run policy verification confirmed that the managed policy again contained:

- `ExtensionInstallBlocklist: ["*"]`
- `URLBlocklist: ["*"]`

## Result

- **39 assertions passed**
- **0 assertions failed**
- **0 fixture or popup runtime errors**
- genuine newly-created browser-action popup target opened
- final real-network storage: 6 rows and 7 aggregated occurrences

Runtime report:

- size: `85,604` bytes
- SHA-256:
  `f4b250da78409214413702b311ab0529a498bd95b2415e76e09bfb30e3a1a1f4`

The bundled runtime-evidence archive has SHA-256:

`66e064e36ef8400486aae76bae476281ff6958d06692bb14c00407b26ce6610b`

## Assertions verified

### Extension and clean-state checks

- background service worker started;
- fresh profile contained no detector rows; and
- the extension returned an explicit `insufficient-evidence` result with:
  - `score: null`;
  - `grade: N/A`;
  - `color: gray`;
  - `confidence: none`; and
  - zero evidence units.

### N/A presentation

- the popup displayed `N/A` and explicitly stated that the result was not
  favorable;
- the dashboard preserved N/A instead of substituting zero or 100;
- hourly score history displayed gaps when no numeric estimate existed;
- P2P copy stated that N/A is never converted to zero;
- the toolbar badge remained blank for N/A and exposed an explicit
  insufficient-evidence tooltip; and
- first-party and low-detector-confidence-only rows remained N/A while their
  exclusion reasons stayed inspectable.

### Published formula fixtures

A single medium-severity, high-detector-confidence, high-attribution-confidence,
medium-party-confidence network evidence unit produced:

- value: `94`
- model band: `A`
- coverage confidence: `low`
- applied penalty: `6.4`
- one unique third-party resource unit

A row representing 128 equivalent occurrences produced:

- one evidence unit;
- value: `92`; and
- applied penalty no greater than the published 1.20 recurrence cap.

Four unique high-quality resource parties produced:

- value: `74`
- model band: `C`
- coverage confidence: `high`
- four evidence units

The popup and dashboard rendered the same values as the core scoring API for
both the one-unit and four-unit fixtures.

### Removed misleading comparisons

- category ranking remained unavailable;
- no population percentile, better/worse privacy claim, or trust label was
  generated; and
- the UI explained that the bundled category data is synthetic rather than a
  documented benchmark.

### Trend and weekly aggregation

- daily history preserved N/A days as null chart gaps;
- numeric estimated days remained numeric;
- the weekly average omitted N/A days instead of treating them as zero or 100;
- the comparable weekly change remained N/A when insufficient numeric history
  existed; and
- the updated report-storage migration accepted and retained nullable P2
  snapshots.

### Page scoping

- one page with one evidence unit returned `94/A`;
- another page with four evidence units returned `74/C`;
- page-scoped queries did not mix the two pages; and
- current-page popup and dashboard values used attributed page domains.

### Real main-world API thresholds

The fixture triggered six real main-world API detector rows:

- canvas threshold;
- storage threshold;
- audio threshold;
- WebRTC construction;
- font threshold; and
- sensor-listener threshold.

Verified behavior:

- all six rows carried `page.test` as their attributed page;
- all retained their current low detector confidence;
- unsupported mouse-movement and form-interaction-only rows remained
  suppressed; and
- the API-only data set remained N/A with all six rows reported under the
  `low-detector-confidence` exclusion reason.

This confirms that visible low-confidence evidence is not silently converted
into a numeric result.

### Real network fixture

A deterministic page loaded catalog, path-token, DOM-resource, duplicate, and
non-matching resources. The resulting P2 page score was:

- status: `estimated`
- value: `97`
- model band: `A`
- coverage confidence: `low`
- observed rows: `6`
- observed occurrences: `7`
- qualifying rows: `2`
- qualifying occurrences: `3`
- excluded rows: `4`
- unique score-qualified third-party parties: `1`
- evidence units: `1`
- applied penalty: `2.78`

The qualifying unit was the attributed
`networkpage.test → www.google-analytics.com` route. Four low-confidence rows
remained visible but were excluded from scoring.

The popup exposed the evidence unit and exclusion counts, and the toolbar badge
used the attributed current-page result rather than a resource-domain result.

### Exports

CSV, JSON, and plain-text `.txt` exports completed.

Export hashes:

- CSV:
  `dc7fca034a1e695c25d219ef99de4d0afc34b38d2b9dba5a973ae6901a289d04`
- JSON:
  `a3fbab34345a3f3620f1ef6ad34e11f4db9cd59b8f947931b15b3bc3670108f2`
- text:
  `fb6aaa8a560cdc3cb24e717086a5ec10caac64b858f19048b6a9cf827092dac1`

Verified export content:

- nullable score status and value;
- model band and coverage confidence;
- evidence units, qualifying rows, excluded rows, and exclusion reasons;
- per-unit routes, rules, evidence, occurrences, and applied penalties;
- explicit disclosure that HTTPS, global row-count, trusted-site, peer, and
  synthetic benchmark adjustments are not applied;
- bounded recurrence and unit-cap formula disclosure; and
- warnings that N/A is not favorable and the result is not a verified privacy
  or safety rating.

### Browser-action popup

The fixture captured the target list before invoking `chrome.action.openPopup()`
and required a newly-created popup target afterward. Chromium exposed a new
`page` target at the packaged popup URL, confirming the real browser-action
surface opened rather than merely reusing a directly navigated extension page.

## Screenshot limitation

Chromium screenshot capture was unstable in this managed host and could block
while waiting on the popup document. Screenshots were therefore removed from the
assertion path. The fixture captured:

- popup and dashboard DOM text for N/A, one-unit, four-unit, trend, peer, and
  real-network states;
- full score API payloads;
- storage payloads;
- badge text and tooltip state;
- downloads;
- action-popup target metadata; and
- browser console and page-error output.

No screenshot-dependent completion claim is made.

## Known limitations preserved

- P2 is an observed-evidence index, not a ground-truth privacy score.
- Detector severity labels and confidence remain hand-maintained prototype
  judgments.
- P1 party classification uses an approximate site-key heuristic, not a
  complete Public Suffix List.
- CNAME-cloaked resources are unresolved.
- initiator, tab, and iframe attribution can be incomplete or stale.
- low-confidence API and URL heuristics remain visible but excluded.
- excluding first-party URL-pattern matches does not mean first-party code
  cannot track users.
- one or several high-confidence evidence units do not establish complete
  detector coverage.
- an A model band does not mean private or safe.
- comparison, trust, and population ranking remain unavailable.
- live peer authenticity, representative sampling, and reputation integrity are
  not established.
- broad extension permissions remain P3 work.

## Conclusion

The P2 implementation gate is complete for the runtime-tested code head:

- explicit N/A state;
- published formula;
- unique evidence-unit grouping;
- bounded recurrence;
- confidence weighting;
- transparent exclusions;
- N/A-safe UI, history, badge, coaching, comparison, export, and P2P paths;
- deterministic unit fixtures;
- production build/package evidence; and
- exact-artifact Chromium evidence.

PR #3 must remain open and draft while its P0 and P1 bases remain under review.
This document does not authorize merging or claim detector accuracy, website
privacy, safety, ownership, data handling, performance, security, or legal
compliance.
