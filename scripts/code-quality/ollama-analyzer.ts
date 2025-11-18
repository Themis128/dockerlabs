#!/usr/bin/env node
/**
 * Ollama Code Quality Analyzer
 * Analyzes code using Ollama for quality improvements, security, and best practices
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface OllamaConfig {
  endpoint: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  contextLength: number;
}

interface AnalysisOptions {
  mode: 'quick' | 'detailed' | 'comprehensive';
  focus?: 'security' | 'performance' | 'maintainability' | 'all';
  outputFormat: 'markdown' | 'json' | 'console';
  saveReport: boolean;
  files?: string[];
}

interface AnalysisResult {
  file: string;
  score: number;
  issues: Issue[];
  suggestions: Suggestion[];
  summary: string;
}

interface Issue {
  severity: 'error' | 'warning' | 'info';
  line?: number;
  message: string;
  category: string;
}

interface Suggestion {
  type: 'refactor' | 'optimization' | 'security' | 'best-practice';
  description: string;
  code?: string;
}

class OllamaCodeAnalyzer {
  private config: OllamaConfig;
  private defaultConfig: OllamaConfig = {
    endpoint: process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434/api/generate',
    model: process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b',
    temperature: 0.2, // Lower temperature for faster, more focused responses
    topP: 0.8, // Lower topP for faster generation
    maxTokens: 8192,
    contextLength: 16384,
  };

  constructor(config?: Partial<OllamaConfig>) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Check if Ollama is available
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.endpoint.replace('/api/generate', '')}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Preload model into Ollama memory for faster subsequent queries
   */
  async preloadModel(): Promise<boolean> {
    try {
      const ollamaBase = this.config.endpoint.replace('/api/generate', '');
      const response = await fetch(`${ollamaBase}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: 'test',
          stream: false,
          options: { num_predict: 1 },
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Analyze a single file
   */
  async analyzeFile(filePath: string, options: AnalysisOptions): Promise<AnalysisResult> {
    const code = fs.readFileSync(filePath, 'utf-8');
    const language = this.detectLanguage(filePath);

    // Adjust config for quick mode
    const originalMaxTokens = this.config.maxTokens;
    if (options.mode === 'quick') {
      this.config.maxTokens = 1024; // Much shorter for quick mode
      this.config.temperature = 0.1; // Very focused
    }

    try {
      const prompt = this.buildPrompt(code, language, options);
      const analysis = await this.queryOllama(prompt, options.mode === 'quick' ? 1 : 2, options.mode);
      return this.parseAnalysis(analysis, filePath);
    } finally {
      // Restore original config
      this.config.maxTokens = originalMaxTokens;
      this.config.temperature = this.defaultConfig.temperature;
    }
  }

  /**
   * Analyze multiple files with parallel processing for speed
   */
  async analyzeFiles(files: string[], options: AnalysisOptions): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    // For quick mode, process in parallel (up to 3 concurrent)
    // For detailed/comprehensive, process sequentially to avoid overwhelming Ollama
    const maxConcurrent = options.mode === 'quick' ? 3 : 1;
    const chunks: string[][] = [];

    for (let i = 0; i < files.length; i += maxConcurrent) {
      chunks.push(files.slice(i, i + maxConcurrent));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (file) => {
        try {
          if (process.env.DEBUG) {
            console.log(`[${new Date().toISOString()}] Analyzing ${file}...`);
          } else {
            process.stdout.write(`Analyzing ${path.basename(file)}... `);
          }

          const startTime = Date.now();
          const result = await this.analyzeFile(file, options);
          const duration = Date.now() - startTime;

          if (!process.env.DEBUG) {
            console.log(`✓ (${duration}ms)`);
          }

          return result;
        } catch (error: any) {
          if (!process.env.DEBUG) {
            console.log(`✗ (${error.message})`);
          }
          return {
            file,
            score: 0,
            issues: [{
              severity: 'error' as const,
              message: `Analysis failed: ${error.message}`,
              category: 'system',
            }],
            suggestions: [],
            summary: 'Analysis failed',
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Analyze entire codebase
   */
  async analyzeCodebase(rootDir: string, options: AnalysisOptions): Promise<AnalysisResult[]> {
    const files = this.findCodeFiles(rootDir, options.files);
    return this.analyzeFiles(files, options);
  }

  /**
   * Build analysis prompt - optimized for speed
   */
  private buildPrompt(code: string, language: string, options: AnalysisOptions): string {
    // Truncate very long files for quick mode
    const maxCodeLength = options.mode === 'quick' ? 2000 :
                          options.mode === 'detailed' ? 5000 :
                          10000;

    if (code.length > maxCodeLength) {
      code = code.substring(0, maxCodeLength) + '\n// ... [code truncated for analysis]';
    }

    const modeInstructions = {
      quick: 'Quick analysis: List only critical errors and major warnings. Keep response brief. Score 0-100.',
      detailed: 'Detailed analysis: Include line numbers, specific issues, and brief suggestions.',
      comprehensive: 'Comprehensive analysis: Cover security, performance, maintainability, best practices, and code smells.',
    };

    const focusInstructions = {
      security: 'Focus ONLY on security: vulnerabilities, injection risks, data exposure.',
      performance: 'Focus ONLY on performance: bottlenecks, inefficient algorithms, optimizations.',
      maintainability: 'Focus ONLY on maintainability: readability, complexity, structure.',
      all: 'Cover all aspects.',
    };

    // Optimized prompt for speed - shorter and more direct
    const basePrompt = options.mode === 'quick'
      ? `Analyze ${language} code. ${modeInstructions[options.mode]}

${focusInstructions[options.focus || 'all']}

Code:
\`\`\`${language}
${code}
\`\`\`

JSON only (no explanation):
{"score":<0-100>,"issues":[{"severity":"error|warning","line":<n>,"message":"<text>","category":"<type>"}],"summary":"<text>"}`
      : `You are an expert code reviewer. ${modeInstructions[options.mode]}

${focusInstructions[options.focus || 'all']}

Analyze this ${language} code and provide JSON:
{
  "score": <0-100>,
  "issues": [{"severity": "error|warning|info", "line": <n>, "message": "<text>", "category": "<type>"}],
  "suggestions": [{"type": "<type>", "description": "<text>", "code": "<optional>"}],
  "summary": "<brief>"
}

Code:
\`\`\`${language}
${code}
\`\`\``;

    return basePrompt;
  }

  /**
   * Query Ollama API with optimizations for speed
   */
  private async queryOllama(prompt: string, retries = 2, mode: 'quick' | 'detailed' | 'comprehensive' = 'detailed'): Promise<string> {
    // Optimize prompt length for faster processing
    const maxPromptLength = this.config.contextLength * 0.8; // Use 80% of context
    if (prompt.length > maxPromptLength) {
      prompt = prompt.substring(0, maxPromptLength) + '\n\n[Code truncated for performance]';
    }

    for (let i = 0; i < retries; i++) {
      try {
        const startTime = Date.now();
        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            prompt,
            stream: false,
            options: {
              temperature: this.config.temperature,
              top_p: this.config.topP,
              num_predict: this.config.maxTokens,
              // Performance optimizations
              num_ctx: Math.min(this.config.contextLength, mode === 'quick' ? 4096 : 8192), // Smaller context for quick mode
              repeat_penalty: 1.05, // Lower penalty for faster generation
              top_k: mode === 'quick' ? 10 : 20, // Limit top_k for faster sampling
            },
          }),
          // Add timeout - shorter for quick mode
          signal: AbortSignal.timeout(mode === 'quick' ? 30000 : 60000),
        });

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        const duration = Date.now() - startTime;
        if (process.env.DEBUG) {
          console.log(`[Ollama] Query completed in ${duration}ms`);
        }
        return data.response || '';
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('Ollama request timeout (60s)');
        }
        if (i === retries - 1) throw error;
        // Shorter backoff for faster retries
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
      }
    }
    throw new Error('Failed to query Ollama after retries');
  }

  /**
   * Parse analysis response
   */
  private parseAnalysis(response: string, filePath: string): AnalysisResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          file: filePath,
          score: parsed.score || 0,
          issues: parsed.issues || [],
          suggestions: parsed.suggestions || [],
          summary: parsed.summary || 'Analysis completed',
        };
      }
    } catch (error) {
      // If JSON parsing fails, create a basic result
    }

    // Fallback: create result from text response
    return {
      file: filePath,
      score: 50,
      issues: [{
        severity: 'info',
        message: 'Could not parse structured analysis. Raw response available.',
        category: 'system',
      }],
      suggestions: [],
      summary: response.substring(0, 200),
    };
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.vue': 'vue',
      '.py': 'python',
      '.cs': 'csharp',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
    };
    return languageMap[ext] || 'text';
  }

  /**
   * Find code files in directory
   */
  private findCodeFiles(rootDir: string, specificFiles?: string[]): string[] {
    if (specificFiles) {
      return specificFiles.map(f => path.resolve(rootDir, f));
    }

    const extensions = ['.ts', '.js', '.vue', '.py', '.cs'];
    const files: string[] = [];
    const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.nuxt', '.output'];

    const walkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name)) {
            walkDir(fullPath);
          }
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    walkDir(rootDir);
    return files;
  }

  /**
   * Generate report
   */
  generateReport(results: AnalysisResult[], format: 'markdown' | 'json' | 'console'): string {
    if (format === 'json') {
      return JSON.stringify(results, null, 2);
    }

    if (format === 'markdown') {
      return this.generateMarkdownReport(results);
    }

    return this.generateConsoleReport(results);
  }

  private generateMarkdownReport(results: AnalysisResult[]): string {
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const errors = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'error').length, 0);
    const warnings = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'warning').length, 0);

    let report = `# Code Quality Analysis Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `- **Files Analyzed:** ${results.length}\n`;
    report += `- **Average Score:** ${avgScore.toFixed(1)}/100\n`;
    report += `- **Total Issues:** ${totalIssues}\n`;
    report += `  - Errors: ${errors}\n`;
    report += `  - Warnings: ${warnings}\n`;
    report += `  - Info: ${totalIssues - errors - warnings}\n\n`;

    report += `## Files\n\n`;
    for (const result of results) {
      report += `### ${result.file}\n\n`;
      report += `**Score:** ${result.score}/100\n\n`;
      report += `**Summary:** ${result.summary}\n\n`;

      if (result.issues.length > 0) {
        report += `#### Issues\n\n`;
        for (const issue of result.issues) {
          report += `- **${issue.severity.toUpperCase()}** (${issue.category})`;
          if (issue.line) report += ` - Line ${issue.line}`;
          report += `: ${issue.message}\n`;
        }
        report += `\n`;
      }

      if (result.suggestions.length > 0) {
        report += `#### Suggestions\n\n`;
        for (const suggestion of result.suggestions) {
          report += `- **${suggestion.type}**: ${suggestion.description}\n`;
          if (suggestion.code) {
            report += `\n\`\`\`\n${suggestion.code}\n\`\`\`\n\n`;
          }
        }
      }
      report += `\n---\n\n`;
    }

    return report;
  }

  private generateConsoleReport(results: AnalysisResult[]): string {
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    let report = `\nCode Quality Analysis Report\n`;
    report += `============================\n\n`;
    report += `Files Analyzed: ${results.length}\n`;
    report += `Average Score: ${avgScore.toFixed(1)}/100\n\n`;

    for (const result of results) {
      report += `${result.file}: ${result.score}/100\n`;
      if (result.issues.length > 0) {
        result.issues.forEach(issue => {
          report += `  [${issue.severity}] ${issue.message}\n`;
        });
      }
    }

    return report;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: AnalysisOptions = {
    mode: 'detailed',
    focus: 'all',
    outputFormat: 'markdown',
    saveReport: true,
  };

  let targetPath = process.cwd();
  let files: string[] | undefined;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--quick':
        options.mode = 'quick';
        break;
      case '--detailed':
        options.mode = 'detailed';
        break;
      case '--comprehensive':
        options.mode = 'comprehensive';
        break;
      case '--security':
        options.focus = 'security';
        break;
      case '--performance':
        options.focus = 'performance';
        break;
      case '--maintainability':
        options.focus = 'maintainability';
        break;
      case '--json':
        options.outputFormat = 'json';
        break;
      case '--console':
        options.outputFormat = 'console';
        break;
      case '--no-save':
        options.saveReport = false;
        break;
      case '--file':
        if (i + 1 < args.length) {
          const nextIndex = i + 1;
          i = nextIndex;
          const fileArg = args[nextIndex];
          if (fileArg) {
            files = [fileArg];
          }
        }
        break;
      case '--files':
        if (i + 1 < args.length) {
          const nextIndex = i + 1;
          i = nextIndex;
          const filesArg = args[nextIndex];
          if (filesArg) {
            files = filesArg.split(',').map(f => f.trim());
          }
        }
        break;
      default:
        if (arg && !arg.startsWith('--')) {
          // Check if it's a file or directory
          const fullPath = path.resolve(targetPath, arg);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isFile()) {
              // It's a file
              if (!files) files = [];
              files.push(fullPath);
            } else {
              // It's a directory
              targetPath = fullPath;
            }
          } catch {
            // Assume it's a file path
            if (!files) files = [];
            files.push(fullPath);
          }
        }
    }
  }

  const analyzer = new OllamaCodeAnalyzer();

  console.log('Checking Ollama connection...');
  const connected = await analyzer.checkConnection();
  if (!connected) {
    console.error('❌ Cannot connect to Ollama. Make sure Ollama is running.');
    console.error('   Start Ollama: ollama serve');
    process.exit(1);
  }
  console.log('✅ Connected to Ollama\n');

  console.log(`Analyzing code in: ${targetPath}`);
  console.log(`Mode: ${options.mode}, Focus: ${options.focus}`);

  // Preload model for faster first query (only in quick mode)
  if (options.mode === 'quick') {
    console.log('Preloading model for faster analysis...');
    await analyzer.preloadModel().catch(() => {}); // Non-blocking
  }

  console.log('');

  const startTime = Date.now();
  const results = files && files.length > 0
    ? await analyzer.analyzeFiles(files, options)
    : await analyzer.analyzeCodebase(targetPath, options);
  const totalTime = Date.now() - startTime;

  console.log(`\n✅ Analysis complete in ${(totalTime / 1000).toFixed(2)}s (${results.length} files)`);

  const report = analyzer.generateReport(results, options.outputFormat);

  if (options.outputFormat === 'console') {
    console.log(report);
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `code-quality-report-${timestamp}.${options.outputFormat === 'json' ? 'json' : 'md'}`;

    if (options.saveReport) {
      fs.writeFileSync(filename, report);
      console.log(`\n✅ Report saved to: ${filename}`);
    } else {
      console.log(report);
    }
  }

  // Exit with error code if there are critical issues
  const hasErrors = results.some(r => r.issues.some(i => i.severity === 'error'));
  process.exit(hasErrors ? 1 : 0);
}

// Check if this file is being run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
                     process.argv[1]?.endsWith('ollama-analyzer.ts') ||
                     process.argv[1]?.endsWith('ollama-analyzer.js');

if (isMainModule) {
  main().catch(console.error);
}

export { OllamaCodeAnalyzer };
