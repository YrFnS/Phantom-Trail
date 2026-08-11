# P4 Functionality Integrity

**Status:** In progress  
**Branch:** `agent/p4-functionality-integrity`  
**Stacked base:** `agent/p3-data-protection`  
**Started:** August 11, 2026

## Purpose

P0 corrected product claims. P1 corrected page/resource attribution. P2 replaced
row-count grades with an explicit evidence model. P3 minimized retained and
outbound data. P4 now makes the remaining product surface internally honest:
every visible control must either execute a tested workflow or be removed.

P4 does not preserve dead prototype features merely because source files exist.
A smaller working extension is preferable to a larger interface containing
controls, commands, schedules, or network paths that do not perform what they
say.

## Initial audit

The P3 head still contains several integrity gaps:

- `ExportScheduler` creates alarms that the background handler never routes,
  treats a row limit as a date range, depends on a removed downloads permission,
  and reports email/cloud delivery as success even though those transports are
  absent.
- `SyncManager` reads and writes obsolete storage keys, never applies the merged
  result during `syncNow`, presents a manual-conflict mode without a resolver,
  syncs unfinished goals and export schedules, and advertises device counts that
  are not a verified account/device model.
- the toolbar `export-data` shortcut creates a Blob but never downloads it, then
  tries to show notifications without an explicit permission flow.
- notification utilities exist, but detector events and daily summaries are not
  wired into the lifecycle and no tested permission/settings workflow is visible.
- daily snapshot and weekly aggregation code exists, but the only active alarm is
  retention cleanup.
- the AI availability check still looks for a credential inside general settings
  even though P3 moved credentials to dedicated session/local storage.
- unmatched text is presented as Q&A even though the OpenRouter path generates an
  aggregate event summary rather than answering the user’s question.
- link prediction remains an unvalidated toggle rather than a completed feature.
- domain-reputation exchange was removed in P3, but compatibility methods and old
  community terminology still need a final surface audit.

## P4 decisions

### Keep and finish

1. **Local Evidence Explorer**
   - deterministic local queries for patterns, evidence index, timeline, a
     specific stored resource-domain label, and a specific attributed page;
   - unmatched text receives a supported-query explanation rather than silently
     invoking a different operation;
   - optional OpenRouter use is an explicit aggregate-summary action, not generic
     chat;
   - AI availability reads the dedicated P3 credential store.

2. **Local snapshots and reports**
   - one daily snapshot alarm;
   - one weekly aggregation alarm;
   - idempotent storage by date/week;
   - manual generate/refresh controls;
   - visible last-run state and N/A-safe report values;
   - no email, cloud, or automatic file delivery.

3. **Optional evidence alerts**
   - explicit browser permission request and revoke controls;
   - off by default;
   - event alerts only after a newly appended qualifying high/critical evidence
     row;
   - daily summary only after a real daily snapshot;
   - quiet-hours and throttling behavior;
   - notification click opens the extension popup when supported;
   - no claim of attack, data collection, or website danger.

4. **Working shortcuts**
   - open the extension popup;
   - run the local current-page summary;
   - no background “export” shortcut unless a real user-visible download can be
     produced without lying about completion.

### Remove from the product

1. **Scheduled export**
   - remove the scheduler, schedule/history storage, command, settings copy, and
     alarm compatibility path;
   - keep manual in-popup CSV, JSON, and plain-text export only.

2. **Cross-device sync**
   - remove the incomplete sync manager, sync settings component, sync storage
     helper, barrel exports, listeners, and stale stored sync state during
     migration;
   - P4 does not replace it with a different cloud or account system.

3. **Generic AI Q&A**
   - do not send arbitrary question text to OpenRouter;
   - do not label aggregate summarization as a direct answer;
   - keep only documented local query patterns and an explicit optional aggregate
     summary action.

4. **Link privacy prediction**
   - remove its visible toggle and active content-script behavior;
   - retain no product claim that Phantom Trail audits destinations before visit.

5. **Peer reputation**
   - retain only P3’s versioned aggregate sample exchange;
   - remove or deprecate remaining domain-reputation compatibility surfaces;
   - continue to label all peer samples unauthenticated and unrepresentative.

## P4 work breakdown

### P4.0 — Contract and dead-surface inventory

- [x] Define keep/remove decisions.
- [ ] Inventory all callers and storage keys for scheduled export, sync,
  notifications, snapshots, AI chat, predictions, and reputation.
- [ ] Add migration rules for removed feature state.

### P4.1 — Reporting lifecycle

- [ ] Implement daily snapshot and weekly aggregation alarm routing.
- [ ] Add idempotent generation metadata and manual refresh.
- [ ] Add visible report status and recent local summaries.
- [ ] Add fixture coverage for empty, N/A, numeric, repeated alarm, and week
  rollover cases.

### P4.2 — Optional alerts

- [ ] Add explicit optional permission request/revoke UI.
- [ ] Validate and persist alert settings.
- [ ] Wire appended score-qualified high/critical events to throttled alerts.
- [ ] Wire daily summaries to completed daily snapshots.
- [ ] Add quiet-hours, throttle, permission-denied, and N/A fixtures.

### P4.3 — Evidence Explorer and AI integrity

- [ ] Fix credential availability against the dedicated credential store.
- [ ] Stop unmatched text from silently becoming an aggregate summary.
- [ ] Add an explicit optional OpenRouter aggregate-summary action.
- [ ] Make local supported intents deterministic and documented.
- [ ] Remove generic-chat and website-audit wording.

### P4.4 — Retire broken workflows

- [ ] Remove scheduled-export code, alarms, storage, command, and copy.
- [ ] Remove cross-device sync code, listeners, storage, exports, and copy.
- [ ] Remove link-prediction activation and setting.
- [ ] Remove remaining domain-reputation compatibility calls where safe.
- [ ] Migrate stale local/sync state for removed features.

### P4.5 — Evidence

- [ ] Pass existing P1–P3 fixtures.
- [ ] Add P4 report, alert, AI-routing, command, and removal fixtures.
- [ ] Pass type-check, lint, production build, manifest validation, and ZIP.
- [ ] Load the exact final artifact in Chromium.
- [ ] Verify alarms, reports, optional permission, event alert, daily summary,
  supported local queries, explicit aggregate summary, removed settings, removed
  commands, and cleared legacy state.
- [ ] Record exact hashes, assertions, and limitations.

## Completion gate

P4 can be marked implementation-complete only when:

- no visible control claims scheduled export, email/cloud delivery, cross-device
  sync, generic AI Q&A, link auditing, or peer reputation;
- every remaining shortcut performs its stated action;
- daily and weekly report jobs are real, idempotent, and visible;
- notifications require explicit permission and settings, and are actually
  triggered by the documented lifecycle;
- AI availability works with P3 credential storage;
- unmatched questions do not invoke a different undisclosed operation;
- removed feature storage and alarms are migrated away;
- all source and package gates pass;
- exact-artifact Chromium evidence covers both retained and removed workflows;
  and
- PR #5 remains stacked and draft until P0–P3 are reviewed and published.

## Non-goals

P4 does not:

- establish detector accuracy, privacy ground truth, or legal compliance;
- authenticate P2P peers or make samples representative;
- build an account system or replace removed sync with a backend;
- add email/cloud export infrastructure;
- turn OpenRouter into a general-purpose browsing assistant;
- restore destination prediction;
- validate browser-store publication or external marketing copy; or
- merge any stacked pull request.
