# Installing Phantom Trail 0.1.0

> **Experimental development software**
>
> Phantom Trail can report false positives, miss tracking behavior, or attribute
> evidence incorrectly. Do not rely on it as a tracker blocker, security
> control, privacy certification, anonymity tool, or legal-compliance product.

## Prerequisites

- Node.js 22
- `pnpm` at the version pinned in `package.json`
- A current supported Google Chrome or Chromium-based browser
- Git

## Build and validate from source

```bash
git clone https://github.com/YrFnS/Phantom-Trail.git
cd Phantom-Trail
pnpm install --frozen-lockfile
pnpm test
pnpm evidence:detectors
pnpm type-check
pnpm lint
pnpm build
pnpm zip
pnpm evidence:security
pnpm evidence:performance
```

The dependency audit uses the current package-registry advisory service and
therefore requires network access:

```bash
pnpm evidence:dependencies
```

The isolated Chromium lifecycle check requires a supported Chrome/Chromium
binary and a graphical display or Xvfb:

```bash
CHROME_BIN=/path/to/chrome pnpm evidence:browser
```

After all evidence files exist, generate a commit-bound evidence manifest:

```bash
SOURCE_SHA=$(git rev-parse HEAD) pnpm evidence:release
```

A passing automated run proves only the narrow recorded checks. It does not
establish real-world detector accuracy, accessibility compliance, security,
privacy, performance, or production readiness.

## Load the unpacked extension

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `.output/chrome-mv3`.
5. Pin the Phantom Trail action icon when desired.
6. Reload already-open websites before testing content-script behavior.

Use a separate browser profile for review. Do not test the prototype with
sensitive browsing data.

## Current views

The popup contains:

- **Feed:** stored detector evidence;
- **Map:** inferred page/resource relationships;
- **Stats:** evidence-index breakdown and exclusions;
- **Explore:** deterministic local evidence questions and an explicit optional
  OpenRouter aggregate-summary action;
- **Reports:** local daily snapshots and weekly aggregations; and
- **Peers:** experimental aggregate P2P sample exchange.

The earlier generic AI chat, Coach, link-prediction, sync, and scheduled-export
surfaces were removed in P4.

## Permissions

### Required at install time

```text
webRequest
storage
tabs
alarms
http://*/*
https://*/*
```

These permit HTTP(S) request observation, storage, active-page attribution,
per-tab badge updates, retention/report alarms, and detector execution on web
pages.

### Optional

```text
management
notifications
```

- `management` allows a user-requested view of recognized installed extension
  names and enabled state. It does not reveal blocker decisions or effectiveness.
- `notifications` allows user-requested evidence alerts and daily local-summary
  notifications.

Neither optional permission is granted or enabled automatically.

## Local data behavior

New and migrated detector events use origin-only URL retention by default.
Stored rows can still contain origins, domain labels, timestamps, request type,
attribution, detector rules, category/severity labels, and minimized evidence.

The default event-retention period is seven days; available choices are 1, 7,
14, or 30 days. The store is also capped at 1,000 rows.

The Data settings screen can:

- switch between origin-only and origin-plus-redacted-path retention;
- change the event-retention period;
- preview OpenRouter outbound fields;
- inspect extension storage key/byte counts;
- request/revoke optional management permission; and
- permanently clear extension-controlled local, session, and sync storage using
  a typed confirmation.

Deletion cannot recall downloaded exports or information already processed by
an external provider or peer.

## Optional OpenRouter aggregate summaries

OpenRouter is off by default. A request requires:

1. a configured API key;
2. explicit enablement; and
3. a direct summary action from Explore.

The key is kept in extension session storage by default. Persisting it across
browser restarts requires a separate **remember** choice.

The default payload contains aggregate counts and evidence-index metadata. An
optional mode can include up to five third-party resource-domain labels. Raw
events, URLs, paths, queries, fragments, descriptions, detector evidence,
personal annotations, storage keys, and the credential are excluded.

Model availability, account limits, cost, routing, retention, and provider
behavior are controlled by OpenRouter and its providers. Live provider behavior
is not covered by the default automated fixture.

## Experimental peer exchange

P2P connection and local aggregate sharing are separate opt-in settings. Both
require the current disclosure to be acknowledged.

Shared samples can contain a rounded estimated index, model band, evidence
coverage, bounded counts, category labels, severity distribution, and a rounded
timestamp. URLs, domains, raw events, descriptions, detector evidence,
credentials, and N/A-as-zero values are excluded.

Peer identity and sample authenticity are not established. Network policy,
firewalls, browser settings, or WebRTC restrictions can prevent connection.

## Evidence notifications

Notifications require a visible permission request and explicit settings.
Alerts are limited to qualifying high/critical prototype evidence, respect quiet
hours, and are throttled. They do not claim a confirmed incident, attack, or
unsafe website.

## Exports

The popup header can generate:

- CSV;
- JSON; and
- a plain-text `.txt` report.

The legacy source identifier `pdf` does not create a PDF. Scheduled export,
email delivery, and cloud delivery were removed.

Exports contain minimized local event representations but can still reveal
origins, domains, timestamps, detector information, and browsing patterns.
Review every file before sharing it.

## Keyboard commands

Only implemented commands are declared:

- `Ctrl+Shift+P` / `Command+Shift+P`: open the Phantom Trail popup;
- `Ctrl+Shift+A` / `Command+Shift+A`: open the current-page evidence dashboard.

Browser or operating-system shortcut conflicts can override these bindings.

## Troubleshooting

### Build or evidence command fails

Run the commands individually and fix the first failing gate:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm evidence:detectors
pnpm type-check
pnpm lint
pnpm build
pnpm zip
pnpm evidence:security
pnpm evidence:performance
```

Generated machine-readable reports are written under `.artifacts/`.

### No events appear

- Reload the extension after rebuilding.
- Refresh the web page after loading the unpacked extension.
- Confirm the page uses HTTP or HTTPS.
- Inspect the extension service worker and page console.
- Remember that no recorded event does not prove that tracking is absent.

### Too many events appear

- Review detector ID, rule, confidence, page/resource attribution, and party
  classification in Feed or Stats.
- Record the exact URL pattern and expected classification in a repository
  issue without sharing sensitive query strings or credentials.
- A curated regression pass does not rule out real-site false positives.

### OpenRouter summary is unavailable

- Confirm the key is configured.
- Confirm aggregate summaries are enabled.
- Use the explicit summary control rather than an unsupported Explorer question.
- Confirm the selected model is available to the account.
- Review local rate-limit state and provider errors.

### Notifications remain unavailable

- Grant the optional notification permission from Settings.
- Enable alerts separately after permission is granted.
- Check quiet hours and the high/critical-only setting.

### P2P has no peers

- Confirm the current disclosure was acknowledged.
- Enable connection and, separately, sample sharing.
- Review firewall, WebRTC, and browser policy restrictions.
- Zero peers does not establish service status or population size.

## Clear data or remove the extension

Use **Settings → Data → Clear All Data** for extension-controlled storage,
alarms, badges, credentials, optional permissions, and the current peer session.
Then remove the extension from `chrome://extensions/` when desired.

Downloaded exports, provider-side data, peer-held copies, browser backups,
website data, cookies, and browser history are outside the extension deletion
operation.

## Release status

No source build or CI artifact should be described as stable or production-ready
while the unresolved gates in `release/manual-gates.v1.json` remain.

Review:

- [Project Status](docs/PROJECT_STATUS.md)
- [Privacy and Data Disclosure](docs/PRIVACY_POLICY.md)
- [Security Policy](SECURITY.md)
- [Threat Model](docs/THREAT-MODEL.md)
- [P5 Evidence and Release Discipline](docs/P5-EVIDENCE-AND-RELEASE.md)
- [Release Checklist](docs/RELEASE-CHECKLIST.md)

## Reporting problems

Include:

- exact commit SHA and artifact hash;
- Chrome version and operating system;
- whether the extension was unpacked or packaged;
- reproduction steps;
- expected and actual behavior;
- relevant console errors; and
- the state of OpenRouter, P2P, notifications, management permission, and badge.
