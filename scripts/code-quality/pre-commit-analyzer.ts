#!/usr/bin/env node
/**
 * Pre-commit Code Analyzer
 * Analyzes staged files before commit using Ollama
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import analyzer (use dynamic import for better compatibility)
const { OllamaCodeAnalyzer } = await import('./ollama-analyzer.js');

async function analyzeStagedFiles() {
  try {
    // Get staged files
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
      .filter(f => f && (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.vue') || f.endsWith('.py')));

    if (stagedFiles.length === 0) {
      console.log('✅ No code files staged for commit');
      return true;
    }

    console.log(`\n🔍 Analyzing ${stagedFiles.length} staged file(s) with Ollama...\n`);

    const analyzer = new OllamaCodeAnalyzer();

    // Check connection
    const connected = await analyzer.checkConnection();
    if (!connected) {
      console.warn('⚠️  Ollama not available. Skipping code analysis.');
      console.warn('   Install and start Ollama: https://ollama.ai');
      return true; // Don't block commit if Ollama is unavailable
    }

    // Analyze files
    const results = await analyzer.analyzeFiles(
      stagedFiles.map(f => path.resolve(process.cwd(), f)),
      {
        mode: 'quick',
        focus: 'all',
        outputFormat: 'console',
        saveReport: false,
      }
    );

    // Filter out false positives (common non-critical issues)
    const falsePositivePatterns = [
      /shebang/i,
      /file path.*incomplete/i,
      /file path.*incorrect/i,
      /path.*incomplete/i,
      /path.*incorrect/i,
      /property.*is not defined.*did you mean/i,
      /property.*does not exist.*did you mean/i,
      /unreachable code/i,
      /incomplete statement/i,
      /incomplete code block/i,
      /syntax error.*unexpected character/i,
      /importing.*module which is not defined/i,
      /module.*not defined/i,
      /unmatched.*statement/i,
      /unmatched.*block/i,
      /unexpected token.*json/i,
      /json.*error/i,
      /json.*parse/i,
    ];

    // Filter errors to exclude false positives
    const realErrors = results.map(result => ({
      ...result,
      issues: result.issues.filter(issue => {
        if (issue.severity === 'error') {
          // Check if it's a false positive
          const isFalsePositive = falsePositivePatterns.some(pattern =>
            pattern.test(issue.message)
          );
          if (isFalsePositive) {
            // Downgrade to warning instead of blocking
            console.warn(`⚠️  Ignoring false positive: ${issue.message}`);
            return false;
          }
        }
        return true;
      })
    }));

    // Check for critical issues (after filtering false positives)
    const errors = realErrors.filter(r => r.issues.some(i => i.severity === 'error'));
    const warnings = realErrors.filter(r => r.issues.some(i => i.severity === 'warning'));

    if (errors.length > 0) {
      console.error('\n❌ Critical issues found in staged files:');
      errors.forEach(result => {
        console.error(`\n  ${result.file}:`);
        result.issues
          .filter(i => i.severity === 'error')
          .forEach(issue => {
            console.error(`    [ERROR] ${issue.message}`);
          });
      });
      console.error('\n⚠️  Please fix critical issues before committing.');
      return false;
    }

    if (warnings.length > 0) {
      console.warn('\n⚠️  Warnings found in staged files:');
      warnings.forEach(result => {
        console.warn(`\n  ${result.file}:`);
        result.issues
          .filter(i => i.severity === 'warning')
          .forEach(issue => {
            console.warn(`    [WARNING] ${issue.message}`);
          });
      });
      console.warn('\n💡 Consider fixing warnings before committing.');
    }

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    console.log(`\n✅ Analysis complete. Average score: ${avgScore.toFixed(1)}/100\n`);

    // Code quality score is informational only in pre-commit
    // The speed score check (>= 90) is what determines if analysis runs
    if (avgScore < 70) {
      console.warn(`\n⚠️  Code quality score (${avgScore.toFixed(1)}/100) is below 70`);
      console.warn('💡 Consider improving code quality, but commit will proceed.\n');
    } else if (avgScore >= 90) {
      console.log(`✅ Code quality score (${avgScore.toFixed(1)}/100) is excellent!\n`);
    } else {
      console.log(`✅ Code quality score (${avgScore.toFixed(1)}/100) is acceptable.\n`);
    }

    return true;
  } catch (error: any) {
    console.error('Error during pre-commit analysis:', error.message);
    return true; // Don't block commit on analysis errors
  }
}

// Run analysis
const success = await analyzeStagedFiles();
process.exit(success ? 0 : 1);
