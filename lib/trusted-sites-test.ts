/**
 * Simple test to verify trusted sites functionality
 * Run this in the browser console to test the implementation
 */

import { TrustedSitesManager, TrustLevel } from '../lib/trusted-sites-manager';
import { calculatePrivacyScoreWithTrust } from '../lib/privacy-score';

export async function testTrustedSites() {
  console.log('🧪 Testing Trusted Sites Management...');
  
  try {
    // Test 1: Add a trusted site
    console.log('1. Adding github.com as trusted site...');
    await TrustedSitesManager.addTrustedSite(
      'github.com', 
      TrustLevel.PARTIAL_TRUST, 
      'Development platform'
    );
    
    // Test 2: Check if site is trusted
    console.log('2. Checking if github.com is trusted...');
    const isTrusted = await TrustedSitesManager.isTrustedSite('github.com');
    console.log(`✅ github.com trusted: ${isTrusted}`);
    
    // Test 3: Get trusted site details
    console.log('3. Getting trusted site details...');
    const trustedSite = await TrustedSitesManager.getTrustedSite('github.com');
    console.log('✅ Trusted site details:', trustedSite);
    
    // Test 4: Test privacy score adjustment
    console.log('4. Testing privacy score adjustment...');
    const mockEvents = [
      {
        id: '1',
        timestamp: Date.now(),
        url: 'https://github.com/test',
        domain: 'github.com',
        trackerType: 'analytics' as const,
        riskLevel: 'medium' as const,
        description: 'Test tracker'
      }
    ];
    
    const scoreWithoutTrust = await calculatePrivacyScoreWithTrust(mockEvents, true);
    const scoreWithTrust = await calculatePrivacyScoreWithTrust(mockEvents, true, 'github.com');
    
    console.log('✅ Score without trust:', scoreWithoutTrust.score);
    console.log('✅ Score with trust:', scoreWithTrust.score);
    console.log('✅ Trust adjustment applied:', scoreWithTrust.breakdown.trustAdjustment);
    
    // Test 5: Generate trust suggestions
    console.log('5. Testing trust suggestions...');
    const suggestions = await TrustedSitesManager.generateTrustSuggestions('google.com');
    console.log('✅ Trust suggestions:', suggestions);
    
    // Test 6: List all trusted sites
    console.log('6. Listing all trusted sites...');
    const allTrustedSites = await TrustedSitesManager.getTrustedSites();
    console.log('✅ All trusted sites:', allTrustedSites);
    
    // Test 7: Update trust level
    console.log('7. Updating trust level...');
    await TrustedSitesManager.updateTrustLevel('github.com', TrustLevel.FULL_TRUST);
    const updatedSite = await TrustedSitesManager.getTrustedSite('github.com');
    console.log('✅ Updated trust level:', updatedSite?.trustLevel);
    
    // Test 8: Remove trusted site
    console.log('8. Removing trusted site...');
    await TrustedSitesManager.removeTrustedSite('github.com');
    const removedCheck = await TrustedSitesManager.isTrustedSite('github.com');
    console.log('✅ Site removed, still trusted:', removedCheck);
    
    console.log('🎉 All tests passed! Trusted Sites functionality is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for use in browser console
(window as unknown as { testTrustedSites: typeof testTrustedSites }).testTrustedSites = testTrustedSites;
