import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  artifactRoot,
  attach,
  captureScreenshot,
  closeChrome,
  ensureArtifactRoot,
  evaluate,
  findPhantomWorker,
  launchChrome,
  originOnly,
  sleep,
  truncate,
  waitForDocumentReady,
  writeJson,
} from './browser-baseline-common.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const matrixPath = join(
  projectRoot,
  'evidence',
  'real-site-baseline-sites.v1.json'
);
const outputPath = join(artifactRoot, 'real-site-observation-baseline.json');
const screenshotRoot = join(artifactRoot, 'real-site-screenshots');
const matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));

function safeEvent(event) {
  const context = event?.context && typeof event.context === 'object'
    ? event.context
    : {};
  const detector = event?.detector && typeof event.detector === 'object'
    ? event.detector
    : null;
  return {
    pageDomain: context.pageDomain || null,
    resourceDomain: context.resourceDomain || event?.domain || null,
    pageOrigin: originOnly(context.pageUrl || event?.pageUrl),
    resourceOrigin: originOnly(context.resourceUrl || event?.resourceUrl || event?.url),
    party: context.party || event?.party || null,
    attributionBasis: context.attributionBasis || event?.attributionBasis || null,
    detector: detector?.id || detector?.name || event?.detectorId || event?.type || null,
    category: event?.category || detector?.category || null,
    confidence: event?.confidence || detector?.confidence || null,
    severity: event?.severity || null,
    occurrences:
      Number.isInteger(event?.occurrences) && event.occurrences > 0
        ? event.occurrences
        : 1
  };
}

function uniqueEvents(events) {
  const map = new Map();
  for (const event of events.map(safeEvent)) {
    const key = JSON.stringify(event);
    if (!map.has(key)) map.set(key, event);
  }
  return Array.from(map.values()).sort((first, second) =>
    JSON.stringify(first).localeCompare(JSON.stringify(second))
  );
}

async function clearEvents(cdp, workerSession) {
  await evaluate(
    cdp,
    workerSession,
    `chrome.storage.local.remove('phantom_trail_events').then(() => true)`
  );
}

async function readEvents(cdp, workerSession) {
  return evaluate(
    cdp,
    workerSession,
    `chrome.storage.local.get('phantom_trail_events')
      .then(result => result.phantom_trail_events || [])`
  );
}

async function observeSite(instance, worker, site) {
  await clearEvents(instance.cdp, worker.sessionId);
  const { targetId } = await instance.cdp.send('Target.createTarget', {
    url: 'about:blank'
  });
  const sessionId = await attach(instance.cdp, targetId);
  let documentStatus = null;
  let mainResponseStatus = null;
  let mainResponseUrl = null;
  const runtimeErrors = [];
  const consoleErrors = [];

  instance.cdp.on('Network.responseReceived', event => {
    if (event.sessionId !== sessionId || event.params.type !== 'Document') return;
    mainResponseStatus = event.params.response?.status ?? null;
    mainResponseUrl = originOnly(event.params.response?.url) || null;
  });
  instance.cdp.on('Runtime.exceptionThrown', event => {
    if (event.sessionId !== sessionId) return;
    runtimeErrors.push(
      event.params.exceptionDetails?.exception?.description ||
        event.params.exceptionDetails?.text ||
        'Runtime exception'
    );
  });
  instance.cdp.on('Runtime.consoleAPICalled', event => {
    if (event.sessionId !== sessionId) return;
    if (!['error', 'assert'].includes(event.params.type)) return;
    consoleErrors.push(
      (event.params.args || []).map(argument =>
        argument.value === undefined
          ? argument.description || argument.type
          : argument.value
      )
    );
  });

  let navigationError = null;
  try {
    const navigation = await instance.cdp.send(
      'Page.navigate',
      { url: site.url },
      sessionId
    );
    if (navigation.errorText) throw new Error(navigation.errorText);
    documentStatus = await waitForDocumentReady(instance.cdp, sessionId, 30_000);
    await sleep(8_000);
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  let page = {
    title: null,
    finalOrigin: mainResponseUrl,
    documentStatus
  };
  try {
    page = await evaluate(
      instance.cdp,
      sessionId,
      `({
        title: document.title,
        finalOrigin: location.protocol === 'http:' || location.protocol === 'https:'
          ? location.origin
          : null,
        documentStatus: document.readyState
      })`
    );
    await captureScreenshot(
      instance.cdp,
      sessionId,
      join(screenshotRoot, `${site.id}.png`)
    );
  } catch (error) {
    if (!navigationError) {
      navigationError = error instanceof Error ? error.message : String(error);
    }
  }

  let events = [];
  try {
    events = await readEvents(instance.cdp, worker.sessionId);
  } catch {
    const refreshedWorker = await findPhantomWorker(instance.cdp);
    worker.sessionId = refreshedWorker.sessionId;
    events = await readEvents(instance.cdp, worker.sessionId);
  }

  await instance.cdp
    .send('Target.closeTarget', { targetId })
    .catch(() => undefined);

  const projected = uniqueEvents(Array.isArray(events) ? events : []);
  return {
    id: site.id,
    cohort: site.cohort,
    requestedOrigin: originOnly(site.url),
    finalOrigin: originOnly(page.finalOrigin) || mainResponseUrl,
    title: truncate(page.title, 160),
    mainResponseStatus,
    documentStatus: page.documentStatus || documentStatus,
    loaded:
      !navigationError &&
      ['interactive', 'complete'].includes(page.documentStatus || documentStatus),
    navigationError,
    eventCount: projected.reduce(
      (total, event) => total + (event.occurrences || 1),
      0
    ),
    distinctEventCount: projected.length,
    events: projected,
    runtimeErrorCount: runtimeErrors.length,
    consoleErrorCount: consoleErrors.length,
    runtimeErrors: runtimeErrors.slice(0, 10),
    consoleErrors: consoleErrors.slice(0, 10),
    manualReviewStatus: 'pending',
    manualLabel: null,
    screenshot: `real-site-screenshots/${site.id}.png`
  };
}

async function main() {
  ensureArtifactRoot();
  const startedAt = new Date().toISOString();
  let instance;
  const results = [];

  try {
    instance = await launchChrome({
      label: 'real-sites',
      additionalArguments: [
        '--disable-popup-blocking',
        '--ignore-certificate-errors'
      ]
    });
    const worker = await findPhantomWorker(instance.cdp);

    for (const site of matrix.sites) {
      console.log(`Observing ${site.id}: ${site.url}`);
      results.push(await observeSite(instance, worker, site));
    }

    const loadedCount = results.filter(result => result.loaded).length;
    const iraqLoadedCount = results.filter(
      result => result.loaded && result.cohort.startsWith('iraq-')
    ).length;
    const negativeControl = results.find(
      result => result.cohort === 'negative-control'
    );
    const baselinePassed =
      loadedCount >= Math.ceil(matrix.sites.length / 2) &&
      iraqLoadedCount >= 1 &&
      Boolean(negativeControl?.loaded);

    const report = {
      schemaVersion: 1,
      datasetVersion: matrix.datasetVersion,
      generatedAt: new Date().toISOString(),
      startedAt,
      sourceSha: process.env.SOURCE_SHA || null,
      status: baselinePassed ? 'passed' : 'failed',
      accuracyClaim: 'not-established',
      releaseGateClosed: false,
      scope:
        'Initial bounded real-site observation sweep of public homepages with origin-only evidence projection.',
      limitations: [
        'The sweep records extension observations; it does not determine whether a detection is a true positive or false positive.',
        'Manual labels, ownership research, consent-state review, CNAME analysis, iframe attribution review, and false-negative instrumentation remain pending.',
        'Live sites, geographic delivery, consent banners, bot controls, and third-party resources can change between runs.',
        'A passing baseline means the harness collected reviewable evidence from enough cohorts; it does not establish detector accuracy or production readiness.'
      ],
      summary: {
        configuredSites: matrix.sites.length,
        loadedSites: loadedCount,
        failedSites: matrix.sites.length - loadedCount,
        iraqSitesLoaded: iraqLoadedCount,
        totalObservedOccurrences: results.reduce(
          (total, result) => total + result.eventCount,
          0
        ),
        distinctProjectedEvents: results.reduce(
          (total, result) => total + result.distinctEventCount,
          0
        )
      },
      sites: results
    };
    writeJson(outputPath, report);
    console.log(
      `Real-site baseline ${report.status}: ${loadedCount}/${matrix.sites.length} pages loaded; manual labels remain pending.`
    );
    if (!baselinePassed) process.exitCode = 1;
  } catch (error) {
    writeJson(outputPath, {
      schemaVersion: 1,
      datasetVersion: matrix.datasetVersion,
      generatedAt: new Date().toISOString(),
      startedAt,
      sourceSha: process.env.SOURCE_SHA || null,
      status: 'failed',
      accuracyClaim: 'not-established',
      releaseGateClosed: false,
      fatalError: error instanceof Error ? error.stack || error.message : String(error),
      sites: results
    });
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (instance) await closeChrome(instance);
  }
}

await main();
