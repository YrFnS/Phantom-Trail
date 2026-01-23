# Privacy Policy

**Last Updated**: January 17, 2026  
**Effective Date**: January 17, 2026

## Overview

Phantom Trail is a privacy-focused Chrome extension that helps you understand and control web tracking. We are committed to protecting your privacy and being transparent about our data practices.

## Data We Collect

### Locally Stored Data (On Your Device)

Phantom Trail stores the following data **locally on your device only**:

1. **Tracking Events** (30-day retention)
   - Website URLs (sanitized - no query parameters or hash fragments)
   - Tracker domains detected
   - Tracker types and risk levels
   - Timestamps of detection
   - In-page tracking methods detected

2. **User Settings**
   - AI feature enable/disable preference
   - Selected AI model
   - Trusted sites list (sites you've marked as trusted)

3. **OpenRouter API Key** (Optional)
   - If you enable AI features, your API key is stored locally
   - Never transmitted to our servers
   - Only sent directly to OpenRouter.ai for AI analysis

### Data We Do NOT Collect

- ❌ We do NOT collect any personal information
- ❌ We do NOT track your browsing history
- ❌ We do NOT sell your data to third parties
- ❌ We do NOT send data to our servers (we don't have servers)
- ❌ We do NOT use analytics or tracking on the extension itself

## How We Use Your Data

### Local Processing

All tracking detection happens **locally in your browser**. No data leaves your device except:

### AI Features (Optional)

If you enable AI features and provide an OpenRouter API key:

- **What is sent**: Sanitized tracking events (URLs without query params/hash)
- **Where it goes**: Directly to OpenRouter.ai (third-party AI provider)
- **Why**: To generate plain-English explanations of tracking activity
- **Your control**: You can disable AI features at any time

### Data Sanitization

Before sending any data to OpenRouter for AI analysis, we:

- Remove query parameters from URLs (session tokens, user IDs)
- Remove hash fragments (tracking IDs)
- Limit API call details to 5 entries
- Keep only essential tracking information

**Example**:

```
Original URL: https://bank.com/account?session=secret123&user_id=456
Sent to AI:   https://bank.com/account
```

## Data Retention

### Automatic Deletion

- **Tracking events**: Automatically deleted after **30 days**
- **User settings**: Retained until you uninstall the extension
- **Trusted sites**: Retained until you remove them or uninstall

### Manual Deletion

You can delete your data at any time:

1. Open Phantom Trail settings
2. Click "Clear All Data"
3. All tracking events and settings will be permanently deleted

## Third-Party Services

### OpenRouter.ai (Optional)

If you enable AI features:

- **Service**: AI-powered tracking analysis
- **Data shared**: Sanitized tracking events (see "Data Sanitization" above)
- **Privacy policy**: https://openrouter.ai/privacy
- **Your control**: Disable AI features to stop data sharing

### No Other Third Parties

Phantom Trail does not integrate with any other third-party services.

## Your Rights (GDPR/CCPA)

### Right to Access

All your data is stored locally on your device. You can view it anytime in the extension.

### Right to Deletion

You can delete all data at any time through the extension settings.

### Right to Data Portability

You can export your tracking data as CSV or JSON from the extension.

### Right to Opt-Out

- AI features are **opt-in** (disabled by default)
- You can disable AI features at any time
- You can add sites to your trusted list to stop tracking detection

## Data Security

### Local Storage

- All data stored using Chrome's secure storage APIs
- Data encrypted by Chrome's built-in encryption
- Only accessible by Phantom Trail extension

### API Key Security

- Your OpenRouter API key is stored locally only
- Never logged or transmitted to anyone except OpenRouter
- Stored using Chrome's secure storage

### No Remote Servers

- We don't operate any servers
- No data is sent to us
- No risk of data breaches on our end

## Children's Privacy

Phantom Trail does not knowingly collect data from children under 13. The extension is designed for general audiences and does not target children.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in the "Last Updated" date above. Continued use of the extension after changes constitutes acceptance of the updated policy.

## Contact Us

If you have questions about this privacy policy or Phantom Trail's data practices:

- **GitHub Issues**: https://github.com/yourusername/phantom-trail/issues
- **Email**: privacy@phantom-trail.example.com

## Compliance

### GDPR (EU General Data Protection Regulation)

Phantom Trail complies with GDPR principles:

- **Lawfulness**: Processing based on legitimate interest (privacy protection)
- **Data minimization**: Only essential data collected
- **Purpose limitation**: Data used only for tracking detection
- **Storage limitation**: 30-day automatic deletion
- **Integrity and confidentiality**: Secure local storage

### CCPA (California Consumer Privacy Act)

Phantom Trail complies with CCPA requirements:

- **Right to know**: All data visible in extension
- **Right to delete**: Manual deletion available
- **Right to opt-out**: AI features are opt-in
- **No sale of data**: We never sell user data

## Open Source

Phantom Trail is open source. You can review our code to verify our privacy practices:

- **Repository**: https://github.com/yourusername/phantom-trail
- **License**: MIT License

---

**Summary**: Phantom Trail is privacy-first. All data stays on your device. AI features are optional and use sanitized data. You control your data completely.
