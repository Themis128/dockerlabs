# Ollama Code Analysis - Quick Reference

## 🚀 Quick Start Commands

### Recommended: Smart Analysis (with pre-processing)
```powershell
npm run analyze:ollama:smart -- -FilePath "app.vue"
```

### Quick Analysis (fast feedback)
```powershell
npm run analyze:ollama:smart -- -FilePath "app.vue" -Quick
```

### Detailed Analysis (comprehensive review)
```powershell
npm run analyze:ollama:smart -- -FilePath "app.vue" -Detailed
```

### With Verbose Logging
```powershell
npm run analyze:ollama:smart -- -FilePath "app.vue" -Verbose
```

## 📋 All Available Commands

### Analysis Commands

| Command | Description | Pre-processing | Model Pre-load |
|---------|-------------|----------------|----------------|
| `analyze:ollama:smart` | **Recommended** - Full preparation + analysis | ✅ Yes | ✅ Yes |
| `analyze:ollama:auto` | Alias for smart analysis | ✅ Yes | ✅ Yes |
| `analyze:ollama:prepare` | Prepare and analyze (no code preprocessing) | ❌ No | ✅ Yes |
| `analyze:ollama` | Standard analysis | ❌ No | ❌ No |
| `analyze:ollama:quick` | Quick analysis mode | ❌ No | ❌ No |
| `analyze:ollama:detailed` | Detailed analysis mode | ❌ No | ❌ No |
| `analyze:ollama:verbose` | Standard with verbose logging | ❌ No | ❌ No |
| `analyze:ollama:preload` | Standard with model pre-loading | ❌ No | ✅ Yes |

### Status & Utility Commands

| Command | Description |
|---------|-------------|
| `ollama:status` | Check Ollama server and model status |
| `ollama:status:detailed` | Detailed status with system info |

## 🎯 Usage Examples

### Basic Analysis
```powershell
# Analyze a Vue component
npm run analyze:ollama:smart -- -FilePath "components/DashboardTab.vue"

# Analyze a TypeScript file
npm run analyze:ollama:smart -- -FilePath "composables/useApi.ts"

# Analyze a Python file
npm run analyze:ollama:smart -- -FilePath "scripts/api.py"
```

### With Options
```powershell
# Quick analysis with custom model
npm run analyze:ollama:smart -- -FilePath "app.vue" -Quick -Model "qwen2.5-coder:14b"

# Detailed analysis with verbose output
npm run analyze:ollama:smart -- -FilePath "app.vue" -Detailed -Verbose

# Custom timeout for large files
npm run analyze:ollama:smart -- -FilePath "large-file.ts" -Timeout 600
```

### Check Status First
```powershell
# Check if Ollama is ready
npm run ollama:status

# Then run analysis
npm run analyze:ollama:smart -- -FilePath "app.vue"
```

## ⚙️ Available Options

All analysis commands support these options:

| Option | Description | Default |
|--------|-------------|---------|
| `-FilePath <path>` | **Required** - Path to file to analyze | - |
| `-Language <lang>` | Language (auto, TypeScript, Vue, Python, etc.) | auto |
| `-Model <model>` | Ollama model to use | qwen2.5-coder:7b |
| `-Quick` | Quick analysis mode (faster, less detailed) | false |
| `-Detailed` | Detailed analysis mode (comprehensive) | false |
| `-Verbose` | Enable verbose logging and debugging | false |
| `-Timeout <seconds>` | Request timeout in seconds | 300 |
| `-MaxRetries <num>` | Maximum retry attempts | 3 |
| `-Stream` | Enable streaming responses | false |
| `-ChunkSize <size>` | Max chunk size (0 = auto) | 0 (auto) |

## 🔍 What Gets Pre-processed?

When using `analyze:ollama:smart`, the code is automatically:

1. **Normalized**: Line endings, whitespace, blank lines
2. **Cleaned**: Trailing whitespace removed, BOM removed
3. **Structured**: 
   - Vue: Clear template/script/style separation
   - TypeScript/JS: Imports grouped at top
4. **Optimized**: Reduced size while preserving meaning

## 📊 Analysis Modes

### Quick Mode (`-Quick`)
- Focus: Critical issues only
- Time: ~30-60 seconds
- Use: Rapid feedback, pre-commit checks

### Standard Mode (default)
- Focus: Code quality, best practices, improvements
- Time: ~1-3 minutes
- Use: Regular code reviews

### Detailed Mode (`-Detailed`)
- Focus: Comprehensive analysis including architecture
- Time: ~3-5 minutes
- Use: Pre-release reviews, major refactoring

## 🐛 Troubleshooting

### Model Not Loading
```powershell
# Pre-load manually
ollama run qwen2.5-coder:7b

# Then run analysis
npm run analyze:ollama:smart -- -FilePath "app.vue"
```

### Timeout Issues
```powershell
# Increase timeout
npm run analyze:ollama:smart -- -FilePath "app.vue" -Timeout 600
```

### Check Ollama Status
```powershell
npm run ollama:status
```

## 💡 Best Practices

1. **Use Smart Analysis**: Always use `analyze:ollama:smart` for best results
2. **Check Status First**: Run `ollama:status` if unsure about Ollama
3. **Start with Quick**: Use `-Quick` for rapid iteration
4. **Use Detailed for Reviews**: Use `-Detailed` before PRs/releases
5. **Pre-load for Speed**: Model stays in memory after first load

## 📝 Output

- **Console**: Real-time colored output with progress
- **Log File**: Detailed log in temp directory
- **Analysis File**: Markdown report saved as `[filename].ollama-analysis.md`

## 🔗 Related Documentation

- Full configuration: `docs/OLLAMA_CONFIGURATION.md`
- Quick start: `OLLAMA_QUICK_START.md`
- Detailed guide: `docs/OLLAMA_CODE_ANALYSIS.md`


