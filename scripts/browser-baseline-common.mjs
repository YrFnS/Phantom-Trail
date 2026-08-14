import { execFile, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const extensionPath = join(projectRoot, '.output', 'chrome-mv3');
export const artifactRoot = join(projectRoot, '.artifacts', 'browser-baseline');

export function ensureArtifactRoot() {
  mkdirSync(artifactRoot, { recursive: true });
}

export function sleep(milliseconds) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
}

export async function waitFor(operation, options = {}) {
  const timeout = options.timeout ?? 20_000;
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
    `Timed out after ${timeout}ms.${
      lastError instanceof Error ? ` Last error: ${lastError.message}` : ''
    }`
  );
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.CHROME_FOR_TESTING,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const executable = candidates.find(candidate => existsSync(candidate));
  if (!executable) {
    throw new Error(`No Chrome executable found: ${candidates.join(', ')}`);
  }
  return executable;
}

export class CdpConnection {
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
      // Best effort during browser teardown.
    }
  }
}

async function readDevToolsPort(profilePath, chromeProcess, stderr) {
  const path = join(profilePath, 'DevToolsActivePort');
  return waitFor(
    () => {
      if (chromeProcess.exitCode !== null) {
        throw new Error(
          `Chrome exited before CDP became ready: ${stderr().slice(-2000)}`
        );
      }
      if (!existsSync(path)) return null;
      const [port, browserPath] = readFileSync(path, 'utf8')
        .trim()
        .split(/\r?\n/u);
      if (!port || !browserPath) return null;
      return { webSocketUrl: `ws://127.0.0.1:${port}${browserPath}` };
    },
    { timeout: 25_000 }
  );
}

export async function launchChrome(options = {}) {
  if (!existsSync(join(extensionPath, 'manifest.json'))) {
    throw new Error('Build the Chrome extension before running browser baselines.');
  }

  const profilePath = mkdtempSync(
    join(tmpdir(), `phantom-trail-${options.label || 'baseline'}-`)
  );
  const chromeExecutable = findChrome();
  const argumentsList = [
    `--user-data-dir=${profilePath}`,
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--remote-debugging-port=0',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-component-update',
    '--disable-sync',
    '--metrics-recording-only',
    '--password-store=basic',
    '--use-mock-keychain',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--window-position=0,0',
    '--window-size=1280,900',
    ...(options.additionalArguments || []),
    options.initialUrl || 'about:blank',
  ];

  const chromeProcess = spawn(chromeExecutable, argumentsList, {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdoutText = '';
  let stderrText = '';
  chromeProcess.stdout.on('data', chunk => {
    stdoutText += String(chunk);
  });
  chromeProcess.stderr.on('data', chunk => {
    stderrText += String(chunk);
  });

  const devTools = await readDevToolsPort(
    profilePath,
    chromeProcess,
    () => stderrText
  );
  const cdp = new CdpConnection(devTools.webSocketUrl);
  await cdp.connect();
  await cdp.send('Target.setDiscoverTargets', { discover: true });

  return {
    cdp,
    process: chromeProcess,
    profilePath,
    stderr: () => stderrText,
    stdout: () => stdoutText,
  };
}

export async function closeChrome(instance) {
  await Promise.race([
    instance.cdp.send('Browser.close').catch(() => undefined),
    sleep(1_000),
  ]);

  if (instance.process.exitCode === null) {
    await Promise.race([
      new Promise(resolvePromise =>
        instance.process.once('exit', resolvePromise)
      ),
      sleep(4_000),
    ]);
  }
  if (instance.process.exitCode === null) instance.process.kill('SIGKILL');
  instance.cdp.close();
  rmSync(instance.profilePath, { recursive: true, force: true });
}

export async function getTargets(cdp) {
  return (await cdp.send('Target.getTargets')).targetInfos || [];
}

export async function attach(cdp, targetId) {
  const { sessionId } = await cdp.send('Target.attachToTarget', {
    targetId,
    flatten: true,
  });
  await Promise.all([
    cdp.send('Runtime.enable', {}, sessionId),
    cdp.send('Page.enable', {}, sessionId).catch(() => undefined),
    cdp.send('Network.enable', {}, sessionId).catch(() => undefined),
    cdp.send('Log.enable', {}, sessionId).catch(() => undefined),
  ]);
  return sessionId;
}

export async function evaluate(cdp, sessionId, expression) {
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

export async function waitForDocumentReady(cdp, sessionId, timeout = 25_000) {
  return waitFor(
    async () => {
      const state = await evaluate(cdp, sessionId, 'document.readyState');
      return ['interactive', 'complete'].includes(state) ? state : null;
    },
    { timeout }
  );
}

export async function findPhantomWorker(cdp) {
  return waitFor(
    async () => {
      const targets = await getTargets(cdp);
      const candidates = targets.filter(
        target =>
          ['service_worker', 'background_page'].includes(target.type) &&
          target.url.startsWith('chrome-extension://')
      );

      for (const target of candidates) {
        let sessionId;
        try {
          sessionId = await attach(cdp, target.targetId);
          const manifest = await waitFor(
            () =>
              evaluate(
                cdp,
                sessionId,
                `typeof chrome === 'object' && chrome.runtime?.getManifest
                  ? chrome.runtime.getManifest()
                  : null`
              ),
            { timeout: 5_000 }
          );
          if (manifest?.name === 'Phantom Trail') {
            return {
              target,
              sessionId,
              extensionId: new URL(target.url).hostname,
              manifest,
            };
          }
        } catch {
          // Another component extension or a not-yet-ready worker.
        }

        if (sessionId) {
          await cdp
            .send('Target.detachFromTarget', { sessionId })
            .catch(() => undefined);
        }
      }
      return null;
    },
    { timeout: 25_000, interval: 250 }
  );
}

export async function captureScreenshot(cdp, sessionId, path) {
  const result = await cdp.send(
    'Page.captureScreenshot',
    { format: 'png', captureBeyondViewport: true },
    sessionId
  );
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(result.data, 'base64'));
}

export async function findChromeWindow() {
  const patterns = ['.*[Cc]hrom.*', '.*Google.*'];
  for (const pattern of patterns) {
    try {
      const { stdout } = await execFileAsync(
        'xdotool',
        ['search', '--onlyvisible', '--class', pattern],
        { timeout: 5_000 }
      );
      const ids = stdout.trim().split(/\s+/u).filter(Boolean);
      if (ids.length > 0) return ids.at(-1);
    } catch {
      // Try the next common WM_CLASS pattern.
    }
  }
  throw new Error('Could not find the visible Chrome window through xdotool.');
}

export async function focusChromeWindow(windowId) {
  await execFileAsync('xdotool', ['windowfocus', '--sync', windowId], {
    timeout: 5_000,
  });
  await execFileAsync('xdotool', ['windowraise', windowId], {
    timeout: 5_000,
  }).catch(() => undefined);
}

export async function sendChromeShortcut(windowId, shortcut) {
  await focusChromeWindow(windowId);
  await execFileAsync(
    'xdotool',
    ['key', '--clearmodifiers', '--window', windowId, shortcut],
    { timeout: 5_000 }
  );
}

export async function captureDesktop(path) {
  mkdirSync(dirname(path), { recursive: true });
  await execFileAsync('scrot', [path], { timeout: 10_000 });
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function originOnly(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function truncate(value, maximum = 200) {
  if (typeof value !== 'string') return null;
  return value.replace(/\s+/gu, ' ').trim().slice(0, maximum);
}
