# Extension Troubleshooting Guide

## Common Issues and Solutions

### Service Worker Registration Failures

**Symptoms:**

- "Service worker registration failed. Status code: 15"
- Extension not loading properly
- Background script errors

**Solutions:**

1. **Clear Extension Data:**
   - Go to `chrome://extensions/`
   - Find Phantom Trail extension
   - Click "Remove" and reinstall

2. **Check Chrome Version:**
   - Ensure Chrome version 88+ (Manifest V3 support)
   - Update Chrome if needed

3. **Reload Extension:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Reload" on Phantom Trail

### Context Invalidation Issues

**Symptoms:**

- "Extension context invalidated" errors
- Content scripts not working
- Communication failures between scripts

**Solutions:**

1. **Automatic Recovery:**
   - Extension now includes automatic recovery
   - Wait 5-10 seconds for recovery to complete

2. **Manual Recovery:**
   - Reload the webpage
   - Reload the extension in `chrome://extensions/`

3. **Persistent Issues:**
   - Restart Chrome browser
   - Clear browser cache and cookies

### Content Script Errors

**Symptoms:**

- "window is not defined" errors
- Tracking detection not working
- No privacy analysis appearing

**Solutions:**

1. **Check Permissions:**
   - Ensure extension has access to the current site
   - Check if site is in restricted list (chrome://, extension pages)

2. **Reload Page:**
   - Refresh the webpage after extension reload
   - Content scripts inject on page load

3. **Check Console:**
   - Open Developer Tools (F12)
   - Look for Phantom Trail messages in console

### Performance Issues

**Symptoms:**

- Slow page loading
- High CPU usage
- Browser freezing

**Solutions:**

1. **Reduce Tracking Sensitivity:**
   - Open extension settings
   - Increase detection thresholds
   - Disable non-essential features

2. **Clear Extension Data:**
   - Go to extension popup
   - Use "Clear Data" option
   - Restart browser

### AI Features Not Working

**Symptoms:**

- No AI analysis appearing
- "AI unavailable" messages
- Empty narrative feed

**Solutions:**

1. **Check API Key:**
   - Open extension settings
   - Verify OpenRouter API key is set
   - Test key with a simple request

2. **Network Issues:**
   - Check internet connection
   - Verify firewall/proxy settings
   - Try different network

3. **Rate Limiting:**
   - Wait for rate limit reset
   - Reduce AI analysis frequency in settings

## Debug Mode

### Enable Debug Logging

1. Open Chrome Developer Tools (F12)
2. Go to Console tab
3. Look for `[Phantom Trail]` messages
4. Enable verbose logging in extension settings

### Common Debug Messages

- `[Phantom Trail] Content script loaded` - Content script working
- `[Phantom Trail] Background script loaded` - Service worker active
- `[Phantom Trail] Tracker detected` - Tracking detection working
- `[Phantom Trail] Context invalidated` - Recovery needed

## Recovery Procedures

### Complete Reset

1. **Remove Extension:**

   ```
   chrome://extensions/ → Remove Phantom Trail
   ```

2. **Clear Browser Data:**

   ```
   chrome://settings/clearBrowserData
   Select "Cookies and other site data"
   Select "Cached images and files"
   ```

3. **Reinstall Extension:**
   - Load unpacked extension from `.output/chrome-mv3/`
   - Or install from Chrome Web Store

### Partial Reset

1. **Reload Extension:**

   ```
   chrome://extensions/ → Developer mode → Reload
   ```

2. **Clear Extension Storage:**
   - Open extension popup
   - Go to Settings → Advanced → Clear Data

3. **Refresh Active Tabs:**
   - Reload all open webpages
   - Content scripts will reinitialize

## Getting Help

### Before Reporting Issues

1. **Check Console Logs:**
   - Open Developer Tools (F12)
   - Copy any error messages
   - Note the website where issue occurred

2. **Try Recovery Steps:**
   - Follow troubleshooting guide above
   - Test on multiple websites

3. **Gather Information:**
   - Chrome version: `chrome://version/`
   - Extension version: Check in `chrome://extensions/`
   - Operating system and version

### Reporting Bugs

Include the following information:

1. **Steps to Reproduce:**
   - Exact sequence of actions
   - Website where issue occurred
   - Expected vs actual behavior

2. **Error Messages:**
   - Console errors (F12 → Console)
   - Extension popup errors
   - Any notification messages

3. **Environment:**
   - Chrome version
   - Operating system
   - Extension version
   - Other extensions installed

## Prevention Tips

### Best Practices

1. **Regular Updates:**
   - Keep Chrome updated
   - Update extension when available
   - Clear cache periodically

2. **Optimal Settings:**
   - Use default detection thresholds
   - Enable automatic recovery
   - Set reasonable AI analysis frequency

3. **Resource Management:**
   - Close unused tabs regularly
   - Restart Chrome daily
   - Monitor extension performance

### Compatibility

**Supported:**

- Chrome 88+ (Manifest V3)
- Chromium-based browsers (Edge, Brave)
- Most websites and web applications

**Not Supported:**

- Chrome internal pages (chrome://)
- Extension pages
- Local file:// URLs (without permission)
- Some enterprise/restricted environments

This troubleshooting guide should help resolve most common issues with the Phantom Trail extension.
