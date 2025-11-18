# Code Quality Analyzer

AI-powered code quality analysis using Ollama for automated code reviews, security checks, and best practice recommendations.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Ensure Ollama is installed and running:
```bash
# Install Ollama from https://ollama.ai
# Pull a code model
ollama pull qwen2.5-coder:7b

# Start Ollama server
ollama serve
```

## Usage

### Command Line

```bash
# Quick analysis
npm run analyze:quality:quick

# Detailed analysis
npm run analyze:quality:detailed

# Comprehensive analysis
npm run analyze:quality:comprehensive

# Focus on security
npm run analyze:quality:security

# Focus on performance
npm run analyze:quality:performance

# Analyze specific file
npm run analyze:quality:file -- path/to/file.ts
```

### Programmatic Usage

```typescript
import { OllamaCodeAnalyzer } from './ollama-analyzer.js';

const analyzer = new OllamaCodeAnalyzer({
  endpoint: 'http://127.0.0.1:11434/api/generate',
  model: 'qwen2.5-coder:7b',
});

// Check connection
const connected = await analyzer.checkConnection();

// Analyze a file
const result = await analyzer.analyzeFile('path/to/file.ts', {
  mode: 'detailed',
  focus: 'all',
  outputFormat: 'markdown',
  saveReport: true,
});

// Analyze multiple files
const results = await analyzer.analyzeFiles(['file1.ts', 'file2.ts'], {
  mode: 'quick',
  focus: 'security',
  outputFormat: 'json',
  saveReport: false,
});

// Generate report
const report = analyzer.generateReport(results, 'markdown');
```

## Configuration

### Environment Variables

- `OLLAMA_ENDPOINT`: Ollama API endpoint (default: `http://127.0.0.1:11434/api/generate`)
- `OLLAMA_MODEL`: Model to use (default: `qwen2.5-coder:7b`)

### Analysis Options

- **mode**: `'quick' | 'detailed' | 'comprehensive'`
- **focus**: `'security' | 'performance' | 'maintainability' | 'all'`
- **outputFormat**: `'markdown' | 'json' | 'console'`
- **saveReport**: `boolean`

## Integration

### Pre-commit Hook

Enable Ollama analysis in pre-commit hook:

```bash
ENABLE_OLLAMA_ANALYSIS=true git commit -m "Your message"
```

Or set it permanently:

```bash
export ENABLE_OLLAMA_ANALYSIS=true
```

### CI/CD

See `docs/CODE_QUALITY_ANALYSIS.md` for CI/CD integration examples.

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

### TypeScript Errors

The analyzer uses TypeScript with ESM. Ensure:
- Node.js 18+ is installed
- `tsx` is installed: `npm install -D tsx`
- Files use `.ts` extension

## Examples

See `docs/CODE_QUALITY_ANALYSIS.md` for detailed examples and best practices.

