/**
 * Manual test script for privacy comparison functionality
 * Run this in the browser console to test comparisons
 */

// Test website categorization
async function testWebsiteCategorization() {
  console.log('Testing website categorization...');

  const { WebsiteCategorization } =
    await import('./lib/website-categorization.js');

  const testSites = [
    'amazon.com',
    'cnn.com',
    'facebook.com',
    'netflix.com',
    'chase.com',
    'github.com',
    'harvard.edu',
    'webmd.com',
    'unknown-site.com',
  ];

  testSites.forEach(domain => {
    const category = WebsiteCategorization.categorizeWebsite(domain);
    console.log(`${domain} -> ${category.name} (${category.id})`);
    console.log(`  Average Score: ${category.averagePrivacyScore}`);
    console.log(`  Risk Profile: ${category.riskProfile}`);
  });

  console.log('✅ Website categorization test completed');
}

// Test privacy comparison
async function testPrivacyComparison() {
  console.log('Testing privacy comparison...');

  const { PrivacyComparison } = await import('./lib/privacy-comparison.js');
  const { StorageManager } = await import('./lib/storage-manager.js');

  // Add some mock events for testing
  const mockEvents = [
    {
      id: 'test-1',
      timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
      url: 'https://amazon.com/tracker.js',
      domain: 'amazon.com',
      trackerType: 'advertising',
      riskLevel: 'medium',
      description: 'Amazon advertising tracker',
    },
    {
      id: 'test-2',
      timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      url: 'https://amazon.com/analytics.js',
      domain: 'amazon.com',
      trackerType: 'analytics',
      riskLevel: 'low',
      description: 'Amazon analytics',
    },
    {
      id: 'test-3',
      timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
      url: 'https://cnn.com/tracker.js',
      domain: 'cnn.com',
      trackerType: 'advertising',
      riskLevel: 'high',
      description: 'CNN advertising tracker',
    },
    {
      id: 'test-4',
      timestamp: Date.now() - 1000 * 60 * 60 * 3, // 3 hours ago
      url: 'https://facebook.com/pixel.js',
      domain: 'facebook.com',
      trackerType: 'fingerprinting',
      riskLevel: 'critical',
      description: 'Facebook pixel tracking',
    },
  ];

  try {
    // Add mock events
    for (const event of mockEvents) {
      await StorageManager.addEvent(event);
    }
    console.log('✅ Mock events added');

    // Test category comparison
    console.log('1. Testing category comparison...');
    const categoryComparison =
      await PrivacyComparison.compareToCategory('amazon.com');
    console.log('Category comparison result:', categoryComparison);

    // Test user comparison
    console.log('2. Testing user comparison...');
    const userComparison =
      await PrivacyComparison.compareToUserAverage('amazon.com');
    console.log('User comparison result:', userComparison);

    // Test similar sites comparison
    console.log('3. Testing similar sites comparison...');
    const similarSites =
      await PrivacyComparison.compareSimilarSites('amazon.com');
    console.log('Similar sites comparison result:', similarSites);

    // Test comprehensive insights
    console.log('4. Testing comprehensive insights...');
    const insights =
      await PrivacyComparison.generateComparisonInsights('amazon.com');
    console.log('Comprehensive insights:', insights);

    console.log('✅ Privacy comparison tests completed successfully!');

    return {
      categoryComparison,
      userComparison,
      similarSites,
      insights,
    };
  } catch (error) {
    console.error('❌ Privacy comparison test failed:', error);
    throw error;
  }
}

// Test category benchmarks
async function testCategoryBenchmarks() {
  console.log('Testing category benchmarks...');

  const { WebsiteCategorization } =
    await import('./lib/website-categorization.js');

  const categories = WebsiteCategorization.getAllCategories();

  categories.forEach(category => {
    const benchmark = WebsiteCategorization.getCategoryBenchmark(category.id);
    console.log(`${category.name}:`);
    console.log(`  Average Score: ${benchmark.averageScore}`);
    console.log(`  Average Trackers: ${benchmark.averageTrackers}`);
    console.log(`  Common Risks: ${benchmark.commonRisks.join(', ')}`);
    console.log(`  Top Performers: ${benchmark.topPerformers.join(', ')}`);
  });

  console.log('✅ Category benchmarks test completed');
}

// Test with different site types
async function testDifferentSiteTypes() {
  console.log('Testing different site types...');

  const { PrivacyComparison } = await import('./lib/privacy-comparison.js');

  const testSites = [
    { domain: 'amazon.com', category: 'e-commerce' },
    { domain: 'cnn.com', category: 'news' },
    { domain: 'facebook.com', category: 'social-media' },
    { domain: 'netflix.com', category: 'entertainment' },
    { domain: 'chase.com', category: 'finance' },
  ];

  for (const site of testSites) {
    try {
      console.log(`\nTesting ${site.domain} (${site.category}):`);

      const insights = await PrivacyComparison.generateComparisonInsights(
        site.domain
      );
      console.log(`  Overall Insight: ${insights.overallInsight}`);
      console.log(`  Trust Level: ${insights.trustLevel}`);
      console.log(
        `  Category Percentile: ${insights.categoryComparison.percentile}`
      );

      if (insights.userComparison) {
        console.log(`  User Percentile: ${insights.userComparison.percentile}`);
      }

      console.log(`  Recommendations: ${insights.recommendations.length}`);
    } catch (error) {
      console.error(`  ❌ Failed to test ${site.domain}:`, error);
    }
  }

  console.log('✅ Different site types test completed');
}

// Run all tests
async function runAllComparisonTests() {
  try {
    console.log('🚀 Starting privacy comparison tests...');

    await testWebsiteCategorization();
    await testCategoryBenchmarks();
    await testPrivacyComparison();
    await testDifferentSiteTypes();

    console.log('🎉 All privacy comparison tests passed!');
  } catch (error) {
    console.error('💥 Privacy comparison tests failed:', error);
  }
}

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testPrivacyComparison = {
    testWebsiteCategorization,
    testPrivacyComparison,
    testCategoryBenchmarks,
    testDifferentSiteTypes,
    runAllComparisonTests,
  };

  console.log(
    'Privacy comparison tests loaded. Run window.testPrivacyComparison.runAllComparisonTests() to test.'
  );
}
