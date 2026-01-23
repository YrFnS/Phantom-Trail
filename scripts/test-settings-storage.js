/**
 * Test settings storage
 * Run this in the browser console on the extension's background page or popup
 */

async function testSettingsStorage() {
  console.log('=== Testing Settings Storage ===');

  try {
    // Test 1: Save settings with API key
    console.log('\n1. Saving test settings...');
    const testSettings = {
      enableAI: true,
      enableNotifications: true,
      riskThreshold: 'medium',
      openRouterApiKey: 'sk-or-v1-test-key-12345',
    };

    await chrome.storage.local.set({
      phantom_trail_settings: testSettings,
    });
    console.log('✓ Settings saved');

    // Test 2: Read settings back
    console.log('\n2. Reading settings...');
    const result = await chrome.storage.local.get('phantom_trail_settings');
    const loadedSettings = result.phantom_trail_settings;
    console.log('✓ Settings loaded:', {
      ...loadedSettings,
      openRouterApiKey: loadedSettings.openRouterApiKey
        ? '***' + loadedSettings.openRouterApiKey.slice(-5)
        : 'none',
    });

    // Test 3: Verify API key
    console.log('\n3. Verifying API key...');
    if (loadedSettings.openRouterApiKey === testSettings.openRouterApiKey) {
      console.log('✓ API key matches!');
    } else {
      console.error('✗ API key mismatch!');
      console.error('Expected:', testSettings.openRouterApiKey);
      console.error('Got:', loadedSettings.openRouterApiKey);
    }

    // Test 4: Check all storage
    console.log('\n4. Checking all storage keys...');
    const allData = await chrome.storage.local.get(null);
    console.log('All storage keys:', Object.keys(allData));

    // Test 5: Storage info
    console.log('\n5. Storage info...');
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    console.log('Bytes in use:', bytesInUse);
    console.log('Quota:', chrome.storage.local.QUOTA_BYTES);

    console.log('\n=== All Tests Passed! ===');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testSettingsStorage();
