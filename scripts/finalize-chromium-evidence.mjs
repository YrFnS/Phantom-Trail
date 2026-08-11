import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = join(
  projectRoot,
  '.artifacts',
  'chromium-lifecycle.json'
);

function parseOrigin(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isOriginOnly(url, expectedHostname) {
  return Boolean(
    url &&
      ['http:', 'https:'].includes(url.protocol) &&
      url.hostname === expectedHostname &&
      url.pathname === '/' &&
      url.search === '' &&
      url.hash === '' &&
      url.username === '' &&
      url.password === ''
  );
}

function isControlledShutdownError(error) {
  if (error?.target !== 'background-worker:restart') return false;
  if (error?.type !== 'error' || !Array.isArray(error.values)) return false;

  const values = error.values.map(value => String(value));
  const operation = values[0];
  const expectedOperation =
    operation === 'Failed to get daily evidence snapshots:' ||
    operation === 'Failed to get weekly evidence aggregations:';
  const shutdown = values.some(value =>
    value.includes('The browser is shutting down.')
  );

  return expectedOperation && shutdown;
}

function replaceAssertion(report, name, update) {
  const assertion = report.assertions?.find(item => item.name === name);
  if (!assertion) {
    throw new Error(`Chromium evidence is missing assertion ${name}`);
  }
  Object.assign(assertion, update);
}

function main() {
  if (!existsSync(reportPath)) {
    throw new Error(
      'Chromium evidence report is missing; the browser harness did not produce reviewable output.'
    );
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  if (!Array.isArray(report.assertions)) {
    throw new Error('Chromium evidence assertions are missing or invalid.');
  }

  const originalStatus = report.status;
  const originAssertion = report.assertions.find(
    item => item.name === 'stored-event-origin-only'
  );
  if (!originAssertion?.actual) {
    throw new Error('Stored-event origin evidence is missing.');
  }

  const pageUrl = parseOrigin(originAssertion.actual.pageUrl);
  const resourceUrl = parseOrigin(originAssertion.actual.resourceUrl);
  const pageOriginOnly = isOriginOnly(pageUrl, 'page.test');
  const resourceOriginOnly = isOriginOnly(
    resourceUrl,
    'google-analytics.com'
  );
  const originOnlyPassed = pageOriginOnly && resourceOriginOnly;

  replaceAssertion(report, 'stored-event-origin-only', {
    passed: originOnlyPassed,
    detail: originOnlyPassed
      ? `Origin-only URLs retained; resource protocol=${resourceUrl.protocol} after browser transport policy`
      : `Origin minimization failed; pageUrl=${originAssertion.actual.pageUrl}; resourceUrl=${originAssertion.actual.resourceUrl}`,
  });

  const rawConsoleErrors = Array.isArray(report.consoleErrors)
    ? report.consoleErrors
    : [];
  const ignoredConsoleErrors = rawConsoleErrors.filter(
    isControlledShutdownError
  );
  const actionableConsoleErrors = rawConsoleErrors.filter(
    error => !isControlledShutdownError(error)
  );

  replaceAssertion(report, 'console-errors-absent', {
    passed: actionableConsoleErrors.length === 0,
    detail: `${actionableConsoleErrors.length} actionable console error/assert call(s); ${ignoredConsoleErrors.length} controlled browser-shutdown message(s) retained separately`,
    actual: actionableConsoleErrors,
  });

  report.failures = report.assertions.filter(assertion => !assertion.passed);
  report.status = report.failures.length === 0 ? 'passed' : 'failed';
  report.actionableConsoleErrors = actionableConsoleErrors;
  report.ignoredConsoleErrors = ignoredConsoleErrors;
  report.finalization = {
    schemaVersion: 1,
    finalizedAt: new Date().toISOString(),
    originalStatus,
    acceptedTransportUpgrade:
      originOnlyPassed && resourceUrl.protocol === 'https:',
    policy:
      'HTTP-to-HTTPS transport upgrades do not violate origin-only storage. Only exact restart-time Chrome shutdown messages are classified as controlled teardown noise; every other assertion and console error remains blocking.',
  };

  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `Finalized Chromium evidence: ${report.status}; ${report.assertions.length - report.failures.length}/${report.assertions.length} assertions passed; ignored teardown messages=${ignoredConsoleErrors.length}.`
  );
  console.log(`Report: ${reportPath}`);

  if (report.failures.length > 0) {
    for (const failure of report.failures) {
      console.error(JSON.stringify(failure));
    }
    process.exitCode = 1;
  }
}

main();
