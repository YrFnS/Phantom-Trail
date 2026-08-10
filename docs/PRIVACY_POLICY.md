# Privacy and Data Disclosure

**Status:** Experimental development disclosure  
**Last updated:** August 10, 2026

This document describes behavior visible in the current Phantom Trail source. It
is not a certification of GDPR, CCPA, or any other legal compliance, and it is
not legal advice.

## Project status

Phantom Trail is an experimental Chrome extension. It does not currently
operate a project-owned backend for storing user browsing data, but optional
features can send data to third-party services or connected peers.

The extension has not completed an independent privacy, security, or legal
review.

## Data stored in the browser

### Recorded detector events

A stored event can include:

- a full URL;
- a domain;
- timestamp;
- tracker type and heuristic severity label;
- human-readable description;
- in-page signal method; and
- API-call or frequency details.

Depending on the event source, a URL can include a path, query string, or
fragment. The network monitor stores the requested resource URL, while in-page
events can store the current page URL. The current event model does not always
reliably distinguish page and resource attribution.

The event store is capped at 1,000 records. Cleanup code targets events older
than 30 days when its alarm runs. This is not an absolute retention guarantee
until browser lifecycle tests verify it.

### Settings and feature data

The extension can also store:

- extension settings and heuristic thresholds;
- an OpenRouter API key;
- personal site annotations;
- badge and theme preferences;
- coaching goals and heuristic history;
- trend snapshots and reports;
- export schedules and history from incomplete modules;
- sync settings and device identifiers;
- P2P settings;
- cached analysis responses; and
- error-recovery and rate-limit state.

Chrome extension storage is managed by the browser. Phantom Trail does not
claim to add independent encryption to every stored value.

## Data that can leave the browser

Optional external features default off.

### OpenRouter event summaries

An OpenRouter request is allowed only when both conditions are true:

1. the user explicitly enables OpenRouter event summaries; and
2. an API key is stored.

A stored key alone is not treated as consent.

When the feature is enabled:

- the API key is sent to OpenRouter for authentication;
- event URLs are sanitized before analysis by removing query strings and
  fragments;
- the current prompt primarily summarizes domains, event counts, tracker types,
  and heuristic labels; and
- OpenRouter processes the request under its own terms and privacy practices.

The current general Q&A path summarizes event data rather than reliably using
the wording of every question. Phantom Trail does not proxy OpenRouter requests
through a project-owned server.

### Experimental P2P transport

After the user joins the experimental network and enables aggregate sharing,
Phantom Trail can exchange reduced fields such as:

- heuristic score and grade;
- capped event count;
- risk-label distribution;
- website category labels;
- rounded timestamp; and
- optional broad region.

Peer identity and data authenticity are not established. Connected peers must
be treated as untrusted, and received samples are not representative community
benchmarks.

Trystero/WebRTC can depend on third-party signaling, relay, and NAT traversal
infrastructure. Connected peers and infrastructure providers may observe normal
connection metadata such as IP addresses. “Peer-to-peer” does not mean that no
servers or third parties are involved.

### Chrome sync

If the experimental sync module is enabled, selected settings or feature data
can be written to `chrome.storage.sync` and handled by the user’s browser account
provider. The current sync implementation has known storage-key, data-shape,
conflict, and application inconsistencies.

### Exports and downloads

CSV and JSON exports can contain raw stored event values, including URLs and
descriptions. Users should inspect files before sharing them.

The legacy export format named `pdf` in source produces a plain-text `.txt`
report, not a PDF document. Scheduled export, email delivery, and cloud delivery
remain incomplete and are hidden from the P0 settings UI.

## Personal site annotations

The feature historically called “trusted sites” now stores personal domain
annotations only.

An annotation does not:

- establish that a site is safe, private, or reputable;
- improve a heuristic score;
- suppress detector output;
- automatically apply to subdomains; or
- verify a site’s identity or privacy practices.

Automatic hard-coded reputation suggestions are disabled.

## Requested permissions

The current manifest requests:

- `webRequest` to observe requests;
- `storage` to persist events and settings;
- `activeTab` and `tabs` to read active-tab information and communicate with
  pages;
- `alarms` for cleanup and incomplete scheduled tasks;
- `notifications` for incomplete browser-alert workflows;
- `downloads` for exports;
- `management` to inspect installed extension names and enabled state; and
- `<all_urls>` host access to run on websites and inspect requests.

These permissions are broad and must be minimized before any production
release.

## Retention and deletion

- Event cleanup targets records older than 30 days.
- The event store keeps at most 1,000 records.
- Settings and other feature data can remain until cleared or the extension is
  removed.
- Uninstalling the extension is the most complete current way to remove its
  extension-local storage.
- Export anything needed before deletion or removal.

## What the project does not claim

Phantom Trail does not claim that:

- a signal proves personal-data collection, sharing, or sale;
- a grade is an independently validated privacy rating;
- a graph edge is a verified data flow;
- coaching output measures user behavior or safety;
- link estimates audit a destination;
- peer data is authentic, representative, or trustworthy;
- installed privacy tools’ blocking effectiveness is measured;
- the extension is GDPR or CCPA compliant; or
- the extension prevents tracking or secures the browser.

## Security limitations

- Broad permissions increase the impact of defects.
- Stored URLs can contain sensitive information.
- API keys are stored in extension-local storage.
- P2P messages are unauthenticated.
- Optional third-party services and peers introduce additional risks.
- The project has not completed an independent security audit.

Do not rely on the prototype for sensitive browsing.

## Project-operated data collection

The current repository does not include a project-owned analytics backend or a
mechanism for selling user data. This statement does not cover OpenRouter,
browser sync providers, Trystero infrastructure, websites visited by the user,
or connected peers.

## Contact and source review

- Repository: https://github.com/YrFnS/Phantom-Trail
- Issues: https://github.com/YrFnS/Phantom-Trail/issues
- Capability status: [PROJECT_STATUS.md](PROJECT_STATUS.md)

The source code is the authoritative reference when this disclosure and runtime
behavior differ. Report discrepancies as issues.
