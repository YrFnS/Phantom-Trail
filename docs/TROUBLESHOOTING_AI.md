# AI Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "AI not available - no API key configured"

**Cause**: The extension doesn't have an OpenRouter API key configured.

**Solution**:
1. Get an API key from [OpenRouter](https://openrouter.ai/)
2. Open the extension popup
3. Click the Settings icon (gear)
4. Enter your OpenRouter API key
5. Save settings

**Note**: The extension will work without AI (basic tracker detection only), but you won't get:
- AI-powered narratives
- Risk assessments
- Personalized recommendations
- Chat functionality

---

### Issue 2: Storage Corruption Errors

**Symptoms**:
- `TypeError: a.filter is not a function`
- `TypeError: a.push is not a function`
- `Failed to add event`
- `Failed to get recent events`

**Cause**: Chrome storage data got corrupted (non-array values stored where arrays are expected).

**Solution 1 - Automatic (Recommended)**:
The extension now automatically detects and repairs corrupted storage. Simply reload the extension:
1. Go to `chrome://extensions`
2. Find "Phantom Trail"
3. Click the reload icon (circular arrow)
4. Check the console for "Events storage corrupted, resetting to empty array"

**Solution 2 - Manual Reset**:
If automatic repair doesn't work:
1. Go to `chrome://extensions`
2. Find "Phantom Trail"
3. Click "Inspect views: background page" (or "service worker")
4. In the console, paste and run:
```javascript
chrome.storage.local.set({
  'phantom_trail_events': [],
  'phantom_trail_daily_snapshots': [],
  'phantom_trail_weekly_reports': []
}).then(() => {
  console.log('Storage reset complete');
  chrome.runtime.reload();
});
```

**Solution 3 - Complete Reset**:
If you want to start fresh:
1. Go to `chrome://extensions`
2. Find "Phantom Trail"
3. Click "Remove"
4. Reinstall the extension

---

### Issue 3: Rate Limiting

**Symptoms**:
- "Rate limit exceeded"
- "Please wait X seconds before asking again"
- AI features temporarily unavailable

**Cause**: Too many AI requests in a short time (OpenRouter API limits).

**Solution**:
- Wait for the cooldown period (usually 60 seconds)
- The extension will automatically retry when the limit resets
- Reduce frequency of AI analysis requests

**Rate Limits**:
- Max 10 requests per minute
- Automatic backoff on rate limit detection
- Cached responses reduce API calls

---

### Issue 4: Network/API Errors

**Symptoms**:
- "API request failed"
- "Unable to analyze tracking data"
- Timeout errors

**Cause**: Network issues, OpenRouter API downtime, or invalid API key.

**Solution**:
1. Check your internet connection
2. Verify your API key is valid at [OpenRouter](https://openrouter.ai/)
3. Check [OpenRouter Status](https://status.openrouter.ai/)
4. The extension will fall back to offline mode automatically

**Offline Mode**:
When AI is unavailable, the extension provides:
- Basic tracker detection
- Risk level classification
- Cached analysis (if available)
- Manual recommendations

---

### Issue 5: Extension Not Detecting Trackers

**Symptoms**:
- No trackers shown on websites
- Empty tracking events list
- Network graph is empty

**Possible Causes & Solutions**:

**1. Extension Not Active**:
- Check if extension icon is visible in toolbar
- Reload the page after installing extension
- Check `chrome://extensions` to ensure it's enabled

**2. Website Uses No Trackers**:
- Some sites genuinely have no third-party trackers
- Try visiting a major site (e.g., news sites, shopping sites)

**3. Storage Corruption**:
- See "Issue 2: Storage Corruption Errors" above

**4. Content Script Not Injected**:
- Check browser console for errors
- Reload the extension
- Reload the webpage

---

## Debugging Steps

### Check Extension Status
1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Find "Phantom Trail"
4. Click "Inspect views: background page"
5. Check console for errors

### Check Storage Data
In the background page console:
```javascript
// Check events storage
chrome.storage.local.get('phantom_trail_events', (result) => {
  console.log('Events:', result.phantom_trail_events);
  console.log('Is Array:', Array.isArray(result.phantom_trail_events));
});

// Check settings
chrome.storage.local.get('phantom_trail_settings', (result) => {
  console.log('Settings:', result.phantom_trail_settings);
});

// Check all storage
chrome.storage.local.get(null, (result) => {
  console.log('All storage:', result);
});
```

### Check AI Status
In the background page console:
```javascript
// Check if AI is available
chrome.storage.local.get('phantom_trail_settings', (result) => {
  const hasKey = !!result.phantom_trail_settings?.openRouterApiKey;
  console.log('Has API Key:', hasKey);
});
```

### Force Storage Repair
In the background page console:
```javascript
// Run the storage repair script
fetch(chrome.runtime.getURL('scripts/clear-storage.js'))
  .then(r => r.text())
  .then(eval);
```

---

## Prevention Tips

### Avoid Storage Corruption
- Don't manually edit Chrome storage
- Don't run multiple instances of the extension
- Keep the extension updated
- Report bugs if corruption happens repeatedly

### Optimize AI Usage
- Let the extension cache responses
- Don't spam the chat interface
- Use the quick analysis feature sparingly
- Configure appropriate rate limits in settings

### Monitor Performance
- Check extension memory usage in Task Manager
- Clear old events periodically (automatic after 30 days)
- Limit number of tracked sites if performance degrades

---

## Getting Help

If issues persist:

1. **Check the logs**:
   - Background page console
   - Browser console on affected pages
   - Copy error messages

2. **Gather information**:
   - Chrome version
   - Extension version
   - Steps to reproduce
   - Error messages

3. **Report the issue**:
   - GitHub Issues (if available)
   - Include logs and reproduction steps
   - Mention if storage reset helped

4. **Temporary workarounds**:
   - Disable AI features (extension still works)
   - Use incognito mode (fresh storage)
   - Export data before resetting

---

## Advanced Troubleshooting

### Clear Specific Storage Keys
```javascript
chrome.storage.local.remove(['phantom_trail_events'], () => {
  console.log('Events cleared');
});
```

### Export Storage Before Reset
```javascript
chrome.storage.local.get(null, (data) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'phantom-trail-backup.json';
  a.click();
});
```

### Check Network Requests
1. Open DevTools Network tab
2. Filter by "openrouter.ai"
3. Check request/response details
4. Look for 429 (rate limit) or 401 (auth) errors

---

## Known Issues

### Chrome Storage Quota
- Chrome limits extension storage to ~10MB
- Extension auto-cleans old events (30+ days)
- If quota exceeded, oldest data is removed

### API Key Security
- API keys stored in local storage (not synced)
- Keys never sent to third parties
- Consider using restricted API keys

### Performance Impact
- Extension designed for <5% CPU overhead
- Network monitoring is lightweight
- AI analysis is on-demand only

---

This guide covers the most common issues. For specific problems not listed here, check the browser console for detailed error messages.
