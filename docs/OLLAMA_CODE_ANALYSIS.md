# Ollama Code Analysis Setup

This document describes how to use the Ollama Autocoder extension for code analysis and quality improvements.

## Overview

The Ollama Autocoder extension has been configured to help analyze code issues and improve code quality throughout the project. It uses AI-powered analysis to identify:

- Code quality issues
- Potential bugs and security vulnerabilities
- Performance problems
- Best practice violations
- Refactoring opportunities

## Configuration

### Extension Settings

The extension is configured in `.vscode/settings.json`:

```json
{
  "ollama-autocoder.model": "qwen2.5-coder:14b",
  "ollama-autocoder.endpoint": "http://127.0.0.1:11434/api/generate",
  "ollama-autocoder.contextLength": 8192,
  "ollama-autocoder.maxTokens": 4096
}
```

### Available Models

You have the following models installed:
- `qwen2.5-coder:14b` (default) - Best for comprehensive analysis
- `qwen2.5-coder:7b` - Faster, lighter option
- `codellama:latest` - Code-specific model
- `mistral:7b` - General purpose
- `llama3.1:8b` - Balanced performance

To switch models, update the `ollama-autocoder.model` setting in `.vscode/settings.json`.

## Usage

### 1. Real-time Code Completions

The extension provides AI-powered code completions as you type. Simply start coding and the extension will suggest completions based on your code context.

**Features:**
- Context-aware suggestions
- Multi-language support (TypeScript, Python, Vue, etc.)
- Inline code completions

### 2. Analyze Current File

#### Using VS Code Tasks

1. Open the file you want to analyze
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Tasks: Run Task"
4. Select "Analyze Current File with Ollama"

#### Using Command Line

```powershell
npm run analyze:ollama -- -FilePath "path/to/your/file.ts"
```

Or directly:

```powershell
.\scripts\powershell\analyze-code-with-ollama.ps1 -FilePath "components/DashboardTab.vue"
```

**Options:**
- `-FilePath <path>` - Path to the file to analyze (required)
- `-Language <lang>` - Language (auto, TypeScript, Python, etc.)
- `-Quick` - Quick analysis mode
- `-Detailed` - Detailed analysis mode
- `-Model <model>` - Override default model

**Output:**
- Analysis displayed in terminal
- Markdown report saved as `filename.ollama-analysis.md`

### 3. Review Entire Codebase

#### Using VS Code Tasks

1. Press `Ctrl+Shift+P`
2. Type "Tasks: Run Task"
3. Select "Review Codebase with Ollama" or "Quick Code Review with Ollama"

#### Using Command Line

```powershell
# Full review
npm run analyze:codebase

# Quick review (5 files)
npm run analyze:quick
```

**Options:**
- `-Directory <path>` - Directory to review (default: current directory)
- `-Extensions <exts>` - File extensions to include (default: *.ts, *.js, *.vue, *.py)
- `-MaxFiles <count>` - Maximum files to analyze (default: 10)
- `-Quick` - Quick analysis mode
- `-Model <model>` - Override default model

**Output:**
- Summary report displayed in terminal
- Full report saved as `ollama-codebase-review-YYYYMMDD-HHMMSS.md`

## Analysis Focus Areas

The analysis covers:

### 1. Code Quality Issues
- Code smells and anti-patterns
- Potential bugs or logic errors
- Performance issues
- Security vulnerabilities

### 2. Best Practices
- Language-specific best practices
- Code organization and structure
- Naming conventions
- Error handling patterns

### 3. Improvements
- Specific, actionable suggestions
- Code examples for improvements
- Refactoring opportunities

### 4. Summary
- Overall code quality score (1-10)
- Priority issues to address first

## Integration with Existing Tools

The Ollama analysis complements your existing code quality tools:

- **TypeScript**: `npm run ts:check`
- **Linting**: `npm run lint`
- **Formatting**: `npm run format`
- **Static Analysis**: See `docs/STATIC_ANALYSIS_REPORT.md`

Use Ollama analysis for:
- Context-aware suggestions
- Refactoring recommendations
- Code review insights
- Learning best practices

Use traditional tools for:
- Type checking
- Syntax validation
- Formatting
- Automated fixes

## Workflow Recommendations

### Daily Development

1. **While Coding**: Use real-time completions from the extension
2. **Before Committing**: Run quick analysis on changed files
   ```powershell
   npm run analyze:ollama -- -FilePath "your-changed-file.ts" -Quick
   ```

### Code Review

1. **Before PR**: Run full codebase review
   ```powershell
   npm run analyze:codebase
   ```
2. **Review Report**: Check the generated markdown report
3. **Address Issues**: Fix high-priority issues identified

### Refactoring

1. **Identify Target**: Use analysis to find refactoring opportunities
2. **Get Suggestions**: Ask for specific refactoring recommendations
3. **Implement**: Use AI suggestions to guide refactoring

## Examples

### Analyzing a TypeScript File

```powershell
.\scripts\powershell\analyze-code-with-ollama.ps1 -FilePath "composables/useApi.ts" -Language "TypeScript"
```

### Analyzing a Vue Component

```powershell
.\scripts\powershell\analyze-code-with-ollama.ps1 -FilePath "components/DashboardTab.vue" -Language "Vue"
```

### Quick Review of Recent Changes

```powershell
.\scripts\powershell\review-codebase-with-ollama.ps1 -Quick -MaxFiles 5 -Extensions @("*.ts", "*.vue")
```

## Troubleshooting

### Ollama Server Not Running

If you see connection errors:

```powershell
# Start Ollama server
ollama serve
```

### Memory Issues with 14b Model

If you experience memory errors, switch to a smaller model:

1. Edit `.vscode/settings.json`
2. Change `"ollama-autocoder.model"` to `"qwen2.5-coder:7b"` or `"codellama:latest"`

### Slow Analysis

- Use `-Quick` flag for faster analysis
- Reduce `-MaxFiles` for codebase reviews
- Use smaller models (7b instead of 14b)

## Best Practices

1. **Start Small**: Begin with single file analysis
2. **Review Reports**: Always review generated reports
3. **Prioritize**: Focus on high-priority issues first
4. **Iterate**: Run analysis after making changes
5. **Combine Tools**: Use Ollama alongside traditional linting

## Next Steps

1. ✅ Extension configured
2. ✅ Analysis scripts created
3. ✅ VS Code tasks added
4. ✅ NPM scripts added
5. 🔄 Start analyzing your code!

Try analyzing a file now:
```powershell
npm run analyze:ollama -- -FilePath "app.vue"
```
