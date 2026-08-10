# Privacy and Data Disclosure

**Status:** Experimental development disclosure  
**Last updated:** August 10, 2026

This document describes the behavior visible in the current Phantom Trail source. It is not a certification of GDPR, CCPA, or any other legal compliance, and it is not legal advice.

## Project status

Phantom Trail is an experimental Chrome extension. It does not currently operate a project-owned backend for storing user browsing data, but optional features can send data to third-party services or connected peers.

The extension has not completed an independent privacy, security, or legal review.

## Data stored in the browser

The prototype can store the following in Chrome extension storage:

### Tracking events

A tracking event can include:

- A full URL
- A domain
- Timestamp
- Tracker type and risk label
- Human-readable description
- In-page signal method
- API-call or frequency details

Depending on the event source, a URL may include paths, query parameters, or fragments. The current network monitor stores the requested resource URL, while in-page events can store the current page URL.

The event store is capped at 1,000 records. Cleanup code removes events older than 30 days when its scheduled alarm runs.

### Settings and feature data

The extension may also store:

- Extension and notification settings
- OpenRouter API key
- Trusted-site configuration
- Badge and theme preferences
- Privacy goals and coaching data
- Trend snapshots and reports
- Export schedules and history
- Sync settings and device identifiers
- P2P settings
- Cached AI responses and recovery state

Chrome extension storage is managed by the browser. Phantom Trail does not claim that every stored value is independently encrypted by the extension.

## Data that can leave the browser

### OpenRouter AI

When a user supplies an OpenRouter API key and an AI code path runs:

- The API key is sent to OpenRouter for authentication.
- Event objects are sanitized before AI processing.
- The current prompt is primarily a summary of tracker domains, counts, types, and risk levels.
- OpenRouter processes the request under its own terms and privacy practices.

Phantom Trail does not proxy these requests through a project-owned server.

### Peer-to-peer network

When the experimental community network is enabled, Phantom Trail can share aggregate fields with connected peers, including:

- Privacy score and grade
- Tracker count
- Risk distribution
- Website categories
- Rounded timestamp
- Optional broad region

Peer data is self-reported and unauthenticated. Connected peers must be treated as untrusted. The Trystero transport may rely on third-party signaling infrastructure even though Phantom Trail does not operate a central application server.

### Chrome sync

When cross-device sync is enabled, selected settings or feature data can be written to `chrome.storage.sync` and handled by the user’s browser account provider. The current sync implementation is experimental and has known data-shape and key inconsistencies.

### Exports and downloads

CSV and JSON exports can contain raw stored tracking events, including URLs. The current PDF option produces a plain-text report. Scheduled downloads use Chrome’s downloads API.

Users are responsible for protecting exported files.

## Requested permissions

The current manifest requests:

- `webRequest` to observe requests
- `storage` to persist events and settings
- `activeTab` and `tabs` to read active-tab information and communicate with pages
- `alarms` for cleanup and scheduled tasks
- `notifications` for browser alerts
- `downloads` for exports
- `management` to inspect installed extension names and enabled state
- `<all_urls>` host access to run on websites and inspect requests

These permissions are broad and are scheduled for minimization before any production release.

## Retention and deletion

- Tracking-event cleanup targets data older than 30 days.
- The event store keeps at most 1,000 records.
- Other settings and feature data can remain until cleared or the extension is removed.
- Uninstalling the extension is the most complete current way to remove its extension-local storage.
- Export data before deletion if you need a copy.

Scheduled cleanup depends on the extension alarm and service-worker lifecycle; it should not be treated as an absolute retention guarantee until runtime tests verify it.

## What the project does not currently claim

Phantom Trail does not claim that:

- A detected signal proves personal data collection or sale.
- A privacy grade is independently validated.
- Community data is representative or trustworthy.
- Installed privacy tools’ blocking effectiveness is measured.
- The extension is GDPR or CCPA compliant.
- The extension prevents tracking or secures the browser.

## Security limitations

- Broad permissions increase the impact of defects.
- Stored URLs can contain sensitive information.
- API keys are stored in extension-local storage.
- P2P messages are unauthenticated.
- Optional third-party services have their own security and privacy risks.
- The project has not completed an independent security audit.

Do not use the prototype for sensitive browsing without understanding these limitations.

## Project-operated data collection

The current repository does not include a project-owned analytics backend or a mechanism for selling user data. This statement does not cover OpenRouter, browser sync providers, Trystero infrastructure, websites visited by the user, or connected peers.

## Contact and source review

- Repository: https://github.com/YrFnS/Phantom-Trail
- Issues: https://github.com/YrFnS/Phantom-Trail/issues
- Capability status: [PROJECT_STATUS.md](PROJECT_STATUS.md)

The source code is the authoritative reference when this disclosure and runtime behavior differ. Please report discrepancies as issues.
