# Ollama Code Analysis - Quick Start Guide

## 🚀 Quick Start

### 1. Ensure Ollama is Running

```powershell
ollama serve
```

### 2. Analyze a Single File

**Option A: Using VS Code**
- Open any code file
- Press `Ctrl+Shift+P`
- Type "Tasks: Run Task"
- Select "Analyze Current File with Ollama"

**Option B: Using Command Line**
```powershell
npm run analyze:ollama -- -FilePath "app.vue"
```

### 3. Review Your Codebase

**Quick Review (5 files):**
```powershell
npm run analyze:quick
```

**Full Review:**
```powershell
npm run analyze:codebase
```

## 📋 Common Commands

| Task | Command |
|------|---------|
| Analyze current file | `npm run analyze:ollama -- -FilePath "path/to/file.ts"` |
| Quick codebase review | `npm run analyze:quick` |
| Full codebase review | `npm run analyze:codebase` |
| Analyze with specific model | Add `-Model "qwen2.5-coder:7b"` |

## 🎯 What Gets Analyzed

- ✅ Code quality issues
- ✅ Potential bugs
- ✅ Security vulnerabilities
- ✅ Performance problems
- ✅ Best practice violations
- ✅ Refactoring opportunities

## 📊 Output

- **Terminal**: Real-time analysis results
- **File**: Markdown report saved next to analyzed file or in project root

## 💡 Tips

1. **Start Small**: Analyze one file at a time first
2. **Use Quick Mode**: For faster feedback, use `-Quick` flag
3. **Review Reports**: Check generated markdown files for detailed insights
4. **Combine Tools**: Use alongside `npm run lint` and `npm run ts:check`

## 🔧 Troubleshooting

**Ollama not running?**
```powershell
ollama serve
```

**Memory issues?**
- Switch to smaller model: `qwen2.5-coder:7b` or `codellama:latest`
- Edit `.vscode/settings.json` and change the model

**Need help?**
See `docs/OLLAMA_CODE_ANALYSIS.md` for detailed documentation.
