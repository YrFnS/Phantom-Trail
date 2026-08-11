# P3 Data Protection

**Status:** In progress  
**Branch:** `agent/p3-data-protection`  
**Stacked base:** `agent/p2-evidence-based-scoring`  
**Started:** August 11, 2026

## Purpose

P0 corrected product claims. P1 made detector attribution inspectable. P2
replaced arbitrary row-count grades with an evidence-qualified model. P3 now
reduces the data Phantom Trail retains, limits what can leave the browser, makes
sensitive credentials explicit, and provides a complete user-visible deletion
workflow.

P3 is a data-minimization and control phase. It does not establish legal
compliance, anonymity, perfect redaction, or security certification.

## Pre-P3 risks

The P2 branch still has several concrete data-protection gaps:

- detector events can persist full page and resource URLs, including query
  strings and fragments;
- URL values can also appear inside descriptions, detector evidence, and raw
  in-page detail strings;
- the OpenRouter key is stored in the general settings object and debug output
  reveals key length and prefix information;
- there is no complete visible Clear All Data workflow;
- P2P connection and sharing consent are separate toggles but do not use a
  versioned acknowledgement or payload preview;
- broad required permissions include capabilities for unfinished or optional
  features;
- the retention period is fixed in code; and
- existing stored rows are not automatically re-sanitized when privacy policy
  changes.

## P3 storage contract

### URL retention modes

P3 supports two explicit local-retention modes:

- `origin-only` — default. Store only `scheme://host[:port]/` for page and
  resource URLs.
- `origin-and-path` — opt-in. Store origin plus pathname after credentials,
  query parameters, and fragments are removed and path segments likely to
  contain identifiers are redacted.

Query strings, fragments, username/password URL credentials, and raw form or API
arguments are never retained by the P3 event store.

Domains, attribution fields, request method/type, detector identity, rule name,
confidence, counts, and timestamps remain available because they are required
for the P1/P2 evidence model.

### Text and nested detail minimization

Before persistence, P3 sanitizes URL-like substrings inside:

- event descriptions;
- detector evidence strings;
- in-page API-call labels; and
- compatibility fields.

Raw serialized main-world detail objects are replaced by a bounded,
human-readable minimization notice. Phantom Trail retains operation names and
counts, not arbitrary arguments or page-supplied values.

### Migration

Reading event storage runs the same minimizer over legacy and P1/P2 rows. When a
stored row contains more detail than the active retention mode permits, the row
is rewritten in place. The migration never reconstructs stripped data.

### Retention

The user can select a bounded event-retention period. P3 defaults to seven days.
Cleanup uses the stored policy rather than a hard-coded 30-day value.

## Credential contract

OpenRouter credentials are not part of general extension settings.

- Session-only storage is the default.
- Remembering a key across browser restarts requires a separate explicit opt-in.
- Switching the remember option migrates or removes the persisted copy.
- Disabling AI does not silently transmit or validate the key.
- Keys and key prefixes are never written to console output, exports, P2P
  payloads, AI prompts, or diagnostic reports.
- Clear All Data removes both session and persisted credentials.

This reduces persistence exposure but does not make a browser-stored API key
immune to a compromised browser profile or extension context.

## Outbound-data contract

### OpenRouter

OpenRouter summaries remain disabled by default. The settings UI must display a
preview of the exact field classes that may be sent.

The default outbound mode is `counts-only`:

- total qualifying and excluded rows;
- occurrence totals;
- category/severity counts;
- evidence-unit and coverage labels; and
- no URLs, paths, query strings, fragments, descriptions, or detector evidence.

An optional `include-domain-labels` mode can include a bounded list of resource
domain labels. It remains an explicit opt-in and never includes page URLs or
resource URLs.

### P2P

Joining the peer transport and sharing a sample remain separate actions.
P3 requires a current consent-version acknowledgement before either can be
enabled. The UI displays the exact aggregate fields and the WebRTC/signalling
metadata warning before consent.

P2P payloads never contain URLs, paths, query strings, fragments, page domains,
resource domains, descriptions, detector evidence, API keys, or local storage
keys.

## Deletion contract

The Data & Privacy settings screen provides a two-step Clear All Data action.
The user must enter the displayed confirmation phrase before deletion.

Deletion clears:

- all `chrome.storage.local` data owned by Phantom Trail;
- all `chrome.storage.session` data owned by Phantom Trail;
- any `chrome.storage.sync` compatibility data;
- extension alarms;
- current toolbar badges and titles; and
- in-memory P2P session state when available.

The operation returns a deletion report with storage areas cleared and any
failures. It does not claim to delete already downloaded exports, data already
sent to OpenRouter, data already shared with peers, browser backups, or copies
held by third parties.

## Permission policy

Required permissions must have a current source-backed purpose.

| Permission | P3 disposition | Reason |
| --- | --- | --- |
| `webRequest` | required | observe request metadata for the detector |
| `storage` | required | settings, minimized events, credentials, and deletion |
| `tabs` | required | active-page attribution and per-tab badge state |
| `alarms` | required | bounded retention cleanup |
| `<all_urls>` | required host access | content and request observation across visited sites |
| `management` | optional | user-initiated discovery of recognized privacy extensions |
| `notifications` | removed | automatic notification workflow is unfinished |
| `downloads` | removed | manual exports use browser-created object downloads without the API |
| `activeTab` | removed | redundant while `tabs` and host access are required |

Optional permission requests must be initiated by a visible user action and can
be revoked from the same interface.

## Work breakdown

### P3.0 — Contract and inventory

- [x] Define storage, credential, outbound, deletion, and permission contracts.
- [ ] Inventory all local, session, sync, alarm, and outbound paths.
- [ ] Add pure URL and event-minimization fixtures.

### P3.1 — Storage minimization and migration

- [ ] Add versioned data-protection settings.
- [ ] Minimize new events before persistence.
- [ ] Re-sanitize existing rows on read and policy changes.
- [ ] Replace fixed retention with the configured bounded period.
- [ ] Expose a storage inventory without displaying sensitive values.

### P3.2 — Credentials and outbound controls

- [ ] Move the OpenRouter key to dedicated session/persisted credential storage.
- [ ] Remove key diagnostics.
- [ ] Add AI payload mode and exact field preview.
- [ ] Add versioned P2P consent and exact payload preview.
- [ ] Refuse outbound operations when consent or qualifying data is absent.

### P3.3 — User deletion and permission minimization

- [ ] Add a two-step Clear All Data workflow and deletion report.
- [ ] Clear local/session/sync data, alarms, badges, and active peer state.
- [ ] Remove unused required permissions.
- [ ] Make privacy-tool discovery an optional, user-initiated permission.

### P3.4 — Evidence

- [ ] Pass data-minimization, migration, deletion, credential, consent, and
  permission fixtures.
- [ ] Pass type-check, lint, production build, manifest validation, and package
  creation.
- [ ] Exercise the exact artifact in Chromium.
- [ ] Verify URL stripping, key persistence modes, AI/P2P previews, optional
  permission grant/revoke, retention cleanup, and Clear All Data.
- [ ] Record remaining limits and exact artifact hashes.

## Non-goals

P3 does not:

- establish GDPR, CCPA, or other legal compliance;
- guarantee anonymous P2P use;
- secure a compromised browser profile;
- revoke or delete data already received by OpenRouter or peers;
- remove the host access required by the current detector architecture;
- complete notification, report, sync, or general AI-chat workflows;
- change the P1 attribution model or P2 evidence formula; or
- claim that redaction detects every possible identifier.

## Completion gate

P3 can be marked implementation-complete only when:

- new and migrated event storage obeys the selected URL-retention mode;
- query strings, fragments, URL credentials, and raw detail objects are absent
  from stored detector rows;
- OpenRouter credentials are isolated and session-only by default;
- outbound previews match the actual AI and P2P payload builders;
- P2P requires current versioned consent;
- Clear All Data is visible, confirmed, and verified across storage areas,
  alarms, badges, and peer state;
- required manifest permissions are reduced and optional access is user-driven;
- focused fixtures, type-check, lint, build, manifest, and package gates pass;
- exact-artifact Chromium evidence confirms the controls; and
- PR #4 remains stacked and draft until P0–P2 are reviewed.
