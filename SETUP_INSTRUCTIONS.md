# Setup Instructions - After Latest Fixes

## What Was Fixed

1. **Storage Corruption** - Extension now automatically detects and repairs corrupted storage
2. **API Key Visibility** - Settings UI now shows your API key so you can verify it's saved
3. **Better Error Handling** - Clear error messages and debug logging

## Quick Start

### 1. Reload the Extension

1. Go to `chrome://extensions`
2. Find "Phantom Trail"
3. Click the reload button (🔄)

This will apply the automatic storage corruption fixes.

### 2. Add Your API Key

#### Get an API Key
1. Go to [OpenRouter](https://openrouter.ai/keys)
2. Sign up or log in
3. Click "Create Key"
4. Copy your API key (starts with `sk-or-v1-...`)

#### Add to Extension
1. Click the Phantom Trail extension icon
2. Click the Settings gear icon (⚙️)
3. In the "General" tab, paste your API key
4. You should see a green checkmark (✓) appear
5. Click "Save Settings"

### 3. Verify It's Working

#### Check in Browser Console
1. Go to `chrome://extensions`
2. Find "Phantom Trail"
3. Click "Inspect views: service worker"
4. Look for these messages:
   - `[Settings] Saved settings with API key: ***xxxx`
   - `[Settings] Verified saved settings`

#### Check in Settings UI
1. Reopen Settings
2. Your API key should still be visible
3. Green checkmark (✓) should be present

### 4. Test AI Features

1. Visit any website (e.g., news site, shopping site)
2. Open the extension popup
3. You should see:
   - Trackers being detected
   - Privacy score calculated
   - AI analysis (if you have an API key)

## Troubleshooting

### Issue: Storage Corruption Errors

**Symptoms:**
- `TypeError: a.filter is not a function`
- `Failed to add event`

**Solution:**
The extension now fixes this automatically. Just reload the extension (step 1 above).

### Issue: API Key Not Saving

**Symptoms:**
- You enter the key and save
- When you reopen Settings, the field is empty
- No green checkmark appears

**Solution:**

1. **Check Console for Errors:**
   - Open background page console
   - Look for "[Settings] Saved settings" messages
   - If you see errors, note them

2. **Try Direct Storage Method:**
   ```javascript
   // In background page console
   chrome.storage.local.set({
     'phantom_trail_settings': {
       enableAI: true,
       enableNotifications: true,
       riskThreshold: 'medium',
       openRouterApiKey: 'YOUR_KEY_HERE'
     }
   }).then(() => {
     console.log('✓ API key saved!');
     chrome.runtime.reload();
   });
   ```

3. **Verify Storage:**
   ```javascript
   // In background page console
   chrome.storage.local.get('phantom_trail_settings', (result) => {
     const settings = result.phantom_trail_settings;
     console.log('Settings:', {
       ...settings,
       openRouterApiKey: settings?.openRouterApiKey ? '***' + settings.openRouterApiKey.slice(-4) : 'none'
     });
   });
   ```

### Issue: AI Still Not Working

**Possible Causes:**
1. Invalid API key
2. No credits on OpenRouter account
3. Rate limiting
4. Network issues

**Debug Steps:**

1. **Test Your API Key:**
   ```javascript
   // In background page console
   const apiKey = 'YOUR_KEY_HERE';
   
   fetch('https://openrouter.ai/api/v1/models', {
     headers: { 'Authorization': `Bearer ${apiKey}` }
   })
   .then(r => r.json())
   .then(data => {
     if (data.error) {
       console.error('✗ API key error:', data.error);
     } else {
       console.log('✓ API key is valid!');
     }
   });
   ```

2. **Check Rate Limits:**
   - Look for "Rate limit exceeded" messages
   - Wait 60 seconds and try again

3. **Check OpenRouter Dashboard:**
   - Go to [OpenRouter Dashboard](https://openrouter.ai/credits)
   - Verify you have credits
   - Check usage logs

## Documentation

For more detailed help, see:

- **[API Key Setup Guide](docs/API_KEY_SETUP.md)** - Complete guide to setting up your API key
- **[Troubleshooting Guide](docs/TROUBLESHOOTING_AI.md)** - Comprehensive troubleshooting for all issues
- **[Quick Fix Guide](docs/QUICK_FIX_STORAGE.md)** - Fast solutions for storage corruption

## Test Scripts

Run these in the background page console to test:

### Test Storage
```javascript
// Copy and paste from scripts/test-settings-storage.js
```

### Test API Key
```javascript
async function testAPISetup() {
  const result = await chrome.storage.local.get('phantom_trail_settings');
  const settings = result.phantom_trail_settings;
  
  if (!settings?.openRouterApiKey) {
    console.error('✗ No API key found');
    return;
  }
  
  console.log('✓ API key found:', '***' + settings.openRouterApiKey.slice(-4));
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${settings.openRouterApiKey}` }
    });
    
    if (response.ok) {
      console.log('✓ API key is valid');
    } else {
      console.error('✗ API key is invalid:', response.status);
    }
  } catch (error) {
    console.error('✗ Network error:', error);
  }
}

testAPISetup();
```

## What's New in This Version

### Storage Improvements
- ✅ Automatic corruption detection
- ✅ Self-healing storage
- ✅ Better error messages
- ✅ Debug logging

### Settings UI Improvements
- ✅ Visible API key field (no longer password type)
- ✅ Green checkmark indicator
- ✅ Monospace font for better readability
- ✅ Error messages displayed in UI
- ✅ Console logging for debugging

### Documentation
- ✅ Comprehensive troubleshooting guide
- ✅ API key setup guide
- ✅ Test scripts
- ✅ Quick fix guides

## Getting Help

If you're still having issues:

1. Check the console for error messages
2. Review the documentation in `docs/`
3. Run the test scripts above
4. Check your OpenRouter account status

## Free Tier Limits

OpenRouter free tier:
- Limited requests per day
- Access to free models only
- Rate limiting (10 requests/minute)
- No credit card required

For unlimited access:
- Add credits to OpenRouter account
- Use paid models
- Higher rate limits

---

**Note:** The extension works without an API key (basic tracker detection only). AI features require an OpenRouter API key.
