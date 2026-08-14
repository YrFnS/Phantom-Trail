# Privacy and Data Disclosure

**Product version:** 0.1.0  
**Disclosure updated:** August 14, 2026  
**Status:** Experimental development disclosure

This document describes the current P0–P5 source behavior plus post-P5 trust-boundary hardening. It is not a
certification of GDPR, CCPA, WCAG, security, privacy, or any other legal or
technical standard, and it is not legal advice.

Phantom Trail has not completed an independent privacy, security, accessibility,
or legal review.

## Product boundary

Phantom Trail is a Chrome extension prototype. The repository does not include a
project-operated backend that receives or stores browsing events.

Optional features can send bounded data directly to:

- OpenRouter and model providers selected by that service; or
- unauthenticated peers and Trystero/WebRTC supporting infrastructure.

Chrome, the browser profile, browser sync/backups, the operating system, visited
websites, external providers, and connected peers are separate data controllers
or trust boundaries outside Phantom Trail's direct control.

## Data observed

The extension can observe or derive:

- HTTP(S) request URLs and request metadata exposed through `webRequest`;
- visited-page and requested-resource origins/domains;
- tab, frame, initiator, request type, and request method when available;
- first-party, third-party, or unknown party classification;
- attributed third-party script and iframe resource URLs observed from the
  isolated content-script world; and
- detector rule, evidence, confidence, category, and prototype severity labels.

Phantom Trail does not request web request bodies.

A recorded rule match is not proof of collection, identity, ownership, intent,
retention, sharing, sale, surveillance, attack, or legal non-compliance.

## Data stored in the browser

### Detector events

Stored event rows can contain:

- event ID and schema version;
- timestamps, first-seen, last-seen, and occurrence count;
- page and resource origins/domains;
- tab/frame/request attribution metadata;
- party relationship and confidence;
- detector ID, rule, match type, evidence, and confidence;
- category and prototype severity label; and
- data-protection metadata describing sanitization.

### URL minimization

The default policy is **origin only**.

Before event persistence, Phantom Trail removes:

- URL usernames and passwords;
- query strings;
- fragments;
- raw browser-API arguments and in-page detail strings from legacy rows;
- URL-like sensitive text in descriptions and detector evidence; and
- pathname details in origin-only mode.

Earlier prototype builds could create minimized browser-API rows. The current
build does not inject page-world API wrappers or create new rows from canvas,
audio, WebGL, WebRTC, font, battery, sensor, mouse, or form activity. Existing
legacy rows remain subject to the active retention policy and Clear All Data.

The optional origin-plus-path mode keeps a redacted pathname. Identifier-like
segments, long numbers, UUIDs, emails, tokens, and similar values are replaced or
removed.

Origin and domain labels can still reveal browsing patterns. Data minimization is
not anonymity or encryption.

### Retention

- Default detector-event retention: **7 days**.
- Available choices: 1, 7, 14, or 30 days.
- Stored event-row cap: 1,000.
- Retention cleanup is applied on reads, policy changes, migration, and a daily
  alarm.

Browser shutdown, crashes, disabled alarms, profile restoration, or browser
implementation differences can affect timing. The policy is tested as a
regression contract, not guaranteed under every browser lifecycle.

### Other local/session data

The extension can also store:

- non-secret extension settings;
- data-protection settings;
- toolbar badge and theme settings;
- personal site annotations;
- local daily snapshots and weekly report aggregations;
- P2P settings and versioned consent;
- notification settings and session throttle state;
- local rate-limit and error-recovery state;
- migration version;
- session-only OpenRouter credential and summary cache; and
- an optional persistent OpenRouter credential when the user explicitly chooses
  to remember it across browser restarts.

Cross-device feature sync was removed in P4. `chrome.storage.sync` is still
cleared by the complete deletion workflow so legacy or browser-restored values
are not left behind.

Chrome extension storage is managed by the browser. Phantom Trail does not add
independent encryption to all stored data. A compromised browser profile can
access extension-controlled values.

## OpenRouter aggregate summaries

### Default state and consent

OpenRouter summaries are off by default. A request is permitted only when:

1. the user configures a credential;
2. aggregate summaries are explicitly enabled; and
3. the user invokes the explicit aggregate-summary action.

A stored credential alone is not treated as consent.

### Credential handling

The credential is stored separately from general settings:

- session storage or memory by default;
- local persistent storage only after the user selects the remember option.

The credential is used in the Authorization header. It is not intentionally
included in prompts, logs, exports, reports, peer payloads, dependency evidence,
or release manifests.

A browser extension cannot protect a credential from a compromised browser
profile or extension process.

### Outbound payload

The default mode sends aggregate fields such as:

- payload/model version;
- observed row and occurrence counts;
- category and prototype severity distributions;
- evidence-index status, value, model band, and coverage confidence;
- evidence-unit and exclusion counts; and
- formula metadata needed to interpret the aggregate.

An optional mode can add up to five third-party resource-domain labels with
bounded row counts.

The canonical builder excludes:

- page URLs and page-domain labels;
- resource URLs;
- paths, queries, fragments, and URL credentials;
- raw event objects;
- event descriptions;
- detector evidence strings and API arguments;
- personal annotations;
- extension storage keys; and
- the OpenRouter credential.

OpenRouter and downstream providers process requests under their own terms,
privacy practices, retention, routing, account, pricing, and security controls.
Phantom Trail does not operate a proxy and cannot recall provider-side data.

Model output is untrusted, capped, parsed cautiously, and labeled generated. It
can still be inaccurate.

## Experimental P2P aggregate exchange

P2P is off by default. The user must acknowledge the current disclosure before
connection or sharing can be enabled.

Connection and local-sample sharing are separate controls. Inbound values are
accepted only after strict type, byte-size, range, score/grade consistency,
category, timestamp-rounding, and freshness validation. The extension caps
accepted peers, rate-limits updates per peer, ignores duplicate samples, and
removes expired samples from the local community aggregate.

A shared sample can contain:

- payload and consent version;
- rounded estimated evidence index and model band;
- evidence-coverage confidence;
- capped evidence-unit count;
- prototype severity-distribution percentages;
- up to three prototype category labels;
- timestamp rounded to the hour; and
- optional coarse region when separately enabled.

P2P excludes:

- N/A converted to zero;
- page/resource URLs and domains;
- paths, queries, fragments, and credentials;
- raw events;
- descriptions and detector evidence;
- OpenRouter credentials;
- personal annotations; and
- storage keys.

Peer identity and sample authenticity are not established. A well-formed, fresh
sample can still be false, coordinated, manipulated, or unrepresentative. Peer data is not a reputation
service, population benchmark, safety verdict, or adoption measurement.

Trystero/WebRTC can depend on signaling, relay, and NAT-traversal infrastructure.
Peers and providers can observe ordinary connection metadata, including IP
addresses. P2P does not mean that no servers or third parties are involved.

## Optional notifications

Notification permission is optional and requested only through a visible user
action. Permission does not automatically enable alerts.

When enabled, alerts can contain:

- a minimized page/resource display domain;
- detector/category label;
- prototype severity and detector confidence; and
- explicit language that the event is not proof of collection, attack, or danger.

Alerts are limited to qualifying high/critical prototype evidence, throttled,
and subject to configured quiet hours. A daily summary can display the local
snapshot's N/A or estimated state and occurrence count.

Operating-system notification history and platform behavior are outside
extension-controlled storage.

## Optional privacy-tool discovery

The optional `management` permission can expose installed extension names and
enabled state to Phantom Trail. It is requested only through a visible user
action and can be revoked.

Phantom Trail cannot observe the other extension's filtering decisions,
blocked-request count, missed trackers, or effectiveness.

## Local reports

Daily snapshots and weekly aggregations are generated locally from minimized
stored detector events. They can contain:

- date/week label;
- nullable evidence-index value and coverage state;
- category/severity occurrence counts; and
- top minimized domain labels.

N/A days remain N/A and are not converted to 0 or 100. Reports are not verified
privacy ratings or complete browsing histories.

## Exports and downloaded files

Manual exports can produce CSV, JSON, or a plain-text `.txt` report.

Exports can contain minimized origins/domains, timestamps, attribution, detector
rules, evidence, category/severity labels, and evidence-index details. These
values can reveal browsing patterns. Inspect files before sharing them.

The historical source option named `pdf` creates plain text, not a PDF.
Scheduled export, email delivery, cloud delivery, and the background export
shortcut were removed.

Downloaded files are outside extension-controlled storage and are not deleted by
Clear All Data.

## Personal site annotations

The feature historically called trusted sites stores personal annotations only.

An annotation does not:

- establish safety, privacy, identity, or reputation;
- improve an evidence index;
- suppress detector output;
- verify ownership or policy; or
- automatically apply to subdomains.

Automatic reputation-based suggestions are disabled.

## Permissions

Required permissions:

- `webRequest` — observe HTTP(S) request metadata;
- `storage` — persist settings, minimized evidence, and reports;
- `tabs` — active-page attribution and per-tab UI state; and
- `alarms` — retention cleanup and local report lifecycle.

Required host access:

- `http://*/*`
- `https://*/*`

Optional permissions:

- `management`
- `notifications`

The extension does not require `downloads`, `activeTab`, or `<all_urls>` in the
current manifest.

Broad HTTP(S) access remains a material risk and is required by the current
continuous-observation architecture.

## Deletion

The Data settings screen requires typed confirmation before deletion.

The workflow attempts to clear:

- `chrome.storage.local`;
- `chrome.storage.session`;
- `chrome.storage.sync`;
- extension alarms;
- toolbar badge state;
- the active in-memory P2P session; and
- optional management permission when granted.

Limitations:

- downloaded exports are separate files;
- data already sent to OpenRouter/providers or peers cannot be recalled;
- provider logs, peer copies, browser backups, OS notification history, website
  storage, cookies, cache, and browser history are outside the deletion
  operation; and
- a browser or operating-system defect can prevent a requested deletion.

Removing the extension from `chrome://extensions/` is an additional browser-level
removal step, not a recall mechanism for external data.

## Removed workflows

P4 removed these incomplete or misleading features:

- cross-device sync;
- scheduled export;
- email/cloud delivery;
- generic AI chat;
- arbitrary-question OpenRouter routing;
- link-destination prediction;
- generated coaching goals; and
- peer domain-reputation requests.

Legacy source values may be deleted or migrated, but no active UI should expose
these workflows.

## Security and evidence limits

P5 adds automated regression checks for source/package invariants, dependency
advisories, detector fixtures, browser lifecycle, popup accessibility, package
size, and artifact provenance.

Those checks are not:

- a penetration test;
- an independent privacy or security review;
- real-world detector accuracy;
- WCAG certification;
- production performance validation;
- provider compliance review; or
- legal compliance.

The human and independent gates in `release/manual-gates.v1.json` remain
blocking.

## What Phantom Trail does not claim

Phantom Trail does not claim that:

- a signal proves personal-data collection, tracking, sharing, sale, ownership,
  identity, or intent;
- an evidence index or model band is an independently validated privacy rating;
- a graph edge is a verified data flow;
- OpenRouter output is correct;
- peers or samples are authentic or representative;
- installed privacy tools' effectiveness is measured;
- the extension blocks or prevents tracking;
- the extension secures the browser or anonymizes the user;
- the project is GDPR, CCPA, WCAG, or otherwise compliant; or
- the extension is stable or production-ready.

## Source, security, and contact

- Repository: https://github.com/YrFnS/Phantom-Trail
- Capability matrix: [PROJECT_STATUS.md](PROJECT_STATUS.md)
- Security policy: [../SECURITY.md](../SECURITY.md)
- Threat model: [THREAT-MODEL.md](THREAT-MODEL.md)
- Release checklist: [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md)

Report non-sensitive discrepancies through repository issues. Prefer private
vulnerability reporting or a GitHub Security Advisory for sensitive findings.
Do not include credentials or private browsing data.
