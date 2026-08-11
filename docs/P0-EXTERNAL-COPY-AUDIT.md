# P0 External-Copy Audit

**Audit date:** August 10, 2026  
**Repository:** `YrFnS/Phantom-Trail`  
**P0 branch:** `agent/p0-truthfulness-baseline`  
**Public default branch:** `main`  
**Status:** Blocking findings remain; P0 must stay in progress

## Purpose

P0 is not complete merely because the branch and extension bundle use truthful
language. Users can still encounter claims through the public repository,
release pages, store listings, demos, submissions, videos, screenshots, and
other published material.

This audit distinguishes verified findings from surfaces that could not be
proven absent.

## Verified public repository finding

The repository is public and its default branch is still `main`. Until pull
request #1 is reviewed and merged, GitHub visitors receive the older `main`
README and related documents rather than the remediated P0 copy.

### `main/README.md`

The public README still presents unsupported or retired claims, including:

- “AI-native” product positioning;
- companies silently reading behavior and selling user data;
- “62+ Trackers Detected” across eight categories;
- GDPR/CCPA compliance;
- natural-language chat and personalized AI coaching;
- measured privacy-tool effectiveness and percentage blocking claims;
- verified cross-site tracking and behavioral profiling;
- exact data-flow mapping to ad networks and data brokers;
- anonymous community comparisons and peer recommendations;
- complete notifications, scheduled exports, sync, prediction, and reporting;
- a recommended prebuilt `1.0.0` release download;
- 90%+ detector coverage, sub-five-second response, CPU, memory, bundle, and
  page-load success claims; and
- minimal-permission, complete local-first, and deletion-control claims.

The branch README removes or qualifies these claims, but the replacement is not
public on the default branch yet.

### `main/INSTALL.md`

The public installation guide still:

- directs users to download `phantom-trail-1.0.0-chrome.zip` from Releases or a
  “shared link”;
- describes the extension as working immediately for tracking detection;
- presents grades and graph output without the P0 evidence limitations;
- implies that adding an API key enables a completed natural-language chat,
  recommendations, and coaching system;
- recommends testing on named third-party websites as if results were
  authoritative; and
- claims no browsing-data collection or transmission without disclosing the
  actual optional data flows and stored-URL limitations.

### `main/docs/PRIVACY_POLICY.md`

The public privacy document still includes claims contradicted or unsupported by
the current implementation, including:

- stored URLs are always sanitized before local storage;
- Phantom Trail does not track browsing history;
- no third parties beyond OpenRouter are involved;
- a visible “Clear All Data” control exists and permanently deletes all events
  and settings;
- personal trusted-site choices stop tracking detection;
- all local values are encrypted and accessible only to Phantom Trail;
- there is no project-side breach risk;
- GDPR and CCPA compliance has been established; and
- users control their data completely.

The P0 branch replaces this with an implementation-based data disclosure.

### Public package and manifest metadata

The default-branch `package.json` still declares:

- version `1.0.0`;
- an “AI-native” description; and
- the ISC license.

The default-branch generated-manifest configuration already uses version
`0.1.0`, but retains the older “makes invisible data collection visible in
real-time” description and certainty-heavy command labels. P0 aligns the
metadata and licensing on the branch.

## Releases, store listings, demos, and submissions

### Repository references

The public `main` README and installation guide explicitly direct users to a
prebuilt `1.0.0` release. That reference must not be treated as valid merely
because a current release object or asset could not be inspected through the
available repository connector.

Before P0 can close, a repository owner must inspect the GitHub Releases and
Tags pages while authenticated and record one of these outcomes:

1. no releases, tags, or assets exist;
2. existing objects contain no retired claims and no `1.0.0` production-ready
   artifact; or
3. stale release titles, bodies, tags, and assets were corrected, withdrawn, or
   clearly marked experimental.

### Public discovery search

Exact-name public searches were performed for:

- Phantom Trail with the repository owner;
- a Phantom Trail Chrome Web Store listing;
- GitHub release pages for this repository; and
- Phantom Trail demos, hackathon submissions, and videos.

No matching Chrome Web Store, demo, submission, or video result was identified.
This is **not proof that none exists**. Search engines may omit unindexed,
unlisted, private, recently changed, region-limited, or differently named
material.

### Required owner-side checks

The owner must still review any known or authenticated surfaces, including:

- Chrome Web Store developer dashboard and unpublished drafts;
- GitHub Releases, Tags, and release assets;
- hackathon or competition submission portals;
- shared Drive, Dropbox, or direct-download links;
- YouTube, Loom, social posts, portfolio pages, and demo recordings;
- screenshots embedded in issues, discussions, READMEs, or submission pages;
- browser-extension directories or mirrors; and
- any message or document previously sent to judges, testers, or prospective
  users.

## Publication gate

P0 cannot be marked complete while the public default branch continues to serve
the retired claims.

The minimum publication sequence is:

1. complete the remaining human toolbar-popup review;
2. resolve any resulting defects on the P0 branch;
3. obtain a final green validation run;
4. confirm the authenticated release/store/demo audit;
5. merge or otherwise publish the reviewed P0 copy to the public default branch;
6. re-open the public repository as an unauthenticated visitor and verify the
   README, installation guide, privacy disclosure, package metadata, and visible
   release links; and
7. record the post-publication evidence in pull request #1.

PR #1 must remain draft until the human review is complete. This document does
not authorize merging or changing the PR state.

## Current conclusion

- **Branch copy:** remediated and evidence-backed.
- **Packaged copy:** audited through the run #131 Chromium fixture.
- **Public default-branch copy:** stale and blocking.
- **Public search for external listings:** no matching result found, but absence
  is unproven.
- **Authenticated release/store/submission audit:** still required.

P0 remains **IN PROGRESS**.
