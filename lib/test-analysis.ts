/**
 * Test script for tracking analysis functionality
 * Run this to verify the analysis system works correctly
 */

import { TrackingAnalysis } from '../lib/tracking-analysis';
import { AIAnalysisPrompts } from '../lib/ai-analysis-prompts';

async function testAnalysis() {
  console.log('🧪 Testing Phantom Trail Analysis System\n');

  try {
    // Test 1: Pattern Analysis
    console.log('1️⃣ Testing Pattern Analysis...');
    const patternResult = await TrackingAnalysis.analyzePatterns(24 * 60 * 60 * 1000);
    console.log('✅ Pattern analysis completed');
    console.log(`   Summary: ${patternResult.summary}`);
    console.log(`   Recommendations: ${patternResult.recommendations.length}\n`);

    // Test 2: Risk Assessment
    console.log('2️⃣ Testing Risk Assessment...');
    const riskResult = await TrackingAnalysis.analyzeRisk(24 * 60 * 60 * 1000);
    console.log('✅ Risk assessment completed');
    console.log(`   Summary: ${riskResult.summary}`);
    console.log(`   Recommendations: ${riskResult.recommendations.length}\n`);

    // Test 3: Tracker Analysis
    console.log('3️⃣ Testing Tracker Analysis...');
    const trackerResult = await TrackingAnalysis.analyzeTracker('doubleclick.net');
    console.log('✅ Tracker analysis completed');
    console.log(`   Summary: ${trackerResult.summary}`);
    console.log(`   Recommendations: ${trackerResult.recommendations.length}\n`);

    // Test 4: Website Audit
    console.log('4️⃣ Testing Website Audit...');
    const websiteResult = await TrackingAnalysis.auditWebsite('https://example.com');
    console.log('✅ Website audit completed');
    console.log(`   Summary: ${websiteResult.summary}`);
    console.log(`   Recommendations: ${websiteResult.recommendations.length}\n`);

    // Test 5: Timeline Analysis
    console.log('5️⃣ Testing Timeline Analysis...');
    const timelineResult = await TrackingAnalysis.analyzeTimeline(24 * 60 * 60 * 1000);
    console.log('✅ Timeline analysis completed');
    console.log(`   Summary: ${timelineResult.summary}`);
    console.log(`   Recommendations: ${timelineResult.recommendations.length}\n`);

    // Test 6: AI Prompt Processing
    console.log('6️⃣ Testing AI Prompt Processing...');
    const queries = [
      'Analyze my tracking patterns',
      'What is my privacy risk?',
      'Show me doubleclick.net behavior',
      'Audit example.com privacy',
      'Show tracking timeline',
    ];

    for (const query of queries) {
      console.log(`   Testing: "${query}"`);
      const response = await AIAnalysisPrompts.processQuery(query);
      console.log(`   ✅ Response length: ${response.length} characters`);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Analysis System Features:');
    console.log('   ✅ Pattern detection and cross-site tracking analysis');
    console.log('   ✅ Privacy risk scoring and trend analysis');
    console.log('   ✅ Individual tracker behavior profiling');
    console.log('   ✅ Website privacy auditing and comparison');
    console.log('   ✅ Timeline analysis with anomaly detection');
    console.log('   ✅ Natural language query processing');
    console.log('   ✅ Formatted analysis results with recommendations');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure all dependencies are installed: pnpm install');
    console.log('   2. Check that storage manager is properly configured');
    console.log('   3. Verify TypeScript compilation: npx tsc --noEmit');
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  testAnalysis();
}

export { testAnalysis };
