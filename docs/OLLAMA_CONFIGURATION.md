# Ollama Extension Configuration Guide

## Overview

This document describes the enhanced Ollama configuration for code analysis and AI-powered development assistance.

## Configuration Files

### 1. VS Code Settings (`.vscode/settings.json`)

Enhanced Ollama Autocoder settings:

```json
{
  "ollama-autocoder.model": "qwen2.5-coder:14b",
  "ollama-autocoder.endpoint": "http://127.0.0.1:11434/api/generate",
  "ollama-autocoder.contextLength": 16384,
  "ollama-autocoder.maxTokens": 8192,
  "ollama-autocoder.temperature": 0.3,
  "ollama-autocoder.topP": 0.9,
  "ollama-autocoder.timeout": 300000,
  "ollama-autocoder.enableStreaming": true,
  "ollama-autocoder.retryAttempts": 3,
  "ollama-autocoder.retryDelay": 2000,
  "ollama-autocoder.fallbackModels": [
    "qwen2.5-coder:7b",
    "codellama:latest",
    "mistral:7b"
  ],
  "ollama-autocoder.analysis.enabled": true,
  "ollama-autocoder.analysis.depth": "comprehensive",
  "ollama-autocoder.analysis.includeSecurity": true,
  "ollama-autocoder.analysis.includePerformance": true,
  "ollama-autocoder.analysis.includeBestPractices": true
}
```

### 2. Cursor Rules (`.cursorrules`)

Cursor-specific configuration for Ollama integration, including:
- Default model preferences
- Analysis workflow guidelines
- Best practices for code analysis

## PowerShell Script Enhancements

### New Features

1. **Timeout Control**: Configurable request timeout (default: 300 seconds)
2. **Retry Logic**: Automatic retries with exponential backoff (default: 3 attempts)
3. **Model Verification**: Checks if the specified model is available before analysis
4. **Streaming Support**: Optional streaming responses for real-time feedback
5. **Chunked Analysis**: Automatically splits large files into smaller chunks for better processing
6. **Verbose Logging**: Detailed logging with debug information and timing metrics
7. **Log File**: Automatic log file generation in temp directory
8. **Progress Tracking**: Real-time progress indicators for multi-chunk analysis
9. **Analysis Modes**:
   - **Quick Mode**: Fast, focused analysis for critical issues
   - **Standard Mode**: Balanced analysis (default)
   - **Detailed Mode**: Comprehensive analysis with architecture review

### Usage Examples

```powershell
# Standard analysis
npm run analyze:ollama -- -FilePath "app.vue"

# Quick analysis
npm run analyze:ollama:quick -- -FilePath "components/DashboardTab.vue"

# Detailed analysis
npm run analyze:ollama:detailed -- -FilePath "composables/useApi.ts"

# Custom model and timeout
powershell -ExecutionPolicy Bypass -File ./scripts/powershell/analyze-code-with-ollama.ps1 `
  -FilePath "app.vue" `
  -Model "qwen2.5-coder:7b" `
  -Timeout 600 `
  -MaxRetries 5

# With streaming
powershell -ExecutionPolicy Bypass -File ./scripts/powershell/analyze-code-with-ollama.ps1 `
  -FilePath "app.vue" `
  -Stream

# With verbose logging and debugging
npm run analyze:ollama:verbose -- -FilePath "app.vue"

# Custom chunk size for large files
powershell -ExecutionPolicy Bypass -File ./scripts/powershell/analyze-code-with-ollama.ps1 `
  -FilePath "large-file.ts" `
  -ChunkSize 3000 `
  -Verbose `
  -LogFile "custom-log.log"
```

## Available NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run analyze:ollama` | Standard analysis (requires -FilePath argument) |
| `npm run analyze:ollama:quick` | Quick analysis mode |
| `npm run analyze:ollama:detailed` | Detailed comprehensive analysis |
| `npm run analyze:ollama:verbose` | Standard analysis with verbose logging |
| `npm run analyze:codebase` | Full codebase review |
| `npm run analyze:quick` | Quick codebase review (5 files) |

## Model Configuration

### Primary Model
- **qwen2.5-coder:14b**: Best for comprehensive analysis
  - Context: 16384 tokens
  - Best for: Production code reviews, detailed analysis

### Fallback Models
- **qwen2.5-coder:7b**: Faster, lighter option
  - Best for: Quick feedback, rapid iteration
- **codellama:latest**: Code-specific model
  - Best for: Code generation and refactoring
- **mistral:7b**: General purpose
  - Best for: General code understanding

## Analysis Modes

### Quick Mode (`-Quick`)
- Focus: Critical issues only
- Output: Concise, actionable feedback
- Use case: Rapid iteration, pre-commit checks
- Time: ~30-60 seconds

### Standard Mode (default)
- Focus: Code quality, best practices, improvements
- Output: Structured analysis with sections
- Use case: Regular code reviews
- Time: ~1-3 minutes

### Detailed Mode (`-Detailed`)
- Focus: Comprehensive analysis including:
  - Architecture & design patterns
  - SOLID principles
  - Security vulnerabilities with CVSS scores
  - Performance bottlenecks
  - Documentation quality
  - Priority matrix and action plan
- Output: Extensive markdown report
- Use case: Pre-release reviews, major refactoring
- Time: ~3-5 minutes

## Error Handling

### Automatic Retries
- Default: 3 attempts
- Backoff: Exponential (2s, 4s, 6s)
- Configurable via `-MaxRetries` parameter
- Detailed error logging in verbose mode

### Connection Checks
- Verifies Ollama server is running
- Validates model availability
- Provides helpful error messages with solutions
- Logs connection timing metrics

### Timeout Management
- Default: 300 seconds (5 minutes)
- Configurable via `-Timeout` parameter
- Prevents hanging on slow responses
- Tracks request timing for performance monitoring

### Chunked Processing
- Large files automatically split into chunks (default: 2000 chars)
- Configurable via `-ChunkSize` parameter
- Progress tracking for multi-chunk analysis
- Results combined automatically

## Output

### Console Output
- Color-coded messages for better readability
- Progress indicators with timing information
- Error messages with actionable solutions
- Verbose mode shows detailed debug information

### File Output
- Analysis saved as `.ollama-analysis.md` next to analyzed file
- Markdown format for easy review
- Includes full analysis with all sections

### Log Files
- Automatic log file generation in temp directory
- Format: `ollama-analysis-YYYYMMDD-HHMMSS.log`
- Custom log file path via `-LogFile` parameter
- Includes timestamps, log levels, and debug information
- Useful for troubleshooting and performance analysis

## Best Practices

1. **Start with Quick Mode**: Use for rapid feedback during development
2. **Use Standard Mode**: For regular code reviews and PRs
3. **Use Detailed Mode**: Before major releases or refactoring
4. **Combine with Linting**: Use alongside `npm run lint` and `npm run ts:check`
5. **Review Reports**: Check generated markdown files for detailed insights
6. **Model Selection**: Use smaller models (7b) for faster feedback, larger (14b) for comprehensive analysis

## Troubleshooting

### Ollama Server Not Running
```powershell
# Start Ollama server
ollama serve
```

### Model Not Found
```powershell
# Pull the required model
ollama pull qwen2.5-coder:14b
```

### Memory Issues
- Switch to smaller model: `qwen2.5-coder:7b`
- Reduce context length in settings
- Use Quick mode for faster analysis

### Slow Analysis
- Use `-Quick` flag
- Switch to smaller model
- Reduce timeout if needed
- Check Ollama server performance

### Connection Timeouts
- Increase timeout: `-Timeout 600`
- Check network connectivity
- Verify Ollama server is accessible
- Check firewall settings

## Configuration Updates

### Recent Enhancements (2025-01-16)

1. ✅ Increased context length to 16384 tokens
2. ✅ Added timeout configuration (300s default)
3. ✅ Implemented retry logic with exponential backoff
4. ✅ Added model verification before analysis
5. ✅ Enhanced error messages with solutions
6. ✅ Added streaming support option
7. ✅ Improved analysis modes (Quick/Standard/Detailed)
8. ✅ Better prompt engineering for each mode
9. ✅ Added fallback model configuration
10. ✅ Enhanced VS Code settings with comprehensive options
11. ✅ **NEW**: Chunked analysis for large files
12. ✅ **NEW**: Verbose logging and debugging mode
13. ✅ **NEW**: Automatic log file generation
14. ✅ **NEW**: Progress tracking and timing metrics
15. ✅ **NEW**: Detailed debug information in verbose mode

## Integration with Development Workflow

### Pre-Commit
```powershell
npm run analyze:ollama:quick -- -FilePath "changed-file.ts"
```

### Code Review
```powershell
npm run analyze:ollama:detailed -- -FilePath "component.vue"
```

### Pre-Release
```powershell
npm run analyze:codebase
```

## Performance Tips

1. **Use Quick Mode** for frequent checks
2. **Cache Results**: Review saved markdown files before re-analyzing
3. **Batch Analysis**: Use codebase review for multiple files
4. **Model Selection**: Match model size to analysis depth needed
5. **Timeout Tuning**: Adjust based on file size and model speed
