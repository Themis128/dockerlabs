# Code Quality Analysis with Ollama

This project uses Ollama for AI-powered code quality analysis, providing automated code reviews, security checks, performance analysis, and best practice recommendations.

## Quick Start

### Prerequisites

1. **Install Ollama**: https://ollama.ai
2. **Pull a code model**:
   ```bash
   ollama pull qwen2.5-coder:7b
   # Or for better quality (requires more RAM):
   ollama pull qwen2.5-coder:14b
   ```
3. **Start Ollama**:
   ```bash
   ollama serve
   ```

### Basic Usage

```bash
# Quick analysis (fast, focuses on critical issues)
npm run analyze:quality:quick

# Detailed analysis (balanced speed/quality)
npm run analyze:quality:detailed

# Comprehensive analysis (thorough, slower)
npm run analyze:quality:comprehensive

# Focus on specific aspects
npm run analyze:quality:security
npm run analyze:quality:performance

# Analyze a specific file
npm run analyze:quality:file -- path/to/file.ts
```

## Analysis Modes

### Quick Mode
- **Speed**: Fast (~5-10 seconds per file)
- **Focus**: Critical issues only
- **Use Case**: Pre-commit checks, rapid feedback
- **Command**: `npm run analyze:quality:quick`

### Detailed Mode (Default)
- **Speed**: Moderate (~15-30 seconds per file)
- **Focus**: Issues with line numbers and suggestions
- **Use Case**: Regular code reviews, pull requests
- **Command**: `npm run analyze:quality:detailed`

### Comprehensive Mode
- **Speed**: Slower (~30-60 seconds per file)
- **Focus**: Complete analysis including code smells, best practices
- **Use Case**: Deep code reviews, refactoring planning
- **Command**: `npm run analyze:quality:comprehensive`

## Analysis Focus Areas

### Security
Focuses on:
- Injection vulnerabilities
- Authentication/authorization issues
- Data exposure risks
- Insecure dependencies
- Input validation problems

```bash
npm run analyze:quality:security
```

### Performance
Focuses on:
- Algorithm efficiency
- Database query optimization
- Memory leaks
- Unnecessary computations
- Resource management

```bash
npm run analyze:quality:performance
```

### Maintainability
Focuses on:
- Code readability
- Complexity reduction
- DRY principles
- Naming conventions
- Documentation

```bash
npm run analyze:quality -- --maintainability
```

### All (Default)
Covers all aspects equally.

## Advanced Usage

### Analyze Specific Files

```bash
# Single file
npm run analyze:quality:file -- components/MyComponent.vue

# Multiple files
tsx scripts/code-quality/ollama-analyzer.ts --files "file1.ts,file2.ts,file3.ts"
```

### Custom Configuration

Set environment variables:

```bash
# Use different Ollama endpoint
OLLAMA_ENDPOINT=http://localhost:11434/api/generate npm run analyze:quality

# Use different model
OLLAMA_MODEL=qwen2.5-coder:14b npm run analyze:quality

# Use custom worker count
PLAYWRIGHT_WORKERS=4 npm run analyze:quality
```

### Output Formats

```bash
# Markdown report (default)
npm run analyze:quality

# JSON output
tsx scripts/code-quality/ollama-analyzer.ts --json

# Console output only
tsx scripts/code-quality/ollama-analyzer.ts --console

# Don't save report
tsx scripts/code-quality/ollama-analyzer.ts --no-save
```

## Integration with Git Hooks

### Pre-commit Hook

The analyzer can be integrated with Husky to check code before commits:

```bash
# Install Husky (if not already installed)
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "tsx scripts/code-quality/pre-commit-analyzer.ts"
```

The pre-commit hook will:
- Analyze only staged files
- Use quick mode for speed
- Block commits with critical errors
- Warn about warnings (but allow commit)

### Manual Pre-commit Check

```bash
# Check staged files before committing
tsx scripts/code-quality/pre-commit-analyzer.ts
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Code Quality Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install Ollama
        run: |
          curl -fsSL https://ollama.ai/install.sh | sh
          ollama pull qwen2.5-coder:7b
      
      - name: Start Ollama
        run: ollama serve &
      
      - name: Install dependencies
        run: npm ci
      
      - name: Analyze code quality
        run: npm run analyze:quality:detailed
        env:
          OLLAMA_ENDPOINT: http://localhost:11434/api/generate
      
      - name: Upload report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: code-quality-report
          path: code-quality-report-*.md
```

## Understanding Reports

### Quality Score
- **90-100**: Excellent code quality
- **70-89**: Good code with minor improvements needed
- **50-69**: Moderate quality, several issues to address
- **0-49**: Poor quality, significant refactoring needed

### Issue Severity

- **Error**: Critical issues that should be fixed immediately
  - Security vulnerabilities
  - Bugs that could cause failures
  - Performance issues affecting users

- **Warning**: Issues that should be addressed soon
  - Code smells
  - Best practice violations
  - Potential maintainability problems

- **Info**: Suggestions for improvement
  - Style improvements
  - Optimization opportunities
  - Documentation suggestions

### Categories

- **Security**: Security-related issues
- **Performance**: Performance-related issues
- **Maintainability**: Code maintainability issues
- **Best Practice**: Best practice violations

## Best Practices

1. **Run Before Commits**: Use pre-commit hooks to catch issues early
2. **Regular Analysis**: Run comprehensive analysis weekly
3. **Focus on Errors**: Prioritize fixing errors over warnings
4. **Review Suggestions**: Not all suggestions need to be implemented
5. **Combine with Linters**: Use alongside ESLint, TypeScript, etc.

## Troubleshooting

### Ollama Not Running

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve
```

### Model Not Found

```bash
# List available models
ollama list

# Pull the required model
ollama pull qwen2.5-coder:7b
```

### Slow Analysis

- Use quick mode for faster results
- Analyze fewer files at once
- Use a faster model (7b instead of 14b)
- Ensure Ollama has enough RAM

### Connection Errors

- Check Ollama is running: `ollama serve`
- Verify endpoint: `http://127.0.0.1:11434`
- Check firewall settings
- Try different port if 11434 is in use

## Configuration

### Model Selection

Recommended models (in order of quality):

1. **qwen2.5-coder:14b** - Best quality, requires 16GB+ RAM
2. **qwen2.5-coder:7b** - Good quality, requires 8GB+ RAM (default)
3. **codellama:latest** - Code-specific, good balance
4. **mistral:7b** - General purpose, fast

### Environment Variables

```bash
# Ollama endpoint
OLLAMA_ENDPOINT=http://127.0.0.1:11434/api/generate

# Model to use
OLLAMA_MODEL=qwen2.5-coder:7b

# Analysis options
OLLAMA_TEMPERATURE=0.3
OLLAMA_TOP_P=0.9
OLLAMA_MAX_TOKENS=8192
```

## Examples

### Analyze Changed Files

```bash
# Get changed files
git diff --name-only HEAD | grep -E '\.(ts|js|vue)$' | \
  xargs -I {} tsx scripts/code-quality/ollama-analyzer.ts --file {}
```

### Analyze Before PR

```bash
# Analyze all TypeScript files
find . -name "*.ts" -not -path "./node_modules/*" | \
  xargs tsx scripts/code-quality/ollama-analyzer.ts --files
```

### Continuous Monitoring

```bash
# Watch for file changes and analyze
npm install -g nodemon
nodemon --watch . --ext ts,js,vue --exec "npm run analyze:quality:quick"
```

## Integration with Other Tools

### ESLint Integration

Combine Ollama analysis with ESLint:

```bash
npm run lint && npm run analyze:quality:quick
```

### TypeScript Integration

Run type checking alongside analysis:

```bash
npm run ts:check && npm run analyze:quality:detailed
```

### Prettier Integration

Format code before analysis:

```bash
npm run format && npm run analyze:quality
```

## Performance Tips

1. **Use Quick Mode**: For frequent checks during development
2. **Analyze Incrementally**: Focus on changed files
3. **Cache Results**: Results are saved to reports for review
4. **Parallel Analysis**: The tool analyzes files sequentially to avoid overwhelming Ollama
5. **Model Selection**: Use 7b models for speed, 14b for quality

## Contributing

To improve the analyzer:

1. Edit `scripts/code-quality/ollama-analyzer.ts`
2. Adjust prompts for better analysis
3. Add new analysis modes
4. Improve report formatting

## Support

For issues or questions:
- Check Ollama is running: `ollama serve`
- Verify model is available: `ollama list`
- Check logs in generated report files
- Review `.cursorrules` for configuration

