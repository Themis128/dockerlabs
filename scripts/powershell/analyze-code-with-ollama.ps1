# Code Analysis Script using Ollama
# Analyzes code files and provides AI-powered suggestions for improvements

param(
    [string]$FilePath = "",
    [string]$Language = "auto",
    [switch]$Quick,
    [switch]$Detailed,
    [string]$Model = "qwen2.5-coder:14b"
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

# Check if Ollama is running
function Test-OllamaConnection {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -ErrorAction Stop
        return $true
    } catch {
        Write-ColorOutput "❌ Ollama server is not running. Please start it with: ollama serve" "Red"
        return $false
    }
}

# Analyze code with Ollama
function Invoke-CodeAnalysis {
    param(
        [string]$Code,
        [string]$FilePath,
        [string]$Language
    )

    # Detect language if auto
    if ($Language -eq "auto") {
        $ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
        switch ($ext) {
            ".ts" { $Language = "TypeScript" }
            ".js" { $Language = "JavaScript" }
            ".vue" { $Language = "Vue" }
            ".py" { $Language = "Python" }
            ".cs" { $Language = "C#" }
            ".html" { $Language = "HTML" }
            ".css" { $Language = "CSS" }
            default { $Language = "Code" }
        }
    }

    # Create analysis prompt
    $prompt = @"
Analyze the following $Language code and provide a comprehensive code review focusing on:

1. **Code Quality Issues:**
   - Code smells and anti-patterns
   - Potential bugs or logic errors
   - Performance issues
   - Security vulnerabilities

2. **Best Practices:**
   - Adherence to language-specific best practices
   - Code organization and structure
   - Naming conventions
   - Error handling

3. **Improvements:**
   - Specific, actionable suggestions
   - Code examples for improvements
   - Refactoring opportunities

4. **Summary:**
   - Overall code quality score (1-10)
   - Priority issues to address first

Code to analyze:
```$Language
$Code
```

Provide a structured analysis with clear sections and actionable recommendations.
"@

    $body = @{
        model = $Model
        prompt = $prompt
        stream = $false
        options = @{
            temperature = 0.3
            top_p = 0.9
        }
    } | ConvertTo-Json -Depth 10

    try {
        Write-ColorOutput "`n🔍 Analyzing code with Ollama ($Model)..." "Cyan"
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/generate" -Method Post -Body $body -ContentType "application/json"
        return $response.response
    } catch {
        Write-ColorOutput "❌ Analysis failed: $_" "Red"
        return $null
    }
}

# Main execution
Write-ColorOutput "`n" "White"
Write-ColorOutput "=" * 60 "Cyan"
Write-ColorOutput "  Ollama Code Analysis Tool" "Cyan"
Write-ColorOutput "=" * 60 "Cyan"
Write-ColorOutput ""

# Check Ollama connection
if (-not (Test-OllamaConnection)) {
    exit 1
}

# Get file path
if ([string]::IsNullOrEmpty($FilePath)) {
    Write-ColorOutput "Usage: .\analyze-code-with-ollama.ps1 -FilePath <path> [options]" "Yellow"
    Write-ColorOutput ""
    Write-ColorOutput "Options:" "Yellow"
    Write-ColorOutput "  -FilePath <path>    Path to the code file to analyze" "White"
    Write-ColorOutput "  -Language <lang>   Language (auto, TypeScript, Python, etc.)" "White"
    Write-ColorOutput "  -Quick              Quick analysis mode" "White"
    Write-ColorOutput "  -Detailed           Detailed analysis mode" "White"
    Write-ColorOutput "  -Model <model>     Ollama model to use (default: qwen2.5-coder:14b)" "White"
    exit 1
}

# Check if file exists
if (-not (Test-Path $FilePath)) {
    Write-ColorOutput "❌ File not found: $FilePath" "Red"
    exit 1
}

# Read file content
try {
    $code = Get-Content $FilePath -Raw -Encoding UTF8
    Write-ColorOutput "✓ Loaded file: $FilePath" "Green"
    Write-ColorOutput "  Size: $($code.Length) characters" "Gray"
} catch {
    Write-ColorOutput "❌ Failed to read file: $_" "Red"
    exit 1
}

# Perform analysis
$analysis = Invoke-CodeAnalysis -Code $code -FilePath $FilePath -Language $Language

if ($analysis) {
    Write-ColorOutput "`n" "White"
    Write-ColorOutput "=" * 60 "Cyan"
    Write-ColorOutput "  Analysis Results" "Cyan"
    Write-ColorOutput "=" * 60 "Cyan"
    Write-ColorOutput ""
    Write-ColorOutput $analysis "White"
    Write-ColorOutput ""
    Write-ColorOutput "=" * 60 "Cyan"

    # Save to file
    $outputFile = "$FilePath.ollama-analysis.md"
    $analysis | Out-File -FilePath $outputFile -Encoding UTF8
    Write-ColorOutput "✓ Analysis saved to: $outputFile" "Green"
} else {
    Write-ColorOutput "❌ Analysis failed" "Red"
    exit 1
}
