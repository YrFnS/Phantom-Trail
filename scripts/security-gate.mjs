import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(projectRoot, '.artifacts', 'security-gate.json');
const buildRoot = join(projectRoot, '.output', 'chrome-mv3');

const sourceRoots = [
  'components',
  'entrypoints',
  'lib',
  'public',
  'styles',
  'wxt.config.ts',
];
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
]);

const retiredPaths = [
  'lib/export-scheduler.ts',
  'lib/sync-manager.ts',
  'lib/storage/sync-storage.ts',
  'entrypoints/content/privacy-prediction.ts',
  'lib/privacy-predictor',
  'components/Settings/SyncSettings.tsx',
  'components/PrivacyCoaching',
  'lib/privacy-coach.ts',
  'lib/ai-coaching.ts',
  'public/content-main-world.js',
  'lib/content-messaging.ts',
  'lib/in-page-detector.ts',
];

const staleEvidencePaths = [
  'tests/privacy-predictions.test.js',
  'tests/sync-functionality.test.js',
  'tests/test-export-scheduling.html',
  'tests/test-notifications.js',
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function walk(inputPath) {
  const absolute = join(projectRoot, inputPath);
  if (!existsSync(absolute)) return [];
  const info = lstatSync(absolute);
  if (info.isSymbolicLink()) return [];
  if (info.isFile()) return [absolute];

  const files = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = join(absolute, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) files.push(...walk(relative(projectRoot, child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

function addFailure(failures, check, detail, file) {
  failures.push({ check, detail, file });
}

function scanSource() {
  const files = sourceRoots
    .flatMap(walk)
    .filter(file => textExtensions.has(extname(file).toLowerCase()));
  const failures = [];
  const outboundCallSites = [];
  const hashes = {};

  const forbiddenPatterns = [
    {
      id: 'request-body-collection',
      expression: /\brequestBody\b/gu,
      message:
        'Project-owned source must not request or retain request bodies.',
    },
    {
      id: 'dynamic-eval',
      expression: /\beval\s*\(|\bnew\s+Function\s*\(/gu,
      message: 'Project-owned source must not use eval or new Function.',
    },
    {
      id: 'external-extension-channel',
      expression:
        /\bonMessageExternal\b|\bonConnectExternal\b|\bexternally_connectable\b/gu,
      message:
        'Externally connectable extension surfaces require a new reviewed security policy.',
    },
    {
      id: 'react-raw-html',
      expression: /\bdangerouslySetInnerHTML\b/gu,
      message: 'React raw-HTML injection is not approved.',
    },
    {
      id: 'broad-host-access',
      expression: /<all_urls>/gu,
      message: 'The P3/P4 host boundary is HTTP(S), not <all_urls>.',
    },
    {
      id: 'remote-css-import',
      expression: /@import[^;\n]*https?:\/\//giu,
      message: 'Remote CSS or font imports are forbidden in extension pages.',
    },
    {
      id: 'remote-html-executable',
      expression:
        /<(?:script|link)\b[^>]*(?:src|href)\s*=\s*["']https?:\/\//giu,
      message: 'Remote scripts and styles are forbidden in extension HTML.',
    },
    {
      id: 'remote-script-assignment',
      expression: /\.src\s*=\s*["']https?:\/\//giu,
      message: 'Remote executable script assignment is forbidden.',
    },
    {
      id: 'sensitive-key-diagnostic',
      expression: /API key length|key prefix|openRouterApiKey\s*[,)]/giu,
      message:
        'Credential values or derived key diagnostics must not be logged.',
    },
    {
      id: 'page-world-detector-bridge',
      expression: /phantom-trail-detection/giu,
      message:
        'The forgeable page-world detector event bridge was retired and must not return.',
    },
    {
      id: 'page-posted-p2p-discovery',
      expression: /PHANTOM_TRAIL_P2P_DISCOVERY/gu,
      message:
        'The obsolete webpage-posted P2P discovery channel was retired and must not return.',
    },
  ];

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const name = relative(projectRoot, file).replaceAll('\\', '/');
    hashes[name] = sha256(text);

    for (const pattern of forbiddenPatterns) {
      const matches = Array.from(text.matchAll(pattern.expression));
      for (const match of matches) {
        const line = text.slice(0, match.index).split('\n').length;
        addFailure(
          failures,
          pattern.id,
          `${pattern.message} Match: ${match[0].slice(0, 120)}`,
          `${name}:${line}`
        );
      }
    }

    const fetchMatches = Array.from(text.matchAll(/\bfetch\s*\(/gu));
    const xhrMatches = Array.from(text.matchAll(/\bXMLHttpRequest\s*\(/gu));
    const socketMatches = Array.from(text.matchAll(/\bnew\s+WebSocket\s*\(/gu));
    for (const [kind, matches] of [
      ['fetch', fetchMatches],
      ['XMLHttpRequest', xhrMatches],
      ['WebSocket', socketMatches],
    ]) {
      for (const match of matches) {
        const line = text.slice(0, match.index).split('\n').length;
        outboundCallSites.push({ kind, file: name, line });
      }
    }
  }

  const approvedOutboundFiles = new Set(['lib/ai/client.ts']);
  for (const callSite of outboundCallSites) {
    if (!approvedOutboundFiles.has(callSite.file)) {
      addFailure(
        failures,
        'unreviewed-outbound-call',
        `${callSite.kind} is not on the project-owned outbound-call allowlist.`,
        `${callSite.file}:${callSite.line}`
      );
    }
  }

  const openRouterClient = join(projectRoot, 'lib/ai/client.ts');
  if (!existsSync(openRouterClient)) {
    addFailure(
      failures,
      'openrouter-boundary-missing',
      'The reviewed OpenRouter client path is missing.',
      'lib/ai/client.ts'
    );
  } else {
    const text = readFileSync(openRouterClient, 'utf8');
    if (!text.includes('https://openrouter.ai/api/v1')) {
      addFailure(
        failures,
        'openrouter-destination-drift',
        'The reviewed OpenRouter API origin is absent or changed.',
        'lib/ai/client.ts'
      );
    }
  }

  for (const retiredPath of retiredPaths) {
    if (existsSync(join(projectRoot, retiredPath))) {
      addFailure(
        failures,
        'retired-feature-present',
        'P4 removed this incomplete or misleading feature path.',
        retiredPath
      );
    }
  }

  for (const stalePath of staleEvidencePaths) {
    if (existsSync(join(projectRoot, stalePath))) {
      addFailure(
        failures,
        'stale-unexecuted-test-present',
        'This legacy test is not executed by the current test command and covers a retired or replaced workflow.',
        stalePath
      );
    }
  }

  return { files, failures, outboundCallSites, hashes };
}

function scanManifest() {
  const failures = [];
  const manifestPath = join(buildRoot, 'manifest.json');
  if (!existsSync(manifestPath)) {
    addFailure(
      failures,
      'manifest-missing',
      'Build the extension before running the package security gate.',
      relative(projectRoot, manifestPath)
    );
    return { manifest: null, failures };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const required = [...(manifest.permissions || [])].sort();
  const optional = [...(manifest.optional_permissions || [])].sort();
  const hosts = [...(manifest.host_permissions || [])].sort();
  const commands = Object.keys(manifest.commands || {}).sort();
  const expectedRequired = ['alarms', 'storage', 'tabs', 'webRequest'];
  const expectedOptional = ['management', 'notifications'];
  const expectedHosts = ['http://*/*', 'https://*/*'];
  const expectedCommands = ['quick-analysis', 'toggle-popup'];

  const exact = (actual, expected) =>
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);

  for (const [id, actual, expected] of [
    ['required-permissions', required, expectedRequired],
    ['optional-permissions', optional, expectedOptional],
    ['host-permissions', hosts, expectedHosts],
    ['keyboard-commands', commands, expectedCommands],
  ]) {
    if (!exact(actual, expected)) {
      addFailure(
        failures,
        `manifest-${id}`,
        `Expected [${expected.join(', ')}] but received [${actual.join(', ')}].`,
        'manifest.json'
      );
    }
  }

  const csp = JSON.stringify(manifest.content_security_policy || {});
  if (/unsafe-eval|https?:\/\//iu.test(csp)) {
    addFailure(
      failures,
      'manifest-csp',
      `Generated extension CSP contains an unsafe or remote source: ${csp}`,
      'manifest.json'
    );
  }

  if (manifest.externally_connectable) {
    addFailure(
      failures,
      'manifest-external-connectability',
      'No externally connectable surface is approved.',
      'manifest.json'
    );
  }

  const accessibleResources = JSON.stringify(
    manifest.web_accessible_resources || []
  );
  if (/content-main-world\.js/iu.test(accessibleResources)) {
    addFailure(
      failures,
      'manifest-page-world-detector',
      'The retired page-world detector script must not be web-accessible.',
      'manifest.json'
    );
  }

  return { manifest, failures };
}

function scanPackage() {
  const failures = [];
  const packagePath = join(projectRoot, 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  const sourceConfig = readFileSync(join(projectRoot, 'wxt.config.ts'), 'utf8');
  const versionMatch = sourceConfig.match(/version:\s*['"]([^'"]+)['"]/u);
  const manifestVersion = versionMatch?.[1];
  if (manifestVersion !== packageJson.version) {
    addFailure(
      failures,
      'source-version-mismatch',
      `package.json=${packageJson.version}; wxt.config.ts=${String(
        manifestVersion
      )}`,
      'package.json'
    );
  }

  if (packageJson.license !== 'MIT') {
    addFailure(
      failures,
      'license-mismatch',
      `Expected MIT but received ${String(packageJson.license)}.`,
      'package.json'
    );
  }

  if (packageJson.dependencies?.tldts !== '7.4.9') {
    addFailure(
      failures,
      'public-suffix-dependency',
      `Expected exact tldts 7.4.9 but received ${String(
        packageJson.dependencies?.tldts
      )}.`,
      'package.json'
    );
  }

  return { packageJson, failures };
}

function main() {
  const source = scanSource();
  const manifest = scanManifest();
  const packageScan = scanPackage();
  const failures = [
    ...source.failures,
    ...manifest.failures,
    ...packageScan.failures,
  ];

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: failures.length === 0 ? 'passed' : 'failed',
    limitations: [
      'This automated source/package gate is not a penetration test or independent security audit.',
      'Dependencies and browser behavior require separate review.',
      'A passing result does not establish production readiness, privacy, or legal compliance.',
    ],
    source: {
      scannedFileCount: source.files.length,
      sourceDigest: sha256(
        Object.entries(source.hashes)
          .sort(([first], [second]) => first.localeCompare(second))
          .map(([name, digest]) => `${name}:${digest}`)
          .join('\n')
      ),
      outboundCallSites: source.outboundCallSites,
    },
    manifest: manifest.manifest
      ? {
          name: manifest.manifest.name,
          version: manifest.manifest.version,
          manifestVersion: manifest.manifest.manifest_version,
          requiredPermissions: manifest.manifest.permissions || [],
          optionalPermissions: manifest.manifest.optional_permissions || [],
          hostPermissions: manifest.manifest.host_permissions || [],
          commands: Object.keys(manifest.manifest.commands || {}),
          contentSecurityPolicy:
            manifest.manifest.content_security_policy || null,
        }
      : null,
    package: {
      name: packageScan.packageJson.name,
      version: packageScan.packageJson.version,
      license: packageScan.packageJson.license,
      dependencyCount: Object.keys(packageScan.packageJson.dependencies || {})
        .length,
      developmentDependencyCount: Object.keys(
        packageScan.packageJson.devDependencies || {}
      ).length,
    },
    failures,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `Security gate ${report.status}: ${source.files.length} source files scanned; ${failures.length} failure(s).`
  );
  console.log(`Report: ${outputPath}`);

  if (failures.length > 0) {
    for (const failure of failures) console.error(JSON.stringify(failure));
    process.exitCode = 1;
  }
}

main();
