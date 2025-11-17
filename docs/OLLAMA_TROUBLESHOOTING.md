# Ollama Analysis Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Pre-load Timeout

**Symptoms:**
```
[WARN] Pre-load timed out, but model may still be loading
```

**Causes:**
- Model is loading for the first time (can take 60-120 seconds)
- System resources are limited
- Ollama server is slow to respond

**Solutions:**

1. **Wait for model to load** (Recommended)
   - The model will load on the first analysis request
   - First analysis may take 60-120 seconds
   - Subsequent analyses will be much faster

2. **Pre-load manually**
   ```powershell
   ollama run qwen2.5-coder:7b
   # Wait for it to respond, then Ctrl+C
   # Model stays in memory
   ```

3. **Check if model is already loaded**
   ```powershell
   npm run ollama:status
   ```

4. **Increase timeout** (if needed)
   ```powershell
   npm run analyze:ollama:smart -- -FilePath "app.vue" -Timeout 900
   ```

### Issue 2: Analysis Request Timeout

**Symptoms:**
```
[WARN] Analysis attempt 1 failed, retrying in 2s... (The operation has timed out)
```

**Causes:**
- Model not loaded in memory
- Request taking longer than timeout
- Ollama server under heavy load

**Solutions:**

1. **Ensure model is pre-loaded**
   ```powershell
   # Check status first
   npm run ollama:status

   # If not loaded, use smart analysis (auto pre-loads)
   npm run analyze:ollama:smart -- -FilePath "app.vue"
   ```

2. **Increase timeout for large files**
   ```powershell
   npm run analyze:ollama:smart -- -FilePath "large-file.ts" -Timeout 900
   ```

3. **Use Quick mode for faster results**
   ```powershell
   npm run analyze:ollama:smart -- -FilePath "app.vue" -Quick
   ```

4. **Check Ollama server resources**
   - Ensure Ollama has enough RAM
   - Close other applications using GPU/CPU
   - Restart Ollama if needed: `ollama serve`

### Issue 3: Model Not Found

**Symptoms:**
```
[WARN] Model 'qwen2.5-coder:7b' not found
```

**Solutions:**

1. **Pull the model**
   ```powershell
   ollama pull qwen2.5-coder:7b
   ```

2. **Use an available model**
   ```powershell
   npm run ollama:status:detailed
   # Then use one of the listed models
   npm run analyze:ollama:smart -- -FilePath "app.vue" -Model "codellama:latest"
   ```

### Issue 4: Ollama Server Not Running

**Symptoms:**
```
[FAIL] Ollama server is not running or not accessible
```

**Solutions:**

1. **Start Ollama server**
   ```powershell
   ollama serve
   ```
   Keep this terminal open while using analysis

2. **Check if running on different port**
   - Default: `http://127.0.0.1:11434`
   - Check Ollama configuration

3. **Verify connection**
   ```powershell
   npm run ollama:status
   ```

### Issue 5: Chunk Size Display Issue

**Symptoms:**
```
[DEBUG] Chunk 1 in list: type=Char, length=1
```

**Status:** This is a debug display issue only. The actual chunk is processed correctly (shows correct length: 205 characters). The analysis works properly despite this debug message.

**Solution:** This is cosmetic and doesn't affect functionality. Can be ignored or use non-verbose mode.

## Performance Optimization

### For Faster Analysis

1. **Pre-load model once**
   ```powershell
   ollama run qwen2.5-coder:7b
   # Model stays in memory for faster subsequent requests
   ```

2. **Use Quick mode**
   ```powershell
   npm run analyze:ollama:smart -- -FilePath "app.vue" -Quick
   ```

3. **Use smaller model for speed**
   ```powershell
   npm run analyze:ollama:smart -- -FilePath "app.vue" -Model "qwen2.5:1.5b"
   ```

### For Better Quality

1. **Use Detailed mode**
   ```powershell
   npm run analyze:ollama:smart -- -FilePath "app.vue" -Detailed
   ```

2. **Use larger model**
   ```powershell
   npm run analyze:ollama:smart -- -FilePath "app.vue" -Model "qwen2.5-coder:14b"
   ```

## Best Practices

1. **Always use Smart Analysis**
   - Pre-processes code optimally
   - Pre-loads model automatically
   - Best overall experience

2. **Check status before analysis**
   ```powershell
   npm run ollama:status
   ```

3. **For first-time use**
   - Be patient - first model load takes 60-120 seconds
   - Subsequent analyses are much faster (5-30 seconds)

4. **For large files**
   - Increase timeout: `-Timeout 900`
   - Use chunking (automatic)
   - Consider Quick mode for initial feedback

## Timeout Recommendations

| File Size | Recommended Timeout | Mode |
|-----------|-------------------|------|
| < 500 lines | 300s (5 min) | Standard |
| 500-2000 lines | 600s (10 min) | Standard |
| 2000-5000 lines | 900s (15 min) | Quick or Standard |
| > 5000 lines | 1200s (20 min) | Quick |

## Getting Help

1. **Check logs**: `C:\Users\<user>\AppData\Local\Temp\ollama-analysis-*.log`
2. **Run status check**: `npm run ollama:status:detailed`
3. **Check Ollama logs**: Look for Ollama server output
4. **Verify model**: `ollama list`

## Recent Fixes (2025-11-17)

✅ Increased default timeout to 600 seconds (10 minutes)
✅ Improved pre-loading with async job and progress indicator
✅ Enhanced timeout handling for first request (model loading)
✅ Better error messages and user guidance
✅ Fixed chunk retrieval to use ToArray() properly
✅ Added language-specific context hints in prompts
