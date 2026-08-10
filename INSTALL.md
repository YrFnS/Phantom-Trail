# Installing Phantom Trail 0.1.0

> **Experimental software**
>
> Phantom Trail is a development prototype. Its detections and privacy scores are heuristic, it can report false positives or miss trackers, and several visible modules are incomplete. Do not rely on it as a security control or legal-compliance tool.

## Build from source

### Prerequisites

- A current Google Chrome or Chromium-based browser
- Node.js 18 or newer
- `pnpm`

### Steps

```bash
git clone https://github.com/YrFnS/Phantom-Trail.git
cd Phantom-Trail
pnpm install
pnpm type-check
pnpm lint
pnpm build
```

Load the built extension:

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3` directory.
5. Pin the Phantom Trail icon if desired.

A successful build only confirms that the source compiled. It does not validate detection accuracy, privacy scores, performance, or every browser workflow.

## What to expect

The extension can record request matches and in-page API signals, store recent events locally, show a live feed and graph, calculate an experimental score, and export CSV or JSON data.

The following should be treated as incomplete or experimental:

- Website attribution and cross-site correlation
- A–F privacy scoring
- Natural-language AI chat and coaching
- Peer-to-peer community data
- Privacy-tool effectiveness analysis
- Cross-device sync
- Scheduled reports and automatic trend snapshots
- Notification workflows
- PDF, email, and cloud export delivery

## Optional OpenRouter AI

AI requests require an OpenRouter API key entered in extension settings.

When an AI code path runs, Phantom Trail sanitizes event URLs and currently sends OpenRouter a prompt built mainly from tracker domains, counts, types, and risk levels. Your API key is also sent to OpenRouter to authenticate the request.

Do not enter an API key or enable AI for sensitive browsing until you have reviewed:

- [Privacy and Data Disclosure](docs/PRIVACY_POLICY.md)
- OpenRouter’s own terms and privacy documentation

## Experimental peer network

Joining the peer network is optional. Shared data is intended to contain aggregate fields such as a score, grade, tracker count, risk distribution, website categories, timestamp, and optional broad region.

Peer messages are self-reported and unauthenticated. They must not be interpreted as verified website reputation, measured community adoption, or a representative benchmark.

## Permissions

The prototype requests broad permissions, including:

- `<all_urls>`
- `webRequest`
- `storage`
- `activeTab`
- `tabs`
- `alarms`
- `notifications`
- `downloads`
- `management`

These permissions are under review and should be minimized before a production release.

## Local data and exports

Tracking-event objects are stored in Chrome extension storage. Stored and exported URLs may include paths, query parameters, or fragments depending on how the event was created.

The event store is capped at 1,000 records and includes cleanup logic for events older than 30 days. CSV and JSON exports can contain raw stored event data. The current PDF option is a text report, not a real PDF document.

## Troubleshooting

### Build fails

Run:

```bash
pnpm install
pnpm type-check
pnpm lint
pnpm build
```

Review the first reported error rather than assuming generated output is valid.

### No events appear

- Reload the extension after building.
- Refresh the website being tested.
- Remember that no result does not prove that a site has no tracking.
- Review the extension service-worker and page console for errors.

### Too many events appear

The current heuristics can classify normal API usage or broad URL patterns as tracking. Record the page, event description, and reproduction steps in a GitHub issue.

### AI does not work

- Confirm that an OpenRouter key is configured.
- Confirm that the selected OpenRouter model is available to your account.
- The non-AI prototype views can still run without a key.

## Remove the extension

Open `chrome://extensions/`, locate Phantom Trail, and select **Remove**. Export anything you need before removal.

## Reporting problems

Open an issue at the repository and include:

- Chrome version
- Phantom Trail commit or version
- Reproduction steps
- Expected and actual behavior
- Relevant console errors
- Whether AI, sync, or P2P was enabled
