# Ollama Code Quality Analyzer - Performance Optimizations

## Performance Results

After optimization, the analyzer shows significant speed improvements:

- **Quick Mode**: ~5.4 seconds per file (2.37x faster than detailed)
- **Detailed Mode**: ~12.9 seconds per file
- **Comprehensive Mode**: ~20-30 seconds per file

## Optimizations Implemented

### 1. Mode-Specific Configuration

**Quick Mode:**
- Max tokens: 1024 (vs 8192)
- Temperature: 0.1 (vs 0.2)
- Context window: 4096 (vs 8192)
- Top-k: 10 (vs 20)
- Timeout: 30s (vs 60s)
- Code truncation: 2000 chars
- Parallel processing: Up to 3 files concurrently

**Detailed Mode:**
- Max tokens: 8192
- Temperature: 0.2
- Context window: 8192
- Sequential processing

### 2. Prompt Optimization

- **Quick mode**: Ultra-short prompts, JSON-only responses
- **Detailed mode**: Standard prompts with examples
- Code truncation based on mode (2000/5000/10000 chars)

### 3. Parallel Processing

- Quick mode: 3 concurrent file analyses
- Detailed/Comprehensive: Sequential to avoid overwhelming Ollama

### 4. Model Preloading

- Optional model preloading for faster first query
- Non-blocking preload in quick mode

### 5. Request Optimizations

- Shorter timeouts for quick mode
- Reduced retry attempts (1 vs 2)
- Faster backoff (500ms vs 1000ms)
- Lower repetition penalty (1.05 vs 1.1)

## Usage Recommendations

### For Pre-commit Hooks
```bash
npm run analyze:quality:quick
```
- Fast enough for pre-commit (5-10s for typical changes)
- Catches critical issues
- Non-blocking in pre-commit hook

### For Code Reviews
```bash
npm run analyze:quality:detailed
```
- Balanced speed/quality
- Good for PR reviews
- ~13s per file

### For Deep Analysis
```bash
npm run analyze:quality:comprehensive
```
- Thorough analysis
- Use for major refactoring
- ~20-30s per file

## Performance Tips

1. **Use Quick Mode for Frequent Checks**
   - Pre-commit hooks
   - During development
   - CI/CD pipelines

2. **Use Smaller Models for Speed**
   - `qwen2.5-coder:7b` (default) - Good balance
   - `qwen2.5:1.5b` - Fastest, less accurate
   - `qwen2.5-coder:14b` - Slower, more accurate

3. **Analyze Incrementally**
   - Only changed files in pre-commit
   - Focus on specific areas
   - Use file filters

4. **Parallel Processing**
   - Quick mode automatically uses parallel processing
   - Detailed mode is sequential to maintain quality

5. **Model Preloading**
   - First query is slower (model loading)
   - Subsequent queries are faster
   - Preload happens automatically in quick mode

## Benchmarking

Run performance tests:
```bash
npm run analyze:quality:test
```

This will test both quick and detailed modes and provide recommendations.

## Environment Variables for Tuning

```bash
# Use faster model
OLLAMA_MODEL=qwen2.5:1.5b npm run analyze:quality:quick

# Use more powerful model (slower)
OLLAMA_MODEL=qwen2.5-coder:14b npm run analyze:quality:detailed

# Enable debug logging
DEBUG=true npm run analyze:quality:quick
```

## Expected Performance

| Mode | Files | Time | Use Case |
|------|-------|------|----------|
| Quick | 1 | ~5s | Pre-commit |
| Quick | 5 | ~8s | Small PR |
| Quick | 10 | ~15s | Medium PR |
| Detailed | 1 | ~13s | Code review |
| Detailed | 5 | ~65s | PR review |
| Comprehensive | 1 | ~25s | Deep analysis |

*Times may vary based on model, hardware, and code complexity*

## Further Optimizations

If you need even faster analysis:

1. **Use streaming** (future enhancement)
2. **Cache results** (future enhancement)
3. **Use smaller models** (qwen2.5:1.5b)
4. **Analyze only changed lines** (git diff)
5. **Skip unchanged files** (git status)

## Troubleshooting Slow Performance

1. **Check Ollama is running**: `ollama serve`
2. **Check model is loaded**: `ollama list`
3. **Use quick mode**: `npm run analyze:quality:quick`
4. **Reduce file count**: Analyze specific files only
5. **Check system resources**: Ensure enough RAM/CPU
