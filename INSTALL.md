# Installing Phantom Trail 0.1.0

> **Experimental software**
>
> Phantom Trail is a development prototype. Its detections, grades, trends,
> graph links, coaching output, and link estimates are heuristic. It can report
> false positives or miss tracking behavior. Do not rely on it as a security
> control, privacy certification, or legal-compliance tool.

## Build from source

### Prerequisites

- A current Google Chrome or Chromium-based browser
- Node.js 22 recommended
- `pnpm` as pinned by `package.json`

### Steps

```bash
git clone https://github.com/YrFnS/Phantom-Trail.git
cd Phantom-Trail
pnpm install --frozen-lockfile
pnpm type-check
pnpm lint
pnpm build
```

Load the built extension:

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `.output/chrome-mv3`.
5. Pin the Phantom Trail icon if desired.

A successful build confirms only that the source compiled in that environment.
It does not validate detector accuracy, scores, privacy properties, performance,
or every browser workflow.

## Automated build gate

The repository workflow `.github/workflows/validate.yml` checks lockfile
consistency, frozen-lockfile install, type checking, lint, production build,
generated manifest metadata, ZIP creation, and artifact upload.

It is not a behavioral test suite. Manual Chrome review remains required.

## What to expect

The extension can record request and browser-API rule matches, store recent
events locally, show a signal feed and inferred graph, calculate an experimental
score, and export local data.

Treat these as incomplete or experimental:

- page/resource attribution and cross-site correlation;
- A–F heuristic scoring;
- general-purpose Q&A and coaching;
- link estimates;
- peer-to-peer community samples;
- cross-device sync;
- automatic snapshots and reports;
- notification workflows;
- scheduled exports; and
- PDF, email, and cloud delivery.

Synthetic category comparisons are hidden in P0.

## Optional OpenRouter summaries

OpenRouter requests default off and require both:

1. enabling **OpenRouter event summaries** in Settings; and
2. storing an OpenRouter API key.

A stored key alone does not enable requests.

When enabled, Phantom Trail removes query strings and fragments from event URLs
before analysis and currently sends a prompt built mainly from domains, event
counts, tracker types, and heuristic labels. The API key is sent to OpenRouter
to authenticate the request.

Review both documents before enabling it:

- [Privacy and Data Disclosure](docs/PRIVACY_POLICY.md)
- OpenRouter’s terms and privacy documentation

## Experimental peer network

P2P defaults off. Joining the network can exchange reduced aggregate fields
such as heuristic score, grade, capped event count, label distribution,
category labels, rounded timestamp, and optional broad region.

Peer identity and messages are unauthenticated. They are not verified website
reputation, community adoption, or representative benchmarks.

WebRTC/Trystero can use third-party signaling, relay, and NAT traversal
infrastructure. Peers and providers may observe normal connection metadata such
as IP addresses.

## Personal site annotations

The star control and Settings list save personal domain annotations only. They
do not improve grades, suppress monitoring, verify safety, or automatically
apply to subdomains.

## Toolbar badge

The experimental toolbar badge defaults off. When enabled, it displays the same
unvalidated heuristic used by the popup. Green or an A grade does not mean that
a website is safe or private.

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

These permissions must be minimized before a production release.

## Local data and exports

Recorded events are stored in Chrome extension storage. Stored URLs can include
paths, query strings, or fragments depending on the event source.

The event store is capped at 1,000 records and contains cleanup logic targeting
events older than 30 days. Runtime lifecycle testing has not yet established an
absolute retention guarantee.

CSV and JSON exports can contain raw stored URLs and descriptions. Inspect files
before sharing them. The plain-text report option downloads `.txt`; it is not a
PDF document.

## Troubleshooting

### Build fails

Run:

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm lint
pnpm build
```

Review the first reported error rather than assuming generated output is valid.

### No signals appear

- Reload the extension after building.
- Refresh the website being tested.
- Remember that no result does not prove that a site has no tracking.
- Review the extension service-worker and page console for errors.

### Too many signals appear

Current rules can classify normal API usage or broad URL patterns as possible
tracking. Record the page, event description, and reproduction steps in a
GitHub issue.

### OpenRouter summaries do not work

- Confirm the explicit AI toggle is enabled.
- Confirm an API key is configured.
- Confirm the selected model is available to the OpenRouter account.
- Local prototype views can still run with AI disabled.

### P2P remains disconnected

- Confirm the experimental network was explicitly enabled.
- Network or browser policies can prevent WebRTC connectivity.
- Zero peers does not indicate an application-wide outage or population size.

## Remove the extension

Open `chrome://extensions/`, locate Phantom Trail, and select **Remove**. Export
anything needed before removal.

## Reporting problems

Open a repository issue and include:

- Chrome version;
- Phantom Trail commit or version;
- reproduction steps;
- expected and actual behavior;
- relevant console errors; and
- whether AI, sync, P2P, or the badge was enabled.
