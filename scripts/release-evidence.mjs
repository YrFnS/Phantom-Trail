import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactRoot = join(projectRoot, '.artifacts');
const buildRoot = join(projectRoot, '.output', 'chrome-mv3');
const outputPath = join(artifactRoot, 'release-evidence.json');

const reportPaths = {
  tests: join(artifactRoot, 'tests.tap'),
  detectorRegression: join(artifactRoot, 'detector-regression-report.json'),
  security: join(artifactRoot, 'security-gate.json'),
  performance: join(artifactRoot, 'performance-gate.json'),
  browserLifecycle: join(artifactRoot, 'chromium-lifecycle.json'),
  dependencyAudit: join(artifactRoot, 'dependency-audit.json'),
  dependencyInventory: join(artifactRoot, 'dependency-inventory.json'),
};

function sha256Buffer(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sha256File(path) {
  return sha256Buffer(readFileSync(path));
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function walk(path) {
  if (!existsSync(path)) return [];
  const info = lstatSync(path);
  if (info.isSymbolicLink()) return [];
  if (info.isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink()) return [];
    return walk(join(path, entry.name));
  });
}

function buildTreeEvidence() {
  const files = walk(buildRoot)
    .map(path => ({
      path: relative(buildRoot, path).replaceAll('\\', '/'),
      bytes: statSync(path).size,
      sha256: sha256File(path),
    }))
    .sort((first, second) => first.path.localeCompare(second.path));
  return {
    fileCount: files.length,
    totalBytes: files.reduce((total, item) => total + item.bytes, 0),
    treeSha256: sha256Buffer(
      files
        .map(item => `${item.path}\0${item.bytes}\0${item.sha256}`)
        .join('\n')
    ),
    files,
  };
}

function findZip() {
  const zipFiles = walk(join(projectRoot, '.output')).filter(
    path => extname(path).toLowerCase() === '.zip'
  );
  return zipFiles
    .map(path => ({
      path,
      bytes: statSync(path).size,
      sha256: sha256File(path),
    }))
    .sort((first, second) => second.bytes - first.bytes)[0];
}

function parseTap(path) {
  const text = readFileSync(path, 'utf8').replace(
    // eslint-disable-next-line no-control-regex
    /\u001b\[[0-9;]*m/gu,
    ''
  );
  const number = label => {
    const match = text.match(new RegExp(`^# ${label} (\\d+)$`, 'mu'));
    return match ? Number(match[1]) : null;
  };
  const summary = {
    tests: number('tests'),
    pass: number('pass'),
    fail: number('fail'),
    skipped: number('skipped'),
    todo: number('todo'),
  };
  return {
    ...summary,
    status:
      summary.tests !== null &&
      summary.pass === summary.tests &&
      summary.fail === 0
        ? 'passed'
        : 'failed',
    sha256: sha256Buffer(text),
  };
}

function sourceHead() {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: projectRoot,
    encoding: 'utf8',
  }).trim();
}

function gitStatus() {
  return execFileSync('git', ['status', '--porcelain'], {
    cwd: projectRoot,
    encoding: 'utf8',
  })
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean);
}

function main() {
  mkdirSync(artifactRoot, { recursive: true });
  const missing = Object.entries(reportPaths)
    .filter(([, path]) => !existsSync(path))
    .map(([name]) => name);
  if (!existsSync(join(buildRoot, 'manifest.json'))) missing.push('manifest');
  const zip = findZip();
  if (!zip) missing.push('zip');

  if (missing.length > 0) {
    throw new Error(`Release evidence inputs are missing: ${missing.join(', ')}`);
  }

  const packageJson = readJson(join(projectRoot, 'package.json'));
  const generatedManifest = readJson(join(buildRoot, 'manifest.json'));
  const wxtSource = readFileSync(join(projectRoot, 'wxt.config.ts'), 'utf8');
  const changelog = readFileSync(join(projectRoot, 'CHANGELOG.md'), 'utf8');
  const readme = readFileSync(join(projectRoot, 'README.md'), 'utf8');
  const manualGateText = readFileSync(
    join(projectRoot, 'release', 'manual-gates.v1.json'),
    'utf8'
  );
  const manualGateDocument = JSON.parse(manualGateText);
  const reports = {
    tests: parseTap(reportPaths.tests),
    detectorRegression: readJson(reportPaths.detectorRegression),
    security: readJson(reportPaths.security),
    performance: readJson(reportPaths.performance),
    browserLifecycle: readJson(reportPaths.browserLifecycle),
    dependencyAudit: readJson(reportPaths.dependencyAudit),
    dependencyInventory: readJson(reportPaths.dependencyInventory),
  };
  const head = sourceHead();
  const expectedHead = process.env.SOURCE_SHA || process.env.GITHUB_SHA || head;
  const sourceVersionMatch = wxtSource.match(/version:\s*['"]([^'"]+)['"]/u);
  const sourceVersion = sourceVersionMatch?.[1] || null;
  const workingTree = gitStatus();

  const automatedFailures = [];
  const expect = (condition, id, detail) => {
    if (!condition) automatedFailures.push({ id, detail });
  };

  expect(head === expectedHead, 'source-sha', `HEAD=${head}; expected=${expectedHead}`);
  expect(workingTree.length === 0, 'clean-tree', workingTree.join('\n'));
  expect(
    packageJson.version === generatedManifest.version &&
      packageJson.version === sourceVersion,
    'version-consistency',
    `package=${packageJson.version}; generated=${generatedManifest.version}; source=${sourceVersion}`
  );
  expect(
    changelog.includes(`[${packageJson.version}]`),
    'changelog-version',
    `CHANGELOG.md lacks [${packageJson.version}]`
  );
  expect(
    readme.includes(packageJson.version),
    'readme-version',
    `README.md does not mention ${packageJson.version}`
  );
  expect(reports.tests.status === 'passed', 'tests', JSON.stringify(reports.tests));
  for (const [name, report] of Object.entries(reports)) {
    if (name === 'tests') continue;
    expect(
      report.status === 'passed',
      name,
      `Expected passed but received ${String(report.status)}`
    );
  }
  expect(
    generatedManifest.manifest_version === 3,
    'manifest-version',
    `manifest_version=${generatedManifest.manifest_version}`
  );
  expect(packageJson.license === 'MIT', 'license', `license=${packageJson.license}`);

  const unresolvedManualGates = manualGateDocument.gates.filter(
    gate => gate.status !== 'resolved'
  );
  const build = buildTreeEvidence();
  const evidenceFiles = Object.fromEntries(
    Object.entries(reportPaths).map(([name, path]) => [
      name,
      {
        path: relative(projectRoot, path).replaceAll('\\', '/'),
        bytes: statSync(path).size,
        sha256: sha256File(path),
      },
    ])
  );

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      commitSha: head,
      expectedCommitSha: expectedHead,
      branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || null,
      repository: process.env.GITHUB_REPOSITORY || 'YrFnS/Phantom-Trail',
      workflowRunId: process.env.GITHUB_RUN_ID || null,
      workflowRunNumber: process.env.GITHUB_RUN_NUMBER || null,
      cleanWorkingTree: workingTree.length === 0,
    },
    product: {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      license: packageJson.license,
      generatedManifest: {
        name: generatedManifest.name,
        version: generatedManifest.version,
        manifestVersion: generatedManifest.manifest_version,
        permissions: generatedManifest.permissions || [],
        optionalPermissions: generatedManifest.optional_permissions || [],
        hostPermissions: generatedManifest.host_permissions || [],
        commands: Object.keys(generatedManifest.commands || {}),
        sha256: sha256File(join(buildRoot, 'manifest.json')),
      },
    },
    automatedStatus:
      automatedFailures.length === 0 ? 'passed' : 'failed',
    releaseStatus:
      automatedFailures.length === 0 && unresolvedManualGates.length === 0
        ? 'eligible-for-owner-review'
        : 'blocked',
    automatedFailures,
    reports: {
      tests: reports.tests,
      detectorRegression: {
        status: reports.detectorRegression.status,
        corpus: reports.detectorRegression.corpus,
        cases: reports.detectorRegression.cases,
        confusionMatrix: reports.detectorRegression.confusionMatrix,
        metrics: reports.detectorRegression.metrics,
      },
      security: {
        status: reports.security.status,
        source: reports.security.source,
        failures: reports.security.failures,
      },
      performance: {
        status: reports.performance.status,
        budgets: reports.performance.budgets,
        measurements: reports.performance.measurements,
        failures: reports.performance.failures,
      },
      browserLifecycle: {
        status: reports.browserLifecycle.status,
        source: reports.browserLifecycle.source,
        measurements: reports.browserLifecycle.measurements,
        assertionCount: reports.browserLifecycle.assertions?.length || 0,
        failureCount: reports.browserLifecycle.failures?.length || 0,
      },
      dependencyAudit: {
        status: reports.dependencyAudit.status,
        exitCode: reports.dependencyAudit.exitCode,
        vulnerabilityCounts: reports.dependencyAudit.vulnerabilityCounts,
      },
      dependencyInventory: {
        status: reports.dependencyInventory.status,
        exitCode: reports.dependencyInventory.exitCode,
      },
    },
    artifacts: {
      zip: {
        path: relative(projectRoot, zip.path).replaceAll('\\', '/'),
        bytes: zip.bytes,
        sha256: zip.sha256,
      },
      unpacked: build,
      evidenceFiles,
    },
    manualGates: {
      version: manualGateDocument.gateVersion,
      sha256: sha256Buffer(manualGateText),
      unresolvedCount: unresolvedManualGates.length,
      unresolved: unresolvedManualGates,
    },
    limitations: [
      'Automated fixture metrics are regression evidence, not real-world detector accuracy.',
      'The browser fixture is not a multi-device, long-duration, assistive-technology, or real-site review.',
      'A passing automated security/dependency gate is not an independent audit or production-readiness certification.',
      'The candidate remains blocked while any manual or independent gate is unresolved.',
    ],
  };

  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `Release evidence: automated=${report.automatedStatus}; release=${report.releaseStatus}; manual gates unresolved=${unresolvedManualGates.length}.`
  );
  console.log(`ZIP SHA-256: ${zip.sha256}`);
  console.log(`Report: ${outputPath}`);

  if (automatedFailures.length > 0) {
    for (const failure of automatedFailures) console.error(JSON.stringify(failure));
    process.exitCode = 1;
  }
  if (
    process.env.REQUIRE_MANUAL_GATES === '1' &&
    unresolvedManualGates.length > 0
  ) {
    console.error(
      `Stable release blocked by ${unresolvedManualGates.length} unresolved manual/independent gate(s).`
    );
    process.exitCode = 1;
  }
}

main();
