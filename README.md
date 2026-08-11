# 👻 Phantom Trail

> **Experimental prototype — version 0.1.0**
>
> Phantom Trail is under active remediation. It is not a production privacy
> product, tracker blocker, security scanner, legal-compliance tool, or validated
> privacy-rating service.

Phantom Trail is a Chrome extension prototype for recording and visualizing
**possible web-tracking signals**. It combines request classification, in-page
instrumentation, local history, heuristic scoring, optional OpenRouter event
summaries, and an experimental peer-to-peer transport.

A detector signal can be a false positive or false negative. It means that a
rule matched a request, hostname, URL pattern, or browser API operation. It does
**not** by itself prove that a company collected, retained, shared, or sold data.

## Current implementation

The repository currently contains:

- A WXT/Manifest V3 extension with a React popup and six main views.
- A manually maintained catalog of **56 domain entries across five code
  categories**.
- Eleven in-page instrumentation signal types covering canvas, WebRTC, fonts,
  audio, WebGL, storage, mouse, forms, device APIs, battery, and sensors.
- Local event storage with a 1,000-record cap and cleanup code for events older
  than 30 days.
- A live signal feed, an inferred relationship graph, charts, and an
  unvalidated A–F heuristic.
- Manual CSV and JSON exports. The option historically called PDF produces a
  plain-text `.txt` report and is labeled accordingly in the UI.
- Optional OpenRouter event summaries, available only when the user explicitly
  enables AI **and** stores an API key.
- Experimental coaching, link-estimate, cross-device sync, and P2P modules.
- Personal site annotations that do not change scores or suppress detection.

See [Project Status](docs/PROJECT_STATUS.md) for the capability matrix.

## P0 truthfulness changes

The P0 branch removes or qualifies claims that were not supported by the
implementation:

- Product status and version are aligned at experimental `0.1.0`.
- Unsupported production-readiness, performance, compliance, detection-rate,
  and release claims are removed.
- The tracker catalog is described by its actual source count and categories.
- Grades, trends, graph links, coaching output, and link estimates are labeled
  as heuristic.
- Synthetic category percentiles are hidden.
- Fabricated blocker-effectiveness, blocked-request, peer-adoption, and peer
  percentile metrics are removed.
- Community samples are labeled unauthenticated and unrepresentative.
- P2P, OpenRouter summaries, link estimates, and the toolbar badge default off.
- A stored API key alone cannot authorize an OpenRouter request.
- “Trusted sites” are converted to personal annotations and cannot boost a
  score or suppress monitoring.
- Incomplete scheduled export and automatic notification controls are hidden.
- Data-flow and permission disclosures replace legal-compliance claims.

These changes make the prototype more honest; they do **not** fix detector
accuracy, attribution, or scoring methodology.

## Important limitations

### Detection and attribution

The current event model does not reliably separate the visited page from every
third-party resource it loads. Some request and API heuristics are broad. Normal
canvas, WebRTC, form, storage, audio, WebGL, and other API use can trigger a
signal.

### Scores and trends

Grades and trend values come from hand-written penalties applied to recorded
events. They have not been calibrated against an independent dataset, audited
methodology, or reproducible benchmark. Unknown or incomplete evidence is not
yet modeled consistently.

### Graph

Graph nodes come from stored events. Edges are inferred from event URLs and are
not proof of a data transfer, ownership relationship, or data-broker chain.

### AI and Q&A

OpenRouter receives sanitized event summaries only after explicit opt-in. The
current model path summarizes recorded domains, counts, types, and labels; it
does not provide dependable general-purpose Q&A or a verified website audit.
Keyword-routed local analyzers handle some supported prompts.

### Community data

The Trystero P2P layer is experimental. Peer identity and sample authenticity
are not established. Connected peers and signaling/relay infrastructure may
observe normal WebRTC connection metadata. Peer samples are not a population
benchmark or reputation authority.

### Incomplete modules

Cross-device sync, automatic snapshots, automatic summaries, scheduled export,
notifications, and several lifecycle integrations remain incomplete. Category
comparison data in source is synthetic and is hidden from the dashboard.

## Data and privacy disclosure

The extension currently requests broad permissions, including access to all
sites, web requests, tabs, downloads, notifications, alarms, storage, and
installed-extension metadata.

Recorded event objects are stored locally. Depending on the event source, a
stored URL can contain a path, query string, or fragment. CSV and JSON exports
can include those stored values, so exported files should be reviewed before
sharing.

Optional external flows are disabled by default:

- **OpenRouter:** sanitized event summaries are sent only when AI is enabled and
  an API key is present.
- **P2P:** reduced aggregate fields may be shared after the user joins the
  experimental network.

Read [Privacy and Data Disclosure](docs/PRIVACY_POLICY.md) before installing or
enabling optional network features.

## Installation

No release should currently be treated as production-ready.

```bash
git clone https://github.com/YrFnS/Phantom-Trail.git
cd Phantom-Trail
pnpm install --frozen-lockfile
pnpm type-check
pnpm lint
pnpm build
```

Then:

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `.output/chrome-mv3`.

Detailed steps and disclosures are in [INSTALL.md](INSTALL.md).

## Automated validation

`.github/workflows/validate.yml` currently checks:

- lockfile consistency;
- dependency installation from the committed lockfile;
- TypeScript type checking;
- ESLint;
- the production Chrome build;
- generated manifest name and version;
- ZIP creation; and
- upload of the unpacked build and ZIP as a workflow artifact.

That gate proves only that the repository installs and builds under the workflow
environment. The repository still lacks a complete unit-test suite, detector
accuracy fixtures, browser integration tests, runtime permission tests,
performance benchmarks, and independent security/privacy review.

## Development commands

```bash
pnpm dev
pnpm build
pnpm zip
pnpm type-check
pnpm lint
pnpm lint:fix
pnpm format
pnpm validate
```

## Remediation roadmap

- **P0 — Truthfulness baseline:** truthful copy, metadata, defaults,
  disclosures, capability matrix, and a deterministic build gate.
- **P1 — Detection and attribution:** distinguish page and resource domains,
  reduce false positives, attach evidence/confidence, and improve deduplication.
- **P2 — Scoring:** add an explicit unknown state and create a reproducible,
  evidence-based scoring method.
- **P3 — Data protection:** minimize permissions and stored URLs, tighten
  optional sharing, and test retention/deletion behavior.
- **P4 — Feature completion:** finish or remove incomplete sync, reporting,
  notifications, scheduled export, AI, prediction, and community workflows.
- **P5 — Evidence:** add unit/browser tests, labeled accuracy fixtures,
  performance benchmarks, release gates, and independent review.

## Contributing

Keep product claims tied to reproducible evidence. New capabilities should be
labeled experimental until tests, runtime validation, and documentation support
them.

## License

Phantom Trail is licensed under the [MIT License](LICENSE).
