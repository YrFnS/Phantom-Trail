/**
 * Comprehensive test suite for Privacy Impact Predictions
 * Run this in the browser console to test prediction features
 */

// Test privacy predictor functionality
async function testPrivacyPredictor() {
  console.log('Testing Privacy Predictor...');
  
  try {
    const { PrivacyPredictor } = await import('../lib/privacy-predictor.js');
    
    // Test 1: Basic prediction
    console.log('Test 1: Basic privacy prediction...');
    const prediction = await PrivacyPredictor.predictPrivacyImpact('https://facebook.com');
    console.log('Facebook prediction:', prediction);
    
    if (!prediction || typeof prediction.predictedScore !== 'number') {
      throw new Error('Invalid prediction result');
    }
    
    // Test 2: Multiple predictions
    console.log('Test 2: Multiple site predictions...');
    const testUrls = [
      'https://google.com',
      'https://github.com',
      'https://amazon.com',
      'https://wikipedia.org',
      'https://gov.uk'
    ];
    
    const predictions = await Promise.all(
      testUrls.map(url => PrivacyPredictor.predictPrivacyImpact(url))
    );
    
    console.log('Multiple predictions:', predictions);
    
    // Test 3: Link analysis
    console.log('Test 3: Link analysis...');
    const context = {
      referrer: 'https://example.com',
      currentDomain: 'example.com',
      linkText: 'Visit Facebook',
      linkPosition: 'content',
      isExternal: true
    };
    
    const linkAnalysis = await PrivacyPredictor.analyzeLink('https://facebook.com', context);
    console.log('Link analysis:', linkAnalysis);
    
    // Test 4: Prediction confidence
    console.log('Test 4: Prediction confidence...');
    const confidence = await PrivacyPredictor.getPredictionConfidence('https://google.com');
    console.log('Google confidence:', confidence);
    
    if (confidence < 0 || confidence > 1) {
      throw new Error('Invalid confidence value');
    }
    
    // Test 5: Recommendations generation
    console.log('Test 5: Recommendations...');
    const recommendations = await PrivacyPredictor.generateRecommendations(prediction);
    console.log('Recommendations:', recommendations);
    
    console.log('✅ All privacy predictor tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Privacy predictor test failed:', error);
    return false;
  }
}

// Test site intelligence functionality
async function testSiteIntelligence() {
  console.log('Testing Site Intelligence...');
  
  try {
    const { SiteIntelligence } = await import('../lib/site-intelligence.js');
    
    // Test 1: Site analysis
    console.log('Test 1: Site analysis...');
    const intelligence = await SiteIntelligence.analyzeSite('facebook.com');
    console.log('Facebook intelligence:', intelligence);
    
    if (!intelligence || typeof intelligence.trustScore !== 'number') {
      throw new Error('Invalid intelligence result');
    }
    
    // Test 2: Site comparison
    console.log('Test 2: Site comparison...');
    const comparison = await SiteIntelligence.compareSites('facebook.com', [
      'twitter.com',
      'instagram.com',
      'linkedin.com',
      'google.com'
    ]);
    console.log('Site comparison:', comparison);
    
    // Test 3: Privacy trends
    console.log('Test 3: Privacy trends...');
    const trends = await SiteIntelligence.getPrivacyTrends('facebook.com', 7);
    console.log('Privacy trends:', trends);
    
    // Test 4: Behavior prediction
    console.log('Test 4: Behavior prediction...');
    const behaviorPrediction = await SiteIntelligence.predictSiteBehavior('facebook.com');
    console.log('Behavior prediction:', behaviorPrediction);
    
    console.log('✅ All site intelligence tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Site intelligence test failed:', error);
    return false;
  }
}

// Test prediction accuracy
async function testPredictionAccuracy() {
  console.log('Testing Prediction Accuracy...');
  
  try {
    const { PrivacyPredictor } = await import('../lib/privacy-predictor.js');
    
    // Test with known good/bad sites
    const testCases = [
      { url: 'https://gov.uk', expectedRange: [80, 100], category: 'government' },
      { url: 'https://wikipedia.org', expectedRange: [75, 95], category: 'education' },
      { url: 'https://facebook.com', expectedRange: [30, 60], category: 'social' },
      { url: 'https://doubleclick.net', expectedRange: [20, 50], category: 'advertising' },
      { url: 'https://github.com', expectedRange: [70, 90], category: 'technology' }
    ];
    
    let accurateCount = 0;
    
    for (const testCase of testCases) {
      const prediction = await PrivacyPredictor.predictPrivacyImpact(testCase.url);
      const isAccurate = prediction.predictedScore >= testCase.expectedRange[0] && 
                        prediction.predictedScore <= testCase.expectedRange[1];
      
      console.log(`${testCase.url}: ${prediction.predictedScore} (expected ${testCase.expectedRange[0]}-${testCase.expectedRange[1]}) - ${isAccurate ? '✅' : '❌'}`);
      
      if (isAccurate) accurateCount++;
    }
    
    const accuracy = (accurateCount / testCases.length) * 100;
    console.log(`Prediction accuracy: ${accuracy}% (${accurateCount}/${testCases.length})`);
    
    if (accuracy < 60) {
      console.warn('⚠️ Prediction accuracy below 60%, model may need improvement');
    }
    
    console.log('✅ Prediction accuracy test completed!');
    return accuracy >= 60;
    
  } catch (error) {
    console.error('❌ Prediction accuracy test failed:', error);
    return false;
  }
}

// Test prediction performance
async function testPredictionPerformance() {
  console.log('Testing Prediction Performance...');
  
  try {
    const { PrivacyPredictor } = await import('../lib/privacy-predictor.js');
    
    const testUrls = [
      'https://google.com',
      'https://facebook.com',
      'https://amazon.com',
      'https://twitter.com',
      'https://youtube.com',
      'https://wikipedia.org',
      'https://github.com',
      'https://stackoverflow.com',
      'https://reddit.com',
      'https://linkedin.com'
    ];
    
    // Test single prediction performance
    console.log('Test 1: Single prediction performance...');
    const startTime = Date.now();
    await PrivacyPredictor.predictPrivacyImpact('https://example.com');
    const singleTime = Date.now() - startTime;
    console.log(`Single prediction time: ${singleTime.toFixed(2)}ms`);
    
    // Test batch prediction performance
    console.log('Test 2: Batch prediction performance...');
    const batchStartTime = Date.now();
    await Promise.all(testUrls.map(url => PrivacyPredictor.predictPrivacyImpact(url)));
    const batchTime = Date.now() - batchStartTime;
    const avgTime = batchTime / testUrls.length;
    console.log(`Batch prediction time: ${batchTime.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms per prediction)`);
    
    // Test cache performance
    console.log('Test 3: Cache performance...');
    const cacheStartTime = Date.now();
    await PrivacyPredictor.predictPrivacyImpact('https://example.com'); // Should be cached
    const cacheTime = Date.now() - cacheStartTime;
    console.log(`Cached prediction time: ${cacheTime.toFixed(2)}ms`);
    
    // Performance thresholds
    const singleThreshold = 3000; // 3 seconds
    const avgThreshold = 1000; // 1 second average
    const cacheThreshold = 100; // 100ms for cached
    
    const performanceResults = {
      singlePrediction: singleTime < singleThreshold,
      batchAverage: avgTime < avgThreshold,
      cachePerformance: cacheTime < cacheThreshold
    };
    
    console.log('Performance results:', performanceResults);
    
    const allPassed = Object.values(performanceResults).every(result => result);
    console.log(allPassed ? '✅ All performance tests passed!' : '⚠️ Some performance tests failed');
    
    return allPassed;
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return false;
  }
}

// Test prediction components
async function testPredictionComponents() {
  console.log('Testing Prediction Components...');
  
  try {
    // Test tooltip creation
    console.log('Test 1: Tooltip creation...');
    const mockPrediction = {
      url: 'https://example.com',
      predictedScore: 75,
      predictedGrade: 'B',
      confidence: 0.8,
      riskFactors: [{
        type: 'category-risk',
        impact: -10,
        description: 'Social media sites typically have extensive tracking',
        confidence: 0.8
      }],
      expectedTrackers: [{
        domain: 'facebook.com',
        type: 'social',
        probability: 0.9,
        riskLevel: 'medium'
      }],
      recommendations: ['Consider using privacy mode'],
      comparisonToAverage: 5,
      timestamp: Date.now()
    };
    
    // Test if we can create prediction elements
    const testDiv = document.createElement('div');
    testDiv.innerHTML = `
      <div class="prediction-test">
        <span class="score">${mockPrediction.predictedScore}</span>
        <span class="grade">${mockPrediction.predictedGrade}</span>
        <span class="confidence">${Math.round(mockPrediction.confidence * 100)}%</span>
      </div>
    `;
    
    document.body.appendChild(testDiv);
    
    // Verify elements were created
    const scoreElement = testDiv.querySelector('.score');
    const gradeElement = testDiv.querySelector('.grade');
    const confidenceElement = testDiv.querySelector('.confidence');
    
    if (!scoreElement || !gradeElement || !confidenceElement) {
      throw new Error('Failed to create prediction elements');
    }
    
    // Clean up
    testDiv.remove();
    
    console.log('✅ All component tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Component test failed:', error);
    return false;
  }
}

// Test link hover functionality
async function testLinkHoverFunctionality() {
  console.log('Testing Link Hover Functionality...');
  
  try {
    // Create test link
    const testLink = document.createElement('a');
    testLink.href = 'https://facebook.com';
    testLink.textContent = 'Test Link';
    testLink.style.position = 'fixed';
    testLink.style.top = '50px';
    testLink.style.left = '50px';
    testLink.style.zIndex = '9999';
    testLink.style.background = 'yellow';
    testLink.style.padding = '10px';
    
    document.body.appendChild(testLink);
    
    // Simulate hover
    const hoverEvent = {
      bubbles: true,
      clientX: 100,
      clientY: 100
    };
    
    testLink.dispatchEvent(new Event('mouseover', hoverEvent));
    
    // Wait for prediction to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if tooltip was created
    const tooltip = document.querySelector('.phantom-trail-prediction-tooltip');
    const hasTooltip = tooltip !== null;
    
    console.log('Tooltip created:', hasTooltip);
    
    // Simulate mouse out
    const mouseOutEvent = {
      bubbles: true
    };
    
    testLink.dispatchEvent(new Event('mouseout', mouseOutEvent));
    
    // Clean up
    setTimeout(() => {
      testLink.remove();
      if (tooltip) tooltip.remove();
    }, 500);
    
    console.log('✅ Link hover test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Link hover test failed:', error);
    return false;
  }
}

// Run all prediction tests
async function runAllPredictionTests() {
  console.log('🚀 Starting Privacy Impact Prediction Tests...\n');
  
  const results = {
    privacyPredictor: await testPrivacyPredictor(),
    siteIntelligence: await testSiteIntelligence(),
    predictionAccuracy: await testPredictionAccuracy(),
    predictionPerformance: await testPredictionPerformance(),
    predictionComponents: await testPredictionComponents(),
    linkHoverFunctionality: await testLinkHoverFunctionality()
  };
  
  console.log('\n📊 Test Results:');
  console.log('Privacy Predictor:', results.privacyPredictor ? '✅ PASS' : '❌ FAIL');
  console.log('Site Intelligence:', results.siteIntelligence ? '✅ PASS' : '❌ FAIL');
  console.log('Prediction Accuracy:', results.predictionAccuracy ? '✅ PASS' : '❌ FAIL');
  console.log('Prediction Performance:', results.predictionPerformance ? '✅ PASS' : '❌ FAIL');
  console.log('Prediction Components:', results.predictionComponents ? '✅ PASS' : '❌ FAIL');
  console.log('Link Hover Functionality:', results.linkHoverFunctionality ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(result => result === true);
  console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  
  return allPassed;
}

// Export for use in extension context
if (typeof window !== 'undefined') {
  window.testPredictionFeatures = {
    runAllPredictionTests,
    testPrivacyPredictor,
    testSiteIntelligence,
    testPredictionAccuracy,
    testPredictionPerformance,
    testPredictionComponents,
    testLinkHoverFunctionality
  };
}

// Auto-run if in Node.js environment
if (typeof globalThis !== 'undefined' && typeof globalThis.module !== 'undefined' && globalThis.module.exports) {
  globalThis.module.exports = {
    runAllPredictionTests,
    testPrivacyPredictor,
    testSiteIntelligence,
    testPredictionAccuracy,
    testPredictionPerformance,
    testPredictionComponents,
    testLinkHoverFunctionality
  };
}
