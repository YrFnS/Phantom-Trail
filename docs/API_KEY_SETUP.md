# API Key Setup Guide

## Getting Your OpenRouter API Key

1. Go to [OpenRouter](https://openrouter.ai/keys)
2. Sign up or log in
3. Click "Create Key"
4. Copy your API key (starts with `sk-or-v1-...`)

## Adding API Key to Extension

### Method 1: Through Settings UI (Recommended)

1. Click the Phantom Trail extension icon
2. Click the Settings gear icon (⚙️)
3. In the "General" tab, find "OpenRouter API Key"
4. Paste your API key
5. Click "Save Settings"
6. You should see a green checkmark (✓) when the key is entered

### Method 2: Direct Storage (For Testing)

1. Go to `chrome://extensions`
2. Find "Phantom Trail"
3. Click "Inspect views: service worker" (or "background page")
4. In the console, paste:

```javascript
chrome.storage.local
  .set({
    phantom_trail_settings: {
      enableAI: true,
      enableNotifications: true,
      riskThreshold: 'medium',
      openRouterApiKey: 'YOUR_API_KEY_HERE',
    },
  })
  .then(() => {
    console.log('API key saved!');
    chrome.runtime.reload();
  });
```

5. Replace `YOUR_API_KEY_HERE` with your actual key
6. Press Enter

## Verifying API Key is Saved

### Check in Settings UI

1. Open Settings
2. Go to "General" tab
3. The API key field should show your key
4. You should see a green checkmark (✓)

### Check in Console

1. Go to `chrome://extensions`
2. Find "Phantom Trail"
3. Click "Inspect views: service worker"
4. In the console, paste:

```javascript
chrome.storage.local.get('phantom_trail_settings', result => {
  const settings = result.phantom_trail_settings;
  if (settings && settings.openRouterApiKey) {
    console.log(
      '✓ API key is saved:',
      '***' + settings.openRouterApiKey.slice(-4)
    );
  } else {
    console.log('✗ No API key found');
  }
});
```

## Troubleshooting

### Issue: API Key Disappears After Saving

**Symptoms:**

- You enter the key and click Save
- When you reopen Settings, the field is empty
- Console shows "AI not available - no API key configured"

**Solution 1 - Clear and Re-enter:**

1. Open Settings
2. Clear the API key field completely
3. Paste your key again (make sure no extra spaces)
4. Click Save
5. Wait for the settings dialog to close
6. Reopen Settings to verify

**Solution 2 - Use Console Method:**
Use Method 2 above to set the key directly via console

**Solution 3 - Check for Corruption:**

```javascript
// Check if settings are corrupted
chrome.storage.local.get('phantom_trail_settings', result => {
  console.log('Settings type:', typeof result.phantom_trail_settings);
  console.log('Settings value:', result.phantom_trail_settings);

  if (typeof result.phantom_trail_settings !== 'object') {
    console.log('Settings corrupted! Resetting...');
    chrome.storage.local.set({
      phantom_trail_settings: {
        enableAI: true,
        enableNotifications: true,
        riskThreshold: 'medium',
      },
    });
  }
});
```

### Issue: "AI not available" Message Persists

**Cause:** The extension checks for the API key on startup.

**Solution:**

1. Verify key is saved (see "Verifying API Key is Saved" above)
2. Reload the extension:
   - Go to `chrome://extensions`
   - Find "Phantom Trail"
   - Click the reload button (🔄)
3. Refresh any open web pages

### Issue: API Key Shows But AI Still Doesn't Work

**Possible Causes:**

1. Invalid API key
2. API key has no credits
3. Network issues
4. Rate limiting

**Debugging Steps:**

1. **Verify Key Format:**
   - Should start with `sk-or-v1-`
   - Should be about 50-60 characters long
   - No spaces or special characters

2. **Test Key Manually:**

   ```javascript
   // Test API key
   const apiKey = 'YOUR_KEY_HERE';

   fetch('https://openrouter.ai/api/v1/models', {
     headers: {
       Authorization: `Bearer ${apiKey}`,
     },
   })
     .then(r => r.json())
     .then(data => {
       if (data.error) {
         console.error('API key error:', data.error);
       } else {
         console.log('✓ API key is valid!');
       }
     })
     .catch(err => console.error('Network error:', err));
   ```

3. **Check Credits:**
   - Go to [OpenRouter Dashboard](https://openrouter.ai/credits)
   - Verify you have credits available
   - Free tier has limits

4. **Check Rate Limits:**
   - Open extension popup
   - Look for rate limit messages
   - Wait 60 seconds and try again

## Security Notes

### Where is the API Key Stored?

- Stored in `chrome.storage.local`
- Only accessible by the extension
- Not synced across devices
- Not sent to any third parties
- Only sent to OpenRouter API

### Best Practices

1. **Use Restricted Keys:**
   - Create a key specifically for this extension
   - Set spending limits on OpenRouter

2. **Don't Share Keys:**
   - Never share your API key
   - Don't commit keys to git
   - Don't post keys in screenshots

3. **Rotate Keys Regularly:**
   - Create new keys periodically
   - Delete old keys from OpenRouter

4. **Monitor Usage:**
   - Check OpenRouter dashboard regularly
   - Set up usage alerts
   - Review API call logs

## Testing Your Setup

Run this complete test in the console:

```javascript
async function testAPISetup() {
  console.log('=== Testing API Setup ===\n');

  // 1. Check if key exists
  const result = await chrome.storage.local.get('phantom_trail_settings');
  const settings = result.phantom_trail_settings;

  if (!settings || !settings.openRouterApiKey) {
    console.error('✗ No API key found in storage');
    return;
  }

  console.log('✓ API key found:', '***' + settings.openRouterApiKey.slice(-4));

  // 2. Test key validity
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${settings.openRouterApiKey}`,
      },
    });

    if (response.ok) {
      console.log('✓ API key is valid');
      const data = await response.json();
      console.log('✓ Available models:', data.data.length);
    } else {
      console.error('✗ API key is invalid:', response.status);
    }
  } catch (error) {
    console.error('✗ Network error:', error);
  }

  console.log('\n=== Test Complete ===');
}

testAPISetup();
```

## Getting Help

If you're still having issues:

1. Check the [Troubleshooting Guide](./TROUBLESHOOTING_AI.md)
2. Look at browser console for errors
3. Try the storage test script: `scripts/test-settings-storage.js`
4. Verify your OpenRouter account status

## Free Tier Limits

OpenRouter free tier includes:

- Limited requests per day
- Access to free models only
- Rate limiting (10 requests/minute)
- No credit card required

For unlimited access:

- Add credits to your OpenRouter account
- Use paid models for better performance
- Higher rate limits
