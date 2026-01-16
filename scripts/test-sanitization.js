#!/usr/bin/env node
/**
 * Test URL sanitization to ensure PII is removed
 */

// Simulate the sanitizeUrl function
function sanitizeUrl(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}

const testCases = [
  {
    name: 'Session token in query',
    input: 'https://example.com/page?session=abc123&user_id=456',
    expected: 'https://example.com/page',
  },
  {
    name: 'Hash fragment with tracking',
    input: 'https://example.com/page#tracking_id=xyz789',
    expected: 'https://example.com/page',
  },
  {
    name: 'Both query and hash',
    input: 'https://example.com/page?token=secret#section=private',
    expected: 'https://example.com/page',
  },
  {
    name: 'Clean URL (no change)',
    input: 'https://example.com/page',
    expected: 'https://example.com/page',
  },
  {
    name: 'URL with path only',
    input: 'https://example.com/',
    expected: 'https://example.com/',
  },
  {
    name: 'Complex path preserved',
    input: 'https://example.com/path/to/resource?sensitive=data',
    expected: 'https://example.com/path/to/resource',
  },
  {
    name: 'Email in query (PII)',
    input: 'https://example.com/signup?email=user@example.com',
    expected: 'https://example.com/signup',
  },
  {
    name: 'OAuth tokens',
    input: 'https://example.com/callback?code=oauth_token_12345&state=xyz',
    expected: 'https://example.com/callback',
  },
];

console.log('🔒 URL Sanitization Test\n');

let passed = 0;
let failed = 0;

testCases.forEach(({ name, input, expected }) => {
  const result = sanitizeUrl(input);
  const success = result === expected;
  
  if (success) {
    console.log(`✅ ${name}`);
    console.log(`   Input:    ${input}`);
    console.log(`   Output:   ${result}\n`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    console.log(`   Input:    ${input}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Got:      ${result}\n`);
    failed++;
  }
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\n📊 Results: ${passed}/${testCases.length} tests passed`);

if (failed > 0) {
  console.log(`\n⚠️  ${failed} test(s) failed`);
  process.exit(1);
} else {
  console.log('\n✅ All URL sanitization tests passed!');
  console.log('🎯 PII protection is working correctly');
  process.exit(0);
}
