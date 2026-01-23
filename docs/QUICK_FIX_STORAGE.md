# Quick Fix: Storage Corruption

If you're seeing errors like:

- `TypeError: a.filter is not a function`
- `TypeError: a.push is not a function`
- `Failed to add event`

## Automatic Fix (Recommended)

The extension now automatically repairs corrupted storage. Just reload it:

1. Go to `chrome://extensions`
2. Find "Phantom Trail"
3. Click the reload button (🔄)
4. Refresh any open web pages

The extension will detect and fix the corrupted data automatically.

## Manual Fix (If Needed)

If the automatic fix doesn't work:

1. Go to `chrome://extensions`
2. Find "Phantom Trail"
3. Click "Inspect views: service worker" (or "background page")
4. In the console that opens, paste this code and press Enter:

```javascript
chrome.storage.local
  .set({
    phantom_trail_events: [],
    phantom_trail_daily_snapshots: [],
    phantom_trail_weekly_reports: [],
  })
  .then(() => {
    console.log('✓ Storage reset complete');
    chrome.runtime.reload();
  });
```

5. Close the console
6. Refresh any open web pages

## What This Does

This resets your tracking data to a clean state. You'll lose:

- Historical tracking events
- Daily snapshots
- Weekly reports

But you'll keep:

- Your settings (including API key)
- Trusted sites list
- Extension preferences

## Prevention

This issue was caused by a bug in an earlier version. The latest version includes:

- Automatic corruption detection
- Self-healing storage
- Better data validation

Keep your extension updated to avoid this issue in the future.

## Still Having Issues?

See the full [AI Troubleshooting Guide](./TROUBLESHOOTING_AI.md) for more solutions.
