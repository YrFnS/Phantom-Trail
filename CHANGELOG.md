# Changelog

All notable source changes are recorded here. Phantom Trail has not published a
stable production release.

## [Unreleased]

### P5 — Evidence and release discipline

- Add a versioned curated detector regression corpus and confusion-matrix
  evaluator.
- Add deterministic package-size and algorithm performance budgets.
- Add Chromium lifecycle, restart, popup, and bounded accessibility-contract
  evidence.
- Add executable source/package security invariants, a security policy, and a
  threat model.
- Add dependency-audit, artifact provenance, release-evidence, and manual-gate
  records.
- Remove stale unexecuted tests for features retired in P4.

P5 metrics are regression evidence only. They do not establish real-world
accuracy, WCAG compliance, production performance, security certification,
privacy protection, or legal compliance.

## [0.1.0] — Experimental remediation baseline

### P0 — Truthfulness

- Reclassified the project as an experimental prototype.
- Removed unsupported production, accuracy, performance, compliance, blocker,
  peer, and release claims.
- Corrected version, license, tracker-catalog count, defaults, and disclosures.

### P1 — Detection and attribution

- Separated visited-page and resource attribution.
- Added evidence, confidence, party relationship, request context, and bounded
  duplicate aggregation.
- Reduced broad and interaction-only false-positive paths.

### P2 — Evidence-based scoring

- Added an explicit insufficient-evidence/N/A state.
- Replaced raw-row penalties and arbitrary defaults with documented,
  confidence-weighted evidence units and bounded recurrence.

### P3 — Data protection

- Minimized stored URLs and raw details before persistence.
- Added shorter retention, credential isolation, outbound previews, permission
  minimization, and a complete visible deletion workflow.

### P4 — Functionality integrity

- Replaced generic AI-style Q&A with a deterministic local Evidence Explorer and
  an explicit optional aggregate-summary action.
- Finished local daily/weekly reports and optional notification lifecycle.
- Removed incomplete sync, scheduled export, background export, link
  prediction, generated coaching, and peer domain-reputation workflows.

## Release posture

Version `0.1.0` remains an experimental development baseline. It must not be
presented as stable or production-ready while the documented P0–P5 human,
external-copy, security, privacy, accessibility, lifecycle, and release gates
remain incomplete.