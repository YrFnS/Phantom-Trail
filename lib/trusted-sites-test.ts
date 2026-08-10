/**
 * Simple browser-console check for personal site annotations.
 * Personal annotations must never change detector evidence or P2 scoring.
 */

import { TrustedSitesManager, TrustLevel } from '../lib/trusted-sites-manager';
import { calculatePrivacyScoreWithTrust } from '../lib/privacy-score';

export async function testTrustedSites() {
  console.log('🧪 Testing Personal Site Annotations...');

  try {
    console.log('1. Adding github.com annotation...');
    await TrustedSitesManager.addTrustedSite(
      'github.com',
      TrustLevel.PARTIAL_TRUST,
      'Development platform'
    );

    console.log('2. Checking annotation lookup...');
    const isTrusted = await TrustedSitesManager.isTrustedSite('github.com');
    console.log(`✅ github.com annotated: ${isTrusted}`);

    console.log('3. Getting annotation details...');
    const trustedSite = await TrustedSitesManager.getTrustedSite('github.com');
    console.log('✅ Annotation details:', trustedSite);

    console.log('4. Confirming annotations do not alter evidence scoring...');
    const mockEvents = [
      {
        id: '1',
        timestamp: Date.now(),
        url: 'https://github.com/test',
        domain: 'github.com',
        trackerType: 'analytics' as const,
        riskLevel: 'medium' as const,
        description: 'Legacy test signal',
      },
    ];

    const scoreWithoutAnnotation = await calculatePrivacyScoreWithTrust(
      mockEvents,
      true
    );
    const scoreWithAnnotation = await calculatePrivacyScoreWithTrust(
      mockEvents,
      true,
      'github.com'
    );

    console.log('✅ Score without annotation:', scoreWithoutAnnotation);
    console.log('✅ Score with annotation:', scoreWithAnnotation);
    console.log(
      '✅ Annotation left score unchanged:',
      JSON.stringify(scoreWithoutAnnotation) === JSON.stringify(scoreWithAnnotation)
    );

    console.log('5. Confirming automatic suggestions remain disabled...');
    const suggestions =
      await TrustedSitesManager.generateTrustSuggestions('google.com');
    console.log('✅ Automatic annotation suggestions:', suggestions);

    console.log('6. Listing annotations...');
    const allTrustedSites = await TrustedSitesManager.getTrustedSites();
    console.log('✅ All annotations:', allTrustedSites);

    console.log('7. Updating annotation label...');
    await TrustedSitesManager.updateTrustLevel(
      'github.com',
      TrustLevel.FULL_TRUST
    );
    const updatedSite = await TrustedSitesManager.getTrustedSite('github.com');
    console.log('✅ Updated annotation label:', updatedSite?.trustLevel);

    console.log('8. Removing annotation...');
    await TrustedSitesManager.removeTrustedSite('github.com');
    const removedCheck = await TrustedSitesManager.isTrustedSite('github.com');
    console.log('✅ Annotation removed:', !removedCheck);
  } catch (error) {
    console.error('❌ Annotation check failed:', error);
  }
}

(
  window as unknown as { testTrustedSites: typeof testTrustedSites }
).testTrustedSites = testTrustedSites;
