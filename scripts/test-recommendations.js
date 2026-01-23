/**
 * Test script for Privacy Recommendations Engine
 * Run with: node scripts/test-recommendations.js
 */

import { PrivacyRecommendations } from '../lib/privacy-recommendations.js';

// Mock tracking events for testing
const mockEvents = [
  {
    id: '1',
    timestamp: Date.now(),
    url: 'https://facebook.com/tr',
    domain: 'facebook.com',
    trackerType: 'social',
    riskLevel: 'high',
    description: 'Facebook tracking pixel',
  },
  {
    id: '2',
    timestamp: Date.now(),
    url: 'https://google-analytics.com/collect',
    domain: 'google-analytics.com',
    trackerType: 'analytics',
    riskLevel: 'medium',
    description: 'Google Analytics tracking',
  },
  {
    id: '3',
    timestamp: Date.now(),
    url: 'https://doubleclick.net/ads',
    domain: 'doubleclick.net',
    trackerType: 'advertising',
    riskLevel: 'high',
    description: 'DoubleClick advertising tracker',
  },
];

async function testRecommendations() {
  console.log('🧪 Testing Privacy Recommendations Engine\n');

  try {
    // Test personalized actions
    console.log('📋 Getting personalized actions...');
    const actions =
      await PrivacyRecommendations.getPersonalizedActions(mockEvents);
    console.log(`Found ${actions.length} recommendations:`);

    actions.forEach((action, index) => {
      console.log(
        `  ${index + 1}. ${action.title} (${action.difficulty}, ${action.impact} impact)`
      );
      console.log(`     ${action.description}`);
    });

    // Test service alternatives
    console.log('\n🔄 Getting service alternatives...');
    const alternatives =
      await PrivacyRecommendations.suggestAlternatives('facebook.com');
    console.log(`Found ${alternatives.length} alternatives:`);

    alternatives.forEach((alt, index) => {
      console.log(`  ${index + 1}. ${alt.alternative} - ${alt.description}`);
      console.log(`     Benefit: ${alt.privacyBenefit}`);
    });

    // Test contextual recommendations
    console.log('\n🎯 Getting contextual recommendations...');
    const contextual =
      await PrivacyRecommendations.getContextualRecommendations(
        'facebook.com',
        mockEvents
      );
    console.log(`Found ${contextual.length} contextual recommendations:`);

    contextual.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.title}`);
      console.log(`     ${rec.description}`);
    });

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
testRecommendations();
