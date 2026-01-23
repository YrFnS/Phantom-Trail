---
description: Test the Chrome extension manually across different scenarios
---

# Extension Testing Prompt

Run comprehensive manual testing of the Phantom Trail Chrome extension to validate functionality, performance, and user experience.

## Testing Scenarios

### 1. Basic Functionality Test

**Websites to Test:**

- CNN.com (heavy tracking)
- GitHub.com (minimal tracking)
- Amazon.com (e-commerce tracking)
- Bank website (security fingerprinting)

**What to Check:**

- [ ] Extension icon appears in toolbar
- [ ] Popup opens without errors
- [ ] Live Feed shows tracking events
- [ ] Network Graph renders correctly
- [ ] Dashboard displays metrics
- [ ] Chat interface responds

**Expected Results:**

- CNN: 15-25 tracking events, privacy score C-D
- GitHub: 2-5 tracking events, privacy score A-B
- Amazon: 10-20 tracking events, privacy score D-F
- Bank: 3-8 events (some trusted), privacy score B-C

### 2. Performance Test

**How to Test:**

1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Start recording
4. Browse 3-5 websites
5. Stop recording

**What to Check:**

- [ ] CPU usage <5% during browsing
- [ ] Memory usage <100MB
- [ ] No frame drops or lag
- [ ] Extension loads in <500ms

**Performance Targets:**

- CPU: <5% average
- Memory: <100MB
- Bundle: ~1MB
- Page load impact: <100ms

### 3. AI Features Test

**Prerequisites:**

- OpenRouter API key configured

**What to Test:**

- [ ] AI narrative appears in Live Feed
- [ ] Narrative is in plain English (non-technical)
- [ ] Chat responds to questions
- [ ] Recommendations are actionable
- [ ] Caching reduces API calls

**Test Questions:**

- "What did Google learn about me today?"
- "Is this website trustworthy?"
- "Why is my privacy score low?"
- "What should I do about this tracking?"

**Expected Results:**

- Responses in <5 seconds
- Clear, non-technical language
- Specific recommendations
- Confidence scores shown

### 4. Privacy Score Test

**What to Test:**

- [ ] Current Site score updates per domain
- [ ] Recent Activity score shows overall
- [ ] Scores match tracking events
- [ ] Grades (A-F) are accurate
- [ ] Breakdown shows risk distribution

**Test Scenarios:**

- Visit trusted site → Score should be A/B
- Visit tracking-heavy site → Score should be D/F
- Visit multiple sites → Recent Activity changes
- Clear data → Scores reset

### 5. Trusted Sites Test

**What to Test:**

- [ ] Add trusted site manually
- [ ] Remove trusted site
- [ ] Export whitelist (JSON)
- [ ] Import whitelist
- [ ] Auto-detection on login pages
- [ ] Context display shows detection

**Test Steps:**

1. Add `example.com` to trusted sites
2. Visit `example.com` → tracking should be ignored
3. Export whitelist → JSON file downloads
4. Remove `example.com`
5. Import whitelist → site restored
6. Visit bank login page → auto-detected

### 6. Export Functionality Test

**What to Test:**

- [ ] CSV export downloads
- [ ] JSON export downloads
- [ ] PDF export downloads
- [ ] Files contain correct data
- [ ] Timestamps are accurate

**Test Steps:**

1. Browse 3-5 websites
2. Export as CSV → open in Excel/Sheets
3. Export as JSON → validate structure
4. Export as PDF → check readability

**Expected Data:**

- All tracking events included
- Timestamps in readable format
- Risk levels shown
- Privacy score breakdown

### 7. Error Handling Test

**What to Test:**

- [ ] No API key → basic features work
- [ ] Invalid API key → error message shown
- [ ] Network offline → graceful degradation
- [ ] Malformed tracker data → no crashes
- [ ] Context invalidation → recovery works

**Test Scenarios:**

1. Remove API key → extension still works
2. Enter invalid key → clear error message
3. Disconnect internet → cached data shown
4. Navigate rapidly → no crashes
5. Reload extension → data persists

### 8. Edge Cases Test

**What to Test:**

- [ ] 100+ trackers on one page
- [ ] Rapid page navigation
- [ ] Long browsing session (30+ min)
- [ ] Multiple tabs open
- [ ] Extension update/reload

**Test Scenarios:**

1. Visit tracker-heavy site → no lag
2. Navigate 10 pages rapidly → no crashes
3. Browse for 30 minutes → memory stable
4. Open 10 tabs → performance OK
5. Reload extension → data persists

## Validation Checklist

### Functionality ✅

- [ ] All 4 tabs work (Live Feed, Network Graph, Dashboard, Chat)
- [ ] Tracking detection works on 90%+ of sites
- [ ] Privacy scores are accurate
- [ ] Export functionality works
- [ ] Trusted sites system works
- [ ] Settings persist across sessions

### Performance ✅

- [ ] CPU usage <5%
- [ ] Memory usage <100MB
- [ ] No visible lag or stuttering
- [ ] Page load impact <100ms
- [ ] Extension loads quickly

### User Experience ✅

- [ ] Interface is intuitive
- [ ] Error messages are clear
- [ ] Loading states shown
- [ ] No confusing jargon
- [ ] Help text available

### Reliability ✅

- [ ] No crashes or freezes
- [ ] Graceful error handling
- [ ] Data persists correctly
- [ ] Context recovery works
- [ ] No console errors

## Bug Reporting Template

If you find issues, report using this format:

```markdown
**Bug Title:** [Brief description]

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**

- Chrome Version: [version]
- Extension Version: [version]
- OS: [Windows/Mac/Linux]

**Console Errors:**
[Paste any errors from F12 Console]

**Screenshots:**
[Attach if applicable]
```

## Performance Benchmarking

### CPU Usage Test

```bash
# Open Chrome Task Manager (Shift+Esc)
# Find "Extension: Phantom Trail"
# Record CPU % over 5 minutes
# Average should be <5%
```

### Memory Usage Test

```bash
# Open Chrome Task Manager (Shift+Esc)
# Find "Extension: Phantom Trail"
# Record Memory over 30 minutes
# Should stay <100MB
```

### Network Impact Test

```bash
# Open DevTools → Network tab
# Record page load time without extension
# Enable extension
# Record page load time with extension
# Difference should be <100ms
```

## Test Results Documentation

After testing, document results:

```markdown
# Test Results - [Date]

## Summary

- Tests Passed: X/Y
- Critical Issues: X
- Performance: Pass/Fail
- User Experience: Pass/Fail

## Detailed Results

### Basic Functionality

- CNN.com: ✅ 18 events detected, score D (62)
- GitHub.com: ✅ 3 events detected, score A (95)
- Amazon.com: ✅ 15 events detected, score F (58)

### Performance

- CPU: ✅ 3.2% average
- Memory: ✅ 78MB average
- Page load: ✅ +45ms impact

### Issues Found

1. [Issue description]
2. [Issue description]

### Recommendations

1. [Recommendation]
2. [Recommendation]
```

## Success Criteria

**Extension is ready for release if:**

- ✅ All basic functionality tests pass
- ✅ Performance targets met
- ✅ No critical bugs
- ✅ User experience is smooth
- ✅ Error handling works correctly

**Extension needs work if:**

- ❌ Critical bugs found
- ❌ Performance targets missed
- ❌ User experience is confusing
- ❌ Frequent crashes or errors
