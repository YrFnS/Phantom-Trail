# Security Policy

## Project status

Phantom Trail is an experimental Chrome extension prototype. It is not a
security control, tracker blocker, privacy certification, legal-compliance tool,
or production-ready release.

This policy defines what security reviewers should protect and what evidence is
required before release claims change. It does not certify the current code.

## System and scope

Covered code includes:

- the Manifest V3 background service worker;
- isolated content scripts and DOM-resource observation;
- the popup, settings, reports, exports, and local Evidence Explorer;
- local, session, and sync storage used by the extension;
- optional OpenRouter aggregate summaries;
- optional Trystero/WebRTC aggregate sample exchange;
- build, test, packaging, and release workflows; and
- project-owned documentation and distribution artifacts.

The extension has no project-operated backend in this repository.

## Assets

Security-sensitive assets include:

- browsing-context labels and timestamps retained by the extension;
- page/resource attribution and detector evidence;
- OpenRouter API credentials;
- personal site annotations and settings;
- exported evidence files;
- optional peer payloads and connection metadata;
- extension permissions and host access;
- integrity of the packaged extension; and
- accuracy of public capability and limitation claims.

## Threat model and trust boundaries

Treat the following as attacker-controlled or untrusted:

- every visited page, frame, URL, DOM node, and script;
- messages originating from page or content-script contexts;
- request URLs, initiators, redirects, and response metadata;
- OpenRouter responses and third-party provider behavior;
- P2P peers, self-reported samples, signaling, relay, and WebRTC metadata;
- imported, migrated, or previously stored extension data;
- downloaded or externally supplied release artifacts;
- dependency packages and generated build output; and
- repository text, tests, reports, and findings until independently verified.

The extension process, browser profile, operating system, browser vendor sync,
and third-party services are separate trust boundaries. A compromised browser
profile can access extension data and is outside Phantom Trail's ability to
secure.

## Security invariants

The following properties must hold:

1. **No request bodies.** Phantom Trail must not request or retain web request
   bodies.
2. **Minimized event storage.** Stored event URLs must follow the active
   data-protection policy, and secrets, credentials, queries, fragments, and raw
   API arguments must not persist in event rows.
3. **Credential separation.** OpenRouter credentials must not be embedded in
   general settings, prompts, logs, exports, reports, peer payloads, or release
   evidence.
4. **Explicit outbound consent.** OpenRouter and P2P data flows must remain off
   by default and require current, explicit user action.
5. **Bounded outbound payloads.** Optional outbound builders must exclude raw
   events, URL paths, queries, fragments, descriptions, and detector evidence
   unless a future reviewed policy explicitly changes the contract.
6. **Permission minimization.** Optional feature permissions must not become
   required install-time permissions without a reviewed threat-model and user
   experience change.
7. **Untrusted page boundary.** Page-controlled DOM values and content-script
   messages must be validated and must not authorize arbitrary storage, network,
   file, browser actions, or detector evidence. No page-world detector bridge is
   approved.
8. **No remotely hosted executable code.** Project-owned extension pages must
   not load executable JavaScript, CSS, fonts, WebAssembly, or HTML from remote
   origins.
9. **No hidden product resurrection.** Removed sync, scheduled-export,
   destination-prediction, generic Q&A, and domain-reputation workflows must not
   reappear without a new documented phase and evidence gate.
10. **Truthful failure.** Missing evidence, permissions, credentials, network
    access, or provider responses must fail closed or produce an explicit
    unavailable/N/A state—not a favorable result.
11. **Artifact provenance.** Release evidence and extension artifacts must be
    produced from the same recorded commit and hashed by CI.
12. **Deletion integrity.** The visible deletion workflow must clear all storage
    areas controlled by the extension and accurately disclose what cannot be
    recalled.

## Active trust-boundary hardening

The active source intentionally does not inject page-world detector code, wrap
page-native browser APIs, or accept webpage-posted detector/P2P discovery events.
Those paths were removed because visited pages are attacker-controlled and could
forge evidence or experience compatibility breakage.

Unauthenticated P2P input is accepted only after strict canonical parsing of the
complete aggregate shape, byte size, ranges, score/grade consistency, timestamp
freshness, categories, and optional region. Accepted peers are locally capped
and rate-limited. These controls reduce poisoning and resource-exhaustion risk;
they do not authenticate a peer or prove a sample is truthful.

## Reportable findings and severity context

Report issues that can realistically cause:

- exposure of browsing data, credentials, or personal annotations;
- unauthorized outbound requests or peer sharing;
- privilege escalation through extension permissions;
- arbitrary script execution in an extension context;
- cross-context message injection that changes data or browser state;
- bypass of URL minimization, retention, or deletion controls;
- release artifact substitution or evidence mismatch;
- silent re-enablement of optional external features;
- materially misleading safety, accuracy, privacy, or compliance output; or
- denial of service that persistently breaks detection, deletion, or settings.

Severity depends on reachability, required user interaction, affected data,
permission scope, persistence, and whether exploitation crosses a browser or
extension trust boundary.

## Known limitations and accepted development risk

The following are known limitations, not proof that related findings are safe:

- broad HTTP(S) host access remains required by the prototype's continuous
  request-attribution design;
- detector rules can produce false positives and false negatives;
- registrable-domain grouping uses a pinned Public Suffix List dependency, but
  list age, CNAME cloaking, corporate ownership, and iframe attribution remain
  unresolved;
- P2P payloads are strictly bounded and freshness-checked, but peer identity and
  payload authenticity are not established;
- OpenRouter retention and provider-side processing are outside this repository;
- Chrome extension storage is not independently encrypted by Phantom Trail;
- project dependencies can contain code paths not exercised by the prototype;
- build warnings from dependencies require review before production use;
- automated accessibility and security checks are bounded regression gates; and
- no independent penetration test, privacy audit, or legal review is complete.

These limitations must remain visible in release evidence and must not be used
to suppress a reachable, impactful vulnerability.

## Out of scope

Unless a report demonstrates a Phantom Trail-specific security impact, the
following are generally outside this repository's control:

- vulnerabilities in Chrome, Chromium, the operating system, or browser sync;
- privacy practices of websites visited by the user;
- OpenRouter, model providers, Trystero signaling/relay providers, or peers;
- exported files after they leave extension-controlled storage; and
- claims based solely on the intentionally unvalidated detector/scoring model
  without a security boundary or data-integrity impact.

## Reporting

Prefer GitHub's private vulnerability-reporting or Security Advisory workflow
when available. Do not include credentials, personal browsing data, or a public
weaponized proof of concept.

For non-sensitive defects, open a repository issue with the affected commit,
Chrome version, reproduction steps, observed impact, and whether optional AI,
P2P, notifications, or management permission was enabled.

## Release policy

A passing automated security gate is necessary but not sufficient for release.
A stable or production-ready claim also requires the human and independent gates
listed in `docs/P5-EVIDENCE-AND-RELEASE.md` and the release checklist.
