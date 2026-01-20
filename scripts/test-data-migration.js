/**
 * Test script to verify data migration functionality
 * Run this in the browser console after loading the extension
 */

async function testDataMigration() {
  console.log('🧪 Testing Data Migration...');
  
  try {
    // Simulate corrupted data
    const corruptedWeeklyData = {
      invalidStructure: true,
      someRandomData: "not an array"
    };
    
    const corruptedDailyData = "this should be an array";
    
    // Store corrupted data
    await chrome.storage.local.set({
      'phantom_trail_weekly_reports': corruptedWeeklyData,
      'phantom_trail_daily_snapshots': corruptedDailyData
    });
    
    console.log('✅ Corrupted data stored for testing');
    
    // Import and run migration
    const { DataMigration } = await import('../lib/data-migration.js');
    await DataMigration.runMigrations();
    
    console.log('✅ Migration completed');
    
    // Verify data is cleaned
    const result = await chrome.storage.local.get([
      'phantom_trail_weekly_reports',
      'phantom_trail_daily_snapshots'
    ]);
    
    const weeklyReports = result.phantom_trail_weekly_reports;
    const dailySnapshots = result.phantom_trail_daily_snapshots;
    
    console.log('📊 Migration Results:');
    console.log('Weekly Reports:', weeklyReports);
    console.log('Daily Snapshots:', dailySnapshots);
    
    // Verify they are now valid arrays
    if (Array.isArray(weeklyReports) && Array.isArray(dailySnapshots)) {
      console.log('✅ Data migration successful - corrupted data cleaned');
      return true;
    } else {
      console.error('❌ Data migration failed - data still corrupted');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testDataMigration = testDataMigration;
}

console.log('📝 Data Migration Test loaded. Run testDataMigration() in console to test.');