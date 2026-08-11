# Phantom Trail Release Checklist

**Current release posture:** Experimental development only  
**Stable-release status:** Blocked

This checklist applies to every artifact described as a release candidate. A
checked automated item is evidence for that narrow check only.

## 1. Source and stack integrity

- [ ] P0–P5 are reviewed and published in dependency order.
- [ ] The release candidate branch is based on the intended public `main` head.
- [ ] No draft implementation PR is being bypassed.
- [ ] Working tree is clean before the build.
- [ ] Commit SHA is recorded in the evidence manifest.
- [ ] Version agrees across `package.json`, WXT source manifest, generated
      manifest, changelog, release notes, and artifact name.
- [ ] License metadata agrees with `LICENSE`.

## 2. Automated source gates

- [ ] Frozen-lockfile installation passes.
- [ ] Lockfile regeneration produces no diff.
- [ ] All executed Node tests pass with the test count recorded.
- [ ] Curated detector corpus passes and publishes its full case report.
- [ ] TypeScript passes.
- [ ] ESLint passes without errors.
- [ ] Production Chrome build passes.
- [ ] Package security gate passes.
- [ ] High/critical production dependency audit passes or the candidate remains
      blocked with a reviewed exception.
- [ ] Package-size and deterministic performance budgets pass.
- [ ] ZIP creation succeeds.

## 3. Exact-artifact browser evidence

- [ ] The exact CI artifact is loaded in an isolated Chromium profile.
- [ ] Service worker starts.
- [ ] Content script loads on the supported HTTP(S) fixture.
- [ ] Page/resource attribution and event persistence pass.
- [ ] Report alarms are registered.
- [ ] Daily and weekly report behavior passes.
- [ ] Optional permissions remain off by default.
- [ ] Session-only storage clears across a browser restart.
- [ ] Popup renders with the expected current navigation.
- [ ] Retired P4 surfaces are absent.
- [ ] No uncaught runtime or console errors are recorded.
- [ ] Browser timing budgets pass.

## 4. Accessibility evidence

- [ ] Automated popup DOM/AX contract passes.
- [ ] Interactive controls have accessible names.
- [ ] Form controls have labels.
- [ ] IDs are unique.
- [ ] Primary header/navigation/main landmarks exist.
- [ ] Primary controls are keyboard focusable.
- [ ] Normal Chrome keyboard review passes.
- [ ] Screen-reader review passes.
- [ ] 200%/400% zoom, contrast, reduced motion, and focus visibility are reviewed.

Automated accessibility checks are not WCAG certification.

## 5. Security and privacy evidence

- [ ] `SECURITY.md` and the threat model match the candidate architecture.
- [ ] No request-body collection exists.
- [ ] Stored event minimization and deletion tests pass.
- [ ] OpenRouter credentials are absent from general settings, logs, prompts,
      exports, peer payloads, and evidence artifacts.
- [ ] OpenRouter and P2P remain explicit opt-in flows.
- [ ] Manifest required and optional permissions match the reviewed allowlist.
- [ ] No remote executable code or project-owned dynamic evaluation is present.
- [ ] No unreviewed outbound project-owned network call exists.
- [ ] Removed P4 feature paths remain absent.
- [ ] Independent extension-security/privacy review is complete.

A passing automated security gate is not a penetration test or certification.

## 6. Product truthfulness

- [ ] README and installation guide match the artifact.
- [ ] Privacy disclosure matches storage and outbound behavior.
- [ ] Project-status matrix is current.
- [ ] Changelog describes changes and limitations.
- [ ] No unsupported accuracy, privacy, safety, performance, compliance,
      anonymity, security, blocker, peer, or production-readiness claim exists.
- [ ] N/A and uncertainty states remain visible.
- [ ] Curated regression metrics are not presented as real-world accuracy.

## 7. External and provider review

- [ ] GitHub Releases, tags, and attached assets are reviewed while authenticated.
- [ ] Chrome Web Store draft/listing copy and permissions are reviewed.
- [ ] Demo, submission, video, download, portfolio, and social copy is reviewed.
- [ ] Live OpenRouter behavior, routing, retention, cost, and failure states are
      reviewed with a dedicated test credential.
- [ ] Real P2P exchange, abuse resistance, authenticity limits, connection
      metadata, and provider dependencies are reviewed.
- [ ] Legal review is complete before any compliance claim or regulated use.

## 8. Artifact provenance and publication

- [ ] CI evidence manifest status is `passed`.
- [ ] Evidence manifest and extension artifact use the same commit SHA.
- [ ] ZIP SHA-256 is recorded in release notes.
- [ ] Unpacked manifest SHA-256 is recorded.
- [ ] Dependency inventory and audit result are attached.
- [ ] Known limitations and unresolved manual gates are included in release notes.
- [ ] Rollback or withdrawal plan is documented.
- [ ] Owner approves the exact artifact hash and final copy.
- [ ] Public artifact is downloaded again and hash-verified after publication.

## Current blocking gates

The authoritative machine-readable list is
`release/manual-gates.v1.json`. Until those gates are resolved, Phantom Trail
must remain labeled experimental and must not be described as stable or
production-ready.