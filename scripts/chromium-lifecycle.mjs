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

const assertions = [];
const runtimeErrors = [];
const consoleErrors = [];
const measurements = {};

function record(name, passed, detail, actual) {
  assertions.push({ name, passed, detail, actual });
  if (!passed) console.error(`FAIL ${name}: ${detail}`);
  else console.log(`PASS ${name}: ${detail}`);
}

function sleep(milliseconds) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
}

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

  const suffix = lastError ? ` Last error: ${lastError.message}` : '';
  throw new Error(`Timed out after ${timeout}ms.${suffix}`);
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
  const found = candidates.find(candidate => existsSync(candidate));
  if (!found) {
    throw new Error(
      `No Chrome/Chromium executable found. Checked: ${candidates.join(', ')}`
    );
  }
  return found;
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
      throw new Error('Node.js global WebSocket is unavailable. Node 22 is required.');
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
        rejectPromise(
          new Error(`CDP WebSocket connection failed: ${String(event.message || event.type)}`)
        );
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

      const listeners = this.listeners.get(message.method) || [];
      for (const listener of listeners) {
        listener({
          params: message.params || {},
          sessionId: message.sessionId,
        });
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
    return () => {
      const current = this.listeners.get(method) || [];
      this.listeners.set(
        method,
        current.filter(item => item !== listener)
      );
    };
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;

    return new Promise((resolvePromise, rejectPromise) => {
      this.pending.set(id, { resolve: resolvePromise, reject: rejectPromise });
      this.socket.send(JSON.stringify(payload));
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
  return await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolvePromise(address.port);
    });
  });
}

async function createFixtureServers() {
  const resourceServer = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    if (request.url?.startsWith('/collect.js')) {
      response.writeHead(200, { 'Content-Type': 'application/javascript' });
      response.end(
        'window.__phantomTrailP5ResourceLoaded = true; console.info("P5 resource fixture loaded");'
      );
      return;
    }
    response.writeHead(204);
    response.end();
  });
  const resourcePort = await listen(resourceServer);

  const pageServer = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Phantom Trail P5 fixture</title>
  <script src="http://google-analytics.com:${resourcePort}/collect.js"></script>
</head>
<body>
  <main>
    <h1>P5 lifecycle fixture</h1>
    <button type="button">Fixture button</button>
  </main>
</body>
</html>`);
  });
  const pagePort = await listen(pageServer);

  return {
    pageUrl: `http://page.test:${pagePort}/fixture`,
    close: async () => {
      await Promise.all([
        new Promise(resolvePromise => resourceServer.close(resolvePromise)),
        new Promise(resolvePromise => pageServer.close(resolvePromise)),
      ]);
    },
  };
}

async function readDevToolsPort() {
  const path = join(profilePath, 'DevToolsActivePort');
  return await waitFor(() => {
    if (!existsSync(path)) return null;
    const [port, browserPath] = readFileSync(path, 'utf8').trim().split(/\r?\n/u);
    if (!port || !browserPath) return null;
    return {
      port: Number(port),
      webSocketUrl: `ws://127.0.0.1:${port}${browserPath}`,
    };
  });
}

async function launchChrome(chromeExecutable) {
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
  ];
  if (process.env.PHANTOM_HEADLESS === '1') argumentsList.push('--headless=new');
  argumentsList.push('about:blank');

  const chromeProcess = spawn(chromeExecutable, argumentsList, {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  chromeProcess.stderr.on('data', chunk => {
    stderr += String(chunk);
  });

  const devTools = await readDevToolsPort();
  const cdp = new CdpConnection(devTools.webSocketUrl);
  await cdp.connect();
  await cdp.send('Target.setDiscoverTargets', { discover: true });

  return {
    process: chromeProcess,
    cdp,
    stderr: () => stderr,
  };
}

async function closeChrome(instance) {
  try {
    await instance.cdp.send('Browser.close');
  } catch {
    // The process may already be exiting.
  }
  await Promise.race([
    new Promise(resolvePromise => instance.process.once('exit', resolvePromise)),
    sleep(5000).then(() => {
      if (!instance.process.killed) instance.process.kill('SIGKILL');
    }),
  ]);
  instance.cdp.close();
}

async function getTargets(cdp) {
  const result = await cdp.send('Target.getTargets');
  return result.targetInfos || [];
}

async function waitForExtensionTarget(cdp) {
  return await waitFor(async () => {
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
      description:
        event.params.exceptionDetails?.exception?.description || null,
    });
  });
  cdp.on('Runtime.consoleAPICalled', event => {
    if (event.sessionId !== sessionId) return;
    if (!['error', 'assert'].includes(event.params.type)) return;
    consoleErrors.push({
      target: label,
      type: event.params.type,
      values: (event.params.args || []).map(argument =>
        argument.value === undefined
          ? argument.description || argument.type
          : argument.value
      ),
    });
  });

  return sessionId;
}

async function evaluate(cdp, sessionId, expression) {
  const response = await cdp.send(
    'Runtime.evaluate',
    {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    },
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
  await waitFor(
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
        .map(id => document.getElementById(id))
        .filter(Boolean)
        .map(text)
        .filter(Boolean)
        .join(' ');
      const name = element => {
        const aria = element.getAttribute('aria-label');
        if (aria && aria.trim()) return aria.trim();
        const labelled = referenced(element.getAttribute('aria-labelledby'));
        if (labelled) return labelled;
        if ('labels' in element && element.labels?.length) {
          const labelText = Array.from(element.labels).map(text).filter(Boolean).join(' ');
          if (labelText) return labelText;
        }
        const alt = element.getAttribute('alt');
        if (alt && alt.trim()) return alt.trim();
        const title = element.getAttribute('title');
        if (title && title.trim()) return title.trim();
        return text(element);
      };
      const selector = [
        'button', 'a[href]', 'input:not([type="hidden"])', 'select', 'textarea',
        '[role="button"]', '[role="tab"]', '[role="checkbox"]', '[tabindex]'
      ].join(',');
      const interactive = Array.from(document.querySelectorAll(selector))
        .filter(element => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
      const unnamed = interactive.filter(element => !name(element)).map(element => ({
        tag: element.tagName,
        role: element.getAttribute('role'),
        type: element.getAttribute('type'),
        html: element.outerHTML.slice(0, 240)
      }));
      const controls = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'));
      const unlabeledControls = controls.filter(element => !name(element)).map(element => ({
        tag: element.tagName,
        type: element.getAttribute('type'),
        html: element.outerHTML.slice(0, 240)
      }));
      const idCounts = Array.from(document.querySelectorAll('[id]')).reduce((map, element) => {
        map[element.id] = (map[element.id] || 0) + 1;
        return map;
      }, {});
      const duplicateIds = Object.entries(idCounts).filter(([, count]) => count > 1);
      const focusable = interactive.filter(element => {
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
      });
      const focusFailures = focusable.slice(0, 40).flatMap(element => {
        element.focus();
        return document.activeElement === element ? [] : [{
          name: name(element),
          html: element.outerHTML.slice(0, 240)
        }];
      });
      return {
        lang: document.documentElement.lang,
        title: document.title,
        interactiveCount: interactive.length,
        unnamed,
        unlabeledControls,
        duplicateIds,
        focusableCount: focusable.length,
        focusFailures,
        landmarks: {
          header: document.querySelectorAll('header').length,
          navigation: document.querySelectorAll('nav, [role="navigation"]').length,
          main: document.querySelectorAll('main, [role="main"]').length
        },
        navLabels: Array.from(document.querySelectorAll('nav button')).map(name),
        bodyText: text(document.body).slice(0, 10000)
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
    .map(node => ({
      role: node.role?.value,
      backendDOMNodeId: node.backendDOMNodeId || null,
    }));

  return { domAudit, unnamedAxNodes };
}

async function firstRun(chromeExecutable, fixture) {
  const launchedAt = Date.now();
  const instance = await launchChrome(chromeExecutable);
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
    `Manifest ${manifest.manifest_version}, product ${manifest.version}`,
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

  const alarms = await waitFor(
    () =>
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
      ),
    { timeout: 10_000 }
  );
  record(
    'report-alarms-registered',
    true,
    alarms.join(', '),
    alarms
  );

  const eventStartedAt = Date.now();
  const { targetId: pageTargetId } = await instance.cdp.send(
    'Target.createTarget',
    { url: fixture.pageUrl }
  );
  const pageSession = await attach(
    instance.cdp,
    pageTargetId,
    'fixture-page:first-run'
  );
  await instance.cdp.send('Page.enable', {}, pageSession);
  await waitForDocumentReady(instance.cdp, pageSession);

  const storedEvents = await waitFor(
    async () => {
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
    },
    { timeout: 15_000 }
  );
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
    attributed || null
  );
  record(
    'stored-event-origin-only',
    Boolean(
      attributed &&
        attributed.context.pageUrl === `http://page.test:${new URL(fixture.pageUrl).port}/` &&
        attributed.context.resourceUrl?.startsWith('http://google-analytics.com:') &&
        !attributed.context.resourceUrl.includes('/collect.js')
    ),
    `pageUrl=${attributed?.context?.pageUrl}; resourceUrl=${attributed?.context?.resourceUrl}`,
    {
      pageUrl: attributed?.context?.pageUrl,
      resourceUrl: attributed?.context?.resourceUrl,
    }
  );

  const popupStartedAt = Date.now();
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const { targetId: popupTargetId } = await instance.cdp.send(
    'Target.createTarget',
    { url: popupUrl }
  );
  const popupSession = await attach(
    instance.cdp,
    popupTargetId,
    'popup:first-run'
  );
  await instance.cdp.send('Page.enable', {}, popupSession);
  await waitForDocumentReady(instance.cdp, popupSession);
  await waitFor(
    async () => {
      const text = await evaluate(instance.cdp, popupSession, 'document.body.innerText');
      return text.includes('Phantom Trail') ? text : null;
    },
    { timeout: 20_000 }
  );

  const navigationTiming = await evaluate(
    instance.cdp,
    popupSession,
    `(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paints = performance.getEntriesByType('paint').map(item => ({name:item.name,startTime:item.startTime}));
      return navigation ? {
        domContentLoaded: navigation.domContentLoadedEventEnd,
        load: navigation.loadEventEnd,
        duration: navigation.duration,
        responseEnd: navigation.responseEnd,
        paints
      } : null;
    })()`
  );
  measurements.popupTargetReadyMilliseconds = Date.now() - popupStartedAt;
  measurements.popupNavigation = navigationTiming;

  const accessibility = await auditPopupAccessibility(
    instance.cdp,
    popupSession
  );
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
    'AI and Coach navigation labels are absent.',
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
    {
      dom: accessibility.domAudit.unnamed,
      ax: accessibility.unnamedAxNodes,
    }
  );
  record(
    'labeled-form-controls',
    accessibility.domAudit.unlabeledControls.length === 0,
    `Unlabeled controls=${accessibility.domAudit.unlabeledControls.length}`,
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

  await evaluate(
    instance.cdp,
    workerSession,
    `Promise.all([
      chrome.storage.local.set({p5_local_restart_probe:'persist'}),
      chrome.storage.session.set({p5_session_restart_probe:'discard'})
    ])`
  );

  return {
    instance,
    extensionId,
    manifest,
    accessibility,
    storedEvents,
    launchedAt,
  };
}

async function secondRun(chromeExecutable, expectedExtensionId) {
  const instance = await launchChrome(chromeExecutable);
  let workerTarget = await waitForExtensionTarget(instance.cdp).catch(
    () => null
  );

  if (!workerTarget) {
    const targets = await getTargets(instance.cdp);
    const existing = targets.find(target =>
      target.url.startsWith(`chrome-extension://${expectedExtensionId}/`)
    );
    if (!existing) {
      await instance.cdp.send('Target.createTarget', {
        url: `chrome-extension://${expectedExtensionId}/popup.html`,
      });
    }
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
    'background-worker:second-run'
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

async function main() {
  if (!existsSync(extensionPath)) {
    throw new Error('Build output is missing. Run pnpm build before browser evidence.');
  }

  const chromeExecutable = findChrome();
  const fixture = await createFixtureServers();
  const budget = JSON.parse(readFileSync(budgetPath, 'utf8'));
  let first;
  let second;

  try {
    first = await firstRun(chromeExecutable, fixture);
    await closeChrome(first.instance);
    first.instance = null;

    second = await secondRun(chromeExecutable, first.extensionId);
    await closeChrome(second);
    second = null;

    const browserBudgets = budget.browserMilliseconds;
    const popupDomContentLoaded = measurements.popupNavigation?.domContentLoaded;
    const popupLoad = measurements.popupNavigation?.load;
    record(
      'popup-dom-content-loaded-budget',
      typeof popupDomContentLoaded === 'number' &&
        popupDomContentLoaded <= browserBudgets.popupDomContentLoadedMaximum,
      `${String(popupDomContentLoaded)}ms <= ${browserBudgets.popupDomContentLoadedMaximum}ms`,
      popupDomContentLoaded
    );
    record(
      'popup-load-budget',
      typeof popupLoad === 'number' && popupLoad <= browserBudgets.popupLoadMaximum,
      `${String(popupLoad)}ms <= ${browserBudgets.popupLoadMaximum}ms`,
      popupLoad
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
    if (first?.instance) await closeChrome(first.instance).catch(() => undefined);
    if (second) await closeChrome(second).catch(() => undefined);
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
        .update(
          readFileSync(join(extensionPath, 'manifest.json'), 'utf8')
        )
        .digest('hex'),
      chromeExecutable,
      chromeVersion: await new Promise(resolvePromise => {
        const child = spawn(chromeExecutable, ['--version']);
        let output = '';
        child.stdout.on('data', chunk => (output += String(chunk)));
        child.on('exit', () => resolvePromise(output.trim()));
      }),
      popupContext: 'extension-page-equivalent',
      profileReusedAcrossRestart: true,
    },
    limitations: [
      'The automated popup target uses the packaged popup URL rather than a physical toolbar click.',
      'This deterministic local fixture is not a real-world detector-accuracy or performance benchmark.',
      'The accessibility contract is not WCAG certification or a substitute for screen-reader and human keyboard review.',
      'OS notification delivery, live OpenRouter behavior, and real P2P exchange are outside this harness.',
    ],
    measurements,
    assertions,
    failures,
    runtimeErrors,
    consoleErrors,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `Chromium lifecycle ${report.status}: ${assertions.length - failures.length}/${assertions.length} assertions passed.`
  );
  console.log(`Report: ${outputPath}`);

  rmSync(profilePath, { recursive: true, force: true });
  if (failures.length > 0) process.exitCode = 1;
}

main().catch(error => {
  mkdirSync(dirname(outputPath), { recursive: true });
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: 'failed',
    fatalError: error instanceof Error ? error.stack || error.message : String(error),
    assertions,
    runtimeErrors,
    consoleErrors,
    measurements,
  };
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.error(error);
  rmSync(profilePath, { recursive: true, force: true });
  process.exitCode = 1;
});
