import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactRoot = join(projectRoot, '.artifacts');
const auditPath = join(artifactRoot, 'dependency-audit.json');
const inventoryPath = join(artifactRoot, 'dependency-inventory.json');

function run(command, args) {
  return spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
}

function parseJson(value) {
  if (!value?.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    const firstBrace = value.indexOf('{');
    const firstBracket = value.indexOf('[');
    const start = [firstBrace, firstBracket]
      .filter(index => index >= 0)
      .sort((first, second) => first - second)[0];
    if (start === undefined) return null;
    try {
      return JSON.parse(value.slice(start));
    } catch {
      return null;
    }
  }
}

function vulnerabilityCounts(parsed) {
  const candidates = [
    parsed?.metadata?.vulnerabilities,
    parsed?.advisories && {
      total: Object.keys(parsed.advisories).length,
    },
  ].filter(Boolean);
  const source = candidates[0] || {};
  return {
    info: Number(source.info || 0),
    low: Number(source.low || 0),
    moderate: Number(source.moderate || 0),
    high: Number(source.high || 0),
    critical: Number(source.critical || 0),
    total: Number(
      source.total ||
        Number(source.info || 0) +
          Number(source.low || 0) +
          Number(source.moderate || 0) +
          Number(source.high || 0) +
          Number(source.critical || 0)
    ),
  };
}

function main() {
  mkdirSync(artifactRoot, { recursive: true });

  const inventoryResult = run('pnpm', [
    'list',
    '--prod',
    '--depth',
    'Infinity',
    '--json',
  ]);
  const inventoryParsed = parseJson(inventoryResult.stdout);
  const inventoryReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: inventoryResult.status === 0 && inventoryParsed ? 'passed' : 'failed',
    command: 'pnpm list --prod --depth Infinity --json',
    exitCode: inventoryResult.status,
    dependencyTree: inventoryParsed,
    stderr: inventoryResult.stderr?.trim() || null,
  };
  writeFileSync(
    inventoryPath,
    `${JSON.stringify(inventoryReport, null, 2)}\n`,
    'utf8'
  );

  const auditResult = run('pnpm', [
    'audit',
    '--prod',
    '--audit-level',
    'high',
    '--json',
  ]);
  const auditParsed = parseJson(auditResult.stdout);
  const counts = vulnerabilityCounts(auditParsed);
  const auditReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: auditResult.status === 0 ? 'passed' : 'failed',
    command: 'pnpm audit --prod --audit-level high --json',
    exitCode: auditResult.status,
    vulnerabilityCounts: counts,
    result: auditParsed,
    stderr: auditResult.stderr?.trim() || null,
    limitations: [
      'Registry advisory data is time-dependent and can change after this run.',
      'A clean registry audit does not detect every malicious, compromised, or vulnerable dependency.',
      'Development dependencies and browser/runtime vulnerabilities require separate review.',
    ],
  };
  writeFileSync(
    auditPath,
    `${JSON.stringify(auditReport, null, 2)}\n`,
    'utf8'
  );

  console.log(
    `Dependency inventory ${inventoryReport.status}; production audit ${auditReport.status}; high=${counts.high}; critical=${counts.critical}.`
  );
  console.log(`Audit report: ${auditPath}`);
  console.log(`Inventory report: ${inventoryPath}`);

  if (inventoryReport.status !== 'passed' || auditReport.status !== 'passed') {
    if (inventoryResult.stderr) console.error(inventoryResult.stderr);
    if (auditResult.stderr) console.error(auditResult.stderr);
    process.exitCode = 1;
  }
}

main();
