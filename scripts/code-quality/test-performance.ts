/**
 * Performance test for Ollama analyzer
 * Calculates a speed score (0-100) based on analysis speed
 * Returns exit code 0 if score >= 90 (fast enough for pre-commit), 1 otherwise
 */

import { OllamaCodeAnalyzer } from './ollama-analyzer.js';
import * as path from 'path';

/**
 * Calculate performance score based on speed
 * Target: < 5s = 100, < 10s = 90+, < 15s = 80+, etc.
 */
function calculateSpeedScore(timeMs: number): number {
  const timeSeconds = timeMs / 1000;

  // Perfect score for very fast (< 5s)
  if (timeSeconds < 5) {
    return 100;
  }

  // Excellent score for fast (< 10s) - target for pre-commit
  if (timeSeconds < 10) {
    // Linear interpolation: 5s = 100, 10s = 90
    return Math.round(100 - ((timeSeconds - 5) / 5) * 10);
  }

  // Good score for acceptable (< 15s)
  if (timeSeconds < 15) {
    // Linear interpolation: 10s = 90, 15s = 80
    return Math.round(90 - ((timeSeconds - 10) / 5) * 10);
  }

  // Fair score for slow (< 20s)
  if (timeSeconds < 20) {
    // Linear interpolation: 15s = 80, 20s = 70
    return Math.round(80 - ((timeSeconds - 15) / 5) * 10);
  }

  // Poor score for very slow (< 30s)
  if (timeSeconds < 30) {
    // Linear interpolation: 20s = 70, 30s = 50
    return Math.round(70 - ((timeSeconds - 20) / 10) * 20);
  }

  // Very poor score for extremely slow (>= 30s)
  return Math.max(0, Math.round(50 - ((timeSeconds - 30) / 10) * 10));
}

async function testPerformance() {
  const MIN_SCORE_FOR_PRE_COMMIT = 90;

  console.log('🚀 Testing Ollama Analyzer Performance\n');

  const analyzer = new OllamaCodeAnalyzer();

  // Test connection
  console.log('1. Testing connection...');
  const connected = await analyzer.checkConnection();
  if (!connected) {
    console.error('❌ Ollama not available. Start with: ollama serve');
    process.exit(1);
  }
  console.log('✅ Connected\n');

  // Test file
  const testFile = path.resolve(process.cwd(), 'playwright.config.ts');
  console.log(`2. Testing with: ${testFile}\n`);

  // Quick mode test (this is what we use for pre-commit)
  console.log('📊 Quick Mode Test (used for pre-commit):');
  const quickStart = Date.now();
  const quickResult = await analyzer.analyzeFile(testFile, {
    mode: 'quick',
    focus: 'all',
    outputFormat: 'console',
    saveReport: false,
  });
  const quickTime = Date.now() - quickStart;
  const quickTimeSeconds = quickTime / 1000;
  const speedScore = calculateSpeedScore(quickTime);

  console.log(`   Time: ${quickTime}ms (${quickTimeSeconds.toFixed(2)}s)`);
  console.log(`   Code Quality Score: ${quickResult.score}/100`);
  console.log(`   Speed Score: ${speedScore}/100`);
  console.log(`   Issues: ${quickResult.issues.length}\n`);

  // Detailed mode test (for reference)
  console.log('📊 Detailed Mode Test (reference):');
  const detailedStart = Date.now();
  const detailedResult = await analyzer.analyzeFile(testFile, {
    mode: 'detailed',
    focus: 'all',
    outputFormat: 'console',
    saveReport: false,
  });
  const detailedTime = Date.now() - detailedStart;
  const detailedTimeSeconds = detailedTime / 1000;
  const detailedSpeedScore = calculateSpeedScore(detailedTime);

  console.log(`   Time: ${detailedTime}ms (${detailedTimeSeconds.toFixed(2)}s)`);
  console.log(`   Code Quality Score: ${detailedResult.score}/100`);
  console.log(`   Speed Score: ${detailedSpeedScore}/100`);
  console.log(`   Issues: ${detailedResult.issues.length}\n`);

  // Performance summary
  console.log('📈 Performance Summary:');
  console.log(`   Quick mode: ${quickTime}ms (${quickTimeSeconds.toFixed(2)}s) - Speed Score: ${speedScore}/100`);
  console.log(`   Detailed mode: ${detailedTime}ms (${detailedTimeSeconds.toFixed(2)}s) - Speed Score: ${detailedSpeedScore}/100`);
  console.log(`   Speedup: ${(detailedTime/quickTime).toFixed(2)}x faster in quick mode\n`);

  // Check if fast enough for pre-commit
  console.log(`🎯 Pre-commit Eligibility (requires speed score >= ${MIN_SCORE_FOR_PRE_COMMIT}):`);
  if (speedScore >= MIN_SCORE_FOR_PRE_COMMIT) {
    console.log(`   ✅ Speed score ${speedScore}/100 meets requirement!`);
    console.log(`   ✅ Ollama analysis can be used in pre-commit hooks\n`);
  } else {
    console.log(`   ❌ Speed score ${speedScore}/100 is below requirement of ${MIN_SCORE_FOR_PRE_COMMIT}`);
    console.log(`   ⚠️  Ollama analysis will be skipped in pre-commit hooks\n`);
  }

  // Recommendations
  console.log('💡 Recommendations:');
  if (quickTime > 10000) {
    console.log('   ⚠️  Quick mode is slow. Consider:');
    console.log('      - Using a smaller model (7b instead of 14b)');
    console.log('      - Reducing maxTokens in config');
    console.log('      - Using model preloading');
  } else if (quickTime < 5000) {
    console.log('   ✅ Quick mode is fast! Good for pre-commit hooks.');
  }

  if (detailedTime > 30000) {
    console.log('   ⚠️  Detailed mode is slow. Consider:');
    console.log('      - Using quick mode for frequent checks');
    console.log('      - Analyzing fewer files at once');
  }

  // Exit with appropriate code
  // Exit 0 if speed score >= 90 (can use in pre-commit), 1 otherwise
  if (speedScore >= MIN_SCORE_FOR_PRE_COMMIT) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testPerformance().catch((error) => {
  console.error('Error during performance test:', error);
  process.exit(1);
});
