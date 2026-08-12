import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extensionPath = join(projectRoot, '.output', 'chrome-mv3');
const outputPath = join(projectRoot, '.artifacts', 'chromium-lifecycle.json');
const budgetPath = join(
  projectRoot,
  'evidence',
  'performance-budgets.v1.json'
);
const profilePath = mkdtempSync(join(tmpdir(), 'phantom-trail-p5-'));
const HARD_TIMEOUT_MS = 150_000;

const assertions = [];
const runtimeErrors = [];
const consoleErrors = [];
const consoleWarnings = [];
const measurements = {};
const activeChromeProcesses = new Set();
const activeServers = new Set();
let currentPhase = 'initializing';

function phase(name) {
  currentPhase = name;
  console.log(`[P5 Chromium] ${name}`);
}

function record(name, passed, detail, actual = null) {
  assertions.push({ name, passed, detail, actual });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
}

function sleep(milliseconds) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
}

function cleanupSynchronously() {
  for (const chromeProcess of activeChromeProcesses) {
    try {
      if (chromeProcess.exitCode === null) chromeProcess.kill('SIGKILL');
    } catch {
      // Best effort during fatal teardown.
    }
  }
  for (const server of activeServers) {
    try {
      server.closeIdleConnections?.();
      server.closeAllConnections?.();
      server.close();
    } catch {
      // Best effort during fatal teardown.
    }
  }
}

function writeFatalReport(error, reason = 'fatal-error') {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        status: 'failed',
        reason,
        phase: currentPhase,
        fatalError:
          error instanceof Error ? error.stack || error.message : String(error),
        assertions,
        runtimeErrors,
        consoleErrors,
        consoleWarnings,
        measurements,
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

const watchdog = setTimeout(() => {
  const error = new Error(
    `Chromium lifecycle exceeded ${HARD_TIMEOUT_MS}ms during ${currentPhase}`
  );
  writeFatalReport(error, 'hard-timeout');
  cleanupSynchronously();
  rmSync(profilePath, { recursive: true, force: true });
  console.error(error.message);
  process.exit(1);
}, HARD_TIMEOUT_MS);

async function waitFor(operation, options = {}) {
  const timeout = options.timeout ?? 15_000;
  const interval = options.interval ?? 100;
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeout) {
    try {
      const value = await operation();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(interval);
  }

  throw new Error(
    `Timed out after ${timeout}ms during ${currentPhase}.${
      lastError instanceof Error ? ` Last error: ${lastError.message}` : ''
    }`
  );
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/opt/google/chrome/chrome',
  ].filter(Boolean);
  const executable = candidates.find(candidate => existsSync(candidate));
  if (!executable) {
    throw new Error(`No Chrome/Chromium executable found: ${candidates.join(', ')}`);
  }
  return executable;
}

class CdpConnection {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    if (typeof WebSocket !== 'function') {
      throw new Error('Node 22 WebSocket support is required.');
    }

    this.socket = new WebSocket(this.url);
    await new Promise((resolvePromise, rejectPromise) => {
      const timeout = setTimeout(
        () => rejectPromise(new Error('CDP WebSocket connection timed out')),
        10_000
      );
      this.socket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolvePromise();
      });
      this.socket.addEventListener('error', event => {
        clearTimeout(timeout);
        rejectPromise(new Error(`CDP WebSocket error: ${String(event.type)}`));
      });
    });

    this.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result || {});
        return;
      }

      for (const listener of this.listeners.get(message.method) || []) {
        listener({ params: message.params || {}, sessionId: message.sessionId });
      }
    });

    this.socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error('CDP connection closed'));
      }
      this.pending.clear();
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;

    return new Promise((resolvePromise, rejectPromise) => {
      this.pending.set(id, { resolve: resolvePromise, reject: rejectPromise });
      try {
        this.socket.send(JSON.stringify(payload));
      } catch (error) {
        this.pending.delete(id);
        rejectPromise(error);
      }
    });
  }

  close() {
    try {
      this.socket?.close();
    } catch {
      // Best effort.
    }
  }
}

async function listen(server) {
  activeServers.add(server);
  return new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolvePromise(address.port);
    });
  });
}

async function closeServer(server, label) {
  phase(`closing ${label} fixture server`);
  try {
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
  } catch {
    // Older Node versions may not expose explicit connection cleanup.
  }

  await Promise.race([
    new Promise(resolvePromise => {
      try {
        server.close(resolvePromise);
      } catch {
        resolvePromise();
      }
    }),
    sleep(2_000),
  ]);

  try {
    server.closeAllConnections?.();
  } catch {
    // Final best effort.
  }
  activeServers.delete(server);
}

async function createFixtureServers() {
  phase('starting local HTTP fixture servers');
  const resourceServer = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Connection', 'close');
    if (request.url?.startsWith('/collect.js')) {
      response.writeHead(200, { 'Content-Type': 'application/javascript' });
      response.end(
        'window.__phantomTrailP5ResourceLoaded = true; console.info("P5 resource loaded");'
      );
      return;
    }
    response.writeHead(204);
    response.end();
  });
  const resourcePort = await listen(resourceServer);

  const pageServer = createServer((_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Connection', 'close');
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Phantom Trail P5 fixture</title>
  <script src="http://google-analytics.com:${resourcePort}/collect.js"></script>
</head>
<body><main><h1>P5 lifecycle fixture</h1><button>Fixture button</button></main></body>
</html>`);
  });
  const pagePort = await listen(pageServer);

  return {
    pageUrl: `http://page.test:${pagePort}/fixture`,
    close: async () =>
      Promise.all([
        closeServer(resourceServer, 'resource'),
        closeServer(pageServer, 'page'),
      ]),
  };
}

async function readDevToolsPort(chromeProcess, stderr) {
  const path = join(profilePath, 'DevToolsActivePort');
  return waitFor(() => {
    if (chromeProcess.exitCode !== null) {
      throw new Error(
        `Chromium exited before CDP became ready: ${stderr().slice(-2000)}`
      );
    }
    if (!existsSync(path)) return null;
    const [port, browserPath] = readFileSync(path, 'utf8').trim().split(/\r?\n/u);
    if (!port || !browserPath) return null;
    return { webSocketUrl: `ws://127.0.0.1:${port}${browserPath}` };
  }, { timeout: 20_000 });
}

async function launchChrome(chromeExecutable, label) {
  phase(`launching Chromium (${label})`);
  rmSync(join(profilePath, 'DevToolsActivePort'), { force: true });
  const argumentsList = [
    `--user-data-dir=${profilePath}`,
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--remote-debugging-port=0',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--metrics-recording-only',
    '--password-store=basic',
    '--use-mock-keychain',
    '--no-proxy-server',
    '--host-resolver-rules=MAP page.test 127.0.0.1, MAP google-analytics.com 127.0.0.1',
    '--window-size=1280,900',
    '--no-sandbox',
    'about:blank',
  ];

  const chromeProcess = spawn(chromeExecutable, argumentsList, {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  activeChromeProcesses.add(chromeProcess);
  let stderrText = '';
  chromeProcess.stdout.on('data', () => undefined);
  chromeProcess.stderr.on('data', chunk => {
    stderrText += String(chunk);
  });

  const devTools = await readDevToolsPort(chromeProcess, () => stderrText);
  const cdp = new CdpConnection(devTools.webSocketUrl);
  await cdp.connect();
  await cdp.send('Target.setDiscoverTargets', { discover: true });
  return { process: chromeProcess, cdp, stderr: () => stderrText };
}

async function closeChrome(instance, label) {
  phase(`closing Chromium (${label})`);
  await Promise.race([
    instance.cdp.send('Browser.close').catch(() => undefined),
    sleep(1_000),
  ]);

  if (instance.process.exitCode === null) {
    await Promise.race([
      new Promise(resolvePromise => instance.process.once('exit', resolvePromise)),
      sleep(4_000),
    ]);
  }
  if (instance.process.exitCode === null) instance.process.kill('SIGKILL');
  if (instance.process.exitCode === null) {
    await Promise.race([
      new Promise(resolvePromise => instance.process.once('exit', resolvePromise)),
      sleep(2_000),
    ]);
  }

  instance.cdp.close();
  activeChromeProcesses.delete(instance.process);
}

async function getTargets(cdp) {
  return (await cdp.send('Target.getTargets')).targetInfos || [];
}

async function waitForExtensionTarget(cdp) {
  return waitFor(async () => {
    const targets = await getTargets(cdp);
    return targets.find(
      target =>
        ['service_worker', 'background_page'].includes(target.type) &&
        target.url.startsWith('chrome-extension://')
    );
  }, { timeout: 20_000 });
}

async function attach(cdp, targetId, label) {
  const { sessionId } = await cdp.send('Target.attachToTarget', {
    targetId,
    flatten: true,
  });
  await Promise.all([
    cdp.send('Runtime.enable', {}, sessionId),
    cdp.send('Log.enable', {}, sessionId).catch(() => undefined),
  ]);

  cdp.on('Runtime.exceptionThrown', event => {
    if (event.sessionId !== sessionId) return;
    runtimeErrors.push({
      target: label,
      text: event.params.exceptionDetails?.text || 'Runtime exception',
      description: event.params.exceptionDetails?.exception?.description || null,
    });
  });
  cdp.on('Runtime.consoleAPICalled', event => {
    if (event.sessionId !== sessionId) return;
    const entry = {
      target: label,
      type: event.params.type,
      values: (event.params.args || []).map(argument =>
        argument.value === undefined
          ? argument.description || argument.type
          : argument.value
      ),
    };

    if (['error', 'assert'].includes(event.params.type)) {
      consoleErrors.push(entry);
    } else if (event.params.type === 'warning') {
      consoleWarnings.push(entry);
    }
  });
  return sessionId;
}

async function evaluate(cdp, sessionId, expression) {
  const response = await cdp.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true, userGesture: true },
    sessionId
  );
  if (response.exceptionDetails) {
    throw new Error(
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text ||
        'Runtime evaluation failed'
    );
  }
  return response.result?.value;
}

async function waitForDocumentReady(cdp, sessionId) {
  return waitFor(
    async () =>
      (await evaluate(cdp, sessionId, 'document.readyState')) === 'complete',
    { timeout: 20_000 }
  );
}

async function auditPopupAccessibility(cdp, sessionId) {
  const domAudit = await evaluate(
    cdp,
    sessionId,
    `(() => {
      const text = element => (element.textContent || '').replace(/\\s+/g, ' ').trim();
      const referenced = value => (value || '').split(/\\s+/).filter(Boolean)
        .map(id => document.getElementById(id)).filter(Boolean).map(text).filter(Boolean).join(' ');
      const name = element => {
        const aria = element.getAttribute('aria-label');
        if (aria?.trim()) return aria.trim();
        const labelled = referenced(element.getAttribute('aria-labelledby'));
        if (labelled) return labelled;
        if ('labels' in element && element.labels?.length) {
          const labelText = Array.from(element.labels).map(text).filter(Boolean).join(' ');
          if (labelText) return labelText;
        }
        const alt = element.getAttribute('alt');
        if (alt?.trim()) return alt.trim();
        const title = element.getAttribute('title');
        if (title?.trim()) return title.trim();
        return text(element);
      };
      const selector = [
        'button','a[href]','input:not([type="hidden"])','select','textarea',
        '[role="button"]','[role="tab"]','[role="checkbox"]','[tabindex]'
      ].join(',');
      const interactive = Array.from(document.querySelectorAll(selector))
        .filter(element => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
      const unnamed = interactive.filter(element => !name(element)).map(element => ({
        tag: element.tagName, role: element.getAttribute('role'), html: element.outerHTML.slice(0, 240)
      }));
      const controls = Array.from(document.querySelectorAll('input:not([type="hidden"]),select,textarea'));
      const unlabeledControls = controls.filter(element => !name(element)).map(element => ({
        tag: element.tagName, type: element.getAttribute('type'), html: element.outerHTML.slice(0, 240)
      }));
      const idCounts = Array.from(document.querySelectorAll('[id]')).reduce((map, element) => {
        map[element.id] = (map[element.id] || 0) + 1; return map;
      }, {});
      const duplicateIds = Object.entries(idCounts).filter(([, count]) => count > 1);
      const focusable = interactive.filter(element => {
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
      });
      const focusFailures = focusable.slice(0, 50).flatMap(element => {
        element.focus();
        return document.activeElement === element ? [] : [{ name: name(element), html: element.outerHTML.slice(0, 240) }];
      });
      return {
        lang: document.documentElement.lang,
        interactiveCount: interactive.length,
        unnamed,
        unlabeledControls,
        duplicateIds,
        focusableCount: focusable.length,
        focusFailures,
        landmarks: {
          header: document.querySelectorAll('header').length,
          navigation: document.querySelectorAll('nav,[role="navigation"]').length,
          main: document.querySelectorAll('main,[role="main"]').length
        },
        navLabels: Array.from(document.querySelectorAll('nav button')).map(name)
      };
    })()`
  );

  await cdp.send('Accessibility.enable', {}, sessionId);
  const axResult = await cdp.send('Accessibility.getFullAXTree', {}, sessionId);
  const interactiveRoles = new Set([
    'button',
    'checkbox',
    'combobox',
    'link',
    'menuitem',
    'radio',
    'switch',
    'tab',
    'textbox',
  ]);
  const unnamedAxNodes = (axResult.nodes || [])
    .filter(node => !node.ignored && interactiveRoles.has(node.role?.value))
    .filter(node => !String(node.name?.value || '').trim())
    .map(node => ({ role: node.role?.value, backendDOMNodeId: node.backendDOMNodeId || null }));
  return { domAudit, unnamedAxNodes };
}

async function firstRun(chromeExecutable, fixture) {
  const instance = await launchChrome(chromeExecutable, 'first run');
  phase('attaching to first-run extension worker');
  const workerTarget = await waitForExtensionTarget(instance.cdp);
  const extensionId = new URL(workerTarget.url).hostname;
  const workerSession = await attach(
    instance.cdp,
    workerTarget.targetId,
    'background-worker:first-run'
  );

  const manifest = await evaluate(
    instance.cdp,
    workerSession,
    'chrome.runtime.getManifest()'
  );
  record(
    'manifest-version',
    manifest.manifest_version === 3 && manifest.version === '0.1.0',
    `Manifest ${manifest.manifest_version}; product ${manifest.version}`,
    manifest
  );

  const permissions = await evaluate(
    instance.cdp,
    workerSession,
    `Promise.all([
      chrome.permissions.contains({permissions:['management']}),
      chrome.permissions.contains({permissions:['notifications']})
    ])`
  );
  record(
    'optional-permissions-default-off',
    permissions[0] === false && permissions[1] === false,
    `management=${permissions[0]}; notifications=${permissions[1]}`,
    permissions
  );

  const alarms = await waitFor(() =>
    evaluate(
      instance.cdp,
      workerSession,
      'chrome.alarms.getAll().then(items => items.map(item => item.name).sort())'
    ).then(items =>
      items.includes('cleanup-old-events') &&
      items.includes('daily-evidence-snapshot') &&
      items.includes('weekly-evidence-report')
        ? items
        : null
    )
  );
  record('report-alarms-registered', true, alarms.join(', '), alarms);

  phase('loading attributed HTTP fixture');
  const eventStartedAt = Date.now();
  const { targetId: pageTargetId } = await instance.cdp.send('Target.createTarget', {
    url: fixture.pageUrl,
  });
  const pageSession = await attach(instance.cdp, pageTargetId, 'fixture-page');
  await instance.cdp.send('Page.enable', {}, pageSession);
  await waitForDocumentReady(instance.cdp, pageSession);

  const storedEvents = await waitFor(async () => {
    const events = await evaluate(
      instance.cdp,
      workerSession,
      `chrome.storage.local.get('phantom_trail_events').then(result => result.phantom_trail_events || [])`
    );
    return events.some(
      event =>
        event.context?.pageDomain === 'page.test' &&
        event.context?.resourceDomain === 'google-analytics.com'
    )
      ? events
      : null;
  });
  measurements.firstDetectorEventMilliseconds = Date.now() - eventStartedAt;
  const attributed = storedEvents.find(
    event =>
      event.context?.pageDomain === 'page.test' &&
      event.context?.resourceDomain === 'google-analytics.com'
  );
  record(
    'attributed-detector-event',
    Boolean(attributed),
    attributed
      ? `${attributed.context.pageDomain} -> ${attributed.context.resourceDomain}`
      : 'No attributed event found',
    attributed
  );
  record(
    'stored-event-origin-only',
    Boolean(
      attributed &&
        attributed.context.pageUrl ===
          `http://page.test:${new URL(fixture.pageUrl).port}/` &&
        attributed.context.resourceUrl?.startsWith('http://google-analytics.com:') &&
        !attributed.context.resourceUrl.includes('/collect.js')
    ),
    `pageUrl=${attributed?.context?.pageUrl}; resourceUrl=${attributed?.context?.resourceUrl}`,
    {
      pageUrl: attributed?.context?.pageUrl,
      resourceUrl: attributed?.context?.resourceUrl,
    }
  );

  phase('loading packaged popup and accessibility tree');
  const popupStartedAt = Date.now();
  const { targetId: popupTargetId } = await instance.cdp.send('Target.createTarget', {
    url: `chrome-extension://${extensionId}/popup.html`,
  });
  const popupSession = await attach(instance.cdp, popupTargetId, 'popup');
  await instance.cdp.send('Page.enable', {}, popupSession);
  await waitForDocumentReady(instance.cdp, popupSession);
  await waitFor(async () => {
    const text = await evaluate(instance.cdp, popupSession, 'document.body.innerText');
    return text.includes('Phantom Trail') ? text : null;
  }, { timeout: 20_000 });

  measurements.popupTargetReadyMilliseconds = Date.now() - popupStartedAt;
  measurements.popupNavigation = await evaluate(
    instance.cdp,
    popupSession,
    `(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return navigation ? {
        domContentLoaded: navigation.domContentLoadedEventEnd,
        load: navigation.loadEventEnd,
        duration: navigation.duration,
        responseEnd: navigation.responseEnd
      } : null;
    })()`
  );

  const accessibility = await auditPopupAccessibility(instance.cdp, popupSession);
  const expectedNav = ['Feed', 'Map', 'Stats', 'Explore', 'Reports', 'Peers'];
  record(
    'popup-navigation-contract',
    JSON.stringify(accessibility.domAudit.navLabels) === JSON.stringify(expectedNav),
    `Navigation: ${accessibility.domAudit.navLabels.join(', ')}`,
    accessibility.domAudit.navLabels
  );
  record(
    'retired-navigation-absent',
    !accessibility.domAudit.navLabels.includes('AI') &&
      !accessibility.domAudit.navLabels.includes('Coach'),
    'AI and Coach labels are absent.',
    accessibility.domAudit.navLabels
  );
  record(
    'document-language',
    Boolean(accessibility.domAudit.lang),
    `lang=${accessibility.domAudit.lang || '(missing)'}`,
    accessibility.domAudit.lang
  );
  record(
    'named-interactive-controls',
    accessibility.domAudit.unnamed.length === 0 &&
      accessibility.unnamedAxNodes.length === 0,
    `DOM unnamed=${accessibility.domAudit.unnamed.length}; AX unnamed=${accessibility.unnamedAxNodes.length}`,
    { dom: accessibility.domAudit.unnamed, ax: accessibility.unnamedAxNodes }
  );
  record(
    'labeled-form-controls',
    accessibility.domAudit.unlabeledControls.length === 0,
    `Unlabeled=${accessibility.domAudit.unlabeledControls.length}`,
    accessibility.domAudit.unlabeledControls
  );
  record(
    'unique-dom-ids',
    accessibility.domAudit.duplicateIds.length === 0,
    `Duplicate IDs=${accessibility.domAudit.duplicateIds.length}`,
    accessibility.domAudit.duplicateIds
  );
  record(
    'primary-landmarks',
    accessibility.domAudit.landmarks.header >= 1 &&
      accessibility.domAudit.landmarks.navigation >= 1 &&
      accessibility.domAudit.landmarks.main >= 1,
    JSON.stringify(accessibility.domAudit.landmarks),
    accessibility.domAudit.landmarks
  );
  record(
    'keyboard-focus-contract',
    accessibility.domAudit.focusFailures.length === 0 &&
      accessibility.domAudit.focusableCount > 0,
    `Focusable=${accessibility.domAudit.focusableCount}; failures=${accessibility.domAudit.focusFailures.length}`,
    accessibility.domAudit.focusFailures
  );

  phase('verifying small stored batches render in the signal graph');
  const expectedGraphDomains = new Set(
    storedEvents.flatMap(event =>
      [event.context?.pageDomain, event.context?.resourceDomain].filter(Boolean)
    )
  );
  const expectedGraphEdges = new Set(
    storedEvents.flatMap(event => {
      const pageDomain = event.context?.pageDomain;
      const resourceDomain = event.context?.resourceDomain;
      return pageDomain && resourceDomain && pageDomain !== resourceDomain
        ? [`${pageDomain}->${resourceDomain}`]
        : [];
    })
  );
  const mapClicked = await evaluate(
    instance.cdp,
    popupSession,
    `(() => {
      const button = Array.from(document.querySelectorAll('nav button'))
        .find(item => (item.textContent || '').trim().includes('Map'));
      button?.click();
      return Boolean(button);
    })()`
  );
  let graphSummary = null;
  try {
    graphSummary = await waitFor(
      async () => {
        const text = await evaluate(
          instance.cdp,
          popupSession,
          'document.body.innerText'
        );
        const match = text.match(/(\d+) recorded domains, (\d+) inferred links/u);
        return match
          ? { domainCount: Number(match[1]), edgeCount: Number(match[2]) }
          : null;
      },
      { timeout: 20_000 }
    );
  } catch {
    // The assertion below records the missing graph instead of hiding it in a timeout.
  }
  record(
    'map-renders-small-stored-batch',
    Boolean(
      mapClicked &&
        graphSummary &&
        graphSummary.domainCount === expectedGraphDomains.size &&
        graphSummary.edgeCount === expectedGraphEdges.size
    ),
    graphSummary
      ? `${graphSummary.domainCount} domains and ${graphSummary.edgeCount} links rendered from ${storedEvents.length} stored row(s)`
      : `Map remained empty for ${storedEvents.length} stored row(s)`,
    {
      storedRows: storedEvents.length,
      expectedDomains: expectedGraphDomains.size,
      expectedEdges: expectedGraphEdges.size,
      graphSummary,
    }
  );

  phase('verifying current-report refresh from popup views');
  await evaluate(
    instance.cdp,
    workerSession,
    `(() => {
      const now = new Date();
      const pad = value => String(value).padStart(2, '0');
      const date = [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('-');
      const monday = new Date(now);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const weekStart = [monday.getFullYear(), pad(monday.getMonth() + 1), pad(monday.getDate())].join('-');
      return chrome.storage.local.set({
        phantom_trail_daily_snapshots: [{
          topDomains: [],
          eventCounts: {
            byType: {unknown:0, cryptomining:0, fingerprinting:0, social:0, analytics:0, advertising:0},
            byRisk: {critical:0, high:0, medium:0, low:0},
            total: 0
          },
          scoreConfidence: 'none',
          scoreStatus: 'insufficient-evidence',
          privacyScore: null,
          date
        }],
        phantom_trail_weekly_reports: [{
          riskySites: [],
          improvedSites: [],
          newTrackers: [],
          scoreChange: null,
          averageScore: null,
          weekStart
        }]
      });
    })()`
  );

  const statsClicked = await evaluate(
    instance.cdp,
    popupSession,
    `(() => {
      const button = Array.from(document.querySelectorAll('nav button'))
        .find(item => (item.textContent || '').trim().includes('Stats'));
      button?.click();
      return Boolean(button);
    })()`
  );
  record('stats-view-available', statsClicked, 'Stats navigation button clicked.');

  const expectedOccurrences = storedEvents.reduce(
    (total, event) => total + (event.occurrenceCount || 1),
    0
  );
  const refreshedFromStats = await waitFor(
    () =>
      evaluate(
        instance.cdp,
        workerSession,
        `chrome.storage.local.get([
          'phantom_trail_daily_snapshots',
          'phantom_trail_weekly_reports',
          'phantom_trail_report_lifecycle'
        ]).then(result => {
          const daily = (result.phantom_trail_daily_snapshots || [])[0] || null;
          const weekly = (result.phantom_trail_weekly_reports || [])[0] || null;
          const lifecycle = result.phantom_trail_report_lifecycle || {};
          return daily?.eventCounts?.total > 0 &&
            weekly?.averageScore !== null &&
            lifecycle.lastDailyRun?.source === 'view' &&
            lifecycle.lastWeeklyRun?.source === 'view'
            ? {daily, weekly, lifecycle}
            : null;
        })`
      ),
    { timeout: 20_000 }
  );
  record(
    'stats-refreshes-current-reports',
    refreshedFromStats.daily.eventCounts.total >= expectedOccurrences,
    `daily occurrences=${refreshedFromStats.daily.eventCounts.total}; expected at least ${expectedOccurrences}`,
    refreshedFromStats
  );

  const reportsClicked = await evaluate(
    instance.cdp,
    popupSession,
    `(() => {
      const button = Array.from(document.querySelectorAll('nav button'))
        .find(item => (item.textContent || '').trim().includes('Reports'));
      button?.click();
      return Boolean(button);
    })()`
  );
  const reportsText = await waitFor(
    async () => {
      const text = await evaluate(instance.cdp, popupSession, 'document.body.innerText');
      return text.includes('Local Evidence Reports') && text.includes('Occurrences')
        ? text
        : null;
    },
    { timeout: 20_000 }
  );
  record(
    'reports-view-renders-refreshed-evidence',
    reportsClicked && reportsText.includes(String(refreshedFromStats.daily.eventCounts.total)),
    `Reports view contains refreshed occurrence count ${refreshedFromStats.daily.eventCounts.total}.`
  );
  phase('verifying the local evidence-index query');
  const exploreClicked = await evaluate(
    instance.cdp,
    popupSession,
    `(() => {
      const button = Array.from(document.querySelectorAll('nav button'))
        .find(item => (item.textContent || '').trim().includes('Explore'));
      button?.click();
      return Boolean(button);
    })()`
  );
  const queryClicked = await waitFor(
    () =>
      evaluate(
        instance.cdp,
        popupSession,
        `(() => {
          const button = Array.from(document.querySelectorAll('button'))
            .find(item => (item.textContent || '').includes('Show the evidence index'));
          button?.click();
          return Boolean(button);
        })()`
      ).then(clicked => (clicked ? true : null)),
    { timeout: 20_000 }
  );
  const evidenceIndexText = await waitFor(
    async () => {
      const text = await evaluate(instance.cdp, popupSession, 'document.body.innerText');
      return text.includes('Experimental Signal-Risk Summary') ? text : null;
    },
    { timeout: 20_000 }
  );
  record(
    'local-evidence-index-query-renders',
    exploreClicked &&
      queryClicked &&
      evidenceIndexText.includes('Observed-evidence index:') &&
      !evidenceIndexText.includes('could not generate this summary'),
    'Evidence Explorer rendered the local evidence-index summary without a fallback error.'
  );

  const falseRepairWarnings = consoleWarnings.filter(entry =>
    entry.values.some(value =>
      String(value).includes('Migrated or removed 0 invalid')
    )
  );
  record(
    'zero-item-repair-warnings-absent',
    falseRepairWarnings.length === 0,
    `${falseRepairWarnings.length} false storage-repair warning(s)`,
    falseRepairWarnings
  );

  phase('seeding restart probes');
  await evaluate(
    instance.cdp,
    workerSession,
    `Promise.all([
      chrome.storage.local.set({p5_local_restart_probe:'persist'}),
      chrome.storage.session.set({p5_session_restart_probe:'discard'})
    ])`
  );
  return { instance, extensionId };
}

async function secondRun(chromeExecutable, expectedExtensionId) {
  const instance = await launchChrome(chromeExecutable, 'restart');
  phase('attaching to restarted extension worker');
  let workerTarget = await waitForExtensionTarget(instance.cdp).catch(() => null);
  if (!workerTarget) {
    await instance.cdp.send('Target.createTarget', {
      url: `chrome-extension://${expectedExtensionId}/popup.html`,
    });
    workerTarget = await waitForExtensionTarget(instance.cdp);
  }

  const extensionId = new URL(workerTarget.url).hostname;
  record(
    'extension-id-stable-across-restart',
    extensionId === expectedExtensionId,
    `first=${expectedExtensionId}; second=${extensionId}`,
    { expectedExtensionId, extensionId }
  );
  const workerSession = await attach(
    instance.cdp,
    workerTarget.targetId,
    'background-worker:restart'
  );
  const probe = await evaluate(
    instance.cdp,
    workerSession,
    `Promise.all([
      chrome.storage.local.get('p5_local_restart_probe'),
      chrome.storage.session.get('p5_session_restart_probe')
    ]).then(([local, session]) => ({
      local: local.p5_local_restart_probe,
      session: session.p5_session_restart_probe
    }))`
  );
  record(
    'local-storage-persists-restart',
    probe.local === 'persist',
    `local=${String(probe.local)}`,
    probe
  );
  record(
    'session-storage-clears-restart',
    probe.session === undefined,
    `session=${String(probe.session)}`,
    probe
  );
  await evaluate(
    instance.cdp,
    workerSession,
    `Promise.all([
      chrome.storage.local.remove('p5_local_restart_probe'),
      chrome.storage.session.remove('p5_session_restart_probe')
    ])`
  );
  return instance;
}

async function chromeVersion(chromeExecutable) {
  return new Promise(resolvePromise => {
    const child = spawn(chromeExecutable, ['--version']);
    let output = '';
    child.stdout.on('data', chunk => {
      output += String(chunk);
    });
    child.on('exit', () => resolvePromise(output.trim()));
  });
}

async function main() {
  if (!existsSync(extensionPath)) {
    throw new Error('Build output is missing. Run pnpm build first.');
  }

  const chromeExecutable = findChrome();
  const budgets = JSON.parse(readFileSync(budgetPath, 'utf8'));
  const fixture = await createFixtureServers();
  let first;
  let second;

  try {
    first = await firstRun(chromeExecutable, fixture);
    await closeChrome(first.instance, 'first run');
    first.instance = null;
    await sleep(500);

    second = await secondRun(chromeExecutable, first.extensionId);
    await closeChrome(second, 'restart');
    second = null;

    phase('evaluating browser budgets and runtime errors');
    const browserBudgets = budgets.browserMilliseconds;
    const domLoaded = measurements.popupNavigation?.domContentLoaded;
    const load = measurements.popupNavigation?.load;
    record(
      'popup-dom-content-loaded-budget',
      typeof domLoaded === 'number' &&
        domLoaded <= browserBudgets.popupDomContentLoadedMaximum,
      `${String(domLoaded)}ms <= ${browserBudgets.popupDomContentLoadedMaximum}ms`,
      domLoaded
    );
    record(
      'popup-load-budget',
      typeof load === 'number' && load <= browserBudgets.popupLoadMaximum,
      `${String(load)}ms <= ${browserBudgets.popupLoadMaximum}ms`,
      load
    );
    record(
      'first-detector-event-budget',
      measurements.firstDetectorEventMilliseconds <=
        browserBudgets.firstDetectorEventMaximum,
      `${measurements.firstDetectorEventMilliseconds}ms <= ${browserBudgets.firstDetectorEventMaximum}ms`,
      measurements.firstDetectorEventMilliseconds
    );
    record(
      'runtime-exceptions-absent',
      runtimeErrors.length === 0,
      `${runtimeErrors.length} runtime exception(s)`,
      runtimeErrors
    );
    record(
      'console-errors-absent',
      consoleErrors.length === 0,
      `${consoleErrors.length} console error/assert call(s)`,
      consoleErrors
    );
  } finally {
    if (first?.instance) {
      await closeChrome(first.instance, 'first-run cleanup').catch(() => undefined);
    }
    if (second) await closeChrome(second, 'restart cleanup').catch(() => undefined);
    await fixture.close();
  }

  const failures = assertions.filter(assertion => !assertion.passed);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: failures.length === 0 ? 'passed' : 'failed',
    source: {
      extensionPath,
      extensionDigest: createHash('sha256')
        .update(readFileSync(join(extensionPath, 'manifest.json'), 'utf8'))
        .digest('hex'),
      chromeExecutable,
      chromeVersion: await chromeVersion(chromeExecutable),
      popupContext: 'extension-page-equivalent',
      profileReusedAcrossRestart: true,
    },
    limitations: [
      'The automated popup target uses the packaged popup URL rather than a physical toolbar click.',
      'This deterministic fixture is not a real-world detector-accuracy or performance benchmark.',
      'The accessibility contract is not WCAG certification or a substitute for human assistive-technology review.',
      'OS notification delivery, live OpenRouter behavior, and real P2P exchange are outside this harness.',
    ],
    measurements,
    assertions,
    failures,
    runtimeErrors,
    consoleErrors,
    consoleWarnings,
  };

  phase('writing Chromium evidence report');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `Chromium lifecycle ${report.status}: ${assertions.length - failures.length}/${assertions.length} assertions passed.`
  );
  console.log(`Report: ${outputPath}`);

  clearTimeout(watchdog);
  rmSync(profilePath, { recursive: true, force: true });
  if (failures.length > 0) process.exitCode = 1;
}

main().catch(error => {
  clearTimeout(watchdog);
  writeFatalReport(error);
  cleanupSynchronously();
  rmSync(profilePath, { recursive: true, force: true });
  console.error(error);
  process.exitCode = 1;
});
