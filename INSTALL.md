# Installation Instructions

## Quick Install (Manual)

### Prerequisites

- Google Chrome browser (version 88+)
- 5 minutes of your time

### Installation Steps

1. **Download the Extension**
   - Download `phantom-trail-1.0.0-chrome.zip` from the releases page
   - Or get it from the shared link

2. **Extract the ZIP File**
   - Right-click the ZIP file → "Extract All" (Windows) or double-click (Mac)
   - Remember the extraction location

3. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Go to `chrome://extensions/`
   - Or: Menu (⋮) → Extensions → Manage Extensions

4. **Enable Developer Mode**
   - Toggle "Developer mode" switch in the top-right corner
   - This allows loading unpacked extensions

5. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to the extracted folder
   - Select the folder containing `manifest.json`
   - Click "Select Folder"

6. **Verify Installation**
   - You should see "Phantom Trail" in your extensions list
   - The extension icon (👻) should appear in your Chrome toolbar
   - Status should show "Enabled"

### First-Time Setup

**Basic Usage (No API Key Required):**

- Extension works immediately for tracking detection
- Click the extension icon to see tracking events
- View privacy scores and network graphs

**Optional: Enable AI Features**

1. Get a free OpenRouter API key:
   - Visit https://openrouter.ai/
   - Sign up for an account
   - Generate an API key
   - Copy the key (starts with `sk-or-...`)

2. Configure in extension:
   - Click the Phantom Trail icon
   - Go to Settings tab
   - Paste your API key in "OpenRouter API Key" field
   - Click "Save Settings"

3. AI features now enabled:
   - Real-time AI narrative explaining tracking
   - Natural language chat interface
   - Personalized privacy recommendations
   - AI-powered privacy coaching

### Testing the Extension

1. **Visit a website** (try cnn.com or amazon.com)
2. **Click the extension icon**
3. **Check the Live Feed tab** - you should see tracking events
4. **View Privacy Score** - see current site and overall scores
5. **Explore Network Graph** - visualize data flows
6. **Try the Chat** (if AI enabled) - ask "What trackers are on this page?"

### Troubleshooting

**Extension doesn't appear:**

- Make sure you selected the correct folder (contains `manifest.json`)
- Check that Developer mode is enabled
- Try reloading the extension (click refresh icon)

**No tracking events showing:**

- Visit a different website (some sites have minimal tracking)
- Check browser console (F12) for errors
- Ensure the extension is enabled

**AI features not working:**

- Verify API key is correct (starts with `sk-or-...`)
- Check your OpenRouter account has credits
- Extension works without AI (basic tracking detection)

**Extension errors:**

- Open Chrome DevTools (F12) → Console tab
- Look for error messages
- Report issues on GitHub with error details

### Uninstallation

1. Go to `chrome://extensions/`
2. Find "Phantom Trail"
3. Click "Remove"
4. Confirm removal

### Privacy & Security

- **Local-first:** All data processing happens on your device
- **Optional AI:** Extension works without API key
- **No data collection:** We don't collect or transmit your browsing data
- **Open source:** Code is available for review on GitHub

### Support

- **Issues:** https://github.com/YrFnS/Phantom-Trail/issues
- **Documentation:** See README.md for detailed features
- **Questions:** Open a GitHub discussion

---

**Enjoy your privacy awareness journey! 👻**
