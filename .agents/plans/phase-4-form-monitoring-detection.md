# Phase 4: Form Monitoring Detection

**Estimated Time:** 1-2 hours
**Complexity:** Medium
**Dependencies:** Phase 1, 2, 3 (Canvas + Storage + Mouse Detection)
**Deliverable:** Form field monitoring detection with critical risk for password fields

## Objective

Detect when websites monitor form field inputs, with special alerting for password field monitoring (potential keylogging).

## Why Form Monitoring Fourth?

- **Critical security concern** (password field monitoring = keylogging)
- **High user impact** (immediate actionable warning)
- **Clear risk escalation** (password = critical, other fields = high)
- **Common on login pages** (banking, social media, email)
- **Validates risk assessment** (tests critical risk level handling)

## User Story

As a privacy-conscious user
I want to be alerted when websites monitor what I type in forms
So that I can avoid entering sensitive information on untrusted sites

## Success Criteria

- [ ] Form monitoring detected on login pages
- [ ] Password field monitoring shows "critical" risk level
- [ ] Other form fields show "high" risk level
- [ ] Field types and names listed in details
- [ ] AI analysis emphasizes security implications
- [ ] No false positives on form validation

---

## CONTEXT REFERENCES

### Files to Modify

- `lib/in-page-detector.ts` - Add form monitoring analysis
- `entrypoints/content-main-world.ts` - Add form event monitoring
- `entrypoints/content.ts` - Add form detection case
- `lib/ai-engine.ts` - Add form monitoring context with security emphasis

---

## IMPLEMENTATION TASKS

### Task 1: UPDATE lib/in-page-detector.ts - Add Form Analysis

**Objective:** Analyze form field monitoring with password field detection

**Add to InPageDetector class:**

```typescript
/**
 * Analyze form field monitoring
 */
static analyzeFormMonitoring(
  fields: Array<{ type: string; name: string; monitored: boolean }>
): DetectionResult {
  const monitoredFields = fields.filter(f => f.monitored);
  const hasPasswordField = monitoredFields.some(f => f.type === 'password');
  const detected = monitoredFields.length > 0;

  return {
    detected,
    method: 'form-monitoring',
    description: detected
      ? `Form field monitoring detected on ${monitoredFields.length} fields`
      : 'No form monitoring detected',
    riskLevel: hasPasswordField ? 'critical' : detected ? 'high' : 'low',
    details: hasPasswordField
      ? '⚠️ PASSWORD FIELD BEING MONITORED - Potential keylogging'
      : `${monitoredFields.length} form fields monitored`,
    apiCalls: monitoredFields.map(f => `${f.type}:${f.name}`),
    frequency: monitoredFields.length,
  };
}
```

**Validation:** `npx tsc --noEmit && pnpm lint`

---

### Task 2: UPDATE entrypoints/content-main-world.ts - Add Form Monitoring

**Objective:** Monitor form field interactions with debounced reporting

**Add to tracking state at top:**

```typescript
const monitoredFields = new Set<HTMLInputElement>();
let formMonitoringTimeout: ReturnType<typeof setTimeout> | null = null;
```

**Add monitoring function:**

```typescript
/**
 * Monitor form field interactions
 */
function monitorFormFields() {
  document.addEventListener(
    'input',
    event => {
      const target = event.target as HTMLElement;

      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const inputElement = target as HTMLInputElement;
        monitoredFields.add(inputElement);

        // Debounce reporting - wait 1 second after last input
        if (formMonitoringTimeout) {
          clearTimeout(formMonitoringTimeout);
        }

        formMonitoringTimeout = setTimeout(() => {
          if (monitoredFields.size > 0) {
            const fields = Array.from(monitoredFields).map(field => ({
              type: field.type || 'text',
              name: field.name || field.id || 'unnamed',
              monitored: true,
            }));

            reportDetection({
              type: 'form-monitoring',
              fields,
              timestamp: Date.now(),
            });

            monitoredFields.clear();
          }
          formMonitoringTimeout = null;
        }, 1000);
      }
    },
    { passive: true }
  );
}

// Add to initialization
try {
  interceptCanvas();
  interceptStorage();
  monitorMouseTracking();
  monitorFormFields(); // Add this line
} catch (error) {
  console.error('[Phantom Trail] Failed to initialize detectors:', error);
}
```

**Validation:** `pnpm build`

---

### Task 3: UPDATE entrypoints/content.ts - Add Form Event Processing

**Objective:** Process form monitoring events with password field awareness

**Add to processDetection function:**

```typescript
case 'form-monitoring':
  detectionResult = InPageDetector.analyzeFormMonitoring(
    event.detail.fields || []
  );
  break;
```

**Validation:** `pnpm build && pnpm lint`

---

### Task 4: UPDATE lib/ai-engine.ts - Add Form Monitoring Context

**Objective:** Enhance AI prompts with security-focused form monitoring context

**Add to buildEventPrompt method:**

```typescript
if (event.inPageTracking?.method === 'form-monitoring') {
  const hasPassword = event.inPageTracking.details.includes('PASSWORD');

  prompt += `\n\nForm Monitoring Details:
- Fields Monitored: ${event.inPageTracking.frequency || 'N/A'}
- Field Types: ${event.inPageTracking.apiCalls?.join(', ') || 'N/A'}
- Risk Level: ${event.riskLevel.toUpperCase()}

${
  hasPassword
    ? '🚨 CRITICAL SECURITY ALERT: This website is monitoring password field inputs. This is potential keylogging behavior. DO NOT enter sensitive passwords on this site. Recommend using a password manager and enabling two-factor authentication.'
    : 'This website is monitoring what you type in form fields. This data can be used to track your behavior, analyze your inputs, and potentially capture sensitive information before you submit the form.'
}`;
}
```

**Validation:** `npx tsc --noEmit && pnpm lint`

---

## VALIDATION COMMANDS

### Level 1: Build & Syntax

```bash
npx tsc --noEmit
pnpm lint
pnpm build
```

### Level 2: Form Monitoring Detection Test

**Test Sites:**

- Any login page (Gmail, Facebook, Twitter)
- Banking sites
- E-commerce checkout forms

**Steps:**

1. Reload extension in Chrome
2. Visit login page (e.g., https://accounts.google.com)
3. Type in username field
4. Type in password field
5. Open extension popup → Live Feed
6. Verify form monitoring event appears with:
   - Risk level: "critical" (red badge) if password field
   - Risk level: "high" (orange badge) if only username
   - Description mentions field count
   - Details show "PASSWORD FIELD BEING MONITORED" if applicable
   - Field types listed (password:password, text:username, etc.)

### Level 3: AI Analysis Verification

**Critical: Security warning for password fields**

**Steps:**

1. Trigger password field monitoring
2. Wait for AI analysis (3-5 seconds)
3. Verify narrative includes:
   - "CRITICAL SECURITY ALERT" or similar
   - Warning about keylogging
   - Recommendation to avoid entering passwords
   - Suggestion for password manager
   - Two-factor authentication mention

### Level 4: False Positive Check

**Test on legitimate form validation:**

- Forms with client-side validation
- Auto-save draft features
- Character counters

**Expected:** Detection should occur (it IS monitoring), but AI should explain context

---

## ACCEPTANCE CRITERIA

- [x] Form monitoring detected on login pages
- [x] Password field monitoring shows "critical" risk
- [x] Other fields show "high" risk
- [x] Field types and names listed
- [x] AI analysis emphasizes security for passwords
- [x] Event stored and appears in Live Feed
- [x] No performance impact on typing
- [x] All validation commands pass

---

## COMPLETION CHECKLIST

- [ ] Task 1: Added analyzeFormMonitoring to in-page-detector.ts
- [ ] Task 2: Added form monitoring to content-main-world.ts
- [ ] Task 3: Added form case to content.ts
- [ ] Task 4: Added form context to ai-engine.ts with security emphasis
- [ ] Form detection works on login pages
- [ ] Password fields trigger critical risk
- [ ] AI analysis includes security warnings
- [ ] No typing lag observed

---

## TROUBLESHOOTING

**Issue: Too many events (every keystroke)**

- Increase debounce timeout from 1000ms to 2000ms
- Only report once per form session
- Add cooldown period (30 seconds)

**Issue: Not detecting password fields**

- Check field.type === 'password' logic
- Verify password input elements are captured
- Log field types to console for debugging

**Issue: False positives on autosave**

- This is expected behavior (autosave IS monitoring)
- AI should explain legitimate use case
- Consider adding "legitimate monitoring" category

**Issue: Performance impact on typing**

- Verify passive: true is set
- Check debounce timeout is working
- Ensure monitoredFields Set is cleared properly

---

## SECURITY CONSIDERATIONS

**Why Critical Risk for Passwords?**

- Password monitoring = potential keylogging
- Immediate security threat to user accounts
- Requires urgent user action (don't enter password)
- Justifies prominent warning in UI

**Why High Risk for Other Fields?**

- Still privacy invasion (tracking inputs)
- Can capture PII (names, emails, addresses)
- Less urgent than passwords but still concerning

**Legitimate Use Cases:**

- Form validation (checking email format)
- Auto-save drafts (Google Docs, email clients)
- Character counters (Twitter, text limits)
- Password strength meters

**User Guidance:**

- AI should distinguish malicious vs legitimate monitoring
- Provide context-aware recommendations
- Emphasize password managers for critical fields

---

## UI CONSIDERATIONS

**Critical Risk Badge:**

- Should be visually distinct (red, bold)
- Icon: 🚨 or ⚠️
- Prominent placement in Live Feed
- Consider browser notification for critical events

**Description Clarity:**

- Non-technical language
- Clear action items
- Explain why it matters
- Provide alternatives (password managers)

---

## NEXT STEPS

After Phase 4 completion:

- **Phase 5:** Device API Detection (hardware fingerprinting)
- **Optional:** Browser notifications for critical events
- **Optional:** Form field whitelist (trusted sites)
