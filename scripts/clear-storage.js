/**
 * Clear corrupted storage data
 * Run this in the browser console on the extension's background page
 */

async function clearCorruptedStorage() {
  console.log('Starting storage cleanup...');
  
  try {
    // Get all storage data
    const allData = await chrome.storage.local.get(null);
    console.log('Current storage keys:', Object.keys(allData));
    
    // Reset events to empty array
    await chrome.storage.local.set({
      'phantom_trail_events': []
    });
    console.log('✓ Reset events storage');
    
    // Reset daily snapshots to empty array
    await chrome.storage.local.set({
      'phantom_trail_daily_snapshots': []
    });
    console.log('✓ Reset daily snapshots');
    
    // Reset weekly reports to empty array
    await chrome.storage.local.set({
      'phantom_trail_weekly_reports': []
    });
    console.log('✓ Reset weekly reports');
    
    console.log('Storage cleanup completed successfully!');
    console.log('Please reload the extension to apply changes.');
    
  } catch (error) {
    console.error('Storage cleanup failed:', error);
  }
}

// Run the cleanup
clearCorruptedStorage();
