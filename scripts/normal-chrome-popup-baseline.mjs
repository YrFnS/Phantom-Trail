import { join } from 'node:path';
import {
  artifactRoot,
  attach,
  captureDesktop,
  captureScreenshot,
  closeChrome,
  ensureArtifactRoot,
  evaluate,
  findChromeWindow,
  findPhantomWorker,
  getTargets,
  launchChrome,
  sendChromeShortcut,
  sleep,
  waitFor,
  waitForDocumentReady,
  writeJson,
} from './browser-baseline-common.mjs';

const reportPath = join(artifactRoot, 'normal-chrome-popup-baseline.json');
const popupScreenshotPath = join(artifactRoot, 'normal-chrome-popup.png');
const desktopScreenshotPath = join(artifactRoot, 'normal-chrome-desktop.png');

async function waitForPopupTarget(cdp, extensionId, timeout = 8_000) {
  return waitFor(
    async () => {
      const targets = await getTargets(cdp);
      return targets.find(
        target =>
          target.type === 'page' &&
          target.url === `chrome-extension://${extensionId}/popup.html`
      );
    },
    { timeout, interval: 100 }
  );
}

async function main() {
  ensureArtifactRoot();
  const startedAt = new Date().toISOString();
  const runtimeErrors = [];
  const consoleErrors = [];
  let instance;
  let report;

  try {
    instance = await launchChrome({ label: 'normal-chrome' });
    const worker = await findPhantomWorker(instance.cdp);
    const commands = await evaluate(
      instance.cdp,
      worker.sessionId,
      'chrome.commands.getAll()'
    );
    const toggleCommand = commands.find(command => command.name === 'toggle-popup');
    const windowId = await findChromeWindow();

    let invocationMethod = 'keyboard-command';
    let popupTarget;
    let keyboardError = null;
    try {
      const shortcut = toggleCommand?.shortcut || 'ctrl+shift+p';
      const xdotoolShortcut = shortcut
        .toLowerCase()
        .replaceAll('+', '+')
        .replace('control', 'ctrl');
      await sendChromeShortcut(windowId, xdotoolShortcut);
      popupTarget = await waitForPopupTarget(instance.cdp, worker.extensionId);
    } catch (error) {
      keyboardError = error instanceof Error ? error.message : String(error);
    }

    if (!popupTarget) {
      invocationMethod = 'chrome.action.openPopup-fallback';
      await evaluate(
        instance.cdp,
        worker.sessionId,
        'chrome.action.openPopup().then(() => true)'
      );
      popupTarget = await waitForPopupTarget(instance.cdp, worker.extensionId);
    }

    const popupSession = await attach(instance.cdp, popupTarget.targetId);
    instance.cdp.on('Runtime.exceptionThrown', event => {
      if (event.sessionId !== popupSession) return;
      runtimeErrors.push(
        event.params.exceptionDetails?.exception?.description ||
          event.params.exceptionDetails?.text ||
          'Runtime exception'
      );
    });
    instance.cdp.on('Runtime.consoleAPICalled', event => {
      if (event.sessionId !== popupSession) return;
      if (!['error', 'assert'].includes(event.params.type)) return;
      consoleErrors.push(
        (event.params.args || []).map(argument =>
          argument.value === undefined
            ? argument.description || argument.type
            : argument.value
        )
      );
    });

    await waitForDocumentReady(instance.cdp, popupSession);
    await sleep(500);

    const dom = await evaluate(
      instance.cdp,
      popupSession,
      `(() => {
        const visible = element => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' &&
            rect.width > 0 && rect.height > 0;
        };
        const focusable = Array.from(document.querySelectorAll(
          'button, a[href], input, select, textarea, [tabindex]'
        )).filter(element => visible(element) && element.tabIndex >= 0);
        return {
          title: document.title,
          language: document.documentElement.lang,
          bodyText: document.body.innerText.replace(/\\s+/g, ' ').trim().slice(0, 2000),
          navigationLabels: Array.from(document.querySelectorAll('nav button'))
            .map(button => (button.textContent || '').replace(/\\s+/g, ' ').trim())
            .filter(Boolean),
          focusableCount: focusable.length,
          unnamedFocusableCount: focusable.filter(element => {
            const name = element.getAttribute('aria-label') ||
              element.getAttribute('title') || element.textContent || '';
            return !name.trim();
          }).length,
          viewport: {
            innerWidth,
            innerHeight,
            bodyScrollWidth: document.body.scrollWidth,
            bodyScrollHeight: document.body.scrollHeight,
            documentScrollWidth: document.documentElement.scrollWidth,
            documentScrollHeight: document.documentElement.scrollHeight
          }
        };
      })()`
    );

    const focusSequence = [];
    for (let index = 0; index < Math.min(dom.focusableCount + 2, 16); index += 1) {
      await instance.cdp.send(
        'Input.dispatchKeyEvent',
        { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 },
        popupSession
      );
      await instance.cdp.send(
        'Input.dispatchKeyEvent',
        { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 },
        popupSession
      );
      focusSequence.push(
        await evaluate(
          instance.cdp,
          popupSession,
          `(() => {
            const element = document.activeElement;
            if (!element) return null;
            return {
              tag: element.tagName,
              name: (element.getAttribute('aria-label') ||
                element.getAttribute('title') || element.textContent || '')
                .replace(/\\s+/g, ' ').trim().slice(0, 120)
            };
          })()`
        )
      );
    }

    await captureScreenshot(instance.cdp, popupSession, popupScreenshotPath);
    await captureDesktop(desktopScreenshotPath);

    const expectedNavigation = ['Feed', 'Map', 'Stats', 'Explore', 'Reports', 'Peers'];
    const navigationPassed = expectedNavigation.every(label =>
      dom.navigationLabels.includes(label)
    );
    const passed =
      navigationPassed &&
      dom.focusableCount > 0 &&
      dom.unnamedFocusableCount === 0 &&
      runtimeErrors.length === 0 &&
      consoleErrors.length === 0;

    report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      startedAt,
      sourceSha: process.env.SOURCE_SHA || null,
      status: passed ? 'passed' : 'failed',
      scope:
        'Automated normal-Chrome popup baseline in a clean headed Chrome for Testing profile under Xvfb.',
      humanToolbarGateClosed: false,
      humanAccessibilityGateClosed: false,
      limitations: [
        'The keyboard command or chrome.action.openPopup fallback invokes the real packaged browser-action popup but does not replace a human physical toolbar click.',
        'Automated focus and DOM checks are not screen-reader, zoom, contrast, reduced-motion, localization, or cognitive-usability review.',
        'Xvfb and Chrome for Testing are not a representative end-user desktop configuration.'
      ],
      extension: {
        id: worker.extensionId,
        name: worker.manifest.name,
        version: worker.manifest.version,
        manifestVersion: worker.manifest.manifest_version
      },
      invocation: {
        method: invocationMethod,
        command: toggleCommand || null,
        keyboardError
      },
      popup: {
        url: popupTarget.url,
        ...dom,
        focusSequence
      },
      runtimeErrors,
      consoleErrors,
      artifacts: {
        popupScreenshot: 'normal-chrome-popup.png',
        desktopScreenshot: 'normal-chrome-desktop.png'
      }
    };
    writeJson(reportPath, report);
    console.log(
      `Normal Chrome popup baseline ${report.status}: ${dom.navigationLabels.join(', ')}`
    );
    if (!passed) process.exitCode = 1;
  } catch (error) {
    report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      startedAt,
      sourceSha: process.env.SOURCE_SHA || null,
      status: 'failed',
      humanToolbarGateClosed: false,
      humanAccessibilityGateClosed: false,
      fatalError: error instanceof Error ? error.stack || error.message : String(error),
      runtimeErrors,
      consoleErrors
    };
    writeJson(reportPath, report);
    console.error(report.fatalError);
    process.exitCode = 1;
  } finally {
    if (instance) await closeChrome(instance);
  }
}

await main();
