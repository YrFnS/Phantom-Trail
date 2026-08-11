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
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { matchTrackerUrl } from '../lib/tracker-match.mts';
import { qualifyEvidenceEvent } from '../lib/evidence-score-policy.mts';
import {
  DEFAULT_DATA_PROTECTION_SETTINGS,
  sanitizeTrackingEventForStorage,
} from '../lib/data-protection-policy.mts';
import type { TrackerInfo, TrackingEvent } from '../lib/types.ts';

interface PerformanceBudgets {
  schemaVersion: number;
  budgetVersion: string;
  limitations: string[];
  packageBytes: {
    unpackedTotalMaximum: number;
    zipMaximum: number;
    largestJavaScriptMaximum: number;
    backgroundJavaScriptMaximum: number;
    contentJavaScriptMaximum: number;
  };
  deterministicMilliseconds: {
    trackerMatches100kMaximum: number;
    evidenceQualification100kMaximum: number;
    eventSanitization25kMaximum: number;
  };
  browserMilliseconds: {
    popupDomContentLoadedMaximum: number;
    popupLoadMaximum: number;
    firstDetectorEventMaximum: number;
  };
}

interface FileMeasurement {
  path: string;
  bytes: number;
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buildRoot = join(projectRoot, '.output', 'chrome-mv3');
const outputPath = join(projectRoot, '.artifacts', 'performance-gate.json');
const budgetPath = join(
  projectRoot,
  'evidence',
  'performance-budgets.v1.json'
);

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function walk(path: string): string[] {
  if (!existsSync(path)) return [];
  const info = lstatSync(path);
  if (info.isSymbolicLink()) return [];
  if (info.isFile()) return [path];

  const files: string[] = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) files.push(...walk(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

function findLargest(
  files: FileMeasurement[],
  predicate: (item: FileMeasurement) => boolean
): FileMeasurement | null {
  return (
    files
      .filter(predicate)
      .sort((first, second) => second.bytes - first.bytes)[0] || null
  );
}

function benchmark(
  iterations: number,
  operation: (index: number) => number
): { milliseconds: number; operationsPerSecond: number; checksum: number } {
  let checksum = 0;
  const warmup = Math.min(2000, Math.max(100, Math.floor(iterations / 20)));
  for (let index = 0; index < warmup; index += 1) checksum += operation(index);

  const startedAt = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    checksum += operation(index);
  }
  const milliseconds = Math.round((performance.now() - startedAt) * 100) / 100;
  return {
    milliseconds,
    operationsPerSecond:
      milliseconds === 0
        ? iterations
        : Math.round((iterations / milliseconds) * 1000),
    checksum,
  };
}

function createEvidenceEvent(index: number): TrackingEvent {
  const timestamp = 1_700_000_000_000 + index;
  return {
    schemaVersion: 2,
    id: `performance-${index}`,
    timestamp,
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    occurrences: (index % 8) + 1,
    url: 'https://google-analytics.com/',
    domain: 'google-analytics.com',
    trackerType: 'analytics',
    riskLevel: index % 3 === 0 ? 'high' : 'medium',
    description:
      'Catalog evidence for https://page.example.test/private?token=secret',
    context: {
      source: 'network-request',
      pageUrl: `https://page.example.test/account/${index}?token=secret#fragment`,
      pageDomain: 'page.example.test',
      resourceUrl: `https://google-analytics.com/collect?client=${index}`,
      resourceDomain: 'google-analytics.com',
      initiator: 'https://page.example.test/',
      requestType: 'script',
      requestMethod: 'GET',
      party: 'third-party',
      partyBasis: 'different-site-heuristic',
      partyConfidence: 'high',
      attributionBasis: 'document-url',
      attributionConfidence: 'high',
    },
    detector: {
      id: 'tracker-catalog-domain',
      matchType: 'catalog-exact-domain',
      confidence: 'high',
      rule: 'google-analytics.com',
      evidence: ['Exact catalog-domain fixture'],
    },
  };
}

function main(): void {
  if (!existsSync(buildRoot)) {
    throw new Error('Build output is missing. Run pnpm build before performance gate.');
  }

  const budgetText = readFileSync(budgetPath, 'utf8');
  const budgets = JSON.parse(budgetText) as PerformanceBudgets;
  if (budgets.schemaVersion !== 1) {
    throw new Error(`Unsupported performance budget schema ${budgets.schemaVersion}`);
  }

  const buildFiles = walk(buildRoot).map<FileMeasurement>(path => ({
    path: relative(buildRoot, path).replaceAll('\\', '/'),
    bytes: statSync(path).size,
  }));
  const unpackedTotalBytes = buildFiles.reduce(
    (total, item) => total + item.bytes,
    0
  );
  const javascript = buildFiles.filter(item => extname(item.path) === '.js');
  const largestJavaScript = findLargest(javascript, () => true);
  const backgroundJavaScript = findLargest(javascript, item =>
    /(^|\/)background(?:\.|\/)/u.test(item.path)
  );
  const contentJavaScript = findLargest(javascript, item =>
    /content[-_/]?scripts?|content\.js/iu.test(item.path)
  );

  const zipFiles = walk(join(projectRoot, '.output')).filter(
    path => extname(path).toLowerCase() === '.zip'
  );
  const zip = zipFiles
    .map(path => ({ path, bytes: statSync(path).size }))
    .sort((first, second) => second.bytes - first.bytes)[0];
  if (!zip) throw new Error('ZIP output is missing. Run pnpm zip before performance gate.');

  const knownTrackers: Record<string, TrackerInfo> = {
    'google-analytics.com': {
      domain: 'google-analytics.com',
      name: 'Google Analytics fixture',
      category: 'Analytics',
      description: 'P5 deterministic performance fixture',
      riskLevel: 'medium',
    },
    'doubleclick.net': {
      domain: 'doubleclick.net',
      name: 'DoubleClick fixture',
      category: 'Advertising',
      description: 'P5 deterministic performance fixture',
      riskLevel: 'high',
    },
  };
  const detectorUrls = [
    'https://google-analytics.com/collect',
    'https://sub.doubleclick.net/pixel',
    'https://cdn.example.test/analytics/script.js',
    'https://telemetry.example.test/app.js',
    'https://example.test/ordinary/resource.js',
  ];

  const trackerMatches = benchmark(100_000, index => {
    const match = matchTrackerUrl(
      detectorUrls[index % detectorUrls.length],
      knownTrackers
    );
    return match ? match.rule.length : 0;
  });

  const evidenceEvent = createEvidenceEvent(0);
  const evidenceQualification = benchmark(100_000, index => {
    const result = qualifyEvidenceEvent(
      { ...evidenceEvent, occurrences: (index % 16) + 1 },
      'dataset',
      ''
    );
    return 'candidate' in result ? Math.round(result.candidate.baseContribution) : 0;
  });

  const eventSanitization = benchmark(25_000, index => {
    const result = sanitizeTrackingEventForStorage(
      createEvidenceEvent(index),
      DEFAULT_DATA_PROTECTION_SETTINGS,
      1_800_000_000_000
    );
    return result.event.url.length + (result.changed ? 1 : 0);
  });

  const measurements = {
    packageBytes: {
      unpackedTotal: unpackedTotalBytes,
      zip: zip.bytes,
      largestJavaScript: largestJavaScript?.bytes ?? null,
      largestJavaScriptPath: largestJavaScript?.path ?? null,
      backgroundJavaScript: backgroundJavaScript?.bytes ?? null,
      backgroundJavaScriptPath: backgroundJavaScript?.path ?? null,
      contentJavaScript: contentJavaScript?.bytes ?? null,
      contentJavaScriptPath: contentJavaScript?.path ?? null,
    },
    deterministic: {
      trackerMatches100k: trackerMatches,
      evidenceQualification100k: evidenceQualification,
      eventSanitization25k: eventSanitization,
    },
  };

  const failures: Array<{ metric: string; actual: number | null; maximum: number }> = [];
  const compare = (metric: string, actual: number | null, maximum: number) => {
    if (actual === null || actual > maximum) failures.push({ metric, actual, maximum });
  };

  compare(
    'packageBytes.unpackedTotal',
    measurements.packageBytes.unpackedTotal,
    budgets.packageBytes.unpackedTotalMaximum
  );
  compare('packageBytes.zip', measurements.packageBytes.zip, budgets.packageBytes.zipMaximum);
  compare(
    'packageBytes.largestJavaScript',
    measurements.packageBytes.largestJavaScript,
    budgets.packageBytes.largestJavaScriptMaximum
  );
  compare(
    'packageBytes.backgroundJavaScript',
    measurements.packageBytes.backgroundJavaScript,
    budgets.packageBytes.backgroundJavaScriptMaximum
  );
  compare(
    'packageBytes.contentJavaScript',
    measurements.packageBytes.contentJavaScript,
    budgets.packageBytes.contentJavaScriptMaximum
  );
  compare(
    'deterministic.trackerMatches100k',
    trackerMatches.milliseconds,
    budgets.deterministicMilliseconds.trackerMatches100kMaximum
  );
  compare(
    'deterministic.evidenceQualification100k',
    evidenceQualification.milliseconds,
    budgets.deterministicMilliseconds.evidenceQualification100kMaximum
  );
  compare(
    'deterministic.eventSanitization25k',
    eventSanitization.milliseconds,
    budgets.deterministicMilliseconds.eventSanitization25kMaximum
  );

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: failures.length === 0 ? 'passed' : 'failed',
    budgets: {
      version: budgets.budgetVersion,
      sha256: createHash('sha256').update(budgetText).digest('hex'),
      limitations: budgets.limitations,
      packageBytes: budgets.packageBytes,
      deterministicMilliseconds: budgets.deterministicMilliseconds,
      browserMilliseconds: budgets.browserMilliseconds,
    },
    build: {
      fileCount: buildFiles.length,
      zipPath: relative(projectRoot, zip.path).replaceAll('\\', '/'),
      zipSha256: sha256File(zip.path),
    },
    measurements,
    failures,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `Performance gate ${report.status}: unpacked=${unpackedTotalBytes} bytes; zip=${zip.bytes} bytes; detector100k=${trackerMatches.milliseconds}ms; qualification100k=${evidenceQualification.milliseconds}ms.`
  );
  console.log(`Report: ${outputPath}`);

  if (failures.length > 0) {
    for (const failure of failures) console.error(JSON.stringify(failure));
    process.exitCode = 1;
  }
}

main();
