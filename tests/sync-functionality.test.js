/**
 * Simple test to verify sync functionality
 * Run this in the browser console to test sync features
 */

// Test sync manager functionality
async function testSyncManager() {
  console.log('Testing Sync Manager...');
  
  try {
    // Import the sync manager (this would be available in the extension context)
    const { SyncManager } = await import('../lib/sync-manager.js');
    
    // Test 1: Get initial sync settings
    console.log('Test 1: Getting sync settings...');
    const initialSettings = await SyncManager.getSyncSettings();
    console.log('Initial settings:', initialSettings);
    
    // Test 2: Enable sync
    console.log('Test 2: Enabling sync...');
    await SyncManager.enableSync();
    const enabledSettings = await SyncManager.getSyncSettings();
    console.log('Enabled settings:', enabledSettings);
    
    // Test 3: Get sync status
    console.log('Test 3: Getting sync status...');
    const status = await SyncManager.getSyncStatus();
    console.log('Sync status:', status);
    
    // Test 4: Manual sync
    console.log('Test 4: Performing manual sync...');
    const syncResult = await SyncManager.syncNow();
    console.log('Sync result:', syncResult);
    
    // Test 5: Export sync data
    console.log('Test 5: Exporting sync data...');
    const exportedData = await SyncManager.exportSyncData();
    console.log('Exported data:', exportedData);
    
    // Test 6: Disable sync
    console.log('Test 6: Disabling sync...');
    await SyncManager.disableSync();
    const disabledSettings = await SyncManager.getSyncSettings();
    console.log('Disabled settings:', disabledSettings);
    
    console.log('✅ All sync tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Sync test failed:', error);
    return false;
  }
}

// Test conflict resolver functionality
async function testConflictResolver() {
  console.log('Testing Conflict Resolver...');
  
  try {
    const { ConflictResolver } = await import('../lib/conflict-resolver.js');
    
    // Test 1: Get available strategies
    console.log('Test 1: Getting available strategies...');
    const strategies = ConflictResolver.getAvailableStrategies();
    console.log('Available strategies:', strategies);
    
    // Test 2: Create mock conflict
    const mockConflict = {
      type: 'settings',
      localData: { theme: 'dark', notifications: true, timestamp: Date.now() },
      remoteData: { theme: 'light', notifications: false, timestamp: Date.now() - 1000 },
      field: 'settings'
    };
    
    // Test 3: Resolve conflict with different strategies
    console.log('Test 2: Resolving conflicts...');
    const newestWins = ConflictResolver.resolveConflict(mockConflict, 'newest-wins');
    console.log('Newest wins result:', newestWins);
    
    const localWins = ConflictResolver.resolveConflict(mockConflict, 'local-wins');
    console.log('Local wins result:', localWins);
    
    const merge = ConflictResolver.resolveConflict(mockConflict, 'merge');
    console.log('Merge result:', merge);
    
    // Test 4: Create conflict summary
    const summary = ConflictResolver.createConflictSummary([mockConflict]);
    console.log('Conflict summary:', summary);
    
    console.log('✅ All conflict resolver tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Conflict resolver test failed:', error);
    return false;
  }
}

// Test storage manager sync enhancements
async function testStorageManagerSync() {
  console.log('Testing Storage Manager Sync Features...');
  
  try {
    const { StorageManager } = await import('../lib/storage-manager.js');
    
    // Test 1: Get syncable data
    console.log('Test 1: Getting syncable data...');
    const syncableData = await StorageManager.getSyncableData();
    console.log('Syncable data:', syncableData);
    
    // Test 2: Check syncable keys
    console.log('Test 2: Checking syncable keys...');
    const testKeys = ['extensionSettings', 'trustedSites', 'phantom_trail_events', 'apiKeys'];
    testKeys.forEach(key => {
      const isSyncable = StorageManager.isSyncableKey(key);
      console.log(`${key}: ${isSyncable ? 'syncable' : 'not syncable'}`);
    });
    
    // Test 3: Get non-syncable keys
    console.log('Test 3: Getting non-syncable keys...');
    const nonSyncableKeys = StorageManager.getNonSyncableKeys();
    console.log('Non-syncable keys:', nonSyncableKeys);
    
    // Test 4: Storage info
    console.log('Test 4: Getting storage info...');
    const storageInfo = await StorageManager.getStorageInfo();
    console.log('Storage info:', storageInfo);
    
    console.log('✅ All storage manager sync tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Storage manager sync test failed:', error);
    return false;
  }
}

// Run all tests
async function runAllSyncTests() {
  console.log('🚀 Starting Cross-Device Sync Tests...\n');
  
  const results = {
    syncManager: await testSyncManager(),
    conflictResolver: await testConflictResolver(),
    storageManager: await testStorageManagerSync()
  };
  
  console.log('\n📊 Test Results:');
  console.log('Sync Manager:', results.syncManager ? '✅ PASS' : '❌ FAIL');
  console.log('Conflict Resolver:', results.conflictResolver ? '✅ PASS' : '❌ FAIL');
  console.log('Storage Manager:', results.storageManager ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(result => result === true);
  console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  
  return allPassed;
}

// Export for use in extension context
if (typeof window !== 'undefined') {
  window.testSyncFeatures = {
    runAllSyncTests,
    testSyncManager,
    testConflictResolver,
    testStorageManagerSync
  };
}

// Auto-run if in Node.js environment
if (typeof globalThis !== 'undefined' && typeof globalThis.module !== 'undefined' && globalThis.module.exports) {
  globalThis.module.exports = {
    runAllSyncTests,
    testSyncManager,
    testConflictResolver,
    testStorageManagerSync
  };
}
