import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchTrackerUrl } from '../lib/tracker-match.mts';
import { shouldStoreNetworkMatch } from '../lib/network-match-policy.mts';
import type {
  DetectionConfidence,
  DetectorMatchType,
  PartyRelationship,
  TrackerCategory,
  TrackerInfo,
  TrackingEventContext,
} from '../lib/types.ts';

interface ExpectedResult {
  matched: boolean;
  matchType?: DetectorMatchType;
  rule?: string;
  confidence?: DetectionConfidence;
  stored?: boolean;
}

interface CorpusCase {
  id: string;
  family: string;
  url: string;
  context?: {
    party: PartyRelationship;
    resourceDomain: string;
  };
  expected: ExpectedResult;
  generated?: boolean;
}

interface DetectorCorpus {
  schemaVersion: number;
  corpusVersion: string;
  purpose: string;
  limitations: string[];
  catalogExpectations: {
    totalDomains: number;
    categoryCounts: Record<TrackerCategory, number>;
  };
  explicitCases: CorpusCase[];
}

interface CaseResult {
  id: string;
  family: string;
  url: string;
  generated: boolean;
  expected: ExpectedResult;
  actual: {
    matched: boolean;
    matchType?: DetectorMatchType;
    rule?: string;
    confidence?: DetectionConfidence;
    stored?: boolean;
  };
  passed: boolean;
  failures: string[];
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const corpusPath = join(
  projectRoot,
  'evidence',
  'detector-regression-corpus.v1.json'
);
const outputPath = join(
  projectRoot,
  '.artifacts',
  'detector-regression-report.json'
);

const trackerSources: Array<{
  path: string;
  category: TrackerCategory;
}> = [
  { path: 'lib/trackers/analytics.ts', category: 'Analytics' },
  { path: 'lib/trackers/advertising.ts', category: 'Advertising' },
  { path: 'lib/trackers/social-media.ts', category: 'Social Media' },
  { path: 'lib/trackers/fingerprinting.ts', category: 'Fingerprinting' },
  { path: 'lib/trackers/cryptomining.ts', category: 'Cryptomining' },
];

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function extractCatalog(): {
  trackers: Record<string, TrackerInfo>;
  domainsByCategory: Record<TrackerCategory, string[]>;
  sourceDigest: string;
  duplicateDomains: string[];
} {
  const trackers: Record<string, TrackerInfo> = {};
  const domainsByCategory = Object.fromEntries(
    trackerSources.map(source => [source.category, []])
  ) as Record<TrackerCategory, string[]>;
  const duplicateDomains: string[] = [];
  let digestInput = '';

  for (const source of trackerSources) {
    const absolutePath = join(projectRoot, source.path);
    const text = readFileSync(absolutePath, 'utf8');
    digestInput += `${source.path}\n${text}\n`;
    const domains = Array.from(text.matchAll(/^\s{2}'([^']+)':\s*\{/gmu)).map(
      match => match[1].toLowerCase()
    );

    for (const domain of domains) {
      if (trackers[domain]) duplicateDomains.push(domain);
      trackers[domain] = {
        domain,
        name: `Catalog fixture (${domain})`,
        category: source.category,
        description:
          'Metadata placeholder used only by the P5 matcher regression evaluator.',
        riskLevel: 'medium',
      };
      domainsByCategory[source.category].push(domain);
    }
  }

  for (const domains of Object.values(domainsByCategory)) domains.sort();

  return {
    trackers,
    domainsByCategory,
    sourceDigest: sha256(digestInput),
    duplicateDomains: Array.from(new Set(duplicateDomains)).sort(),
  };
}

function createGeneratedCatalogCases(
  domainsByCategory: Record<TrackerCategory, string[]>
): CorpusCase[] {
  const cases: CorpusCase[] = [];

  for (const [category, domains] of Object.entries(domainsByCategory)) {
    for (const domain of domains) {
      cases.push({
        id: `catalog-exact-${domain}`,
        family: `catalog-exact:${category}`,
        url: `https://${domain}/resource.js`,
        expected: {
          matched: true,
          matchType: 'catalog-exact-domain',
          rule: domain,
          confidence: 'high',
        },
        generated: true,
      });
      cases.push({
        id: `catalog-subdomain-${domain}`,
        family: `catalog-subdomain:${category}`,
        url: `https://subdomain.${domain}/resource.js`,
        expected: {
          matched: true,
          matchType: 'catalog-subdomain',
          rule: domain,
          confidence: 'high',
        },
        generated: true,
      });
    }
  }

  return cases;
}

function createContext(
  testCase: CorpusCase,
  matchConfidence: DetectionConfidence
): TrackingEventContext {
  const resourceDomain = testCase.context?.resourceDomain || '';
  const party = testCase.context?.party || 'unknown';
  return {
    source: 'network-request',
    pageUrl: 'https://page.example.test/',
    pageDomain: 'page.example.test',
    resourceUrl: testCase.url,
    resourceDomain,
    requestType: 'script',
    requestMethod: 'GET',
    party,
    partyBasis:
      party === 'first-party'
        ? 'same-host'
        : party === 'third-party'
          ? 'different-site-heuristic'
          : 'missing-context',
    partyConfidence: party === 'unknown' ? 'low' : 'high',
    attributionBasis: 'document-url',
    attributionConfidence: matchConfidence === 'low' ? 'medium' : 'high',
  };
}

function evaluateCase(
  testCase: CorpusCase,
  trackers: Record<string, TrackerInfo>
): CaseResult {
  const match = matchTrackerUrl(testCase.url, trackers);
  const actual: CaseResult['actual'] = {
    matched: Boolean(match),
    matchType: match?.matchType,
    rule: match?.rule,
    confidence: match?.confidence,
  };

  if (testCase.expected.stored !== undefined) {
    actual.stored = match
      ? shouldStoreNetworkMatch(
          createContext(testCase, match.confidence),
          match.confidence
        )
      : false;
  }

  const failures: string[] = [];
  if (actual.matched !== testCase.expected.matched) {
    failures.push(
      `matched expected ${testCase.expected.matched} but received ${actual.matched}`
    );
  }

  for (const field of ['matchType', 'rule', 'confidence', 'stored'] as const) {
    const expectedValue = testCase.expected[field];
    if (expectedValue !== undefined && actual[field] !== expectedValue) {
      failures.push(
        `${field} expected ${String(expectedValue)} but received ${String(
          actual[field]
        )}`
      );
    }
  }

  return {
    id: testCase.id,
    family: testCase.family,
    url: testCase.url,
    generated: testCase.generated === true,
    expected: testCase.expected,
    actual,
    passed: failures.length === 0,
    failures,
  };
}

function divide(numerator: number, denominator: number): number {
  return denominator === 0
    ? 1
    : Math.round((numerator / denominator) * 10000) / 10000;
}

function main(): void {
  const corpusText = readFileSync(corpusPath, 'utf8');
  const corpus = JSON.parse(corpusText) as DetectorCorpus;
  if (corpus.schemaVersion !== 1) {
    throw new Error(`Unsupported detector corpus schema ${corpus.schemaVersion}`);
  }

  const catalog = extractCatalog();
  const generatedCases = createGeneratedCatalogCases(catalog.domainsByCategory);
  const allCases = [...generatedCases, ...corpus.explicitCases];
  const results = allCases.map(testCase =>
    evaluateCase(testCase, catalog.trackers)
  );

  let truePositive = 0;
  let falsePositive = 0;
  let trueNegative = 0;
  let falseNegative = 0;
  for (const result of results) {
    if (result.expected.matched && result.actual.matched) truePositive += 1;
    else if (!result.expected.matched && result.actual.matched) falsePositive += 1;
    else if (!result.expected.matched && !result.actual.matched) trueNegative += 1;
    else falseNegative += 1;
  }

  const sourceCategoryCounts = Object.fromEntries(
    Object.entries(catalog.domainsByCategory).map(([category, domains]) => [
      category,
      domains.length,
    ])
  ) as Record<TrackerCategory, number>;
  const catalogFailures: string[] = [];
  const sourceDomainCount = Object.keys(catalog.trackers).length;
  if (sourceDomainCount !== corpus.catalogExpectations.totalDomains) {
    catalogFailures.push(
      `catalog domain count expected ${corpus.catalogExpectations.totalDomains} but received ${sourceDomainCount}`
    );
  }
  for (const [category, expectedCount] of Object.entries(
    corpus.catalogExpectations.categoryCounts
  )) {
    const actualCount = sourceCategoryCounts[category as TrackerCategory] || 0;
    if (actualCount !== expectedCount) {
      catalogFailures.push(
        `${category} catalog count expected ${expectedCount} but received ${actualCount}`
      );
    }
  }
  if (catalog.duplicateDomains.length > 0) {
    catalogFailures.push(
      `duplicate catalog domains: ${catalog.duplicateDomains.join(', ')}`
    );
  }

  const failedCases = results.filter(result => !result.passed);
  const familySummary = Object.values(
    results.reduce<Record<string, { family: string; total: number; passed: number }>>(
      (summary, result) => {
        const current = summary[result.family] || {
          family: result.family,
          total: 0,
          passed: 0,
        };
        current.total += 1;
        if (result.passed) current.passed += 1;
        summary[result.family] = current;
        return summary;
      },
      {}
    )
  ).sort((first, second) => first.family.localeCompare(second.family));
  const passed = catalogFailures.length === 0 && failedCases.length === 0;

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: passed ? 'passed' : 'failed',
    corpus: {
      version: corpus.corpusVersion,
      sha256: sha256(corpusText),
      purpose: corpus.purpose,
      limitations: corpus.limitations,
    },
    catalog: {
      sourceSha256: catalog.sourceDigest,
      totalDomains: sourceDomainCount,
      categoryCounts: sourceCategoryCounts,
      duplicateDomains: catalog.duplicateDomains,
      failures: catalogFailures,
    },
    cases: {
      total: results.length,
      generatedCatalogCases: generatedCases.length,
      explicitCases: corpus.explicitCases.length,
      passed: results.length - failedCases.length,
      failed: failedCases.length,
    },
    confusionMatrix: {
      truePositive,
      falsePositive,
      trueNegative,
      falseNegative,
    },
    metrics: {
      precision: divide(truePositive, truePositive + falsePositive),
      recall: divide(truePositive, truePositive + falseNegative),
      specificity: divide(trueNegative, trueNegative + falsePositive),
      accuracy: divide(
        truePositive + trueNegative,
        truePositive + trueNegative + falsePositive + falseNegative
      ),
    },
    familySummary,
    failures: [
      ...catalogFailures.map(message => ({ type: 'catalog', message })),
      ...failedCases.map(result => ({
        type: 'case',
        id: result.id,
        family: result.family,
        failures: result.failures,
        expected: result.expected,
        actual: result.actual,
      })),
    ],
    caseResults: results,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(
    `Detector regression corpus ${corpus.corpusVersion}: ${report.cases.passed}/${report.cases.total} cases passed; precision=${report.metrics.precision}; recall=${report.metrics.recall}; specificity=${report.metrics.specificity}`
  );
  console.log(`Report: ${outputPath}`);

  if (!passed) {
    for (const failure of report.failures) {
      console.error(JSON.stringify(failure));
    }
    process.exitCode = 1;
  }
}

main();
