/**
 * Manual test script for notification functionality
 * Run this in the browser console to test notifications
 */

// Test notification settings
async function testNotificationSettings() {
  console.log('Testing notification settings...');

  const { NotificationManager } = await import('./lib/notification-manager.js');

  // Test default settings
  const isEnabled = await NotificationManager.isEnabled();
  console.log('Notifications enabled:', isEnabled);

  // Test settings update
  const testSettings = {
    enabled: true,
    criticalOnly: false,
    dailySummary: true,
    weeklyReport: false,
    quietHours: { start: '22:00', end: '08:00' },
  };

  await NotificationManager.updateSettings(testSettings);
  console.log('Settings updated successfully');
}

// Test privacy alert notification
async function testPrivacyAlert() {
  console.log('Testing privacy alert...');

  const { NotificationManager } = await import('./lib/notification-manager.js');

  const mockEvent = {
    id: 'test-123',
    timestamp: Date.now(),
    url: 'https://example.com/tracker.js',
    domain: 'example.com',
    trackerType: 'fingerprinting',
    riskLevel: 'critical',
    description: 'Device fingerprinting detected',
  };

  await NotificationManager.showPrivacyAlert(mockEvent);
  console.log('Privacy alert notification sent');
}

// Test daily summary notification
async function testDailySummary() {
  console.log('Testing daily summary...');

  const { NotificationManager } = await import('./lib/notification-manager.js');

  const mockScore = {
    score: 85,
    grade: 'B',
    color: 'yellow',
    breakdown: {
      totalTrackers: 12,
      highRisk: 2,
      mediumRisk: 5,
      lowRisk: 5,
      criticalRisk: 0,
      httpsBonus: true,
      excessiveTrackingPenalty: false,
    },
    recommendations: ['Consider using a VPN', 'Block third-party cookies'],
  };

  await NotificationManager.showDailySummary(mockScore);
  console.log('Daily summary notification sent');
}

// Run all tests
async function runAllTests() {
  try {
    await testNotificationSettings();
    await testPrivacyAlert();
    await testDailySummary();
    console.log('All notification tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testNotifications = {
    testNotificationSettings,
    testPrivacyAlert,
    testDailySummary,
    runAllTests,
  };

  console.log(
    'Notification tests loaded. Run window.testNotifications.runAllTests() to test.'
  );
}
