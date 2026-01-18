/**
 * Manual test script for privacy trends functionality
 * Run this in the browser console to test trends
 */

// Test privacy trends functionality
async function testPrivacyTrends() {
  console.log('Testing privacy trends...');
  
  const { PrivacyTrends } = await import('./lib/privacy-trends.js');
  const { StorageManager } = await import('./lib/storage-manager.js');
  
  try {
    // Test daily snapshot generation
    console.log('1. Testing daily snapshot generation...');
    const snapshot = await PrivacyTrends.generateDailySnapshot();
    console.log('Daily snapshot:', snapshot);
    
    // Store the snapshot
    await StorageManager.storeDailySnapshot(snapshot);
    console.log('✅ Daily snapshot stored successfully');
    
    // Test retrieving snapshots
    console.log('2. Testing snapshot retrieval...');
    const snapshots = await StorageManager.getDailySnapshots(7);
    console.log('Retrieved snapshots:', snapshots);
    
    // Test trend calculation
    console.log('3. Testing trend calculation...');
    const trends = await PrivacyTrends.calculateDailyTrends(7);
    console.log('Calculated trends:', trends);
    
    // Test weekly report generation
    console.log('4. Testing weekly report generation...');
    const weeklyReport = await PrivacyTrends.generateWeeklyReport();
    console.log('Weekly report:', weeklyReport);
    
    // Test anomaly detection
    console.log('5. Testing anomaly detection...');
    const anomalies = await PrivacyTrends.detectAnomalies();
    console.log('Detected anomalies:', anomalies);
    
    console.log('✅ All privacy trends tests completed successfully!');
    
    return {
      snapshot,
      snapshots,
      trends,
      weeklyReport,
      anomalies
    };
    
  } catch (error) {
    console.error('❌ Privacy trends test failed:', error);
    throw error;
  }
}

// Test trend initialization
async function testTrendInitialization() {
  console.log('Testing trend initialization...');
  
  const { PrivacyTrends } = await import('./lib/privacy-trends.js');
  
  try {
    await PrivacyTrends.initializeTrendTracking();
    console.log('✅ Trend tracking initialized successfully');
  } catch (error) {
    console.error('❌ Trend initialization failed:', error);
    throw error;
  }
}

// Test with mock data
async function testWithMockData() {
  console.log('Testing with mock tracking events...');
  
  const { StorageManager } = await import('./lib/storage-manager.js');
  const { PrivacyTrends } = await import('./lib/privacy-trends.js');
  
  // Create mock events for testing
  const mockEvents = [
    {
      id: 'test-1',
      timestamp: Date.now() - (24 * 60 * 60 * 1000), // Yesterday
      url: 'https://example.com/tracker.js',
      domain: 'example.com',
      trackerType: 'advertising',
      riskLevel: 'medium',
      description: 'Advertising tracker'
    },
    {
      id: 'test-2',
      timestamp: Date.now() - (12 * 60 * 60 * 1000), // 12 hours ago
      url: 'https://tracker.com/fingerprint.js',
      domain: 'tracker.com',
      trackerType: 'fingerprinting',
      riskLevel: 'critical',
      description: 'Device fingerprinting'
    },
    {
      id: 'test-3',
      timestamp: Date.now() - (6 * 60 * 60 * 1000), // 6 hours ago
      url: 'https://analytics.com/track.js',
      domain: 'analytics.com',
      trackerType: 'analytics',
      riskLevel: 'low',
      description: 'Analytics tracking'
    }
  ];
  
  try {
    // Add mock events
    for (const event of mockEvents) {
      await StorageManager.addEvent(event);
    }
    console.log('✅ Mock events added');
    
    // Generate snapshot with mock data
    const snapshot = await PrivacyTrends.generateDailySnapshot();
    console.log('Snapshot with mock data:', snapshot);
    
    // Test trends with mock data
    const trends = await PrivacyTrends.calculateDailyTrends(7);
    console.log('Trends with mock data:', trends);
    
    console.log('✅ Mock data tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Mock data test failed:', error);
    throw error;
  }
}

// Run all tests
async function runAllTrendsTests() {
  try {
    console.log('🚀 Starting privacy trends tests...');
    
    await testTrendInitialization();
    await testPrivacyTrends();
    await testWithMockData();
    
    console.log('🎉 All privacy trends tests passed!');
  } catch (error) {
    console.error('💥 Privacy trends tests failed:', error);
  }
}

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testPrivacyTrends = {
    testPrivacyTrends,
    testTrendInitialization,
    testWithMockData,
    runAllTrendsTests
  };
  
  console.log('Privacy trends tests loaded. Run window.testPrivacyTrends.runAllTrendsTests() to test.');
}
