# Trusted Sites System

## Overview

Phantom Trail uses a **hybrid trusted sites system** to reduce false positives for legitimate security fingerprinting while maintaining strong privacy protection.

## Three-Layer Trust System

### Layer 1: Default Whitelist
Pre-configured sites known to use fingerprinting for legitimate security purposes:
- **Authentication Platforms**: GitHub, GitLab, Microsoft, Google
- **Financial Services**: PayPal, Stripe, major banks
- **Cloud Consoles**: AWS, Google Cloud, Azure

These sites are hardcoded and cannot be removed by users.

### Layer 2: User Whitelist
Users can add their own trusted sites through the Settings UI:
- Add any domain you trust
- Specify which tracking methods are allowed (optional)
- Add temporary sites (session-only)
- Export/import whitelist for backup

### Layer 3: Smart Context Detection
Automatic detection of security contexts where fingerprinting is likely legitimate:
- **Login Pages**: URLs containing /login, /signin, /auth, /sso
- **Banking Sites**: Domains with banking/financial keywords
- **Payment Pages**: Checkout, payment, billing pages
- **Password Fields**: Pages with password input fields

Context detection only trusts sites with **high confidence** scores.

## How It Works

When fingerprinting is detected, the extension checks all three layers:

```
Fingerprinting Detected
        ↓
Is site in default whitelist? → Yes → Skip warning
        ↓ No
Is site in user whitelist? → Yes → Skip warning
        ↓ No
Is security context detected? → Yes → Skip warning
        ↓ No
Show warning to user
```

## Managing Trusted Sites

### Adding Sites
1. Open extension popup
2. Click Settings (gear icon)
3. Go to "Trusted Sites" tab
4. Click "+ Add Site"
5. Enter domain (e.g., `example.com`)
6. Optionally specify allowed methods
7. Optionally mark as temporary (session-only)

### Removing Sites
1. Go to Settings → Trusted Sites
2. Find the site in "Your Trusted Sites"
3. Click "Remove"

### Export/Import
- **Export**: Save your whitelist as JSON file
- **Import**: Restore whitelist from JSON file
- Useful for backup or sharing across devices

## Current Page Context

The Settings UI shows the security context of the current page:
- Domain name
- Confidence level (Low/Medium/High)
- Detected contexts (login page, banking, payment, password field)

This helps you understand why a site might be trusted automatically.

## Privacy Considerations

- All trust decisions happen **locally** (no external API calls)
- User whitelist stored in `chrome.storage.local` (private to extension)
- No data sent to external services
- Context detection uses only URL patterns and DOM inspection

## Examples

### Trusted by Default
- `github.com` - Account security
- `paypal.com` - Payment fraud prevention
- `chase.com` - Banking security

### Auto-Trusted by Context
- `mycompany.com/login` - Login page detected
- `mybank.com` - Banking domain detected
- `store.com/checkout` - Payment page detected

### User-Added
- Your company's SSO portal
- Your school's authentication system
- Your local bank not in default list

## Technical Details

**Files**:
- `lib/trusted-sites.ts` - Core trust logic
- `lib/context-detector.ts` - Security context detection
- `lib/user-whitelist-manager.ts` - User whitelist management
- `components/Settings/TrustedSitesSettings.tsx` - Settings UI

**Storage**:
- User whitelist: `chrome.storage.local` key `userTrustedSites`
- Format: Array of `UserTrustedSite` objects

**Context Detection Patterns**:
- Login: `/login`, `/signin`, `/auth`, `/sso`, `/oauth`
- Banking: `bank`, `credit`, `financial`, major bank names
- Payment: `/checkout`, `/payment`, `/billing`, payment processor domains

## Future Enhancements

Potential improvements (not yet implemented):
- Machine learning-based context detection
- Community-shared whitelist (with privacy)
- Automatic expiration of user-added sites
- Site-specific method permissions
- Whitelist sync across devices
